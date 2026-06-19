const asyncHandler = require('express-async-handler');
const Submission = require('../../models/Submission');
const Test = require('../../models/Test');
const User = require('../../models/User');

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
        status: 'submitted'
    });

    res.status(201).json(submission);
});

// @desc    Get submissions for the logged in student
// @route   GET /api/submissions
// @access  Private (Student)
const getSubmissions = asyncHandler(async (req, res) => {
    const submissions = await Submission.find({ student: req.user._id })
        .populate('test')
        .populate('student', 'name email')
        .sort({ submittedAt: -1 });

    res.json(submissions);
});

// @desc    Get one submission by ID
// @route   GET /api/submissions/:id
// @access  Private
const getSubmissionById = asyncHandler(async (req, res) => {
    const submission = await Submission.findById(req.params.id)
        .populate('test')
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
                    // Update reaction field in database
                    submission.answers[i].reaction = a.reaction;
                }
            }
        });
    }

    const updated = await submission.save();
    res.json(updated);
});

module.exports = { submitTest, getSubmissions, getSubmissionById, updateStudentComment };
