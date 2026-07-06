const asyncHandler = require('express-async-handler');
const Submission = require('../../models/Submission');
const Test = require('../../models/Test');
const User = require('../../models/User');
const PublicSubmission = require('../../models/PublicSubmission');
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

const getSubmissions = asyncHandler(async (req, res) => {
    const query = { student: req.user._id };
    if (req.query.testId) {
        query.test = req.query.testId;
    }
    const submissions = await Submission.find(query)
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
    let submission = await Submission.findById(req.params.id)
        .populate({ path: 'test', populate: { path: 'createdBy', select: 'name email role' } })
        .populate('student', 'name email');

    if (!submission) {
        submission = await PublicSubmission.findById(req.params.id)
            .populate({ path: 'test', populate: { path: 'createdBy', select: 'name email role' } });
            
        if (!submission) {
            res.status(404);
            throw new Error('Submission not found');
        }

        // Map fields to match the Submission shape for frontend compatibility
        const submissionObj = submission.toObject();
        submissionObj.student = { name: submission.name, email: submission.email };
        submissionObj.studentName = submission.name;
        // Let's set status to evaluated so student can see it as checked/evaluated
        submissionObj.status = 'evaluated';
        return res.json(submissionObj);
    }

    res.json(submission);
});

// @desc    Update comments and reactions on a shared submission
// @route   PUT /api/submissions/shared/:id/comment
// @access  Public
const updateSharedComment = asyncHandler(async (req, res) => {
    const { answers } = req.body;

    let submission = await Submission.findById(req.params.id);
    if (!submission) {
        submission = await PublicSubmission.findById(req.params.id);
    }
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

// @desc    Toggle reaction (like/dislike) on entire submission
// @route   PUT /api/submissions/:id/reaction
// @access  Private
const toggleSubmissionReaction = asyncHandler(async (req, res) => {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
    }

    const { reaction } = req.body; // 'like', 'dislike', or ''
    const voterId = req.user ? String(req.user._id) : (req.body.guestId || req.ip || 'guest');

    if (!submission.likes) submission.likes = [];
    if (!submission.dislikes) submission.dislikes = [];

    // Remove first
    submission.likes = submission.likes.filter(id => id !== voterId);
    submission.dislikes = submission.dislikes.filter(id => id !== voterId);

    if (reaction === 'like') {
        submission.likes.push(voterId);
        submission.reaction = 'like';
    } else if (reaction === 'dislike') {
        submission.dislikes.push(voterId);
        submission.reaction = 'dislike';
    } else {
        submission.reaction = '';
    }

    await submission.save();
    res.json(submission);
});

// @desc    Get public discussion comments on a submission
// @route   GET /api/submissions/:id/comments
// @access  Private
const getSubmissionComments = asyncHandler(async (req, res) => {
    const submission = await Submission.findById(req.params.id).select('comments');
    if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
    }
    res.json(submission.comments || []);
});

// @desc    Add a public discussion comment on a submission
// @route   POST /api/submissions/:id/comments
// @access  Private
const addSubmissionComment = asyncHandler(async (req, res) => {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
    }

    const { message, author, role } = req.body;
    if (!message || !message.trim()) {
        return res.status(400).json({ message: 'Message is required' });
    }

    const authorName = author || req.user?.name || req.user?.username || 'Anonymous';
    const authorRole = role || req.user?.role || 'Student';

    if (!submission.comments) submission.comments = [];
    submission.comments.push({
        author: authorName,
        role: authorRole,
        message: message.trim(),
        timestamp: new Date()
    });

    await submission.save();
    res.json(submission.comments);
});

module.exports = {
    submitTest,
    getSubmissions,
    getSubmissionById,
    updateStudentComment,
    getSharedSubmissionById,
    updateSharedComment,
    addSubmissionFeedback,
    getSubmissionFeedback,
    toggleSubmissionReaction,
    getSubmissionComments,
    addSubmissionComment
};
