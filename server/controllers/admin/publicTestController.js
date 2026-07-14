const asyncHandler = require('express-async-handler');
const Test = require('../../models/Test');
const PublicSubmission = require('../../models/PublicSubmission');

// @desc    Get dashboard list of public tests with views/responses count
// @route   GET /api/public-tests/admin/dashboard
// @access  Private/Admin
const getPublicTestsDashboard = asyncHandler(async (req, res) => {
    const tests = await Test.find({ publishMode: 'public' }).sort({ createdAt: -1 });
    
    const dashboardData = await Promise.all(tests.map(async (test) => {
        const submissions = await PublicSubmission.find({ test: test._id });
        const attempts = submissions.length;
        const completed = submissions.filter(s => s.completedStatus === 'Completed').length;
        
        let averageScore = 0;
        if (attempts > 0) {
            const sum = submissions.reduce((acc, s) => acc + (s.score || 0), 0);
            averageScore = Math.round((sum / attempts) * 10) / 10;
        }

        const completionRate = attempts > 0 ? Math.round((completed / attempts) * 100) : 0;

        return {
            _id: test._id,
            title: test.title,
            institute: test.institute,
            course: test.course,
            subject: test.subject,
            publicViews: test.publicViews || 0,
            totalResponses: attempts,
            completionRate,
            averageScore,
            status: test.status || 'active',
            publicSettings: test.publicSettings || {}
        };
    }));

    res.json(dashboardData);
});

// @desc    Get stats for a public test (Admin only)
// @route   GET /api/public-tests/admin/:id/stats
// @access  Private/Admin
const getPublicTestStats = asyncHandler(async (req, res) => {
    const test = await Test.findById(req.params.id);
    if (!test) {
        return res.status(404).json({ message: 'Test not found' });
    }

    const submissions = await PublicSubmission.find({ test: test._id });
    const attempts = submissions.length;
    const completed = submissions.filter(s => s.completedStatus === 'Completed').length;

    let averageScore = 0;
    if (attempts > 0) {
        const sum = submissions.reduce((acc, s) => acc + (s.score || 0), 0);
        averageScore = Math.round((sum / attempts) * 10) / 10;
    }

    // Device breakdown
    const devices = {};
    submissions.forEach(s => {
        const dev = s.deviceInfo || 'Desktop';
        devices[dev] = (devices[dev] || 0) + 1;
    });

    // Timeline breakdown (by date)
    const timeline = {};
    submissions.forEach(s => {
        const dateStr = new Date(s.submittedAt).toLocaleDateString('en-GB');
        timeline[dateStr] = (timeline[dateStr] || 0) + 1;
    });

    res.json({
        testId: test._id,
        title: test.title,
        views: test.publicViews || 0,
        attempts,
        completed,
        averageScore,
        deviceBreakdown: Object.keys(devices).map(name => ({ name, value: devices[name] })),
        timeline: Object.keys(timeline).map(date => ({ date, count: timeline[date] }))
    });
});

// @desc    Get guest responses (submissions) (Admin only)
// @route   GET /api/public-tests/admin/:id/submissions
// @access  Private/Admin
const getPublicTestSubmissions = asyncHandler(async (req, res) => {
    const submissions = await PublicSubmission.find({ test: req.params.id }).sort({ submittedAt: -1 });
    res.json(submissions);
});

// @desc    Toggle test enabled/disabled status (Admin only)
// @route   PUT /api/public-tests/admin/:id/toggle-status
// @access  Private/Admin
const togglePublicTestStatus = asyncHandler(async (req, res) => {
    const test = await Test.findById(req.params.id);
    if (!test) {
        return res.status(404).json({ message: 'Test not found' });
    }

    test.status = test.status === 'active' ? 'disabled' : 'active';
    await test.save();
    res.json({ success: true, status: test.status });
});

// @desc    Update public settings (Admin only)
// @route   PUT /api/public-tests/admin/:id/settings
// @access  Private/Admin
const updatePublicTestSettings = asyncHandler(async (req, res) => {
    const { publicSettings, status, publishMode } = req.body;
    const test = await Test.findById(req.params.id);
    if (!test) {
        return res.status(404).json({ message: 'Test not found' });
    }

    if (publicSettings !== undefined) test.publicSettings = publicSettings;
    if (status !== undefined) test.status = status;
    if (publishMode !== undefined) test.publishMode = publishMode;

    await test.save();
    res.json({ success: true, test });
});

// @desc    Delete guest submission (Admin only)
// @route   DELETE /api/public-tests/admin/submissions/:id
// @access  Private/Admin
const deletePublicSubmission = asyncHandler(async (req, res) => {
    const submission = await PublicSubmission.findById(req.params.id);
    if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
    }
    submission.isDeleted = true;
    await submission.save();
    res.json({ success: true, message: 'Submission moved to Recycle Bin' });
});

// @desc    Get all guest responses (submissions) (Admin only)
// @route   GET /api/public-tests/admin/submissions
// @access  Private/Admin
const getAllPublicSubmissions = asyncHandler(async (req, res) => {
    let query = { isDeleted: { $ne: true } };
    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor')) {
        const tests = await Test.find({ institute: req.user.institute });
        const testIds = tests.map(t => t._id);
        query.test = { $in: testIds };
    }
    const submissions = await PublicSubmission.find(query)
        .populate('test', 'title')
        .sort({ submittedAt: -1 });
    res.json(submissions);
});

// @desc    Get soft-deleted public submissions
// @route   GET /api/public-tests/admin/submissions/trash
// @access  Private/Admin
const getDeletedSubmissions = asyncHandler(async (req, res) => {
    let query = { isDeleted: true };
    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor')) {
        const tests = await Test.find({ institute: req.user.institute });
        const testIds = tests.map(t => t._id);
        query.test = { $in: testIds };
    }
    const submissions = await PublicSubmission.find(query)
        .populate('test', 'title')
        .sort({ updatedAt: -1 });
    res.json(submissions);
});

// @desc    Restore a soft-deleted public submission
// @route   PUT /api/public-tests/admin/submissions/:id/restore
// @access  Private/Admin
const restoreSubmission = asyncHandler(async (req, res) => {
    const submission = await PublicSubmission.findById(req.params.id);
    if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
    }
    submission.isDeleted = false;
    await submission.save();
    res.json({ success: true, message: 'Submission restored successfully', submission });
});

// @desc    Permanently delete a public submission
// @route   DELETE /api/public-tests/admin/submissions/:id/permanent
// @access  Private/Admin
const permanentlyDeleteSubmission = asyncHandler(async (req, res) => {
    const submission = await PublicSubmission.findById(req.params.id);
    if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
    }
    await submission.deleteOne();
    res.json({ success: true, message: 'Submission permanently deleted' });
});

// @desc    Import public test submissions in bulk
// @route   POST /api/public-tests/admin/submissions/import
// @access  Private/Admin
const importSubmissions = asyncHandler(async (req, res) => {
    const { submissions } = req.body;
    if (!Array.isArray(submissions)) {
        res.status(400);
        throw new Error('Submissions must be an array');
    }

    const results = {
        successCount: 0,
        errors: []
    };

    for (const subItem of submissions) {
        const { testTitle, name, email, phone, score, completedStatus, submittedAt } = subItem;
        if (!name || !email || !testTitle) {
            results.errors.push({ row: subItem, error: 'Name, email, and testTitle are required' });
            continue;
        }

        try {
            // Find a test matching testTitle
            const test = await Test.findOne({
                title: { $regex: new RegExp(`^${testTitle.trim()}$`, 'i') }
            });
            if (!test) {
                results.errors.push({ row: subItem, error: `Test "${testTitle}" not found` });
                continue;
            }

            await PublicSubmission.create({
                test: test._id,
                name,
                email,
                phone: phone || '',
                score: Number(score) || 0,
                completedStatus: completedStatus || 'Completed',
                status: 'submitted',
                submittedAt: submittedAt ? new Date(submittedAt) : new Date()
            });

            results.successCount++;
        } catch (error) {
            results.errors.push({ row: subItem, error: error.message });
        }
    }

    res.status(200).json({
        success: true,
        message: `Successfully imported ${results.successCount} submissions`,
        results
    });
});

// @desc    Evaluate guest submission (Admin only)
// @route   PUT /api/public-tests/admin/submissions/:id/evaluate
// @access  Private/Admin
const evaluatePublicSubmission = asyncHandler(async (req, res) => {
    const { answers, score } = req.body;
    const submission = await PublicSubmission.findById(req.params.id);
    if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
    }

    if (answers && Array.isArray(answers)) {
        submission.answers = answers;
    }
    if (score !== undefined) {
        submission.score = score;
    }
    submission.status = 'evaluated';

    await submission.save();
    res.json({ success: true, submission });
});

module.exports = {
    getPublicTestsDashboard,
    getPublicTestStats,
    getPublicTestSubmissions,
    togglePublicTestStatus,
    updatePublicTestSettings,
    deletePublicSubmission,
    getAllPublicSubmissions,
    evaluatePublicSubmission,
    getDeletedSubmissions,
    restoreSubmission,
    permanentlyDeleteSubmission,
    importSubmissions
};
