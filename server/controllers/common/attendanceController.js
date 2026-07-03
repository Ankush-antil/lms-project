const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AttendanceSession = require('../../models/AttendanceSession');
const Attendance = require('../../models/Attendance');
const User = require('../../models/User');

// Helper to save base64 image
const saveBase64Image = (base64Str, folderPath, fileName) => {
    if (!base64Str) return null;
    
    // Check if base64 header exists and strip it
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let imageBuffer;
    if (matches && matches.length === 3) {
        imageBuffer = Buffer.from(matches[2], 'base64');
    } else {
        // Assume raw base64 if no header
        imageBuffer = Buffer.from(base64Str, 'base64');
    }
    
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
    
    const filePath = path.join(folderPath, fileName);
    fs.writeFileSync(filePath, imageBuffer);
    
    // Return relative path for URL serving
    return `/uploads/attendance/${path.basename(folderPath)}/${fileName}`;
};

// 1. Create a new Attendance QR Session (Teacher only)
exports.createSession = async (req, res) => {
    try {
        const { courseId, subject, section, duration } = req.body;
        
        if (!subject || !section || !duration) {
            return res.status(400).json({ message: "Please provide subject, section, and duration" });
        }
        
        const teacherId = req.user._id;
        const date = new Date().toISOString().split('T')[0];
        
        // Deactivate previous active sessions for same section & subject by this teacher
        await AttendanceSession.updateMany(
            { teacher: teacherId, subject, section, isActive: true },
            { isActive: false }
        );
        
        const qrToken = crypto.randomUUID();
        const startTime = new Date();
        const endTime = new Date(Date.now() + parseInt(duration) * 60000);
        
        const session = await AttendanceSession.create({
            teacher: teacherId,
            course: courseId || null,
            subject,
            section,
            date,
            startTime,
            endTime,
            duration: parseInt(duration),
            qrToken,
            isActive: true,
            wifiSSID: req.body.wifiSSID || null,
            wifiIP: req.ip || null
        });
        
        res.status(201).json(session);
    } catch (error) {
        console.error("Error creating session:", error);
        res.status(500).json({ message: "Failed to create attendance session" });
    }
};

// 1.5 End/Deactivate an Attendance QR Session (Teacher only)
exports.endSession = async (req, res) => {
    try {
        const { id } = req.params;
        const session = await AttendanceSession.findOneAndUpdate(
            { _id: id, teacher: req.user._id },
            { isActive: false, endTime: new Date() },
            { new: true }
        );
        if (!session) {
            return res.status(404).json({ message: "Active session not found" });
        }
        res.json({ message: "Session ended successfully", session });
    } catch (error) {
        console.error("Error ending session:", error);
        res.status(500).json({ message: "Failed to end session" });
    }
};

// 2. Get active sessions for logged-in teacher
exports.getActiveSessions = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const currentTime = new Date();
        
        // Find active sessions that haven't expired
        const sessions = await AttendanceSession.find({
            teacher: teacherId,
            isActive: true,
            endTime: { $gt: currentTime }
        }).populate('course', 'name code');
        
        res.json(sessions);
    } catch (error) {
        console.error("Error fetching active sessions:", error);
        res.status(500).json({ message: "Failed to fetch active sessions" });
    }
};

// 3. Get session details by ID
exports.getSessionDetails = async (req, res) => {
    try {
        const session = await AttendanceSession.findById(req.params.id)
            .populate('teacher', 'name email')
            .populate('course', 'name code');
            
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }
        
        res.json(session);
    } catch (error) {
        console.error("Error fetching session details:", error);
        res.status(500).json({ message: "Failed to fetch session details" });
    }
};

// 4. Validate QR Token & Get Session details (Student scans)
exports.getSessionByToken = async (req, res) => {
    try {
        const { qrToken } = req.params;
        const session = await AttendanceSession.findOne({ qrToken, isActive: true })
            .populate('teacher', 'name')
            .populate('course', 'name');
            
        if (!session) {
            return res.status(404).json({ message: "Invalid or inactive QR code" });
        }
        
        if (new Date() > session.endTime) {
            return res.status(400).json({ message: "This class attendance QR has expired" });
        }
        
        // Validate section immediately when student scans QR code
        const student = await User.findById(req.user._id);
        if (student && student.studentProfile?.section && student.studentProfile.section !== session.section) {
            return res.status(400).json({ 
                message: `This QR code is only for Section ${session.section}. You belong to Section ${student.studentProfile.section || 'N/A'}.` 
            });
        }
        
        // Validate Wi-Fi connection
        const studentIP = req.ip;
        const studentWifiSSID = req.query.wifiSSID;

        if (session.wifiSSID) {
            if (!studentWifiSSID) {
                return res.status(400).json({
                    message: `You must be connected to Wi-Fi: "${session.wifiSSID}" to scan this QR code.`
                });
            }
            if (studentWifiSSID !== session.wifiSSID) {
                return res.status(400).json({
                    message: `Please connect to the correct classroom Wi-Fi: "${session.wifiSSID}". (You are connected to "${studentWifiSSID}")`
                });
            }
        }

        const isLocalhost = (ip) => ip === '::1' || ip === '127.0.0.1' || ip.includes('127.0.0.1');
        if (session.wifiIP && process.env.NODE_ENV === 'production' && !isLocalhost(studentIP) && !isLocalhost(session.wifiIP)) {
            if (studentIP !== session.wifiIP) {
                return res.status(400).json({
                    message: "You must be connected to the same Wi-Fi router network as the teacher."
                });
            }
        }
        
        // Also check if student is checked in
        const record = await Attendance.findOne({ session: session._id, student: req.user._id });
        const checkStatus = record ? (record.checkOutTime ? 'completed' : 'checked-in') : 'not-started';
        
        res.json({
            session,
            checkStatus
        });
    } catch (error) {
        console.error("Error fetching session by token:", error);
        res.status(500).json({ message: "Failed to retrieve session details" });
    }
};

// 5. Mark Attendance (Student Check-in / Check-out with selfie)
exports.markAttendance = async (req, res) => {
    try {
        const { qrToken, photo, type } = req.body;
        
        if (!qrToken || !photo || !type) {
            return res.status(400).json({ message: "Please provide QR token, photo, and type (in/out)" });
        }
        
        if (type !== 'in' && type !== 'out') {
            return res.status(400).json({ message: "Type must be either 'in' or 'out'" });
        }
        
        const studentId = req.user._id;
        const student = await User.findById(studentId);
        
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        // Find session
        const session = await AttendanceSession.findOne({ qrToken, isActive: true });
        if (!session) {
            return res.status(404).json({ message: "Invalid or inactive QR code" });
        }
        
        if (new Date() > session.endTime) {
            return res.status(400).json({ message: "This class attendance QR has expired" });
        }
        
        // Validate section
        if (student.studentProfile?.section && student.studentProfile.section !== session.section) {
            return res.status(400).json({ 
                message: `You belong to section ${student.studentProfile.section}, but this attendance is for section ${session.section}` 
            });
        }
        
        // Validate Wi-Fi connection
        const studentIP = req.ip;
        const studentWifiSSID = req.body.wifiSSID;

        if (session.wifiSSID) {
            if (!studentWifiSSID) {
                return res.status(400).json({
                    message: `You must be connected to Wi-Fi: "${session.wifiSSID}" to submit attendance.`
                });
            }
            if (studentWifiSSID !== session.wifiSSID) {
                return res.status(400).json({
                    message: `Please connect to the correct classroom Wi-Fi: "${session.wifiSSID}".`
                });
            }
        }

        const isLocalhost = (ip) => ip === '::1' || ip === '127.0.0.1' || ip.includes('127.0.0.1');
        if (session.wifiIP && process.env.NODE_ENV === 'production' && !isLocalhost(studentIP) && !isLocalhost(session.wifiIP)) {
            if (studentIP !== session.wifiIP) {
                return res.status(400).json({
                    message: "You must be connected to the same Wi-Fi router network as the teacher."
                });
            }
        }
        
        // Folder to save attendance photos
        const attendanceFolder = path.join(__dirname, '../../uploads/attendance', session._id.toString());
        const fileName = `${studentId}_${type}.jpg`;
        const relativePhotoPath = saveBase64Image(photo, attendanceFolder, fileName);
        
        let record = await Attendance.findOne({ session: session._id, student: studentId });
        
        if (type === 'in') {
            if (record) {
                return res.status(400).json({ message: "You have already checked in for this class" });
            }
            
            record = await Attendance.create({
                session: session._id,
                student: studentId,
                date: session.date,
                checkInTime: new Date(),
                checkInPhoto: relativePhotoPath,
                status: 'In'
            });
            
            // Sync to User's physicalAttendance array as Present (since they checked in)
            const existingIndex = student.studentProfile.physicalAttendance.findIndex(a => a.date === session.date);
            if (existingIndex > -1) {
                student.studentProfile.physicalAttendance[existingIndex].status = 'Present';
            } else {
                student.studentProfile.physicalAttendance.push({ date: session.date, status: 'Present' });
            }
            await student.save();
            
            return res.status(200).json({ message: "Check-in successful!", record });
        } else {
            // Check-out
            if (!record) {
                return res.status(400).json({ message: "You need to check in before checking out" });
            }
            
            if (record.checkOutTime) {
                return res.status(400).json({ message: "You have already checked out for this class" });
            }
            
            record.checkOutTime = new Date();
            record.checkOutPhoto = relativePhotoPath;
            record.status = 'Present';
            await record.save();
            
            return res.status(200).json({ message: "Check-out successful!", record });
        }
    } catch (error) {
        console.error("Error marking attendance:", error);
        res.status(500).json({ message: "Failed to mark attendance" });
    }
};

// 6. Manual Attendance Mark (Teacher only fallback)
exports.manualMark = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { studentId, status } = req.body; // status: 'Present', 'Absent', 'In'
        
        if (!studentId || !status) {
            return res.status(400).json({ message: "Please provide studentId and status" });
        }
        
        if (!['Present', 'Absent', 'In'].includes(status)) {
            return res.status(400).json({ message: "Status must be 'Present', 'Absent', or 'In'" });
        }
        
        const session = await AttendanceSession.findById(sessionId);
        if (!session) {
            return res.status(404).json({ message: "Attendance session not found" });
        }
        
        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        let record = await Attendance.findOne({ session: sessionId, student: studentId });
        
        if (!record) {
            record = new Attendance({
                session: sessionId,
                student: studentId,
                date: session.date
            });
        }
        
        record.status = status;
        record.isManual = true;
        
        if (status === 'Present') {
            record.checkInTime = record.checkInTime || new Date();
            record.checkOutTime = record.checkOutTime || new Date();
        } else if (status === 'In') {
            record.checkInTime = record.checkInTime || new Date();
            record.checkOutTime = undefined;
        } else {
            // Absent
            record.checkInTime = undefined;
            record.checkOutTime = undefined;
        }
        
        await record.save();
        
        // Sync to User Model
        const userStatus = (status === 'Present' || status === 'In') ? 'Present' : 'Absent';
        const existingIndex = student.studentProfile.physicalAttendance.findIndex(a => a.date === session.date);
        if (existingIndex > -1) {
            student.studentProfile.physicalAttendance[existingIndex].status = userStatus;
        } else {
            student.studentProfile.physicalAttendance.push({ date: session.date, status: userStatus });
        }
        await student.save();
        
        res.json({ message: "Attendance updated manually", record });
    } catch (error) {
        console.error("Error manually marking attendance:", error);
        res.status(500).json({ message: "Failed to update attendance manually" });
    }
};

// 7. Get all records of students for a session (Teacher view)
exports.getSessionRecords = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await AttendanceSession.findById(sessionId);
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }
        
        // Find all students in this section
        const students = await User.find({
            role: 'Student',
            'studentProfile.section': session.section
        }).select('name email avatar studentProfile');
        
        // Find all attendance records for this session
        const records = await Attendance.find({ session: sessionId });
        
        // Merge students and attendance records
        const list = students.map(student => {
            const record = records.find(r => r.student.toString() === student._id.toString());
            return {
                student: {
                    _id: student._id,
                    name: student.name,
                    email: student.email,
                    avatar: student.avatar,
                    course: student.studentProfile?.course,
                    subject: student.studentProfile?.subject
                },
                record: record || { status: 'Absent', date: session.date }
            };
        });
        
        res.json({
            session,
            records: list
        });
    } catch (error) {
        console.error("Error fetching session records:", error);
        res.status(500).json({ message: "Failed to fetch session records" });
    }
};
