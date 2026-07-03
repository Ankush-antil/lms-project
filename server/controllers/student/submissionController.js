const asyncHandler = require('express-async-handler');
const Submission = require('../../models/Submission');
const Test = require('../../models/Test');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

// @desc    Submit student answers for a test
// @route   POST /api/submissions
// @access  Private (Student)
const submitTest = asyncHandler(async (req, res) => {
    const { testId, answers } = req.body;

    const test = await Test.findById(testId);
    if (!test) {
        res.status(404);
        throw new Error('Test not found');
    }

    // Remove existing submission if re-submitting
    await Submission.deleteOne({ test: testId, student: req.user._id });

    const submission = await Submission.create({
        test: testId,
        student: req.user._id,
        studentName: req.user.name,
        answers,
        status: req.body.status || 'submitted'
    });

    res.status(201).json(submission);
});

// @desc    Get submissions for the logged in student
// @route   GET /api/submissions
// @access  Private (Student)
const getSubmissions = asyncHandler(async (req, res) => {
    const submissions = await Submission.find({ student: req.user._id })
        .populate({ path: 'test', populate: { path: 'createdBy', select: 'name email role' } })
        .populate('student', 'name email')
        .sort({ submittedAt: -1 });

    res.json(submissions);
});

// @desc    Get one submission by ID
// @route   GET /api/submissions/:id
// @access  Private
const getSubmissionById = asyncHandler(async (req, res) => {
    const submission = await Submission.findById(req.params.id)
        .populate({ path: 'test', populate: { path: 'createdBy', select: 'name email role' } })
        .populate('student', 'name email');

    if (!submission) {
        res.status(404);
        throw new Error('Submission not found');
    }

    // Load logged-in user's institute
    const user = await User.findById(req.user._id).populate('institute');
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    if (!user.institute) {
        res.status(403);
        throw new Error('Not authorized: You do not belong to any institute');
    }

    const userInstituteName = user.institute.name?.trim().toLowerCase();
    const testInstituteName = submission.test?.institute?.trim().toLowerCase();

    if (!testInstituteName) {
        res.status(403);
        throw new Error('Not authorized: Test does not belong to any institute');
    }

    if (userInstituteName !== testInstituteName) {
        res.status(403);
        throw new Error('Not authorized: This test result belongs to a different institute');
    }

    res.json(submission);
});

// @desc    Update student comments on graded responses
// @route   PUT /api/submissions/:id/student-comment
// @access  Private (Student)
const updateStudentComment = asyncHandler(async (req, res) => {
    const { answers } = req.body;

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
        res.status(404);
        throw new Error('Submission not found');
    }

    const commentRole = (req.user.role === 'Teacher' || req.user.role === 'Admin') ? 'Teacher' : 'Student';
    const voterId = String(req.user._id);

    if (answers && Array.isArray(answers)) {
        answers.forEach((a, i) => {
            if (submission.answers[i]) {
                if (a.studentComment) {
                    // Append the comment to the conversation array with the dynamic role
                    submission.answers[i].conversation.push({
                        role: commentRole,
                        message: a.studentComment,
                        timestamp: new Date()
                    });
                }
                if (a.reaction !== undefined) {
                    if (!submission.answers[i].likes) submission.answers[i].likes = [];
                    if (!submission.answers[i].dislikes) submission.answers[i].dislikes = [];

                    // Remove this voter from both lists
                    submission.answers[i].likes = submission.answers[i].likes.filter(id => id !== voterId);
                    submission.answers[i].dislikes = submission.answers[i].dislikes.filter(id => id !== voterId);

                    if (a.reaction === 'like') {
                        submission.answers[i].likes.push(voterId);
                        submission.answers[i].reaction = 'like';
                    } else if (a.reaction === 'dislike') {
                        submission.answers[i].dislikes.push(voterId);
                        submission.answers[i].reaction = 'dislike';
                    } else {
                        submission.answers[i].reaction = '';
                    }
                }
            }
        });
    }

    const updated = await submission.save();
    res.json(updated);
});

// @desc    Get shared submission by ID without authentication
// @route   GET /api/submissions/shared/:id
// @access  Public
const getSharedSubmissionById = asyncHandler(async (req, res) => {
    const submission = await Submission.findById(req.params.id)
        .populate({ path: 'test', populate: { path: 'createdBy', select: 'name email role' } })
        .populate('student', 'name email');

    if (!submission) {
        res.status(404);
        throw new Error('Submission not found');
    }

    res.json(submission);
});

// @desc    Update comments and reactions on a shared submission
// @route   PUT /api/submissions/shared/:id/comment
// @access  Public
const updateSharedComment = asyncHandler(async (req, res) => {
    const { answers } = req.body;

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
        res.status(404);
        throw new Error('Submission not found');
    }

    // Try to extract user from token (optional)
    let user;
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            user = await User.findById(decoded.id);
        } catch (e) {
            // Ignore auth token decode errors
        }
    }

    const commentatorRole = user ? (user.role === 'Teacher' || user.role === 'Admin' ? 'Teacher' : 'Student') : 'Guest';

    if (answers && Array.isArray(answers)) {
        answers.forEach((a, i) => {
            if (submission.answers[i]) {
                if (a.studentComment) {
                    submission.answers[i].conversation.push({
                        role: commentatorRole,
                        message: a.studentComment,
                        timestamp: new Date()
                    });
                }
                if (a.reaction !== undefined) {
                    if (!submission.answers[i].likes) submission.answers[i].likes = [];
                    if (!submission.answers[i].dislikes) submission.answers[i].dislikes = [];

                    const voterId = user ? String(user._id) : (a.guestId || req.ip || 'guest');

                    // Remove from both lists first
                    submission.answers[i].likes = submission.answers[i].likes.filter(id => id !== voterId);
                    submission.answers[i].dislikes = submission.answers[i].dislikes.filter(id => id !== voterId);

                    if (a.reaction === 'like') {
                        submission.answers[i].likes.push(voterId);
                        submission.answers[i].reaction = 'like';
                    } else if (a.reaction === 'dislike') {
                        submission.answers[i].dislikes.push(voterId);
                        submission.answers[i].reaction = 'dislike';
                    } else {
                        submission.answers[i].reaction = '';
                    }
                }
            }
        });
    }

    const updated = await submission.save();
    res.json(updated);
});

// @desc    Add feedback message to submission conversation
// @route   POST /api/submissions/:id/feedback
// @access  Private
const addSubmissionFeedback = asyncHandler(async (req, res) => {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
    }

    const { message } = req.body;
    if (!message || !message.trim()) {
        return res.status(400).json({ message: 'Message text is required' });
    }

    const role = req.user.role === 'Teacher' || req.user.role === 'Admin' ? 'Teacher' : 'Student';

    submission.conversation.push({
        role,
        message: message.trim(),
        timestamp: new Date()
    });

    await submission.save();
    res.status(201).json(submission.conversation);
});

// @desc    Get submission conversation history
// @route   GET /api/submissions/:id/feedback
// @access  Private
const getSubmissionFeedback = asyncHandler(async (req, res) => {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
    }
    res.json(submission.conversation || []);
});

module.exports = {
    submitTest,
    getSubmissions,
    getSubmissionById,
    updateStudentComment,
    getSharedSubmissionById,
    updateSharedComment,
    addSubmissionFeedback,
    getSubmissionFeedback
};
