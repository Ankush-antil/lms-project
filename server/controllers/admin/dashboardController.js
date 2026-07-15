const asyncHandler = require('express-async-handler');
const User = require('../../models/User');
const Course = require('../../models/Course');
const Test = require('../../models/Test');
const Activity = require('../../models/Activity');
const Institute = require('../../models/Institute');
const Application = require('../../models/Application');
const PublicSubmission = require('../../models/PublicSubmission');

// @desc    Get dashboard stats and activities
// @route   GET /api/dashboard/stats
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
    // 1. User stats by roles (counted under active role or any of their allowed roles)
    const studentCount = await User.countDocuments({ role: 'Student' });
    const teacherCount = await User.countDocuments({ role: 'Teacher' });
    const editorCount = await User.countDocuments({ role: 'Editor' });
    const staffCount = await User.countDocuments({ role: 'Staff' });
    const accountantCount = await User.countDocuments({ role: 'Accountant' });
    const marketerCount = await User.countDocuments({ role: 'Marketer' });
    const parentCount = await User.countDocuments({ role: 'Parent' });

    // 2. User classification counts
    const registeredCount = await User.countDocuments({ role: { $ne: 'Admin' } });
    const guestCount = await Application.countDocuments({});
    
    // Limited users are unique candidates in PublicSubmissions
    const limitedUsersUnique = await PublicSubmission.distinct('email');
    const limitedCount = limitedUsersUnique.length;

    // Total Users
    const totalUsersCount = registeredCount + guestCount + limitedCount;

    // 3. Content counts
    const courseCount = await Course.countDocuments({ isDeleted: { $ne: true } });
    const instituteCount = await Institute.countDocuments({ isDeleted: { $ne: true } });
    
    // Unique subjects aggregation from all active courses
    const coursesForSubjects = await Course.find({ isDeleted: { $ne: true } }, 'subjects');
    const uniqueSubjects = new Set();
    coursesForSubjects.forEach(c => {
        if (c.subjects && Array.isArray(c.subjects)) {
            c.subjects.forEach(s => {
                if (s) uniqueSubjects.add(s.trim());
            });
        }
    });
    const subjectCount = uniqueSubjects.size;

    const testCount = await Test.countDocuments({});
    const servicesCount = 3; // Drive, Notes, Chat

    const activities = await Activity.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'name');

    res.json({
        stats: {
            students: studentCount,
            teachers: teacherCount,
            editors: editorCount,
            staff: staffCount,
            accountants: accountantCount,
            marketers: marketerCount,
            parents: parentCount,
            registeredUsers: registeredCount,
            guestUsers: guestCount,
            limitedUsers: limitedCount,
            totalUsers: totalUsersCount,
            courses: courseCount,
            institutes: instituteCount,
            subjects: subjectCount,
            tests: testCount,
            services: servicesCount
        },
        activities
    });
});

module.exports = { getDashboardStats };

