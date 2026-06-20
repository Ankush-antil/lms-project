const asyncHandler = require('express-async-handler');
const User = require('../../models/User');
const Course = require('../../models/Course');
const Test = require('../../models/Test');
const Activity = require('../../models/Activity');
const Institute = require('../../models/Institute');

// @desc    Get dashboard stats and activities
// @route   GET /api/dashboard/stats
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
    const studentCount = await User.countDocuments({ role: 'Student' });
    const teacherCount = await User.countDocuments({ role: 'Teacher' });
    const courseCount = await Course.countDocuments({ status: 'active' });
    const testCount = await Test.countDocuments({});
    const instituteCount = await Institute.countDocuments({});

    const activities = await Activity.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'name');

    res.json({
        stats: {
            students: studentCount,
            teachers: teacherCount,
            courses: courseCount,
            tests: testCount,
            institutes: instituteCount
        },
        activities
    });
});

module.exports = { getDashboardStats };
