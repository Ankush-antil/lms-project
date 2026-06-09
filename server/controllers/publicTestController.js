const asyncHandler = require('express-async-handler');
const Test = require('../models/Test');
const PublicSubmission = require('../models/PublicSubmission');

// @desc    Get public test by ID
// @route   GET /api/public-tests/:id
// @access  Public
const getPublicTestById = asyncHandler(async (req, res) => {
    const test = await Test.findById(req.params.id);
    if (!test) {
        return res.status(404).json({ message: 'Test not found' });
    }

    if (test.publishMode !== 'public') {
        return res.status(403).json({ message: 'This test is not published to the web.' });
    }

    if (test.status === 'disabled') {
        return res.status(403).json({ message: 'This test link has been disabled by the instructor.' });
    }

    // Check Start / End date
    const now = new Date();
    if (test.publicSettings?.startDate && new Date(test.publicSettings.startDate) > now) {
        return res.status(403).json({ message: `This test starts on ${new Date(test.publicSettings.startDate).toLocaleString()}.` });
    }
    if (test.publicSettings?.endDate && new Date(test.publicSettings.endDate) < now) {
        return res.status(403).json({ message: 'This test has ended and is no longer accepting responses.' });
    }
    if (test.publicSettings?.expiryDate && new Date(test.publicSettings.expiryDate) < now) {
        return res.status(403).json({ message: 'This test link has expired.' });
    }

    // Check Password Protection
    const password = req.headers['x-test-password'] || req.query.password;
    const hasPassword = test.publicSettings?.password && test.publicSettings.password.trim() !== '';

    if (hasPassword) {
        if (!password || password !== test.publicSettings.password) {
            return res.json({
                isPasswordProtected: true,
                title: test.title,
                description: test.description
            });
        }
    }

    // Prepare questions (hide correct answers to prevent source inspection)
    const sanitizedQuestions = test.questions.map(q => {
        const qObj = q.toObject ? q.toObject() : { ...q };
        if (qObj.options && Array.isArray(qObj.options)) {
            qObj.options = qObj.options.map(opt => ({
                _id: opt._id,
                text: opt.text
                // isCorrect is omitted
            }));
        }
        return qObj;
    });

    res.json({
        _id: test._id,
        title: test.title,
        description: test.description,
        subject: test.subject,
        activity: test.activity,
        questions: sanitizedQuestions,
        publicSettings: {
            timeLimit: test.publicSettings?.timeLimit || 0,
            showScoreAfterSubmission: test.publicSettings?.showScoreAfterSubmission !== false,
            showCorrectAnswers: !!test.publicSettings?.showCorrectAnswers,
            antiSpam: !!test.publicSettings?.antiSpam
        }
    });
});

// @desc    Verify password for protected public test
// @route   POST /api/public-tests/:id/verify-password
// @access  Public
const verifyPublicTestPassword = asyncHandler(async (req, res) => {
    const { password } = req.body;
    const test = await Test.findById(req.params.id);
    if (!test) {
        return res.status(404).json({ message: 'Test not found' });
    }

    const correctPassword = test.publicSettings?.password || '';
    if (password === correctPassword) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Incorrect password' });
    }
});

// @desc    Increment public test views
// @route   POST /api/public-tests/:id/view
// @access  Public
const incrementPublicTestViews = asyncHandler(async (req, res) => {
    const test = await Test.findById(req.params.id);
    if (test) {
        test.publicViews = (test.publicViews || 0) + 1;
        await test.save();
        res.json({ success: true, views: test.publicViews });
    } else {
        res.status(404).json({ message: 'Test not found' });
    }
});

// @desc    Submit guest answers for a public test
// @route   POST /api/public-tests/:id/submit
// @access  Public
const submitPublicTest = asyncHandler(async (req, res) => {
    const { name, email, phone, organization, answers, deviceInfo, recaptchaVerified } = req.body;

    if (!name || !email) {
        return res.status(400).json({ message: 'Name and Email are mandatory fields.' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email address format.' });
    }

    const test = await Test.findById(req.params.id);
    if (!test) {
        return res.status(404).json({ message: 'Test not found.' });
    }

    if (test.publishMode !== 'public' || test.status === 'disabled') {
        return res.status(403).json({ message: 'This test is not active.' });
    }

    // Check Start / End date again
    const now = new Date();
    if (test.publicSettings?.startDate && new Date(test.publicSettings.startDate) > now) {
        return res.status(403).json({ message: 'This test has not started yet.' });
    }
    if (test.publicSettings?.endDate && new Date(test.publicSettings.endDate) < now) {
        return res.status(403).json({ message: 'This test has ended.' });
    }

    // Duplicate submission check (One Response Per Email)
    const allowMultiple = test.publicSettings?.allowMultiple || false;
    if (!allowMultiple) {
        const existing = await PublicSubmission.findOne({ test: test._id, email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ message: 'You have already submitted this test.' });
        }
    }

    // Check Max Responses Limit
    if (test.publicSettings?.maxResponses) {
        const responsesCount = await PublicSubmission.countDocuments({ test: test._id });
        if (responsesCount >= test.publicSettings.maxResponses) {
            return res.status(403).json({ message: 'This test has reached its maximum response capacity.' });
        }
    }

    // Calculate score for auto-graded questions (Multiple Choice, Checkboxes, Dropdown)
    let totalScore = 0;
    const gradedAnswers = answers.map(submitted => {
        // Find corresponding question
        const q = test.questions.find(item => item.id === submitted.questionId);
        let marksEarned = 0;

        if (q) {
            const qType = q.type?.toLowerCase();
            const isMcq = qType === 'multiple choice' || qType === 'dropdown';
            const isCheckboxes = qType === 'checkboxes';

            if (isMcq && q.options) {
                const correctOpt = q.options.find(opt => opt.isCorrect);
                if (correctOpt && submitted.textAnswer?.trim() === correctOpt.text?.trim()) {
                    marksEarned = q.marks || 1;
                }
            } else if (isCheckboxes && q.options) {
                // Checkboxes might have multiple correct options
                const correctTexts = q.options.filter(opt => opt.isCorrect).map(opt => opt.text?.trim());
                // Submitted answers for checkboxes are usually comma-separated or stored as string array
                let submittedTexts = [];
                if (Array.isArray(submitted.textAnswer)) {
                    submittedTexts = submitted.textAnswer.map(t => t?.trim());
                } else if (typeof submitted.textAnswer === 'string') {
                    submittedTexts = submitted.textAnswer.split(',').map(t => t?.trim()).filter(Boolean);
                }

                // Check if correctTexts matches submittedTexts exactly
                const allCorrectMatched = correctTexts.every(c => submittedTexts.includes(c));
                const noIncorrectMatched = submittedTexts.every(s => correctTexts.includes(s));

                if (allCorrectMatched && noIncorrectMatched && correctTexts.length > 0) {
                    marksEarned = q.marks || 1;
                }
            }
            totalScore += marksEarned;
        }

        return {
            questionId: submitted.questionId,
            questionText: submitted.questionText || q?.text || 'Question',
            questionType: q?.type || submitted.questionType,
            textAnswer: typeof submitted.textAnswer === 'object' ? JSON.stringify(submitted.textAnswer) : (submitted.textAnswer || ''),
            audioData: submitted.audioData || '',
            videoData: submitted.videoData || '',
            marks: marksEarned
        };
    });

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    const submission = await PublicSubmission.create({
        test: test._id,
        name,
        email: email.toLowerCase(),
        phone: phone || '',
        organization: organization || '',
        ipAddress,
        deviceInfo: deviceInfo || 'Unknown Device',
        answers: gradedAnswers,
        score: totalScore,
        completedStatus: 'Completed'
    });

    // Simulate Emails in Backend console logs
    console.log(`\n================ SIMULATED EMAILS FOR PUBLIC TEST SUBMISSION ================`);
    if (test.publicSettings?.emailNotification?.sendConfirmationEmail) {
        console.log(`[EMAIL CONFIRMATION] Sent to: ${email}`);
        console.log(`Dear ${name}, thank you for attempting "${test.title}". Your submission has been saved.`);
    }
    if (test.publicSettings?.emailNotification?.sendScoreEmail && test.publicSettings?.showScoreAfterSubmission) {
        console.log(`[EMAIL SCORE REPORT] Sent to: ${email}`);
        console.log(`Your Score for "${test.title}" is: ${totalScore} points.`);
    }
    if (test.publicSettings?.emailNotification?.sendSubmissionNotification) {
        console.log(`[EMAIL ADMIN ALERT] Sent to: Instructor/Admin`);
        console.log(`New response submitted for public test "${test.title}" by ${name} (${email}). Score: ${totalScore}`);
    }
    console.log(`============================================================================\n`);

    res.status(201).json({
        success: true,
        submissionId: submission._id,
        score: totalScore,
        showScore: test.publicSettings?.showScoreAfterSubmission !== false
    });
});

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

// @desc    Check duplicate email for a public test
// @route   POST /api/public-tests/:id/check-email
// @access  Public
const checkPublicTestEmail = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const test = await Test.findById(req.params.id);
    if (!test) {
        return res.status(404).json({ message: 'Test not found' });
    }
    const allowMultiple = test.publicSettings?.allowMultiple || false;
    if (!allowMultiple) {
        const existing = await PublicSubmission.findOne({ test: test._id, email: email.toLowerCase() });
        if (existing) {
            return res.json({ exists: true });
        }
    }
    res.json({ exists: false });
});

// @desc    Delete guest submission (Admin only)
// @route   DELETE /api/public-tests/admin/submissions/:id
// @access  Private/Admin
const deletePublicSubmission = asyncHandler(async (req, res) => {
    const submission = await PublicSubmission.findById(req.params.id);
    if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
    }
    await submission.deleteOne();
    res.json({ success: true, message: 'Submission deleted successfully' });
});

module.exports = {
    getPublicTestById,
    verifyPublicTestPassword,
    incrementPublicTestViews,
    submitPublicTest,
    getPublicTestStats,
    getPublicTestSubmissions,
    togglePublicTestStatus,
    updatePublicTestSettings,
    checkPublicTestEmail,
    getPublicTestsDashboard,
    deletePublicSubmission
};
