const asyncHandler = require('express-async-handler');
const Submission = require('../models/Submission');
const Test = require('../models/Test');

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

// @desc    Get submissions — students see only their own; teachers/admins see all
// @route   GET /api/submissions
// @access  Private
const getSubmissions = asyncHandler(async (req, res) => {
    let query = {};
    if (req.user.role === 'Student') {
        query.student = req.user._id;
    }

    const submissions = await Submission.find(query)
        .populate('test', 'title subject institute course date')
        .populate('student', 'name email')
        .sort({ submittedAt: -1 });

    res.json(submissions);
});


// @desc    Get submissions for a specific test
// @route   GET /api/submissions/test/:testId
// @access  Private
const getSubmissionsByTest = asyncHandler(async (req, res) => {
    const submissions = await Submission.find({ test: req.params.testId })
        .populate('student', 'name email')
        .sort({ submittedAt: -1 });

    res.json(submissions);
});

// @desc    Get one submission by ID
// @route   GET /api/submissions/:id
// @access  Private
const getSubmissionById = asyncHandler(async (req, res) => {
    const submission = await Submission.findById(req.params.id)
        .populate('test', 'title subject institute course questions')
        .populate('student', 'name email');

    if (!submission) {
        res.status(404);
        throw new Error('Submission not found');
    }
    res.json(submission);
});

// @desc    Evaluate a submission (teacher marks answers)
// @route   PUT /api/submissions/:id/evaluate
// @access  Private (Admin/Teacher)
const evaluateSubmission = asyncHandler(async (req, res) => {
    const { answers, totalMarks } = req.body;

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
        res.status(404);
        throw new Error('Submission not found');
    }

    // Merge teacher marks/feedback into each answer
    if (answers && Array.isArray(answers)) {
        answers.forEach((a, i) => {
            if (submission.answers[i]) {
                submission.answers[i].marks = a.marks ?? submission.answers[i].marks;
                submission.answers[i].feedback = a.feedback ?? submission.answers[i].feedback;
            }
        });
    }

    submission.totalMarks = totalMarks ?? submission.totalMarks;
    submission.status = 'evaluated';

    const updated = await submission.save();
    res.json(updated);
});

module.exports = { submitTest, getSubmissions, getSubmissionsByTest, getSubmissionById, evaluateSubmission };
