const asyncHandler = require('express-async-handler');
const User = require('../../models/User');
const Activity = require('../../models/Activity');
const Course = require('../../models/Course');
const StudentInboxConfig = require('../../models/StudentInboxConfig');
const StudentActivityConfig = require('../../models/StudentActivityConfig');
const FeeRecord = require('../../models/FeeRecord');
const RoleRequest = require('../../models/RoleRequest');
const { deleteFromSheets } = require('../../utils/googleSheets');

// Helper: compute section letter for a student
const computeSection = async (courseId) => {
    if (!courseId) return 'A';
    const course = await Course.findById(courseId);
    if (!course) return 'A';
    const sectionsCount = course.sectionsCount || 1;
    const capacity = course.maxStudentsPerSection || 30;

    // Find the first section (from A to sectionsCount) that has space
    for (let i = 0; i < sectionsCount; i++) {
        const sectionLetter = String.fromCharCode(65 + i);
        const sectionCount = await User.countDocuments({ 
            role: 'Student', 
            'studentProfile.course': courseId,
            'studentProfile.section': sectionLetter,
            isDeleted: { $ne: true }
        });
        if (sectionCount < capacity) {
            return sectionLetter;
        }
    }
    // If all are full, return the last section
    return String.fromCharCode(65 + (sectionsCount - 1));
};

// @desc    Get all users (filtered by role)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
    const { role, course, institute } = req.query;
    const query = { isDeleted: { $ne: true } };
    if (role) {
        query.$or = [
            { role: role },
            { allowedRoles: role }
        ];
    }
    if (institute) query.institute = institute;
    if (course) {
        if (role === 'Student') {
            query['studentProfile.course'] = course;
        } else if (role === 'Teacher') {
            query['teacherProfile.assignedCourses'] = course;
        } else if (role === 'Editor') {
            query['editorProfile.assignedCourses'] = course;
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
        .populate('parentProfile.student', 'name email studentProfile')
        .populate('teacherProfile.assignedCourses', 'name')
        .populate('teacherProfile.assignedStudents', 'name email studentProfile')
        .populate('editorProfile.assignedCourses', 'name')
        .populate('guestProfile.demoCourse', 'name');

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
        callEnabled: callEnabled !== undefined ? callEnabled : true,
        // Save allowedRoles from form (the pre-save hook ensures primary role is always included)
        allowedRoles: Array.isArray(req.body.allowedRoles) && req.body.allowedRoles.length > 0
            ? [...new Set([...(req.body.allowedRoles), role])] // ensure primary role always present
            : [role]
    };

    if (role === 'Student') {
        // Auto-assign section based on course capacity if not specified
        const assignedSection = req.body.section || await computeSection(course);
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
    } else if (role === 'Editor') {
        userFields.editorProfile = {
            assignedCourses: course ? [course] : [],
            subjects: subjects ? (Array.isArray(subjects) ? subjects : subjects.split(',').map(s => s.trim())) : [],
            controls: req.body.controls
        };
    } else if (role === 'Accountant') {
        userFields.accountantProfile = {
            controls: req.body.controls
        };
    } else if (role === 'Staff') {
        userFields.staffProfile = {
            designation: req.body.staffProfile?.designation || '',
            department: req.body.staffProfile?.department || '',
            joiningDate: req.body.staffProfile?.joiningDate || new Date(),
            salary: req.body.staffProfile?.salary || 0,
            salaryStatus: req.body.staffProfile?.salaryStatus || 'Pending'
        };
    } else if (role === 'Parent') {
        userFields.parentProfile = {
            student: req.body.parentProfile?.student || null
        };
    } else if (role === 'Guest') {
        const demoCourse = req.body.demoCourse || null;
        const demoDuration = parseInt(req.body.demoDuration) || 1;
        const demoExpiryDate = new Date();
        demoExpiryDate.setDate(demoExpiryDate.getDate() + demoDuration);

        userFields.guestProfile = {
            demoCourse,
            demoDuration,
            demoExpiryDate
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
        } else if (role === 'Editor' && req.body.controls !== undefined && scope !== 'single') {
            const query = { role: 'Editor', _id: { $ne: user._id } };

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
                    $set: { 'editorProfile.controls': req.body.controls }
                });
            }
        } else if (role === 'Accountant' && req.body.controls !== undefined && scope !== 'single') {
            const query = { role: 'Accountant', _id: { $ne: user._id } };

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
                    $set: { 'accountantProfile.controls': req.body.controls }
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

        user.isDeleted = true;
        await user.save();
        res.json({ message: 'User moved to Recycle Bin' });
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

        const activeRole = req.body.editingRole || user.role;

        if (activeRole === 'Student') {
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
        } else if (activeRole === 'Teacher') {
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
        } else if (activeRole === 'Editor') {
            if (!user.editorProfile) user.editorProfile = {};
            user.editorProfile.assignedCourses = req.body.course ? [req.body.course] : user.editorProfile.assignedCourses;
            user.editorProfile.subjects = req.body.subjects ? (Array.isArray(req.body.subjects) ? req.body.subjects : req.body.subjects.split(',').map(s => s.trim())) : user.editorProfile.subjects;

            if (req.body.controls !== undefined) {
                user.editorProfile.controls = req.body.controls;
                user.markModified('editorProfile.controls');

                // Propagate controls if scope is not 'single'
                const scope = req.body.controlsScope || 'single';
                if (scope !== 'single') {
                    const query = { role: 'Editor', _id: { $ne: user._id } };

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
                            $set: { 'editorProfile.controls': req.body.controls }
                        });
                    }
                }
            }
        } else if (activeRole === 'Accountant') {
            if (!user.accountantProfile) user.accountantProfile = {};

            if (req.body.controls !== undefined) {
                user.accountantProfile.controls = req.body.controls;
                user.markModified('accountantProfile.controls');

                // Propagate controls if scope is not 'single'
                const scope = req.body.controlsScope || 'single';
                if (scope !== 'single') {
                    const query = { role: 'Accountant', _id: { $ne: user._id } };

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
                            $set: { 'accountantProfile.controls': req.body.controls }
                        });
                    }
                }
            }
        } else if (activeRole === 'Staff') {
            if (!user.staffProfile) user.staffProfile = {};
            if (req.body.staffProfile) {
                user.staffProfile.designation = req.body.staffProfile.designation !== undefined ? req.body.staffProfile.designation : user.staffProfile.designation;
                user.staffProfile.department = req.body.staffProfile.department !== undefined ? req.body.staffProfile.department : user.staffProfile.department;
                user.staffProfile.salary = req.body.staffProfile.salary !== undefined ? req.body.staffProfile.salary : user.staffProfile.salary;
                user.staffProfile.salaryStatus = req.body.staffProfile.salaryStatus !== undefined ? req.body.staffProfile.salaryStatus : user.staffProfile.salaryStatus;
            }
        } else if (activeRole === 'Parent') {
            if (!user.parentProfile) user.parentProfile = {};
            if (req.body.parentProfile) {
                user.parentProfile.student = req.body.parentProfile.student !== undefined ? req.body.parentProfile.student : user.parentProfile.student;
            }
        } else if (activeRole === 'Guest') {
            if (!user.guestProfile) user.guestProfile = {};
            if (req.body.demoCourse !== undefined) {
                user.guestProfile.demoCourse = req.body.demoCourse || user.guestProfile.demoCourse;
            }
            if (req.body.demoDuration !== undefined) {
                user.guestProfile.demoDuration = req.body.demoDuration;
                // Recalculate expiry date based on new duration
                const startDate = user.guestProfile.demoStartDate || new Date();
                user.guestProfile.demoStartDate = startDate;
                user.guestProfile.demoExpiryDate = new Date(new Date(startDate).getTime() + req.body.demoDuration * 24 * 60 * 60 * 1000);
            }
            user.markModified('guestProfile');
        }

        // Save allowedRoles if provided
        if (req.body.allowedRoles && Array.isArray(req.body.allowedRoles)) {
            // Ensure the user's primary/current activeRole is always in allowedRoles
            const rolesSet = new Set(req.body.allowedRoles);
            rolesSet.add(activeRole); // always keep the editing role
            user.allowedRoles = [...rolesSet];
            user.markModified('allowedRoles');
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
    if (!student || (student.role !== 'Student' && student.role !== 'Teacher' && student.role !== 'Staff')) {
        res.status(404);
        throw new Error('User not found');
    }

    // Verify authorized access
    if (req.user.role === 'Teacher') {
        if (student.role !== 'Student') {
            res.status(403);
            throw new Error('Not authorized to mark attendance for this user');
        }
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
            throw new Error('Not authorized to mark attendance for this user');
        }
    }

    const { date, status, teacherNote, checkInTime, checkOutTime, source, markedBy } = req.body; // e.g. date: "2026-06-30", status: "Present" / "Absent" / "Leave" / "Holiday"
    if (!date || !status) {
        res.status(400);
        throw new Error('Please provide both date and status');
    }

    if (!['Present', 'Absent', 'Leave', 'Holiday', 'In'].includes(status)) {
        res.status(400);
        throw new Error('Invalid status');
    }

    if (student.role === 'Student') {
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
            student.studentProfile.physicalAttendance[existingIndex].source = source || 'manual';
            if (teacherNote !== undefined) student.studentProfile.physicalAttendance[existingIndex].teacherNote = teacherNote;
            if (checkInTime !== undefined) student.studentProfile.physicalAttendance[existingIndex].checkInTime = checkInTime;
            if (checkOutTime !== undefined) student.studentProfile.physicalAttendance[existingIndex].checkOutTime = checkOutTime;
            if (markedBy !== undefined) student.studentProfile.physicalAttendance[existingIndex].markedBy = markedBy;
        } else {
            student.studentProfile.physicalAttendance.push({
                date, status,
                teacherNote: teacherNote || '',
                source: source || 'manual',
                checkInTime: checkInTime || '',
                checkOutTime: checkOutTime || '',
                markedBy: markedBy || ''
            });
        }

        student.markModified('studentProfile.physicalAttendance');
    } else if (student.role === 'Teacher') {
        if (!student.teacherProfile) {
            student.teacherProfile = {};
        }
        if (!student.teacherProfile.physicalAttendance) {
            student.teacherProfile.physicalAttendance = [];
        }

        // Check if attendance already exists for this date
        const existingIndex = student.teacherProfile.physicalAttendance.findIndex(a => a.date === date);
        if (existingIndex !== -1) {
            student.teacherProfile.physicalAttendance[existingIndex].status = status;
            student.teacherProfile.physicalAttendance[existingIndex].source = source || 'manual';
            if (teacherNote !== undefined) student.teacherProfile.physicalAttendance[existingIndex].teacherNote = teacherNote;
            if (checkInTime !== undefined) student.teacherProfile.physicalAttendance[existingIndex].checkInTime = checkInTime;
            if (checkOutTime !== undefined) student.teacherProfile.physicalAttendance[existingIndex].checkOutTime = checkOutTime;
            if (markedBy !== undefined) student.teacherProfile.physicalAttendance[existingIndex].markedBy = markedBy;
        } else {
            student.teacherProfile.physicalAttendance.push({
                date, status,
                teacherNote: teacherNote || '',
                source: source || 'manual',
                checkInTime: checkInTime || '',
                checkOutTime: checkOutTime || '',
                markedBy: markedBy || ''
            });
        }

        student.markModified('teacherProfile.physicalAttendance');
    } else if (student.role === 'Staff') {
        if (!student.staffProfile) {
            student.staffProfile = {};
        }
        if (!student.staffProfile.physicalAttendance) {
            student.staffProfile.physicalAttendance = [];
        }

        // Check if attendance already exists for this date
        const existingIndex = student.staffProfile.physicalAttendance.findIndex(a => a.date === date);
        if (existingIndex !== -1) {
            student.staffProfile.physicalAttendance[existingIndex].status = status;
            student.staffProfile.physicalAttendance[existingIndex].source = source || 'manual';
            if (teacherNote !== undefined) student.staffProfile.physicalAttendance[existingIndex].teacherNote = teacherNote;
            if (checkInTime !== undefined) student.staffProfile.physicalAttendance[existingIndex].checkInTime = checkInTime;
            if (checkOutTime !== undefined) student.staffProfile.physicalAttendance[existingIndex].checkOutTime = checkOutTime;
            if (markedBy !== undefined) student.staffProfile.physicalAttendance[existingIndex].markedBy = markedBy;
        } else {
            student.staffProfile.physicalAttendance.push({
                date, status,
                teacherNote: teacherNote || '',
                source: source || 'manual',
                checkInTime: checkInTime || '',
                checkOutTime: checkOutTime || '',
                markedBy: markedBy || ''
            });
        }

        student.markModified('staffProfile.physicalAttendance');
    }

    await student.save();
    res.json({
        success: true,
        physicalAttendance: student.role === 'Student'
            ? student.studentProfile.physicalAttendance
            : student.role === 'Teacher'
                ? student.teacherProfile.physicalAttendance
                : student.staffProfile.physicalAttendance
    });
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
            const { studentId, status, note, checkInTime, checkOutTime, source, markedBy } = record;
            if (!studentId || !status) continue;

            const student = await User.findById(studentId);
            if (!student || (student.role !== 'Student' && student.role !== 'Teacher' && student.role !== 'Staff')) continue;

            // Verify authority
            if (req.user.role === 'Institute' || req.user.role === 'Editor') {
                if (student.institute?.toString() !== req.user.institute?.toString()) continue;
            } else if (req.user.role === 'Teacher') {
                if (student.role !== 'Student') continue; // Teachers can only mark students
                // Check course assignment matching
                const teacher = await User.findById(req.user._id);
                const courseId = student.studentProfile?.course;
                const teachesCourse = teacher.teacherProfile?.assignedCourses?.some(c => c.toString() === courseId?.toString());
                if (!teachesCourse) continue;
            }

            if (student.role === 'Student') {
                if (!student.studentProfile) {
                    student.studentProfile = {};
                }
                if (!student.studentProfile.physicalAttendance) {
                    student.studentProfile.physicalAttendance = [];
                }

                const existingIndex = student.studentProfile.physicalAttendance.findIndex(a => a.date === date);
                if (existingIndex !== -1) {
                    student.studentProfile.physicalAttendance[existingIndex].status = status;
                    student.studentProfile.physicalAttendance[existingIndex].source = source || 'manual';
                    if (note !== undefined) student.studentProfile.physicalAttendance[existingIndex].teacherNote = note;
                    if (checkInTime !== undefined) student.studentProfile.physicalAttendance[existingIndex].checkInTime = checkInTime;
                    if (checkOutTime !== undefined) student.studentProfile.physicalAttendance[existingIndex].checkOutTime = checkOutTime;
                    if (markedBy !== undefined) student.studentProfile.physicalAttendance[existingIndex].markedBy = markedBy;
                } else {
                    student.studentProfile.physicalAttendance.push({
                        date, status,
                        teacherNote: note || '',
                        source: source || 'manual',
                        checkInTime: checkInTime || '',
                        checkOutTime: checkOutTime || '',
                        markedBy: markedBy || ''
                    });
                }

                student.markModified('studentProfile.physicalAttendance');
            } else if (student.role === 'Teacher') {
                if (!student.teacherProfile) {
                    student.teacherProfile = {};
                }
                if (!student.teacherProfile.physicalAttendance) {
                    student.teacherProfile.physicalAttendance = [];
                }

                const existingIndex = student.teacherProfile.physicalAttendance.findIndex(a => a.date === date);
                if (existingIndex !== -1) {
                    student.teacherProfile.physicalAttendance[existingIndex].status = status;
                    student.teacherProfile.physicalAttendance[existingIndex].source = source || 'manual';
                    if (note !== undefined) student.teacherProfile.physicalAttendance[existingIndex].teacherNote = note;
                    if (checkInTime !== undefined) student.teacherProfile.physicalAttendance[existingIndex].checkInTime = checkInTime;
                    if (checkOutTime !== undefined) student.teacherProfile.physicalAttendance[existingIndex].checkOutTime = checkOutTime;
                    if (markedBy !== undefined) student.teacherProfile.physicalAttendance[existingIndex].markedBy = markedBy;
                } else {
                    student.teacherProfile.physicalAttendance.push({
                        date, status,
                        teacherNote: note || '',
                        source: source || 'manual',
                        checkInTime: checkInTime || '',
                        checkOutTime: checkOutTime || '',
                        markedBy: markedBy || ''
                    });
                }

                student.markModified('teacherProfile.physicalAttendance');
            } else if (student.role === 'Staff') {
                if (!student.staffProfile) {
                    student.staffProfile = {};
                }
                if (!student.staffProfile.physicalAttendance) {
                    student.staffProfile.physicalAttendance = [];
                }

                const existingIndex = student.staffProfile.physicalAttendance.findIndex(a => a.date === date);
                if (existingIndex !== -1) {
                    student.staffProfile.physicalAttendance[existingIndex].status = status;
                    student.staffProfile.physicalAttendance[existingIndex].source = source || 'manual';
                    if (note !== undefined) student.staffProfile.physicalAttendance[existingIndex].teacherNote = note;
                    if (checkInTime !== undefined) student.staffProfile.physicalAttendance[existingIndex].checkInTime = checkInTime;
                    if (checkOutTime !== undefined) student.staffProfile.physicalAttendance[existingIndex].checkOutTime = checkOutTime;
                    if (markedBy !== undefined) student.staffProfile.physicalAttendance[existingIndex].markedBy = markedBy;
                } else {
                    student.staffProfile.physicalAttendance.push({
                        date, status,
                        teacherNote: note || '',
                        source: source || 'manual',
                        checkInTime: checkInTime || '',
                        checkOutTime: checkOutTime || '',
                        markedBy: markedBy || ''
                    });
                }

                student.markModified('staffProfile.physicalAttendance');
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

// @desc    Get all soft-deleted users
// @route   GET /api/users/trash
// @access  Private/Admin
const getDeletedUsers = asyncHandler(async (req, res) => {
    const { role } = req.query;
    const query = { isDeleted: true };
    if (role) query.role = role;

    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor')) {
        query.institute = req.user.institute;
    }

    const users = await User.find(query)
        .select('-password')
        .populate('institute', 'name')
        .populate('studentProfile.course', 'name subjects')
        .populate('teacherProfile.assignedCourses', 'name');

    res.json(users);
});

// @desc    Restore a soft-deleted user
// @route   PUT /api/users/:id/restore
// @access  Private/Admin
const restoreUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor') && user.institute?.toString() !== req.user.institute?.toString()) {
        res.status(403);
        throw new Error('Not authorized to restore users belonging to other institutes');
    }

    user.isDeleted = false;
    await user.save();
    res.json({ message: 'User restored successfully', user });
});

// @desc    Permanently delete a user
// @route   DELETE /api/users/:id/permanent
// @access  Private/Admin
const permanentlyDeleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

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
    res.json({ message: 'User permanently deleted' });
});

// @desc    Create Role Request
// @route   POST /api/users/role-requests
// @access  Private
const createRoleRequest = asyncHandler(async (req, res) => {
    const { requestedRole, courseId } = req.body;
    const userId = req.user._id;

    if (!requestedRole) {
        res.status(400);
        throw new Error('Requested role is required');
    }

    if (requestedRole === 'Student' && !courseId) {
        res.status(400);
        throw new Error('Course selection is required when requesting the Student role');
    }

    // Check if role is already allowed for user
    const user = await User.findById(userId);
    if (user.allowedRoles && user.allowedRoles.includes(requestedRole)) {
        res.status(400);
        throw new Error('This role is already allowed for your account');
    }

    // Check if there is already a pending request for this role
    const existingRequest = await RoleRequest.findOne({
        user: userId,
        requestedRole,
        status: 'Pending'
    });
    if (existingRequest) {
        res.status(400);
        throw new Error('A request for this role is already pending approval');
    }

    // Determine targetApprover
    let targetApprover = 'Admin';
    if (user.role === 'Institute') {
        targetApprover = 'Admin';
    } else if (user.institute) {
        targetApprover = 'Institute';
    }

    const request = await RoleRequest.create({
        user: userId,
        requestedRole,
        institute: user.institute || null,
        course: requestedRole === 'Student' ? courseId : null,
        targetApprover,
        status: 'Pending'
    });

    res.status(201).json({
        success: true,
        message: 'Role request submitted successfully',
        request
    });
});

// @desc    Get Role Requests
// @route   GET /api/users/role-requests
// @access  Private (Admin / Institute)
const getRoleRequests = asyncHandler(async (req, res) => {
    let query = { isDeleted: { $ne: true } };
    const { myRequests } = req.query;

    if (myRequests === 'true' || !['Admin', 'Institute'].includes(req.user.role)) {
        query.user = req.user._id;
    } else if (req.user.role === 'Admin') {
        query.targetApprover = 'Admin';
    } else if (req.user.role === 'Institute') {
        query.targetApprover = 'Institute';
        query.institute = req.user.institute;
    } else {
        res.status(403);
        throw new Error('Not authorized to view role requests');
    }

    const requests = await RoleRequest.find(query)
        .populate('user', 'name email role')
        .populate('institute', 'name')
        .populate('course', 'name')
        .sort({ createdAt: -1 });

    res.json(requests);
});

// @desc    Delete role request (soft delete)
// @route   DELETE /api/users/role-requests/:id
// @access  Private (Admin / Institute)
const deleteRoleRequest = asyncHandler(async (req, res) => {
    const request = await RoleRequest.findById(req.params.id);
    if (!request) {
        res.status(404);
        throw new Error('Role request not found');
    }
    if (req.user.role === 'Institute' && request.institute?.toString() !== req.user.institute?.toString()) {
        res.status(403);
        throw new Error('Not authorized to delete role requests of other institutes');
    }
    request.isDeleted = true;
    await request.save();
    res.json({ message: 'Role request moved to Recycle Bin' });
});

// @desc    Get soft-deleted role requests
// @route   GET /api/users/role-requests/trash
// @access  Private (Admin / Institute)
const getDeletedRoleRequests = asyncHandler(async (req, res) => {
    let query = { isDeleted: true };
    if (req.user.role === 'Institute') {
        query.institute = req.user.institute;
    }
    const requests = await RoleRequest.find(query)
        .populate('user', 'name email role')
        .populate('institute', 'name')
        .populate('course', 'name')
        .sort({ updatedAt: -1 });
    res.json(requests);
});

// @desc    Restore a soft-deleted role request
// @route   PUT /api/users/role-requests/:id/restore
// @access  Private (Admin / Institute)
const restoreRoleRequest = asyncHandler(async (req, res) => {
    const request = await RoleRequest.findById(req.params.id);
    if (!request) {
        res.status(404);
        throw new Error('Role request not found');
    }
    if (req.user.role === 'Institute' && request.institute?.toString() !== req.user.institute?.toString()) {
        res.status(403);
        throw new Error('Not authorized to restore role requests of other institutes');
    }
    request.isDeleted = false;
    await request.save();
    res.json({ message: 'Role request restored successfully', request });
});

// @desc    Permanently delete a role request
// @route   DELETE /api/users/role-requests/:id/permanent
// @access  Private (Admin / Institute)
const permanentlyDeleteRoleRequest = asyncHandler(async (req, res) => {
    const request = await RoleRequest.findById(req.params.id);
    if (!request) {
        res.status(404);
        throw new Error('Role request not found');
    }
    if (req.user.role === 'Institute' && request.institute?.toString() !== req.user.institute?.toString()) {
        res.status(403);
        throw new Error('Not authorized to delete role requests of other institutes');
    }
    await request.deleteOne();
    res.json({ message: 'Role request permanently deleted' });
});

// @desc    Approve Role Request
// @route   PUT /api/users/role-requests/:id/approve
// @access  Private (Admin / Institute)
const approveRoleRequest = asyncHandler(async (req, res) => {
    const request = await RoleRequest.findById(req.params.id);
    if (!request) {
        res.status(444);
        throw new Error('Role request not found');
    }

    // Verify authorization
    if (req.user.role === 'Admin' && request.targetApprover !== 'Admin') {
        res.status(403);
        throw new Error('Not authorized to approve this request');
    }
    if (req.user.role === 'Institute' && (request.targetApprover !== 'Institute' || request.institute.toString() !== req.user.institute.toString())) {
        res.status(403);
        throw new Error('Not authorized to approve this request');
    }

    request.status = 'Approved';
    await request.save();

    // Push the approved role to the user's allowedRoles and update primary role
    const targetUser = await User.findById(request.user);
    if (targetUser) {
        if (!targetUser.allowedRoles.includes(request.requestedRole)) {
            targetUser.allowedRoles.push(request.requestedRole);
        }
        // Also preserve the old role in allowedRoles before switching
        if (!targetUser.allowedRoles.includes(targetUser.role)) {
            targetUser.allowedRoles.push(targetUser.role);
        }
        // Switch primary role to the newly approved role
        targetUser.role = request.requestedRole;
        
        // If Student role approved, initialize studentProfile and assign course
        if (request.requestedRole === 'Student' && request.course) {
            if (!targetUser.studentProfile) {
                targetUser.studentProfile = {};
            }
            targetUser.studentProfile.course = request.course;
            targetUser.studentProfile.enrollmentDate = new Date();
        }

        await targetUser.save();
    }

    res.json({
        success: true,
        message: 'Role request approved successfully',
        request
    });
});

// @desc    Reject Role Request
// @route   PUT /api/users/role-requests/:id/reject
// @access  Private (Admin / Institute)
const rejectRoleRequest = asyncHandler(async (req, res) => {
    const request = await RoleRequest.findById(req.params.id);
    if (!request) {
        res.status(444);
        throw new Error('Role request not found');
    }

    // Verify authorization
    if (req.user.role === 'Admin' && request.targetApprover !== 'Admin') {
        res.status(403);
        throw new Error('Not authorized to reject this request');
    }
    if (req.user.role === 'Institute' && (request.targetApprover !== 'Institute' || request.institute.toString() !== req.user.institute.toString())) {
        res.status(403);
        throw new Error('Not authorized to reject this request');
    }

    request.status = 'Rejected';
    await request.save();

    res.json({
        success: true,
        message: 'Role request rejected successfully',
        request
    });
});

// @desc    Switch Active Role
// @route   PUT /api/users/switch-role
// @access  Private
const switchRole = asyncHandler(async (req, res) => {
    const { newRole } = req.body;
    const userId = req.user._id;

    const validRoles = ['Admin', 'Teacher', 'Student', 'Editor', 'Institute', 'Accountant', 'Marketer', 'Staff', 'Parent'];
    if (!validRoles.includes(newRole)) {
        res.status(400);
        throw new Error('Invalid role specified');
    }

    const user = await User.findById(userId);

    // Admin can switch to ANY role. Institute can switch to any role EXCEPT Admin.
    // Other users can only switch to roles in their allowedRoles array (or current active role).
    const hasAdminPrivilege = user.role === 'Admin' || (user.allowedRoles && user.allowedRoles.includes('Admin'));
    const hasInstitutePrivilege = user.role === 'Institute' || (user.allowedRoles && user.allowedRoles.includes('Institute'));

    let isAllowed = false;
    if (hasAdminPrivilege) {
        isAllowed = true;
    } else if (hasInstitutePrivilege) {
        isAllowed = newRole !== 'Admin';
    } else {
        isAllowed = (user.allowedRoles && user.allowedRoles.includes(newRole)) || user.role === newRole;
    }

    if (!isAllowed) {
        res.status(403);
        throw new Error('You are not authorized to switch to this role');
    }

    // Ensure both current role and new role are preserved in allowedRoles so they can switch back/between them
    if (user.role && !user.allowedRoles.includes(user.role)) {
        user.allowedRoles.push(user.role);
    }
    if (!user.allowedRoles.includes(newRole)) {
        user.allowedRoles.push(newRole);
    }

    user.role = newRole;
    await user.save();

    res.json({
        success: true,
        message: `Role switched to ${newRole}`,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            allowedRoles: user.allowedRoles,
            institute: user.institute
        }
    });
});

// @desc    Import Role Requests
// @route   POST /api/users/role-requests/import
// @access  Private (Admin / Institute)
const importRoleRequests = asyncHandler(async (req, res) => {
    const { requests } = req.body;
    if (!Array.isArray(requests)) {
        res.status(400);
        throw new Error('Requests must be an array');
    }

    const results = {
        successCount: 0,
        errors: []
    };

    for (const reqItem of requests) {
        const { email, requestedRole, courseName } = reqItem;
        if (!email || !requestedRole) {
            results.errors.push({ row: reqItem, error: 'Email and requestedRole are required' });
            continue;
        }

        try {
            // Find User
            const userObj = await User.findOne({ email });
            if (!userObj) {
                results.errors.push({ row: reqItem, error: `User with email ${email} not found` });
                continue;
            }

            // Check if user already has this role
            if (userObj.allowedRoles && userObj.allowedRoles.includes(requestedRole)) {
                results.errors.push({ row: reqItem, error: `Role ${requestedRole} is already allowed for ${email}` });
                continue;
            }

            // Resolve course if Student
            let courseId = null;
            if (requestedRole === 'Student' && courseName) {
                const courseObj = await Course.findOne({ 
                    name: { $regex: new RegExp(`^${courseName.trim()}$`, 'i') },
                    institute: userObj.institute || req.user.institute
                });
                if (!courseObj) {
                    results.errors.push({ row: reqItem, error: `Course "${courseName}" not found in this institute` });
                    continue;
                }
                courseId = courseObj._id;
            }

            // Check if pending request exists
            const existingRequest = await RoleRequest.findOne({
                user: userObj._id,
                requestedRole,
                status: 'Pending'
            });

            if (existingRequest) {
                results.errors.push({ row: reqItem, error: `A pending request for role ${requestedRole} already exists for ${email}` });
                continue;
            }

            // Determine targetApprover
            let targetApprover = 'Admin';
            if (userObj.role === 'Institute') {
                targetApprover = 'Admin';
            } else if (userObj.institute) {
                targetApprover = 'Institute';
            }

            // Create request
            await RoleRequest.create({
                user: userObj._id,
                requestedRole,
                institute: userObj.institute || null,
                course: courseId,
                targetApprover,
                status: 'Pending'
            });

            results.successCount++;
        } catch (error) {
            results.errors.push({ row: reqItem, error: error.message });
        }
    }

    res.status(200).json({
        success: true,
        message: `Successfully imported ${results.successCount} role requests`,
        results
    });
});

// @desc    Import Users in Bulk
// @route   POST /api/users/import
// @access  Private (Admin / Institute)
const importUsers = asyncHandler(async (req, res) => {
    const { users } = req.body;
    if (!Array.isArray(users)) {
        res.status(400);
        throw new Error('Users must be an array');
    }

    let creatorInstitute = req.user.institute;
    if (req.user.role === 'Admin' && req.body.institute) {
        creatorInstitute = req.body.institute;
    }

    const results = {
        successCount: 0,
        errors: []
    };

    for (const uItem of users) {
        const { name, email, password, role, courseName, mobileNumber } = uItem;
        if (!name || !email || !role) {
            results.errors.push({ row: uItem, error: 'Name, email, and role are required' });
            continue;
        }

        try {
            const userExists = await User.findOne({ email });
            if (userExists) {
                results.errors.push({ row: uItem, error: `User with email ${email} already exists` });
                continue;
            }

            let courseId = null;
            if (courseName && ['Student', 'Teacher', 'Editor'].includes(role)) {
                const courseObj = await Course.findOne({ 
                    name: { $regex: new RegExp(`^${courseName.trim()}$`, 'i') },
                    institute: creatorInstitute
                });
                if (courseObj) {
                    courseId = courseObj._id;
                } else if (role === 'Student') {
                    results.errors.push({ row: uItem, error: `Course "${courseName}" not found in this institute` });
                    continue;
                }
            }

            const userFields = {
                name,
                email,
                password: password || 'Welcome123',
                role,
                institute: creatorInstitute,
                mobileNumber: mobileNumber || '',
                callEnabled: true
            };

            if (role === 'Student') {
                const assignedSection = await computeSection(courseId);
                userFields.studentProfile = {
                    course: courseId,
                    section: assignedSection,
                    enrollmentDate: new Date(),
                    controls: {}
                };
            } else if (role === 'Teacher') {
                userFields.teacherProfile = {
                    assignedCourses: courseId ? [courseId] : [],
                    subjects: [],
                    studentAssignmentMode: 'all',
                    assignedSections: [],
                    assignedStudents: [],
                    controls: {}
                };
            } else if (role === 'Editor') {
                userFields.editorProfile = {
                    assignedCourses: courseId ? [courseId] : [],
                    subjects: [],
                    controls: {}
                };
            } else if (role === 'Accountant') {
                userFields.accountantProfile = { controls: {} };
            } else if (role === 'Marketer') {
                userFields.marketerProfile = { controls: {} };
            } else if (role === 'Staff') {
                userFields.staffProfile = { controls: {} };
            } else if (role === 'Parent') {
                userFields.parentProfile = { controls: {} };
            }

            await User.create(userFields);
            results.successCount++;
        } catch (error) {
            results.errors.push({ row: uItem, error: error.message });
        }
    }

    res.status(200).json({
        success: true,
        message: `Successfully imported ${results.successCount} users`,
        results
    });
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
    saveActivityConfig,
    getDeletedUsers,
    restoreUser,
    permanentlyDeleteUser,
    createRoleRequest,
    getRoleRequests,
    approveRoleRequest,
    rejectRoleRequest,
    importRoleRequests,
    importUsers,
    switchRole,
    deleteRoleRequest,
    getDeletedRoleRequests,
    restoreRoleRequest,
    permanentlyDeleteRoleRequest
};
