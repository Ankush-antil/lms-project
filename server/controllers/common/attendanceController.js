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

// Helper to calculate Haversine distance in meters
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Radius of the Earth in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in meters
};

// 1. Create a new Attendance QR Session (Teacher only)
exports.createSession = async (req, res) => {
    try {

        const teacherId = req.user._id;
        const teacher = await User.findById(teacherId);
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        const { courseId, subject, section, duration, type, locationRequired, latitude, longitude } = req.body;
        
        // Auto-determine Section:
        // "agar teacher k pass 2 scetion hai to vo qr code dono section k liy hai agar ek hai to ek liya liya ho"
        let finalSection = section || 'ALL';
        if (!section && teacher.teacherProfile?.assignedSections && teacher.teacherProfile.assignedSections.length > 0) {
            if (teacher.teacherProfile.assignedSections.length === 1) {
                finalSection = teacher.teacherProfile.assignedSections[0];
            } else {
                finalSection = 'ALL';
            }
        }

        // Auto-determine Course:
        let finalCourseId = courseId || null;
        if (!finalCourseId && teacher.teacherProfile?.assignedCourses && teacher.teacherProfile.assignedCourses.length > 0) {
            finalCourseId = teacher.teacherProfile.assignedCourses[0];
        }

        // Auto-determine Subject:
        let finalSubject = 'Daily Attendance';

        // Auto-determine Duration (Indefinite: default to 1 year)
        let finalDuration = duration ? parseInt(duration) : 525600;

        const date = new Date().toISOString().split('T')[0];
        
        // Allow multiple active sessions (e.g., Mark In and Mark Out simultaneously)
        
        const qrToken = crypto.randomUUID();
        const startTime = new Date();
        const endTime = new Date(Date.now() + finalDuration * 60000);
        
        const session = await AttendanceSession.create({
            teacher: teacherId,
            course: finalCourseId,
            subject: finalSubject,
            section: finalSection,
            date,
            startTime,
            endTime,
            duration: finalDuration,
            qrToken,
            isActive: true,
            wifiSSID: req.body.wifiSSID || null,
            wifiIP: req.ip || null,
            type: type || 'in',
            locationRequired: !!locationRequired,
            latitude: latitude || null,
            longitude: longitude || null
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
        
        // Expiration check removed (QR codes stay active indefinitely until manually closed)
        
        // Validate section immediately when student scans QR code
        const student = await User.findById(req.user._id);
        if (student && student.studentProfile?.section && session.section && session.section.toUpperCase() !== 'ALL' && student.studentProfile.section !== session.section) {
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
        
        // Validate location proximity (if teacher recorded their location)
        if (session.latitude && session.longitude) {
            const studentLat = parseFloat(req.query.latitude);
            const studentLon = parseFloat(req.query.longitude);
            if (!studentLat || !studentLon) {
                return res.status(400).json({
                    message: "Location access is required to verify if you are in the classroom."
                });
            }
            const distance = getDistanceInMeters(session.latitude, session.longitude, studentLat, studentLon);
            if (distance > 150) { // 150 meters
                return res.status(400).json({
                    message: `You are too far from the classroom (${Math.round(distance)} meters away). Proximity verification failed.`
                });
            }
        }
        
        // Also check if student is checked in today
        const record = await Attendance.findOne({ student: req.user._id, date: session.date });
        const checkStatus = record ? (record.checkOutTime ? 'completed' : 'checked-in') : 'not-started';
        
        res.json({
            session,
            checkStatus
        });
    } catch (error) {
        console.error("Error verifying QR code:", error);
        res.status(500).json({ message: "Failed to verify QR code" });
    }
};

// 3. Mark Attendance (Check-in/Check-out)
exports.markAttendance = async (req, res) => {
    try {
        const { qrToken, photo, latitude, longitude } = req.body;
        
        if (!qrToken || !photo) {
            return res.status(400).json({ message: "Please provide QR token and photo" });
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
        
        // Expiration check removed (QR codes stay active indefinitely until manually closed)
        
        // Validate section
        if (student.studentProfile?.section && session.section && session.section.toUpperCase() !== 'ALL' && student.studentProfile.section !== session.section) {
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

        // Validate Location (Geofencing check)
        if (session.locationRequired && session.latitude && session.longitude) {
            if (latitude === undefined || longitude === undefined) {
                return res.status(400).json({
                    message: "Location access is required to mark attendance. Please enable GPS."
                });
            }
            
            const getDistance = (lat1, lon1, lat2, lon2) => {
                const R = 6371000; // Earth radius in meters
                const phi1 = lat1 * Math.PI / 180;
                const phi2 = lat2 * Math.PI / 180;
                const deltaPhi = (lat2 - lat1) * Math.PI / 180;
                const deltaLambda = (lon2 - lon1) * Math.PI / 180;

                const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                          Math.cos(phi1) * Math.cos(phi2) *
                          Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

                return R * c; // in meters
            };

            const distance = getDistance(session.latitude, session.longitude, latitude, longitude);
            
            // Limit distance to 150 meters (classroom range)
            if (distance > 150) {
                return res.status(400).json({
                    message: `Location check failed: You are not in the classroom. (Distance: ${Math.round(distance)}m)`
                });
            }
        }

        let record = await Attendance.findOne({ student: studentId, date: session.date });
        
        // Determine action based on existing record
        const actionType = record ? (record.checkOutTime ? 'completed' : 'out') : 'in';

        if (actionType === 'completed') {
            return res.status(400).json({ message: "You have already completed your attendance for today" });
        }
        
        const attendanceFolder = path.join(__dirname, '../../uploads/attendance', session._id.toString());
        const fileName = `${studentId}_${actionType}.jpg`;
        const relativePhotoPath = saveBase64Image(photo, attendanceFolder, fileName);
        
        if (actionType === 'in') {
            record = await Attendance.create({
                session: session._id,
                student: studentId,
                date: session.date,
                checkInTime: new Date(),
                checkInPhoto: relativePhotoPath,
                status: 'In'
            });
            
            // Sync to User's physicalAttendance array
            const existingIndex = student.studentProfile.physicalAttendance.findIndex(a => a.date === session.date);
            if (existingIndex > -1) {
                student.studentProfile.physicalAttendance[existingIndex].status = 'Present';
                student.studentProfile.physicalAttendance[existingIndex].source = 'qr';
            } else {
                student.studentProfile.physicalAttendance.push({ date: session.date, status: 'Present', source: 'qr' });
            }
            student.markModified('studentProfile.physicalAttendance');
            await student.save();
            
            return res.status(200).json({ message: "Check-in successful! Your class time has started.", record });
        } else if (actionType === 'out') {
            // Check-out
            record.checkOutTime = new Date();
            record.checkOutPhoto = relativePhotoPath;
            record.status = 'Present';
            record.session = session._id; // Link to the current check-out session
            await record.save();
            
            return res.status(200).json({ message: "Check-out successful! Your class time has stopped.", record });
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
            student.studentProfile.physicalAttendance[existingIndex].source = 'qr';
        } else {
            student.studentProfile.physicalAttendance.push({ date: session.date, status: userStatus, source: 'qr' });
        }
        student.markModified('studentProfile.physicalAttendance');
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
        
        // Find all students in this section or all teacher's students if section is 'ALL'
        let studentQuery = { role: 'Student' };
        if (session.course) {
            studentQuery['studentProfile.course'] = session.course;
        }

        if (session.section && session.section.toUpperCase() !== 'ALL') {
            studentQuery['studentProfile.section'] = session.section;
        } else {
            const teacher = await User.findById(session.teacher);
            if (teacher) {
                const assignedCourses = teacher.teacherProfile?.assignedCourses || [];
                const courseIds = assignedCourses.map(c => c._id || c);
                if (courseIds.length > 0) {
                    studentQuery['studentProfile.course'] = { $in: courseIds };
                }
                const mode = teacher.teacherProfile?.studentAssignmentMode || 'all';
                const assignedSections = teacher.teacherProfile?.assignedSections || [];
                const assignedStudents = teacher.teacherProfile?.assignedStudents || [];
                
                if (mode === 'section' && assignedSections.length > 0) {
                    studentQuery['studentProfile.section'] = { $in: assignedSections };
                } else if (mode === 'selected' && assignedStudents.length > 0) {
                    studentQuery['_id'] = { $in: assignedStudents };
                }
            }
        }

        const students = await User.find(studentQuery).select('name email avatar studentProfile');
        
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

exports.getMyAttendanceRecords = async (req, res) => {
    try {
        let studentId = req.user._id;
        if (req.user.role === 'Parent' && req.user.parentProfile?.student) {
            studentId = req.user.parentProfile.student;
        } else if (req.query.studentId && (req.user.role === 'Admin' || req.user.role === 'Institute')) {
            studentId = req.query.studentId;
        }

        // 1. Get student profile physical attendance
        const student = await User.findById(studentId).select('studentProfile');
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        const physicalRecords = student.studentProfile?.physicalAttendance || [];

        // 2. Get QR attendance records
        const qrRecords = await Attendance.find({ student: studentId })
            .populate({
                path: 'session',
                populate: { path: 'teacher', select: 'name' }
            })
            .sort({ date: -1 });

        // 3. Merge date-keyed map
        const dateMap = {};
        physicalRecords.forEach(rec => {
            dateMap[rec.date] = {
                date: rec.date,
                status: rec.status,
                source: rec.source || 'manual',
                teacherNote: rec.teacherNote || '',
                leaveNote: rec.leaveNote || '',
                leaveFile: rec.leaveFile || '',
                leaveStatus: rec.leaveStatus || 'Pending',
                sessionSubject: 'Class Room',
                teacherName: 'Instructor'
            };
        });

        qrRecords.forEach(qr => {
            const d = qr.date;
            if (!dateMap[d]) {
                dateMap[d] = {
                    date: d,
                    status: qr.status === 'In' ? 'Present' : qr.status,
                    source: 'qr',
                    teacherNote: qr.teacherNote || '',
                    leaveNote: '',
                    leaveFile: '',
                    leaveStatus: 'Approved'
                };
            }
            dateMap[d].checkInTime = qr.checkInTime;
            dateMap[d].checkInPhoto = qr.checkInPhoto;
            dateMap[d].checkOutTime = qr.checkOutTime;
            dateMap[d].checkOutPhoto = qr.checkOutPhoto;
            if (qr.session) {
                dateMap[d].sessionSubject = qr.session.subject;
                if (qr.session.teacher) {
                    dateMap[d].teacherName = qr.session.teacher.name;
                }
            }
        });

        // 4. Format to match mobile screen schema expectations
        const historyList = Object.values(dateMap).map(rec => ({
            _id: rec.date,
            date: rec.date,
            status: rec.status,
            source: rec.source,
            checkInTime: rec.checkInTime,
            checkInPhoto: rec.checkInPhoto,
            checkOutTime: rec.checkOutTime,
            checkOutPhoto: rec.checkOutPhoto,
            teacherNote: rec.teacherNote,
            leaveNote: rec.leaveNote,
            leaveStatus: rec.leaveStatus,
            session: {
                subject: rec.sessionSubject || 'Lecture',
                teacher: {
                    name: rec.teacherName || 'Instructor'
                }
            }
        })).sort((a, b) => b.date.localeCompare(a.date));

        res.json(historyList);
    } catch (error) {
        console.error("Error fetching student attendance:", error);
        res.status(500).json({ message: "Failed to fetch attendance history" });
    }
};

// 9. Get combined attendance history for a student (Teacher view) — physical + QR sessions
exports.getStudentAttendanceHistory = async (req, res) => {
    try {
        const { studentId } = req.params;
        
        // Load student's physical attendance array
        const student = await User.findById(studentId).select('name email avatar studentProfile');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        const physicalRecords = student.studentProfile?.physicalAttendance || [];
        
        // Load QR session records for this student
        const qrRecords = await Attendance.find({ student: studentId })
            .populate({
                path: 'session',
                populate: { path: 'teacher', select: 'name' }
            })
            .sort({ date: -1 });
        
        // Build a date-keyed map from physical records
        const dateMap = {};
        physicalRecords.forEach(rec => {
            dateMap[rec.date] = {
                date: rec.date,
                status: rec.status,
                source: rec.source || 'manual',
                teacherNote: rec.teacherNote || '',
                leaveNote: rec.leaveNote || '',
                leaveFile: rec.leaveFile || '',
                leaveStatus: rec.leaveStatus || 'Pending'
            };
        });
        
        // Merge QR records (add additional info like check-in photo)
        qrRecords.forEach(qr => {
            const d = qr.date;
            if (!dateMap[d]) {
                dateMap[d] = {
                    date: d,
                    status: qr.status === 'In' ? 'Present' : qr.status,
                    source: 'qr',
                    teacherNote: qr.teacherNote || '',
                    leaveNote: '',
                    leaveFile: ''
                };
            }
            // Attach QR-specific fields
            dateMap[d].checkInTime = qr.checkInTime;
            dateMap[d].checkInPhoto = qr.checkInPhoto;
            dateMap[d].checkOutTime = qr.checkOutTime;
            dateMap[d].checkOutPhoto = qr.checkOutPhoto;
            dateMap[d].isManual = qr.isManual;
            dateMap[d].qrSessionId = qr.session?._id;
            dateMap[d].sessionSubject = qr.session?.subject;
        });
        
        // Sort by date descending
        const history = Object.values(dateMap).sort((a, b) => b.date.localeCompare(a.date));
        
        res.json({
            student: {
                _id: student._id,
                name: student.name,
                email: student.email,
                avatar: student.avatar,
                section: student.studentProfile?.section,
                course: student.studentProfile?.course
            },
            history
        });
    } catch (error) {
        console.error('Error fetching student attendance history:', error);
        res.status(500).json({ message: 'Failed to fetch attendance history' });
    }
};

// 10. Delete a student's physical attendance for a specific date (Teacher only)
exports.deletePhysicalAttendance = async (req, res) => {
    try {
        const { studentId, date } = req.params;
        
        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        // Delete QR session records from Attendance collection
        const qrDelResult = await Attendance.deleteMany({ student: studentId, date: date });
        
        const beforeLen = student.studentProfile?.physicalAttendance?.length || 0;
        student.studentProfile.physicalAttendance = (
            student.studentProfile.physicalAttendance || []
        ).filter(a => a.date !== date);
        
        const arrayChanged = student.studentProfile.physicalAttendance.length !== beforeLen;
        
        if (qrDelResult.deletedCount === 0 && !arrayChanged) {
            return res.status(404).json({ message: 'No attendance record found for this date' });
        }
        
        if (arrayChanged) {
            student.markModified('studentProfile.physicalAttendance');
            await student.save();
        }
        
        res.json({ success: true, message: `Attendance deleted for ${date}` });
    } catch (error) {
        console.error('Error deleting physical attendance:', error);
        res.status(500).json({ message: 'Failed to delete attendance record' });
    }
};

// 11. Student submits leave application (note + optional PDF/image)
exports.submitLeaveApplication = async (req, res) => {
    try {
        const studentId = req.user._id;
        const { date, leaveNote } = req.body;

        if (!date) {
            return res.status(400).json({ message: 'Date is required for leave application' });
        }

        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'User not found' });
        }

        let leaveFileUrl = '';
        if (req.file) {
            leaveFileUrl = `/uploads/leave-applications/${req.file.filename}`;
        }

        if (student.role === 'Staff') {
            if (!student.staffProfile) student.staffProfile = {};
            if (!student.staffProfile.physicalAttendance) student.staffProfile.physicalAttendance = [];

            const existingIndex = student.staffProfile.physicalAttendance.findIndex(a => a.date === date);
            if (existingIndex > -1) {
                student.staffProfile.physicalAttendance[existingIndex].status = 'Leave';
                student.staffProfile.physicalAttendance[existingIndex].leaveStatus = 'Pending';
                student.staffProfile.physicalAttendance[existingIndex].leaveNote = leaveNote || '';
                if (leaveFileUrl) {
                    student.staffProfile.physicalAttendance[existingIndex].leaveFile = leaveFileUrl;
                }
            } else {
                student.staffProfile.physicalAttendance.push({
                    date,
                    status: 'Leave',
                    leaveStatus: 'Pending',
                    leaveNote: leaveNote || '',
                    leaveFile: leaveFileUrl,
                    source: 'manual'
                });
            }
            student.markModified('staffProfile.physicalAttendance');
        } else {
            if (!student.studentProfile) student.studentProfile = {};
            if (!student.studentProfile.physicalAttendance) student.studentProfile.physicalAttendance = [];

            const existingIndex = student.studentProfile.physicalAttendance.findIndex(a => a.date === date);
            if (existingIndex > -1) {
                student.studentProfile.physicalAttendance[existingIndex].status = 'Leave';
                student.studentProfile.physicalAttendance[existingIndex].leaveStatus = 'Pending';
                student.studentProfile.physicalAttendance[existingIndex].leaveNote = leaveNote || '';
                if (leaveFileUrl) {
                    student.studentProfile.physicalAttendance[existingIndex].leaveFile = leaveFileUrl;
                }
            } else {
                student.studentProfile.physicalAttendance.push({
                    date,
                    status: 'Leave',
                    leaveStatus: 'Pending',
                    leaveNote: leaveNote || '',
                    leaveFile: leaveFileUrl,
                    source: 'manual'
                });
            }
            student.markModified('studentProfile.physicalAttendance');
        }

        await student.save();
        res.json({ success: true, message: 'Leave application submitted successfully' });
    } catch (error) {
        console.error('Error submitting leave application:', error);
        res.status(500).json({ message: 'Failed to submit leave application' });
    }
};

// 12. Approve or Reject student leave application (Teacher only)
exports.approveOrRejectLeave = async (req, res) => {
    try {
        const { studentId, date } = req.params;
        const { approved } = req.body; // Boolean: true -> Approve, false -> Reject

        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        if (!student.studentProfile) student.studentProfile = {};
        if (!student.studentProfile.physicalAttendance) student.studentProfile.physicalAttendance = [];

        const index = student.studentProfile.physicalAttendance.findIndex(a => a.date === date);
        if (index === -1) {
            return res.status(404).json({ message: 'No attendance record found for this date' });
        }

        if (approved) {
            student.studentProfile.physicalAttendance[index].status = 'Leave';
            student.studentProfile.physicalAttendance[index].leaveStatus = 'Approved';
        } else {
            student.studentProfile.physicalAttendance[index].status = 'Absent';
            student.studentProfile.physicalAttendance[index].leaveStatus = 'Rejected';
        }

        student.markModified('studentProfile.physicalAttendance');
        await student.save();

        res.json({
            success: true,
            message: `Leave application ${approved ? 'approved' : 'rejected'} for ${date}`,
            status: student.studentProfile.physicalAttendance[index].status,
            leaveStatus: student.studentProfile.physicalAttendance[index].leaveStatus
        });
    } catch (error) {
        console.error('Error approving/rejecting leave:', error);
        res.status(500).json({ message: 'Failed to update leave application status' });
    }
};
// 13. Get Auto QR Config
exports.getAutoConfig = async (req, res) => {
    try {
        const teacher = await User.findById(req.user._id).populate('teacherProfile.autoQRConfig.course', 'name code');
        if (!teacher || teacher.role !== 'Teacher') {
            return res.status(403).json({ message: 'Not authorized as teacher' });
        }
        res.json(teacher.teacherProfile.autoQRConfig || {});
    } catch (error) {
        console.error('Error fetching auto QR config:', error);
        res.status(500).json({ message: 'Failed to fetch auto QR config' });
    }
};

// 14. Save Auto QR Config
exports.saveAutoConfig = async (req, res) => {
    try {
        const teacher = await User.findById(req.user._id);
        if (!teacher || teacher.role !== 'Teacher') {
            return res.status(403).json({ message: 'Not authorized as teacher' });
        }
        
        if (!teacher.teacherProfile) teacher.teacherProfile = {};
        
        teacher.teacherProfile.autoQRConfig = {
            ...teacher.teacherProfile.autoQRConfig,
            ...req.body
        };
        
        await teacher.save();
        res.json({ success: true, message: 'Auto QR Schedule saved successfully', config: teacher.teacherProfile.autoQRConfig });
    } catch (error) {
        console.error('Error saving auto QR config:', error);
        res.status(500).json({ message: 'Failed to save auto QR config' });
    }
};

// 15. Get attendance history for a teacher (Admin/Institute view)
exports.getTeacherAttendanceHistory = async (req, res) => {
    try {
        const { teacherId } = req.params;
        
        const teacher = await User.findById(teacherId).select('name email avatar role allowedRoles teacherProfile');
        if (!teacher || (teacher.role !== 'Teacher' && !teacher.allowedRoles?.includes('Teacher'))) {
            return res.status(404).json({ message: 'Teacher not found' });
        }
        
        const physicalRecords = teacher.teacherProfile?.physicalAttendance || [];
        
        const history = physicalRecords.map(rec => ({
            _id: rec.date,
            date: rec.date,
            status: rec.status,
            source: rec.source || 'manual',
            teacherNote: rec.teacherNote || '',
            session: {
                subject: 'Duty / Class',
                teacher: { name: teacher.name }
            }
        })).sort((a, b) => b.date.localeCompare(a.date));
        
        res.json({
            teacher: {
                _id: teacher._id,
                name: teacher.name,
                email: teacher.email,
                avatar: teacher.avatar
            },
            history
        });
    } catch (error) {
        console.error('Error fetching teacher attendance history:', error);
        res.status(500).json({ message: 'Failed to fetch attendance history' });
    }
};

// 16. Delete a teacher's physical attendance for a specific date (Admin/Institute only)
exports.deleteTeacherPhysicalAttendance = async (req, res) => {
    try {
        const { teacherId, date } = req.params;
        
        const teacher = await User.findById(teacherId);
        if (!teacher || (teacher.role !== 'Teacher' && !teacher.allowedRoles?.includes('Teacher'))) {
            return res.status(404).json({ message: 'Teacher not found' });
        }
        
        const beforeLen = teacher.teacherProfile?.physicalAttendance?.length || 0;
        teacher.teacherProfile.physicalAttendance = (
            teacher.teacherProfile.physicalAttendance || []
        ).filter(a => a.date !== date);
        
        const arrayChanged = teacher.teacherProfile.physicalAttendance.length !== beforeLen;
        
        if (!arrayChanged) {
            return res.status(404).json({ message: 'No attendance record found for this date' });
        }
        
        teacher.markModified('teacherProfile.physicalAttendance');
        await teacher.save();
        
        res.json({ success: true, message: `Attendance deleted for ${date}` });
    } catch (error) {
        console.error('Error deleting teacher physical attendance:', error);
        res.status(500).json({ message: 'Failed to delete attendance record' });
    }
};

// 17. Get attendance history for a staff member (Institute/Admin view)
exports.getStaffAttendanceHistory = async (req, res) => {
    try {
        const { staffId } = req.params;
        
        const staff = await User.findById(staffId).select('name email avatar role staffProfile');
        if (!staff || staff.role !== 'Staff') {
            return res.status(404).json({ message: 'Staff member not found' });
        }
        
        const physicalRecords = staff.staffProfile?.physicalAttendance || [];
        
        const history = physicalRecords.map(rec => ({
            _id: rec.date,
            date: rec.date,
            status: rec.status,
            source: rec.source || 'manual',
            teacherNote: rec.teacherNote || '',
            leaveNote: rec.leaveNote || '',
            leaveFile: rec.leaveFile || '',
            leaveStatus: rec.leaveStatus || 'Pending',
            checkInTime: rec.checkInTime || '',
            checkOutTime: rec.checkOutTime || '',
            markedBy: rec.markedBy || '',
            session: {
                subject: 'Duty / Office',
                teacher: { name: staff.name }
            }
        })).sort((a, b) => b.date.localeCompare(a.date));
        
        res.json({
            staff: {
                _id: staff._id,
                name: staff.name,
                email: staff.email,
                avatar: staff.avatar,
                designation: staff.staffProfile?.designation,
                department: staff.staffProfile?.department
            },
            history
        });
    } catch (error) {
        console.error('Error fetching staff attendance history:', error);
        res.status(500).json({ message: 'Failed to fetch attendance history' });
    }
};

// 18. Delete a staff's physical attendance for a specific date (Institute/Admin only)
exports.deleteStaffPhysicalAttendance = async (req, res) => {
    try {
        const { staffId, date } = req.params;
        
        const staff = await User.findById(staffId);
        if (!staff || staff.role !== 'Staff') {
            return res.status(404).json({ message: 'Staff member not found' });
        }
        
        const beforeLen = staff.staffProfile?.physicalAttendance?.length || 0;
        staff.staffProfile.physicalAttendance = (
            staff.staffProfile.physicalAttendance || []
        ).filter(a => a.date !== date);
        
        const arrayChanged = staff.staffProfile.physicalAttendance.length !== beforeLen;
        
        if (!arrayChanged) {
            return res.status(404).json({ message: 'No attendance record found for this date' });
        }
        
        staff.markModified('staffProfile.physicalAttendance');
        await staff.save();
        
        res.json({ success: true, message: `Attendance deleted for ${date}` });
    } catch (error) {
        console.error('Error deleting staff physical attendance:', error);
        res.status(500).json({ message: 'Failed to delete attendance record' });
    }
};

// 19. Approve or Reject staff leave application (Institute/Admin only)
exports.approveOrRejectStaffLeave = async (req, res) => {
    try {
        const { staffId, date } = req.params;
        const { approved } = req.body; // Boolean: true -> Approve, false -> Reject

        const staff = await User.findById(staffId);
        if (!staff || staff.role !== 'Staff') {
            return res.status(404).json({ message: 'Staff member not found' });
        }

        if (!staff.staffProfile) staff.staffProfile = {};
        if (!staff.staffProfile.physicalAttendance) staff.staffProfile.physicalAttendance = [];

        const index = staff.staffProfile.physicalAttendance.findIndex(a => a.date === date);
        if (index === -1) {
            return res.status(404).json({ message: 'No attendance record found for this date' });
        }

        if (approved) {
            staff.staffProfile.physicalAttendance[index].status = 'Leave';
            staff.staffProfile.physicalAttendance[index].leaveStatus = 'Approved';
        } else {
            staff.staffProfile.physicalAttendance[index].status = 'Absent';
            staff.staffProfile.physicalAttendance[index].leaveStatus = 'Rejected';
        }

        staff.markModified('staffProfile.physicalAttendance');
        await staff.save();

        res.json({
            success: true,
            message: `Leave application ${approved ? 'approved' : 'rejected'} for ${date}`,
            status: staff.staffProfile.physicalAttendance[index].status,
            leaveStatus: staff.staffProfile.physicalAttendance[index].leaveStatus
        });
    } catch (error) {
        console.error('Error approving/rejecting staff leave:', error);
        res.status(500).json({ message: 'Failed to update leave application status' });
    }
};
