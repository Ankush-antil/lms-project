const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Course = require('../models/Course');
const Institute = require('../models/Institute');
const Test = require('../models/Test');

// @desc    Get all users (filtered by role)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
    const role = req.query.role;
    const query = role ? { role } : {};
    console.log(`[API] Fetching users with query:`, query);

    const users = await User.find(query)
        .select('-password')
        .populate('institute', 'name')
        .populate('studentProfile.course', 'name')
        .populate('teacherProfile.assignedCourses', 'name');

    console.log(`[API] Found ${users.length} users for role: ${role || 'All'}`);
    res.json(users);
});

// @desc    Get students for the logged in teacher
// @route   GET /api/users/teacher-students
// @access  Private (Teacher)
const getTeacherStudents = asyncHandler(async (req, res) => {
    try {
        const teacher = await User.findById(req.user._id).populate('teacherProfile.assignedCourses', 'name');
        if (!teacher || teacher.role !== 'Teacher') {
            return res.status(403).json({ message: 'Not authorized as a teacher' });
        }

        const assignedCourses = teacher.teacherProfile?.assignedCourses || [];
        console.log(`[API] Teacher ${teacher.name} fetching students for courses:`, assignedCourses.map(c => c._id || c));

        // Find students whose course ID is in the teacher's assignedCourses list
        const students = await User.find({
            role: 'Student',
            'studentProfile.course': { $in: assignedCourses }
        })
            .select('-password')
            .populate('institute', 'name')
            .populate('studentProfile.course', 'name');

        // For each student, let's also attach submission counts if possible
        const Submission = require('../models/Submission');

        const studentsWithStats = await Promise.all(students.map(async (student) => {
            try {
                // Find tests matching teacher's assignments
                const matchingTests = await Test.find({
                    $or: [
                        { course: { $in: teacher.teacherProfile?.assignedCourses?.map(c => c.name) || [] } },
                        { subject: { $in: teacher.teacherProfile?.subjects || [] } }
                    ]
                }).select('_id');
                const testIds = matchingTests.map(t => t._id);

                const subs = await Submission.find({
                    student: student._id,
                    test: { $in: testIds }
                });

                return {
                    ...student.toObject(),
                    stats: {
                        pending: subs.filter(s => s.status === 'submitted').length,
                        completed: subs.filter(s => s.status === 'evaluated').length,
                        total: subs.length
                    }
                };
            } catch (err) {
                console.error(`Error processing stats for student ${student._id}:`, err);
                return { ...student.toObject(), stats: { pending: 0, completed: 0, total: 0 } };
            }
        }));

        res.json(studentsWithStats);
    } catch (error) {
        console.error('CRITICAL ERROR IN getTeacherStudents:', error);
        res.status(500).json({ message: error.message });
    }
});


// @desc    Get User Profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
        .select('-password')
        .populate('institute', 'name')
        .populate('studentProfile.course', 'name');
    if (user) {
        res.json(user);
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
    console.log(`FETCH PROFILE - Requested ID: ${req.params.id} by User: ${req.user._id}`);

    if (!req.params.id || req.params.id === 'undefined' || req.params.id === '[object Object]') {
        console.error('FETCH PROFILE - Invalid ID provided');
        return res.status(400).json({ message: 'Invalid User ID format' });
    }

    const user = await User.findById(req.params.id)
        .select('-password')
        .populate('institute', 'name')
        .populate('studentProfile.course', 'name')
        .populate('teacherProfile.assignedCourses', 'name');

    if (user) {
        console.log(`FETCH PROFILE - Found user: ${user.name} (${user.role})`);
        res.json(user);
    } else {
        console.warn(`FETCH PROFILE - User not found for ID: ${req.params.id}`);
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Create User (Admin only)
// @route   POST /api/users
// @access  Private/Admin
const createUser = asyncHandler(async (req, res) => {
    const { name, email, password, role, course, subjects, institute, subject, mobileNumber } = req.body;

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
        mobileNumber: mobileNumber || ''
    };

    if (role === 'Student') {
        userFields.studentProfile = {
            course,
            subject: subject || '',
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
        await user.deleteOne();
        res.json({ message: 'User removed' });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
        user.name = req.body.name !== undefined ? req.body.name : user.name;
        user.email = req.body.email !== undefined ? req.body.email : user.email;
        user.avatar = req.body.avatar !== undefined ? req.body.avatar : user.avatar;
        user.institute = req.body.institute !== undefined ? req.body.institute : user.institute;
        user.mobileNumber = req.body.mobileNumber !== undefined ? req.body.mobileNumber : user.mobileNumber;

        if (req.body.password && req.body.password.trim() !== '') {
            user.password = req.body.password;
        }

        if (user.role === 'Student') {
            user.studentProfile = {
                ...user.studentProfile,
                course: req.body.course || user.studentProfile?.course,
                subject: req.body.subject !== undefined ? req.body.subject : user.studentProfile?.subject
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

// @desc    Update User Profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.avatar = req.body.avatar !== undefined ? req.body.avatar : user.avatar;

        if (req.body.password && req.body.password.trim() !== '') {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            avatar: updatedUser.avatar
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

module.exports = {
    getUsers,
    getTeacherStudents,
    getUserProfile,
    createUser,
    deleteUser,
    updateUser,
    getUserById,
    updateUserProfile
};
