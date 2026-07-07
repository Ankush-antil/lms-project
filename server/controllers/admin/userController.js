const asyncHandler = require('express-async-handler');
const User = require('../../models/User');
const Activity = require('../../models/Activity');
const Course = require('../../models/Course');
const StudentInboxConfig = require('../../models/StudentInboxConfig');
const StudentActivityConfig = require('../../models/StudentActivityConfig');
const FeeRecord = require('../../models/FeeRecord');
const { deleteFromSheets } = require('../../utils/googleSheets');

// Helper: compute section letter for a student
const computeSection = async (courseId) => {
    if (!courseId) return 'A';
    const course = await Course.findById(courseId);
    if (!course) return 'A';
    const capacity = course.maxStudentsPerSection || 30;
    const count = await User.countDocuments({ role: 'Student', 'studentProfile.course': courseId });
    const sectionIndex = Math.floor(count / capacity);
    return String.fromCharCode(65 + sectionIndex); // 0=A,1=B,2=C...
};

// @desc    Get all users (filtered by role)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
    const { role, course } = req.query;
    const query = {};
    if (role) query.role = role;
    if (course) {
        if (role === 'Student') {
            query['studentProfile.course'] = course;
        } else if (role === 'Teacher') {
            query['teacherProfile.assignedCourses'] = course;
        }
    }

    // Isolate by institute for Institute and Editor roles
    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor')) {
        query.institute = req.user.institute;
    }

    console.log(`[API] Fetching users with query:`, query);

    const users = await User.find(query)
        .select('-password')
        .populate('institute', 'name')
        .populate('studentProfile.course', 'name subjects')
        .populate('teacherProfile.assignedCourses', 'name')
        .populate('teacherProfile.assignedStudents', 'name email studentProfile');

    console.log(`[API] Found ${users.length} users for role: ${role || 'All'}`);
    res.json(users);
});

// @desc    Create User (Admin / Institute)
// @route   POST /api/users
// @access  Private/Admin or Institute
const createUser = asyncHandler(async (req, res) => {
    const { name, email, password, role, course, subjects, subject, mobileNumber, batch, callEnabled, studentAssignmentMode, assignedSections, assignedStudents } = req.body;
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
        callEnabled: callEnabled !== undefined ? callEnabled : true
    };

    if (role === 'Student') {
        // Auto-assign section based on course capacity
        const assignedSection = await computeSection(course);
        userFields.studentProfile = {
            course,
            subject: subject || '',
            batch: batch || '',
            section: assignedSection,
            enrollmentDate: new Date(),
            controls: req.body.controls
        };
    } else if (role === 'Teacher') {
        userFields.teacherProfile = {
            assignedCourses: course ? [course] : [],
            subjects: subjects ? (Array.isArray(subjects) ? subjects : subjects.split(',').map(s => s.trim())) : [],
            studentAssignmentMode: studentAssignmentMode || 'all',
            assignedSections: assignedSections || [],
            assignedStudents: assignedStudents || [],
            controls: req.body.controls
        };
    }

    const user = await User.create(userFields);

    if (user) {
        // Propagate controls if scope is not 'single'
        const scope = req.body.controlsScope || 'single';
        if (role === 'Student' && req.body.controls !== undefined && scope !== 'single') {
            const query = { role: 'Student', _id: { $ne: user._id } };

            // Enforce creator's institute
            if (user.institute) {
                query.institute = user.institute;
            }

            if (scope === 'course') {
                query['studentProfile.course'] = user.studentProfile.course;
            } else if (scope === 'selected') {
                const selectedIds = req.body.selectedPropagationStudents || [];
                query._id = { $in: selectedIds };
            }

            if (scope !== 'selected' || (req.body.selectedPropagationStudents && req.body.selectedPropagationStudents.length > 0)) {
                await User.updateMany(query, {
                    $set: { 'studentProfile.controls': req.body.controls }
                });
            }
        } else if (role === 'Teacher' && req.body.controls !== undefined && scope !== 'single') {
            const query = { role: 'Teacher', _id: { $ne: user._id } };

            // Enforce creator's institute
            if (user.institute) {
                query.institute = user.institute;
            }

            if (scope === 'selected') {
                const selectedIds = req.body.selectedPropagationStudents || [];
                query._id = { $in: selectedIds };
            }

            if (scope !== 'selected' || (req.body.selectedPropagationStudents && req.body.selectedPropagationStudents.length > 0)) {
                await User.updateMany(query, {
                    $set: { 'teacherProfile.controls': req.body.controls }
                });
            }
        }

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

        // If student, delete their FeeRecord and sync Google Sheets
        if (user.role === 'Student') {
            const record = await FeeRecord.findOne({ student: user._id });
            if (record) {
                await deleteFromSheets(record._id, user.admissionNo, user.name);
                await record.deleteOne();
            }
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
        user.mobile2 = req.body.mobile2 !== undefined ? req.body.mobile2 : user.mobile2;
        user.fatherName = req.body.fatherName !== undefined ? req.body.fatherName : user.fatherName;
        user.admissionNo = req.body.admissionNo !== undefined ? req.body.admissionNo : user.admissionNo;
        user.callEnabled = req.body.callEnabled !== undefined ? req.body.callEnabled : user.callEnabled;
        user.isActive = req.body.isActive !== undefined ? req.body.isActive : user.isActive;

        if (req.body.password && req.body.password.trim() !== '') {
            user.password = req.body.password;
        }

        if (user.role === 'Student') {
            if (!user.studentProfile) user.studentProfile = {};
            user.studentProfile.course = req.body.course || user.studentProfile.course;
            user.studentProfile.subject = req.body.subject !== undefined ? req.body.subject : user.studentProfile.subject;
            user.studentProfile.batch = req.body.batch !== undefined ? req.body.batch : user.studentProfile.batch;
            user.studentProfile.section = req.body.section !== undefined ? req.body.section : user.studentProfile.section;
            if (req.body.controls !== undefined) {
                user.studentProfile.controls = req.body.controls;
                user.markModified('studentProfile.controls');

                // Propagate controls if scope is not 'single'
                const scope = req.body.controlsScope || 'single';
                if (scope !== 'single') {
                    const query = { role: 'Student', _id: { $ne: user._id } };

                    // Enforce institute isolation
                    if (user.institute) {
                        query.institute = user.institute;
                    }

                    if (scope === 'course') {
                        query['studentProfile.course'] = user.studentProfile.course;
                    } else if (scope === 'selected') {
                        const selectedIds = req.body.selectedPropagationStudents || [];
                        query._id = { $in: selectedIds };
                    }

                    // Update controls for other matching students
                    if (scope !== 'selected' || (req.body.selectedPropagationStudents && req.body.selectedPropagationStudents.length > 0)) {
                        await User.updateMany(query, {
                            $set: { 'studentProfile.controls': req.body.controls }
                        });
                    }
                }
            }
        } else if (user.role === 'Teacher') {
            if (!user.teacherProfile) user.teacherProfile = {};
            user.teacherProfile.assignedCourses = req.body.course ? [req.body.course] : user.teacherProfile.assignedCourses;
            user.teacherProfile.subjects = req.body.subjects ? (Array.isArray(req.body.subjects) ? req.body.subjects : req.body.subjects.split(',').map(s => s.trim())) : user.teacherProfile.subjects;
            user.teacherProfile.studentAssignmentMode = req.body.studentAssignmentMode !== undefined ? req.body.studentAssignmentMode : user.teacherProfile.studentAssignmentMode;
            user.teacherProfile.assignedSections = req.body.assignedSections !== undefined ? req.body.assignedSections : user.teacherProfile.assignedSections;
            user.teacherProfile.assignedStudents = req.body.assignedStudents !== undefined ? req.body.assignedStudents : user.teacherProfile.assignedStudents;

            if (req.body.controls !== undefined) {
                user.teacherProfile.controls = req.body.controls;
                user.markModified('teacherProfile.controls');

                // Propagate controls if scope is not 'single'
                const scope = req.body.controlsScope || 'single';
                if (scope !== 'single') {
                    const query = { role: 'Teacher', _id: { $ne: user._id } };

                    // Enforce institute isolation
                    if (user.institute) {
                        query.institute = user.institute;
                    }

                    if (scope === 'selected') {
                        const selectedIds = req.body.selectedPropagationStudents || [];
                        query._id = { $in: selectedIds };
                    }

                    if (scope !== 'selected' || (req.body.selectedPropagationStudents && req.body.selectedPropagationStudents.length > 0)) {
                        await User.updateMany(query, {
                            $set: { 'teacherProfile.controls': req.body.controls }
                        });
                    }
                }
            }
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

    const { date, status, teacherNote } = req.body; // e.g. date: "2026-06-30", status: "Present" / "Absent" / "Leave" / "Holiday"
    if (!date || !status) {
        res.status(400);
        throw new Error('Please provide both date and status');
    }

    if (!['Present', 'Absent', 'Leave', 'Holiday', 'In'].includes(status)) {
        res.status(400);
        throw new Error('Invalid status');
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
        student.studentProfile.physicalAttendance[existingIndex].source = 'manual';
        if (teacherNote !== undefined) {
            student.studentProfile.physicalAttendance[existingIndex].teacherNote = teacherNote;
        }
    } else {
        student.studentProfile.physicalAttendance.push({ date, status, teacherNote: teacherNote || '', source: 'manual' });
    }

    student.markModified('studentProfile.physicalAttendance');
    await student.save();
    res.json({ success: true, physicalAttendance: student.studentProfile.physicalAttendance });
});

// @desc    Delete student physical attendance record
// @route   DELETE /api/users/:id/physical-attendance/:date
// @access  Private
const deletePhysicalAttendance = asyncHandler(async (req, res) => {
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
            throw new Error('Not authorized to delete attendance for this student');
        }
    } else if (req.user.role === 'Institute' || req.user.role === 'Editor') {
        if (student.institute?.toString() !== req.user.institute?.toString()) {
            res.status(403);
            throw new Error('Not authorized to delete attendance for this student');
        }
    }

    const { date } = req.params;
    if (!date) {
        res.status(400);
        throw new Error('Please specify a date to delete');
    }

    if (student.studentProfile && student.studentProfile.physicalAttendance) {
        student.studentProfile.physicalAttendance = student.studentProfile.physicalAttendance.filter(
            a => a.date !== date
        );
        await student.save();
    }

    res.json({ success: true, physicalAttendance: student.studentProfile?.physicalAttendance || [] });
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
    // attendanceRecords format: [{ studentId: "id", status: "Present"|"Absent"|"Leave"|"Holiday", note: "..." }]
    if (!date || !attendanceRecords || !Array.isArray(attendanceRecords)) {
        res.status(400);
        throw new Error('Please provide date and attendanceRecords array');
    }

    // Block future dates
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const attendDate = new Date(date);
    if (attendDate > today) {
        res.status(400);
        throw new Error('Cannot mark attendance for a future date');
    }

    try {
        for (const record of attendanceRecords) {
            const { studentId, status, note } = record;
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
                student.studentProfile.physicalAttendance[existingIndex].source = 'manual';
                if (note !== undefined) {
                    student.studentProfile.physicalAttendance[existingIndex].teacherNote = note;
                }
            } else {
                student.studentProfile.physicalAttendance.push({
                    date, status,
                    teacherNote: note || '',
                    source: 'manual'
                });
            }

            student.markModified('studentProfile.physicalAttendance');
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
    deletePhysicalAttendance,
    updateFeeStatus,
    markBulkPhysicalAttendance,
    getInboxConfigs,
    saveInboxConfig,
    getActivityConfigs,
    saveActivityConfig
};
