const asyncHandler = require('express-async-handler');
const User = require('../../models/User');
const Activity = require('../../models/Activity');
const Course = require('../../models/Course');
const StudentInboxConfig = require('../../models/StudentInboxConfig');
const StudentActivityConfig = require('../../models/StudentActivityConfig');

// @desc    Get all users (filtered by role)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
    const role = req.query.role;
    const query = role ? { role } : {};

    // Isolate by institute for Institute and Editor roles
    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor')) {
        query.institute = req.user.institute;
    }

    console.log(`[API] Fetching users with query:`, query);

    const users = await User.find(query)
        .select('-password')
        .populate('institute', 'name')
        .populate('studentProfile.course', 'name subjects')
        .populate('teacherProfile.assignedCourses', 'name');

    console.log(`[API] Found ${users.length} users for role: ${role || 'All'}`);
    res.json(users);
});

// @desc    Create User (Admin / Institute)
// @route   POST /api/users
// @access  Private/Admin or Institute
const createUser = asyncHandler(async (req, res) => {
    const { name, email, password, role, course, subjects, subject, mobileNumber, batch, callEnabled } = req.body;
    let institute = req.body.institute;

    // Enforce creator's institute for Institute and Editor users
    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor')) {
        institute = req.user.institute;
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const userFields = {
        name,
        email,
        password, // Middleware will hash this
        role,
        institute,
        mobileNumber: mobileNumber || '',
        callEnabled: callEnabled !== undefined ? callEnabled : false
    };

    if (role === 'Student') {
        userFields.studentProfile = {
            course,
            subject: subject || '',
            batch: batch || '',
            enrollmentDate: new Date()
        };
    } else if (role === 'Teacher') {
        userFields.teacherProfile = {
            assignedCourses: course ? [course] : [],
            subjects: subjects ? (Array.isArray(subjects) ? subjects : subjects.split(',').map(s => s.trim())) : []
        };
    }

    const user = await User.create(userFields);

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        });

        // Log Activity
        let activityDetail = `${user.name} joined the system`;
        if (role === 'Student' && course) {
            const courseDoc = await Course.findById(course);
            if (courseDoc) activityDetail = `${user.name} joined ${courseDoc.name}`;
        } else if (role === 'Teacher' && subjects) {
            activityDetail = `${user.name} assigned to ${Array.isArray(subjects) ? subjects.join(', ') : subjects}`;
        }

        await Activity.create({
            type: 'USER_CREATED',
            message: `New ${user.role} registered`,
            detail: activityDetail,
            user: user._id
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
        // Enforce institute isolation for Institute and Editor roles
        if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor') && user.institute?.toString() !== req.user.institute?.toString()) {
            res.status(403);
            throw new Error('Not authorized to delete users belonging to other institutes');
        }

        await user.deleteOne();
        res.json({ message: 'User removed' });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin or Institute
const updateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
        // Enforce institute isolation for Institute and Editor roles
        if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor') && user.institute?.toString() !== req.user.institute?.toString()) {
            res.status(403);
            throw new Error('Not authorized to update users belonging to other institutes');
        }

        user.name = req.body.name !== undefined ? req.body.name : user.name;
        user.email = req.body.email !== undefined ? req.body.email : user.email;
        user.avatar = req.body.avatar !== undefined ? req.body.avatar : user.avatar;

        // Prevent Institute/Editor users from changing user's institute
        if (req.user.role !== 'Institute' && req.user.role !== 'Editor') {
            user.institute = req.body.institute !== undefined ? req.body.institute : user.institute;
        }

        user.mobileNumber = req.body.mobileNumber !== undefined ? req.body.mobileNumber : user.mobileNumber;
        user.callEnabled = req.body.callEnabled !== undefined ? req.body.callEnabled : user.callEnabled;
        user.isActive = req.body.isActive !== undefined ? req.body.isActive : user.isActive;

        if (req.body.password && req.body.password.trim() !== '') {
            user.password = req.body.password;
        }

        if (user.role === 'Student') {
            user.studentProfile = {
                ...user.studentProfile,
                course: req.body.course || user.studentProfile?.course,
                subject: req.body.subject !== undefined ? req.body.subject : user.studentProfile?.subject,
                batch: req.body.batch !== undefined ? req.body.batch : user.studentProfile?.batch
            };
        } else if (user.role === 'Teacher') {
            user.teacherProfile = {
                ...user.teacherProfile,
                assignedCourses: req.body.course ? [req.body.course] : user.teacherProfile?.assignedCourses,
                subjects: req.body.subjects ? (Array.isArray(req.body.subjects) ? req.body.subjects : req.body.subjects.split(',').map(s => s.trim())) : user.teacherProfile?.subjects
            };
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Mark physical attendance for a student
// @route   POST /api/users/:id/physical-attendance
// @access  Private/Admin, Editor, Institute, Teacher
const markPhysicalAttendance = asyncHandler(async (req, res) => {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'Student') {
        res.status(404);
        throw new Error('Student not found');
    }

    // Verify authorized access
    if (req.user.role === 'Teacher') {
        // Teacher must teach in student's course
        const teacher = await User.findById(req.user._id);
        const courseId = student.studentProfile?.course;
        const teachesCourse = teacher.teacherProfile?.assignedCourses?.some(c => c.toString() === courseId?.toString());
        if (!teachesCourse) {
            res.status(403);
            throw new Error('Not authorized to mark attendance for this student');
        }
    } else if (req.user.role === 'Institute' || req.user.role === 'Editor') {
        if (student.institute?.toString() !== req.user.institute?.toString()) {
            res.status(403);
            throw new Error('Not authorized to mark attendance for this student');
        }
    }

    const { date, status } = req.body; // e.g. date: "2026-06-30", status: "Present" / "Absent"
    if (!date || !status) {
        res.status(400);
        throw new Error('Please provide both date and status');
    }

    if (!student.studentProfile) {
        student.studentProfile = {};
    }
    if (!student.studentProfile.physicalAttendance) {
        student.studentProfile.physicalAttendance = [];
    }

    // Check if attendance already exists for this date
    const existingIndex = student.studentProfile.physicalAttendance.findIndex(a => a.date === date);
    if (existingIndex !== -1) {
        student.studentProfile.physicalAttendance[existingIndex].status = status;
    } else {
        student.studentProfile.physicalAttendance.push({ date, status });
    }

    await student.save();
    res.json({ success: true, physicalAttendance: student.studentProfile.physicalAttendance });
});

// @desc    Update student fee status
// @route   PUT /api/users/:id/fee-status
// @access  Private/Admin, Editor, Institute, Teacher
const updateFeeStatus = asyncHandler(async (req, res) => {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'Student') {
        res.status(404);
        throw new Error('Student not found');
    }

    // Verify authorized access
    if (req.user.role === 'Teacher') {
        const teacher = await User.findById(req.user._id);
        const courseId = student.studentProfile?.course;
        const teachesCourse = teacher.teacherProfile?.assignedCourses?.some(c => c.toString() === courseId?.toString());
        if (!teachesCourse) {
            res.status(403);
            throw new Error('Not authorized to manage fees for this student');
        }
    } else if (req.user.role === 'Institute' || req.user.role === 'Editor') {
        if (student.institute?.toString() !== req.user.institute?.toString()) {
            res.status(403);
            throw new Error('Not authorized to manage fees for this student');
        }
    }

    const { feeStatus } = req.body; // 'Paid' or 'Pending'
    if (!feeStatus || !['Paid', 'Pending'].includes(feeStatus)) {
        res.status(400);
        throw new Error('Invalid feeStatus');
    }

    if (!student.studentProfile) {
        student.studentProfile = {};
    }
    student.studentProfile.feeStatus = feeStatus;

    await student.save();
    res.json({ success: true, feeStatus: student.studentProfile.feeStatus });
});

// @desc    Mark bulk physical attendance for students
// @route   POST /api/users/bulk-physical-attendance
// @access  Private/Admin, Editor, Institute, Teacher
const markBulkPhysicalAttendance = asyncHandler(async (req, res) => {
    const { date, attendanceRecords } = req.body;
    // attendanceRecords format: [{ studentId: "id", status: "Present"|"Absent" }]
    if (!date || !attendanceRecords || !Array.isArray(attendanceRecords)) {
        res.status(400);
        throw new Error('Please provide date and attendanceRecords array');
    }

    try {
        for (const record of attendanceRecords) {
            const { studentId, status } = record;
            if (!studentId || !status) continue;

            const student = await User.findById(studentId);
            if (!student || student.role !== 'Student') continue;

            // Verify authority
            if (req.user.role === 'Institute' || req.user.role === 'Editor') {
                if (student.institute?.toString() !== req.user.institute?.toString()) continue;
            } else if (req.user.role === 'Teacher') {
                // Check course assignment matching
                const teacher = await User.findById(req.user._id);
                const courseId = student.studentProfile?.course;
                const teachesCourse = teacher.teacherProfile?.assignedCourses?.some(c => c.toString() === courseId?.toString());
                if (!teachesCourse) continue;
            }

            if (!student.studentProfile) {
                student.studentProfile = {};
            }
            if (!student.studentProfile.physicalAttendance) {
                student.studentProfile.physicalAttendance = [];
            }

            const existingIndex = student.studentProfile.physicalAttendance.findIndex(a => a.date === date);
            if (existingIndex !== -1) {
                student.studentProfile.physicalAttendance[existingIndex].status = status;
            } else {
                student.studentProfile.physicalAttendance.push({ date, status });
            }

            await student.save();
        }

        res.json({ success: true, message: 'Bulk attendance recorded successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

const getInboxConfigs = asyncHandler(async (req, res) => {
    let targetStudentId = req.params.studentId;
    if (!targetStudentId) {
        if (req.user && req.user.role === 'Student') {
            targetStudentId = req.user._id;
        } else {
            res.status(400);
            throw new Error('Student ID is required');
        }
    }

    const configs = await StudentInboxConfig.find({ student: targetStudentId });
    res.json(configs);
});

const saveInboxConfig = asyncHandler(async (req, res) => {
    const { studentId, inboxId, displayName, visible, disabled } = req.body;

    if (!studentId || !inboxId) {
        res.status(400);
        throw new Error('studentId and inboxId are required');
    }

    let config = await StudentInboxConfig.findOne({ student: studentId, inboxId });

    if (config) {
        if (displayName !== undefined) config.displayName = displayName;
        if (visible !== undefined) config.visible = visible;
        if (disabled !== undefined) config.disabled = disabled;
        await config.save();
    } else {
        config = await StudentInboxConfig.create({
            student: studentId,
            inboxId,
            displayName: displayName || '',
            visible: visible !== undefined ? visible : true,
            disabled: disabled !== undefined ? disabled : false
        });
    }

    res.json(config);
});

const getActivityConfigs = asyncHandler(async (req, res) => {
    let targetStudentId = req.params.studentId;
    if (!targetStudentId) {
        if (req.user && req.user.role === 'Student') {
            targetStudentId = req.user._id;
        } else {
            res.status(400);
            throw new Error('Student ID is required');
        }
    }

    const configs = await StudentActivityConfig.find({ student: targetStudentId });
    res.json(configs);
});

const saveActivityConfig = asyncHandler(async (req, res) => {
    const { studentId, testId, visible, disabled } = req.body;

    if (!studentId || !testId) {
        res.status(400);
        throw new Error('studentId and testId are required');
    }

    let config = await StudentActivityConfig.findOne({ student: studentId, test: testId });

    if (config) {
        if (visible !== undefined) config.visible = visible;
        if (disabled !== undefined) config.disabled = disabled;
        await config.save();
    } else {
        config = await StudentActivityConfig.create({
            student: studentId,
            test: testId,
            visible: visible !== undefined ? visible : true,
            disabled: disabled !== undefined ? disabled : false
        });
    }

    res.json(config);
});

module.exports = {
    getUsers,
    createUser,
    deleteUser,
    updateUser,
    markPhysicalAttendance,
    updateFeeStatus,
    markBulkPhysicalAttendance,
    getInboxConfigs,
    saveInboxConfig,
    getActivityConfigs,
    saveActivityConfig
};
