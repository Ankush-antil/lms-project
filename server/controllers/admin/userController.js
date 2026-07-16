const asyncHandler = require('express-async-handler');
const User = require('../../models/User');
const Activity = require('../../models/Activity');
const Course = require('../../models/Course');
const Institute = require('../../models/Institute');
const StudentInboxConfig = require('../../models/StudentInboxConfig');
const StudentActivityConfig = require('../../models/StudentActivityConfig');
const FeeRecord = require('../../models/FeeRecord');
const RoleRequest = require('../../models/RoleRequest');
const { deleteFromSheets } = require('../../utils/googleSheets');

// Helper to escape regex special characters
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
            query.$and = [
                {
                    $or: [
                        { 'studentProfile.course': course },
                        { 'studentProfile.coursesList.course': course }
                    ]
                }
            ];
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 0;
    const skip = (page - 1) * limit;

    let dbQuery = User.find(query);
    if (limit > 0) {
        dbQuery = dbQuery.skip(skip).limit(limit);
    }

    const users = await dbQuery
        .select('-password')
        .populate('institute', 'name')
        .populate('studentProfile.course', 'name subjects duration subjectDurations')
        .populate('studentProfile.coursesList.course', 'name subjects duration subjectDurations')
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
    const { name, email, password, role, course, subjects, subject, mobileNumber, batch, callEnabled, studentAssignmentMode, assignedSections, assignedStudents, coursesList } = req.body;
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
        const primaryCourse = coursesList && coursesList.length > 0 ? coursesList[0].course : course;
        const assignedSection = req.body.section || await computeSection(primaryCourse);
        const finalCoursesList = coursesList || (course ? [{ course, subjects: subject ? subject.split(',').map(s => s.trim()).filter(Boolean) : [] }] : []);
        const primarySubject = coursesList && coursesList.length > 0
            ? (coursesList[0].subjects || []).join(', ')
            : (subject || '');

        userFields.studentProfile = {
            course: primaryCourse,
            coursesList: finalCoursesList,
            subject: primarySubject,
            batch: batch || '',
            section: assignedSection,
            enrollmentDate: new Date(),
            controls: req.body.controls
        };
    } else if (role === 'Teacher') {
        const finalAssignedCourses = req.body.assignedCourses || (course ? [course] : []);
        userFields.teacherProfile = {
            assignedCourses: finalAssignedCourses,
            subjects: subjects ? (Array.isArray(subjects) ? subjects : subjects.split(',').map(s => s.trim())) : [],
            studentAssignmentMode: studentAssignmentMode || 'all',
            assignedSections: assignedSections || [],
            assignedStudents: assignedStudents || [],
            controls: req.body.controls
        };
    } else if (role === 'Editor') {
        const finalAssignedCourses = req.body.assignedCourses || (course ? [course] : []);
        userFields.editorProfile = {
            assignedCourses: finalAssignedCourses,
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
        if (user.role === 'Admin') {
            res.status(400);
            throw new Error('Admin users cannot be deleted');
        }

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
            if (req.body.coursesList !== undefined) {
                user.studentProfile.coursesList = req.body.coursesList;
                user.markModified('studentProfile.coursesList');
                if (Array.isArray(req.body.coursesList) && req.body.coursesList.length > 0) {
                    user.studentProfile.course = req.body.coursesList[0].course || user.studentProfile.course;
                    user.studentProfile.subject = (req.body.coursesList[0].subjects || []).join(', ');
                } else {
                    user.studentProfile.course = null;
                    user.studentProfile.subject = '';
                }
            } else if (req.body.course !== undefined || req.body.subject !== undefined) {
                user.studentProfile.course = req.body.course || user.studentProfile.course;
                user.studentProfile.subject = req.body.subject !== undefined ? req.body.subject : user.studentProfile.subject;
                // Sync coursesList
                if (user.studentProfile.course) {
                    user.studentProfile.coursesList = [{
                        course: user.studentProfile.course,
                        subjects: user.studentProfile.subject ? user.studentProfile.subject.split(',').map(s => s.trim()).filter(Boolean) : []
                    }];
                    user.markModified('studentProfile.coursesList');
                } else {
                    user.studentProfile.coursesList = [];
                    user.markModified('studentProfile.coursesList');
                }
            }
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
            if (req.body.assignedCourses !== undefined) {
                user.teacherProfile.assignedCourses = req.body.assignedCourses;
            } else {
                user.teacherProfile.assignedCourses = req.body.course ? [req.body.course] : user.teacherProfile.assignedCourses;
            }
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
            if (req.body.assignedCourses !== undefined) {
                user.editorProfile.assignedCourses = req.body.assignedCourses;
            } else {
                user.editorProfile.assignedCourses = req.body.course ? [req.body.course] : user.editorProfile.assignedCourses;
            }
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

const getInboxConfigsByCourseSubject = asyncHandler(async (req, res) => {
    const { courseId, subject } = req.query;
    if (!courseId && !subject) {
        res.status(400);
        throw new Error('courseId or subject is required');
    }

    let studentQuery = {};

    if (subject) {
        // When subject is provided, find ALL courses that include this subject
        // then get all students from all those courses
        const Course = require('../../models/Course');
        const subjectsArr = subject.split(',').map(s => s.trim()).filter(Boolean);
        const subjectRegexArr = subjectsArr.map(s => new RegExp(`^\\s*${s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*$`, 'i'));

        // Find all courses containing this subject
        const coursesWithSubject = await Course.find({
            subjects: { $in: subjectRegexArr }
        }).select('_id');
        const courseIds = coursesWithSubject.map(c => c._id);

        // Also include the explicitly provided courseId if given
        if (courseId) {
            const mongoose = require('mongoose');
            const cid = new mongoose.Types.ObjectId(courseId);
            if (!courseIds.some(id => id.equals(cid))) {
                courseIds.push(cid);
            }
        }

        if (courseIds.length === 0) {
            return res.json([]);
        }

        studentQuery = {
            $or: [
                { 'studentProfile.course': { $in: courseIds } },
                { 'studentProfile.coursesList.course': { $in: courseIds } }
            ]
        };
    } else {
        studentQuery = {
            $or: [
                { 'studentProfile.course': courseId },
                { 'studentProfile.coursesList.course': courseId }
            ]
        };
    }

    const students = await User.find(studentQuery).select('_id');

    if (!students || students.length === 0) {
        return res.json([]);
    }

    const studentIds = students.map(s => s._id);

    const configsQuery = {
        student: { $in: studentIds },
        displayName: { $ne: '' }
    };
    if (subject) {
        const subjectsArr = subject.split(',').map(s => s.trim()).filter(Boolean);
        const subjectRegexArr = subjectsArr.map(s => new RegExp(`^\\s*${s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*$`, 'i'));
        configsQuery.subject = { $in: subjectRegexArr };
    }

    const configs = await StudentInboxConfig.find(configsQuery).sort({ updatedAt: -1 });

    const uniqueConfigsMap = {};
    for (const config of configs) {
        const key = `${config.inboxId}_${config.subject || ''}`;
        if (!uniqueConfigsMap[key]) {
            uniqueConfigsMap[key] = config;
        }
    }

    res.json(Object.values(uniqueConfigsMap));
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

const getStudentSubjectDaysMapping = async (studentId, targetCourseId) => {
    const student = await User.findById(studentId).populate([
        { path: 'studentProfile.course' },
        { path: 'studentProfile.coursesList.course' }
    ]);
    if (!student || !student.studentProfile) return [];

    // Find the active course object
    let activeCourseObj = null;
    const list = student.studentProfile.coursesList || [];
    const foundInList = list.find(item => {
        const cId = item.course?._id || item.course;
        return String(cId) === String(targetCourseId);
    });
    if (foundInList && foundInList.course) {
        if (typeof foundInList.course === 'object' && foundInList.course !== null) {
            activeCourseObj = foundInList.course;
        } else {
            activeCourseObj = await Course.findById(foundInList.course);
        }
    } else {
        const primCourse = student.studentProfile.course;
        if (primCourse && String(primCourse._id || primCourse) === String(targetCourseId)) {
            if (typeof primCourse === 'object' && primCourse !== null) {
                activeCourseObj = primCourse;
            } else {
                activeCourseObj = await Course.findById(primCourse);
            }
        }
    }

    if (!activeCourseObj) return [];

    // Get assigned subjects
    let assignedSubjects = [];
    if (foundInList) {
        assignedSubjects = foundInList.subjects || [];
    } else {
        const assignedSubjectsString = student.studentProfile.subject;
        if (assignedSubjectsString) {
            assignedSubjects = assignedSubjectsString.split(',').map(s => s.trim()).filter(Boolean);
        }
    }

    // Merge in subjects from course subjectDurations/subjects
    const courseSubDurations = activeCourseObj.subjectDurations || [];
    courseSubDurations.forEach(d => {
        if (d.subjectName && !assignedSubjects.some(s => s.toLowerCase() === d.subjectName.toLowerCase())) {
            assignedSubjects.push(d.subjectName);
        }
    });
    const courseSubjects = activeCourseObj.subjects || [];
    courseSubjects.forEach(sub => {
        if (sub && !assignedSubjects.some(s => s.toLowerCase() === sub.toLowerCase())) {
            assignedSubjects.push(sub);
        }
    });

    const course = activeCourseObj;
    const subjects = course.subjects || [];
    const durations = course.subjectDurations || [];
    const totalDuration = course.duration || 5;

    let currentDayIndex = 1;
    const mapping = [];

    if (durations && durations.length > 0) {
        durations.forEach(d => {
            const subName = d.subjectName;
            const subDur = Number(d.duration) || 0;
            const daysList = [];
            for (let i = 1; i <= subDur; i++) {
                daysList.push({
                    dayNum: i,
                    indexNum: currentDayIndex,
                    id: `Inbox ${currentDayIndex}`
                });
                currentDayIndex++;
            }
            if (daysList.length > 0) {
                mapping.push({
                    subjectName: subName,
                    days: daysList
                });
            }
        });
    }

    const mappedSubjectNames = mapping.map(m => m.subjectName.toLowerCase());
    const remainingSubjects = subjects.filter(s => !mappedSubjectNames.includes(s.toLowerCase()));

    if (remainingSubjects.length > 0) {
        const remainingDays = Math.max(totalDuration - currentDayIndex + 1, 0);
        const daysPerSubject = remainingDays > 0 ? Math.floor(remainingDays / remainingSubjects.length) : 0;
        const extraDays = remainingDays > 0 ? remainingDays % remainingSubjects.length : 0;

        remainingSubjects.forEach((subName, idx) => {
            let subDur = daysPerSubject + (idx < extraDays ? 1 : 0);
            if (subDur <= 0) subDur = 5; // default to 5 if course duration is already exceeded
            const daysList = [];
            for (let i = 1; i <= subDur; i++) {
                daysList.push({
                    dayNum: i,
                    indexNum: currentDayIndex,
                    id: `Inbox ${currentDayIndex}`
                });
                currentDayIndex++;
            }
            if (daysList.length > 0) {
                mapping.push({
                    subjectName: subName,
                    days: daysList
                });
            }
        });
    } else if (currentDayIndex <= totalDuration) {
        const daysList = [];
        let dayCounter = 1;
        while (currentDayIndex <= totalDuration) {
            daysList.push({
                dayNum: dayCounter,
                indexNum: currentDayIndex,
                id: `Inbox ${currentDayIndex}`
            });
            currentDayIndex++;
            dayCounter++;
        }
        if (daysList.length > 0) {
            mapping.push({
                subjectName: 'Other Subjects',
                days: daysList
            });
        }
    }

    if (mapping.length === 0) {
        const daysList = [];
        for (let i = 1; i <= totalDuration; i++) {
            daysList.push({
                dayNum: i,
                indexNum: i,
                id: `Inbox ${i}`
            });
        }
        mapping.push({
            subjectName: 'General',
            days: daysList
        });
    }

    // Cross-course subjects (from all student courses)
    if (assignedSubjects && assignedSubjects.length > 0) {
        const mappedLower = new Set(mapping.map(m => m.subjectName.toLowerCase()));
        const allEnrolledCourses = [];
        const enrolledList = student.studentProfile.coursesList || [];
        for (const item of enrolledList) {
            if (item.course) {
                if (typeof item.course === 'object' && item.course !== null) {
                    allEnrolledCourses.push(item.course);
                } else {
                    const c = await Course.findById(item.course);
                    if (c) allEnrolledCourses.push(c);
                }
            }
        }
        const primCourse = student.studentProfile.course;
        if (primCourse) {
            if (typeof primCourse === 'object' && primCourse !== null) {
                allEnrolledCourses.push(primCourse);
            } else {
                const c = await Course.findById(primCourse);
                if (c) allEnrolledCourses.push(c);
            }
        }

        assignedSubjects.forEach(subName => {
            const subNameL = subName.toLowerCase();
            if (mappedLower.has(subNameL)) return;

            let foundDur = 0;
            for (const ec of allEnrolledCourses) {
                const entry = (ec.subjectDurations || []).find(
                    d => (d.subjectName || '').toLowerCase() === subNameL
                );
                if (entry && Number(entry.duration) > 0) {
                    foundDur = Number(entry.duration);
                    break;
                }
            }

            if (foundDur === 0) foundDur = 1;

            const daysList = [];
            for (let i = 1; i <= foundDur; i++) {
                daysList.push({
                    dayNum: i,
                    indexNum: currentDayIndex,
                    id: `Inbox ${currentDayIndex}`
                });
                currentDayIndex++;
            }
            mapping.push({ subjectName: subName, days: daysList });
            mappedLower.add(subNameL);
        });
    }

    // Filter by assigned subjects
    if (assignedSubjects && assignedSubjects.length > 0) {
        const lowerAssigned = assignedSubjects.map(s => s.toLowerCase());
        return mapping.filter(m => lowerAssigned.includes(m.subjectName.toLowerCase()));
    }

    return mapping;
};

const saveInboxConfig = asyncHandler(async (req, res) => {
    const { studentId, inboxId, displayName, visible, disabled, courseId, subject } = req.body;

    let targetStudentId = studentId;
    if (!targetStudentId && courseId) {
        const student = await User.findOne({
            $or: [
                { 'studentProfile.course': courseId },
                { 'studentProfile.coursesList.course': courseId }
            ]
        });
        if (student) {
            targetStudentId = student._id;
        }
    }

    if (!targetStudentId || !inboxId) {
        res.status(400);
        throw new Error('studentId (or courseId with enrolled students) and inboxId are required');
    }

    let resolvedCourseId = courseId;
    let resolvedSubject = subject;

    // Auto-resolve courseId and subject from student profile if missing
    if (targetStudentId) {
        const studentObj = await User.findById(targetStudentId);
        if (studentObj && studentObj.studentProfile) {
            if (!resolvedCourseId) {
                resolvedCourseId = studentObj.studentProfile.course;
                if (!resolvedCourseId && studentObj.studentProfile.coursesList && studentObj.studentProfile.coursesList.length > 0) {
                    resolvedCourseId = studentObj.studentProfile.coursesList[0].course;
                }
            }
            if (!resolvedSubject) {
                resolvedSubject = studentObj.studentProfile.subject;
                if (!resolvedSubject && studentObj.studentProfile.coursesList && studentObj.studentProfile.coursesList.length > 0) {
                    resolvedSubject = (studentObj.studentProfile.coursesList[0].subjects || []).join(', ');
                }
            }
        }
    }

    let oldDisplayName = '';
    const oldConfig = await StudentInboxConfig.findOne({ student: targetStudentId, inboxId, subject: resolvedSubject });
    if (oldConfig) {
        oldDisplayName = oldConfig.displayName || '';
    }

    let config = await StudentInboxConfig.findOne({ student: targetStudentId, inboxId, subject: resolvedSubject });

    if (config) {
        if (displayName !== undefined) config.displayName = displayName;
        if (visible !== undefined) config.visible = visible;
        if (disabled !== undefined) config.disabled = disabled;
        if (resolvedCourseId) config.course = resolvedCourseId;
        await config.save();
    } else {
        config = await StudentInboxConfig.create({
            student: targetStudentId,
            inboxId,
            subject: resolvedSubject || '',
            course: resolvedCourseId,
            displayName: displayName || '',
            visible: visible !== undefined ? visible : true,
            disabled: disabled !== undefined ? disabled : false
        });
    }

    // Propagate changes if displayName was updated
    if (displayName !== undefined) {
        const Course = require('../../models/Course');
        const Test = require('../../models/Test');

        // ------------------------------------------------------------------
        // 1. Find ALL courses that share the same subject so we can propagate
        //    the rename across every course, not just one.
        // ------------------------------------------------------------------
        let allCourseIdsForSubject = [];
        let allCourseNamesForSubject = [];

        if (resolvedSubject) {
            const subjectsArr = resolvedSubject.split(',').map(s => s.trim()).filter(Boolean);
            const subjectRegexArr = subjectsArr.map(s =>
                new RegExp(`^\\s*${s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*$`, 'i')
            );
            const coursesWithSubject = await Course.find({
                subjects: { $in: subjectRegexArr }
            }).select('_id name');
            allCourseIdsForSubject = coursesWithSubject.map(c => c._id);
            allCourseNamesForSubject = coursesWithSubject.map(c => c.name);
        }

        // Also include the explicitly provided courseId / name if not already in list
        if (resolvedCourseId) {
            const providedCourse = await Course.findById(resolvedCourseId).select('_id name');
            if (providedCourse) {
                const alreadyIn = allCourseIdsForSubject.some(id => id.equals(providedCourse._id));
                if (!alreadyIn) {
                    allCourseIdsForSubject.push(providedCourse._id);
                    allCourseNamesForSubject.push(providedCourse.name);
                }
            }
        }

        // ------------------------------------------------------------------
        // 2. Find ALL students enrolled in any of those courses and propagate
        //    the displayName rename to their inbox configs.
        // ------------------------------------------------------------------
        // Resolve the dayNum from the source student's mapping
        let dayNum = null;
        if (targetStudentId && resolvedSubject && resolvedCourseId) {
            try {
                const sourceMapping = await getStudentSubjectDaysMapping(targetStudentId, resolvedCourseId);
                const subGroup = sourceMapping.find(m => m.subjectName.toLowerCase() === resolvedSubject.toLowerCase());
                if (subGroup) {
                    const dayEntry = subGroup.days.find(d => d.id.toLowerCase() === inboxId.toLowerCase());
                    if (dayEntry) {
                        dayNum = dayEntry.dayNum;
                    }
                }
            } catch (err) {
                console.error("Error resolving dayNum in saveInboxConfig:", err);
            }
        }

        let allStudentIds = [];
        if (allCourseIdsForSubject.length > 0) {
            const studentsAcrossCourses = await User.find({
                $or: [
                    { 'studentProfile.course': { $in: allCourseIdsForSubject } },
                    { 'studentProfile.coursesList.course': { $in: allCourseIdsForSubject } }
                ]
            }).select('_id');
            allStudentIds = studentsAcrossCourses.map(s => s._id);
        } else if (resolvedCourseId) {
            const studentsInCourse = await User.find({
                $or: [
                    { 'studentProfile.course': resolvedCourseId },
                    { 'studentProfile.coursesList.course': resolvedCourseId }
                ]
            }).select('_id');
            allStudentIds = studentsInCourse.map(s => s._id);
        }

        if (allStudentIds.length > 0) {
            await Promise.all(
                allStudentIds.map(async (sId) => {
                    const sIdStr = String(sId);
                    
                    // Resolve all targetInboxIds for this student
                    let targetInboxIds = [];
                    if (dayNum !== null && resolvedSubject) {
                        try {
                            const targetStudentObj = await User.findById(sId).select('studentProfile');
                            if (targetStudentObj && targetStudentObj.studentProfile) {
                                // Collect all course IDs for the target student
                                const coursesToCheck = [];
                                if (targetStudentObj.studentProfile.course) {
                                    coursesToCheck.push(String(targetStudentObj.studentProfile.course));
                                }
                                if (targetStudentObj.studentProfile.coursesList) {
                                    targetStudentObj.studentProfile.coursesList.forEach(item => {
                                        if (item.course) coursesToCheck.push(String(item.course._id || item.course));
                                    });
                                }
                                
                                // For each course, find the day ID corresponding to this subject and dayNum
                                for (const cId of coursesToCheck) {
                                    const targetMapping = await getStudentSubjectDaysMapping(sId, cId);
                                    const subGroup = targetMapping.find(m => m.subjectName.toLowerCase() === resolvedSubject.toLowerCase());
                                    if (subGroup) {
                                        const dayEntry = subGroup.days.find(d => d.dayNum === dayNum);
                                        if (dayEntry && dayEntry.id) {
                                            targetInboxIds.push(dayEntry.id);
                                        }
                                    }
                                }
                            }
                        } catch (err) {
                            console.error(`Error resolving targetInboxIds for student ${sId}:`, err);
                        }
                    }

                    // Fallback to the original inboxId if no specific target ID was resolved
                    if (targetInboxIds.length === 0) {
                        targetInboxIds.push(inboxId);
                    }

                    // Deduplicate
                    targetInboxIds = [...new Set(targetInboxIds)];

                    // Update configs for resolved day IDs
                    for (const tInboxId of targetInboxIds) {
                        const existing = await StudentInboxConfig.findOne({ student: sId, inboxId: tInboxId }).select('displayName');
                        const existingName = existing ? (existing.displayName || '') : '';
                        
                        const defaultLike = (name) => {
                            if (!name) return true;
                            return name === '' || /^index\s+\d+$/i.test(name) || name === oldDisplayName;
                        };

                        if (defaultLike(existingName)) {
                            await StudentInboxConfig.findOneAndUpdate(
                                { student: sId, inboxId: tInboxId },
                                { $set: { displayName } },
                                { upsert: true, new: true }
                            );
                        }
                    }
                })
            );
        }

        // ------------------------------------------------------------------
        // 3. Update test indices across ALL courses that share this subject.
        // ------------------------------------------------------------------
        const searchIndexNames = [inboxId];
        if (oldDisplayName) {
            searchIndexNames.push(oldDisplayName);
        }

        if (allCourseNamesForSubject.length > 0 && resolvedSubject) {
            const subjectsArr = resolvedSubject.split(',').map(s => s.trim()).filter(Boolean);
            const subjectRegexArr = subjectsArr.map(s =>
                new RegExp(`^\\s*${s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*$`, 'i')
            );
            // Update tests in ALL matching courses + subject
            await Test.updateMany(
                {
                    course: { $in: allCourseNamesForSubject },
                    subject: { $in: subjectRegexArr },
                    index: { $in: searchIndexNames }
                },
                { $set: { index: displayName } }
            );
        } else if (allCourseNamesForSubject.length > 0) {
            // No subject filter — update in all matching courses
            await Test.updateMany(
                {
                    course: { $in: allCourseNamesForSubject },
                    index: { $in: searchIndexNames }
                },
                { $set: { index: displayName } }
            );
        }
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
        .populate('studentProfile.course', 'name subjects duration subjectDurations')
        .populate('studentProfile.coursesList.course', 'name subjects duration subjectDurations')
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

    if (user.role === 'Admin') {
        res.status(400);
        throw new Error('Admin users cannot be deleted');
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
        // Admin can see all role requests without targetApprover restriction
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

    // Verify authorization: Admin can approve everything, Institute can only approve their own requests
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

    // Verify authorization: Admin can reject everything, Institute can only reject their own requests
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
    const { newRole, password, institute, courseId, courseIds, section, sections } = req.body;
    const userId = req.user._id;

    const validRoles = ['Admin', 'Teacher', 'Student', 'Editor', 'Institute', 'Accountant', 'Marketer', 'Staff', 'Parent', 'Guest'];
    if (!validRoles.includes(newRole)) {
        res.status(400);
        throw new Error('Invalid role specified');
    }

    const user = await User.findById(userId);

    // Verify password if switching from Student or Teacher role (and user is not an Admin/Institute)
    const isOriginalAdminOrInstitute = user.allowedRoles && (user.allowedRoles.includes('Admin') || user.allowedRoles.includes('Institute'));
    if ((user.role === 'Student' || user.role === 'Teacher') && !isOriginalAdminOrInstitute) {
        if (!password) {
            res.status(400);
            throw new Error(`Password is required to switch from ${user.role} role`);
        }
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            res.status(401);
            throw new Error('Invalid password. Access denied.');
        }
    }

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

    // Apply role-specific metadata (institute, course, section) for context switching
    if (institute) {
        user.institute = institute;
    }
    if (newRole === 'Student') {
        if (!user.studentProfile) user.studentProfile = {};
        if (courseId) user.studentProfile.course = courseId;
        if (section) user.studentProfile.section = section;
    } else if (newRole === 'Teacher') {
        if (!user.teacherProfile) user.teacherProfile = {};
        if (courseIds) user.teacherProfile.assignedCourses = courseIds;
        if (sections) user.teacherProfile.assignedSections = sections;
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
            institute: user.institute,
            studentProfile: user.studentProfile,
            teacherProfile: user.teacherProfile
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
        const { name, email, password, role, courseName, mobileNumber, admissionNo, instituteName, subject, batch, section } = uItem;
        if (!name || !email || !role) {
            results.errors.push({ row: uItem, error: 'Name, email, and role are required' });
            continue;
        }

        try {
            // Resolve Institute if provided by name
            let userInstitute = creatorInstitute;
            if (instituteName && instituteName.trim()) {
                const InstituteModel = require('../../models/Institute');
                const instObj = await InstituteModel.findOne({
                    name: { $regex: new RegExp(`^\\s*${escapeRegex(instituteName.trim())}`, 'i') },
                    isDeleted: { $ne: true }
                });
                if (instObj) {
                    userInstitute = instObj._id;
                }
            }

            let courseId = null;
            if (courseName && ['Student', 'Teacher', 'Editor'].includes(role)) {
                // Remove any trailing ellipsis from truncation
                const cleanCourseQuery = courseName.trim().replace(/\.\.\./g, '').trim();
                const courseObj = await Course.findOne({ 
                    name: { $regex: new RegExp(`^${escapeRegex(cleanCourseQuery)}`, 'i') },
                    institute: userInstitute
                });
                if (courseObj) {
                    courseId = courseObj._id;
                } else if (role === 'Student') {
                    results.errors.push({ row: uItem, error: `Course "${courseName}" not found in this institute` });
                    continue;
                }
            }

            const userExists = await User.findOne({ email });
            if (userExists) {
                // Update existing user instead of failing
                userExists.name = name || userExists.name;
                userExists.mobileNumber = mobileNumber || userExists.mobileNumber;
                userExists.institute = userInstitute || userExists.institute;
                if (admissionNo && admissionNo.trim()) {
                    userExists.admissionNo = admissionNo.trim();
                }

                if (role === 'Student') {
                    if (!userExists.studentProfile) userExists.studentProfile = {};
                    if (courseId) userExists.studentProfile.course = courseId;
                    if (section && section.trim()) userExists.studentProfile.section = section.trim();
                    if (batch && batch.trim()) userExists.studentProfile.batch = batch.trim();
                    if (subject && subject.trim()) userExists.studentProfile.subject = subject.trim();
                } else if (role === 'Teacher') {
                    if (!userExists.teacherProfile) userExists.teacherProfile = {};
                    if (courseId && !userExists.teacherProfile.assignedCourses.includes(courseId)) {
                        userExists.teacherProfile.assignedCourses.push(courseId);
                    }
                    if (subject && !userExists.teacherProfile.subjects.includes(subject)) {
                        userExists.teacherProfile.subjects.push(subject);
                    }
                } else if (role === 'Editor') {
                    if (!userExists.editorProfile) userExists.editorProfile = {};
                    if (courseId && !userExists.editorProfile.assignedCourses.includes(courseId)) {
                        userExists.editorProfile.assignedCourses.push(courseId);
                    }
                    if (subject && !userExists.editorProfile.subjects.includes(subject)) {
                        userExists.editorProfile.subjects.push(subject);
                    }
                }

                await userExists.save();
                results.successCount++;
                continue;
            }

            // Resolve / Auto-generate Unique Admission No.
            let finalAdmissionNo = '';
            if (admissionNo && admissionNo.trim()) {
                finalAdmissionNo = admissionNo.trim();
            } else if (role === 'Student') {
                let isUnique = false;
                let attempts = 0;
                while (!isUnique && attempts < 20) {
                    const randVal = Math.floor(10000 + Math.random() * 90000);
                    const candidate = `UQ-${randVal}`;
                    const dup = await User.findOne({ admissionNo: candidate });
                    if (!dup) {
                        finalAdmissionNo = candidate;
                        isUnique = true;
                    }
                    attempts++;
                }
            }

            const userFields = {
                name,
                email,
                password: password || 'Welcome123',
                role,
                institute: userInstitute,
                mobileNumber: mobileNumber || '',
                admissionNo: finalAdmissionNo,
                callEnabled: true
            };

            if (role === 'Student') {
                const assignedSection = section && section.trim() ? section.trim() : await computeSection(courseId);
                userFields.studentProfile = {
                    course: courseId,
                    section: assignedSection,
                    batch: batch && batch.trim() ? batch.trim() : '',
                    subject: subject && subject.trim() ? subject.trim() : '',
                    enrollmentDate: new Date(),
                    controls: {}
                };
            } else if (role === 'Teacher') {
                userFields.teacherProfile = {
                    assignedCourses: courseId ? [courseId] : [],
                    subjects: subject ? [subject] : [],
                    studentAssignmentMode: 'all',
                    assignedSections: [],
                    assignedStudents: [],
                    controls: {}
                };
            } else if (role === 'Editor') {
                userFields.editorProfile = {
                    assignedCourses: courseId ? [courseId] : [],
                    subjects: subject ? [subject] : [],
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
    getInboxConfigsByCourseSubject,
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
