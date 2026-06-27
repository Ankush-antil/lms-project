const asyncHandler = require('express-async-handler');
const User = require('../../models/User');
const Activity = require('../../models/Activity');
const Course = require('../../models/Course');

// @desc    Get all users (filtered by role)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
    const role = req.query.role;
    const query = role ? { role } : {};
    
    // Isolate by institute for Institute role
    if (req.user && req.user.role === 'Institute') {
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
    const { name, email, password, role, course, subjects, subject, mobileNumber } = req.body;
    let institute = req.body.institute;

    // Enforce creator's institute for Institute users
    if (req.user && req.user.role === 'Institute') {
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
        // Enforce institute isolation
        if (req.user && req.user.role === 'Institute' && user.institute?.toString() !== req.user.institute?.toString()) {
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
        // Enforce institute isolation
        if (req.user && req.user.role === 'Institute' && user.institute?.toString() !== req.user.institute?.toString()) {
            res.status(403);
            throw new Error('Not authorized to update users belonging to other institutes');
        }

        user.name = req.body.name !== undefined ? req.body.name : user.name;
        user.email = req.body.email !== undefined ? req.body.email : user.email;
        user.avatar = req.body.avatar !== undefined ? req.body.avatar : user.avatar;
        
        // Prevent Institute users from changing user's institute
        if (req.user.role !== 'Institute') {
            user.institute = req.body.institute !== undefined ? req.body.institute : user.institute;
        }
        
        user.mobileNumber = req.body.mobileNumber !== undefined ? req.body.mobileNumber : user.mobileNumber;
        user.isActive = req.body.isActive !== undefined ? req.body.isActive : user.isActive;

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

module.exports = {
    getUsers,
    createUser,
    deleteUser,
    updateUser
};
