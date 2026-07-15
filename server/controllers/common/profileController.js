const asyncHandler = require('express-async-handler');
const User = require('../../models/User');

// @desc    Get User Profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
        .select('-password')
        .populate([
            { path: 'institute', select: 'name imageUrl wifiNetworks' },
            { path: 'studentProfile.course', select: 'name subjects duration subjectDurations' },
            { path: 'studentProfile.coursesList.course', select: 'name subjects duration subjectDurations' },
            { path: 'parentProfile.student', select: 'name email studentProfile' },
            { path: 'teacherProfile.assignedCourses', select: 'name subjects subjectDurations' },
            { path: 'editorProfile.assignedCourses', select: 'name subjects subjectDurations' }
        ]);
    if (user) {
        const userObj = user.toObject();
        if (userObj.role === 'Teacher') {
            const teacherSubjects = userObj.teacherProfile?.subjects || [];
            if (userObj.teacherProfile && userObj.teacherProfile.assignedCourses) {
                userObj.teacherProfile.assignedCourses = userObj.teacherProfile.assignedCourses.map(course => {
                    if (course) {
                        course.subjects = (course.subjects || []).filter(subject => teacherSubjects.includes(subject));
                        course.subjectDurations = (course.subjectDurations || []).filter(sd => teacherSubjects.includes(sd.subjectName));
                    }
                    return course;
                });
            }
        }
        res.json(userObj);
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = asyncHandler(async (req, res) => {
    console.log(`FETCH PROFILE - Requested ID: ${req.params.id} by User: ${req.user._id}`);

    if (!req.params.id || req.params.id === 'undefined' || req.params.id === '[object Object]') {
        console.error('FETCH PROFILE - Invalid ID provided');
        return res.status(400).json({ message: 'Invalid User ID format' });
    }

    const user = await User.findById(req.params.id)
        .select('-password')
        .populate([
            { path: 'institute', select: 'name imageUrl wifiNetworks' },
            { path: 'studentProfile.course', select: 'name subjects duration subjectDurations' },
            { path: 'studentProfile.coursesList.course', select: 'name subjects duration subjectDurations' },
            { path: 'parentProfile.student', select: 'name email studentProfile' },
            { path: 'teacherProfile.assignedCourses', select: 'name subjects subjectDurations' },
            { path: 'teacherProfile.assignedStudents', select: 'name email studentProfile' },
            { path: 'editorProfile.assignedCourses', select: 'name subjects subjectDurations' }
        ]);

    if (user) {
        console.log(`FETCH PROFILE - Found user: ${user.name} (${user.role})`);
        const userObj = user.toObject();
        if (req.user && req.user.role === 'Teacher') {
            const teacher = await User.findById(req.user._id);
            const teacherSubjects = teacher?.teacherProfile?.subjects || [];
            
            if (userObj.role === 'Teacher') {
                if (userObj.teacherProfile && userObj.teacherProfile.assignedCourses) {
                    userObj.teacherProfile.assignedCourses = userObj.teacherProfile.assignedCourses.map(course => {
                        if (course) {
                            course.subjects = (course.subjects || []).filter(subject => teacherSubjects.includes(subject));
                            course.subjectDurations = (course.subjectDurations || []).filter(sd => teacherSubjects.includes(sd.subjectName));
                        }
                        return course;
                    });
                }
            } else if (userObj.role === 'Student') {
                if (userObj.studentProfile) {
                    if (userObj.studentProfile.subject) {
                        const studentSubs = userObj.studentProfile.subject.split(',').map(s => s.trim()).filter(Boolean);
                        userObj.studentProfile.subject = studentSubs.filter(sub => teacherSubjects.includes(sub)).join(', ');
                    }
                    if (userObj.studentProfile.course) {
                        userObj.studentProfile.course.subjects = (userObj.studentProfile.course.subjects || []).filter(sub => teacherSubjects.includes(sub));
                        userObj.studentProfile.course.subjectDurations = (userObj.studentProfile.course.subjectDurations || []).filter(sd => teacherSubjects.includes(sd.subjectName));
                    }
                    if (userObj.studentProfile.coursesList) {
                        userObj.studentProfile.coursesList = userObj.studentProfile.coursesList.map(item => {
                            if (item.course) {
                                item.course.subjects = (item.course.subjects || []).filter(sub => teacherSubjects.includes(sub));
                                item.course.subjectDurations = (item.course.subjectDurations || []).filter(sd => teacherSubjects.includes(sd.subjectName));
                            }
                            if (item.subjects) {
                                item.subjects = (item.subjects || []).filter(sub => teacherSubjects.includes(sub));
                            }
                            return item;
                        });
                    }
                }
            }
        }
        res.json(userObj);
    } else {
        console.warn(`FETCH PROFILE - User not found for ID: ${req.params.id}`);
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
        user.mobileNumber = req.body.mobileNumber !== undefined ? req.body.mobileNumber : user.mobileNumber;
        user.callEnabled = req.body.callEnabled !== undefined ? req.body.callEnabled : user.callEnabled;

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
    getUserProfile,
    getUserById,
    updateUserProfile
};
