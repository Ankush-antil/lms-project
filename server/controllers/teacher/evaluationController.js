const asyncHandler = require('express-async-handler');
const Submission = require('../../models/Submission');
const Test = require('../../models/Test');
const User = require('../../models/User');

// @desc    Get all submissions (for Teacher/Admin)
// @route   GET /api/submissions
// @access  Private (Teacher/Admin)
const getSubmissions = asyncHandler(async (req, res) => {
    let query = {};
    if (req.user.role === 'Teacher') {
        const teacher = await User.findById(req.user._id).populate('teacherProfile.assignedCourses', 'name');

        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        const assignedCourseNames = teacher.teacherProfile?.assignedCourses?.map(c => c.name) || [];
        const assignedSubjects = teacher.teacherProfile?.subjects || [];

        // Find tests matching teacher's assignments
        const matchingTests = await Test.find({
            $or: [
                { course: { $in: assignedCourseNames } },
                { subject: { $in: assignedSubjects } }
            ]
        }).select('_id');

        const testIds = matchingTests.map(t => t._id);

        if (testIds.length === 0) {
            return res.json([]);
        }

        query.test = { $in: testIds };
    }

    const submissions = await Submission.find(query)
        .populate({ path: 'test', populate: { path: 'createdBy', select: 'name email role' } })
        .populate('student', 'name email studentProfile')
        .sort({ submittedAt: -1 });

    res.json(submissions);
});

// @desc    Get submissions for a specific test (for Teacher/Admin)
// @route   GET /api/submissions/test/:testId
// @access  Private (Teacher/Admin)
const getSubmissionsByTest = asyncHandler(async (req, res) => {
    if (req.user.role === 'Teacher') {
        const teacher = await User.findById(req.user._id).populate('teacherProfile.assignedCourses', 'name');
        const test = await Test.findById(req.params.testId);

        if (!test) {
            return res.status(404).json({ message: 'Test not found' });
        }

        const assignedCourseNames = teacher.teacherProfile?.assignedCourses?.map(c => c.name) || [];
        const assignedSubjects = teacher.teacherProfile?.subjects || [];

        const isAuthorized = assignedCourseNames.includes(test.course) || assignedSubjects.includes(test.subject);

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Not authorized to view submissions for this test' });
        }
    }

    const submissions = await Submission.find({ test: req.params.testId })
        .populate('student', 'name email studentProfile')
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
                if (a.videoData !== undefined) {
                    submission.answers[i].videoData = a.videoData;
                }
                // If teacher provided feedback, append it to the conversation
                if (a.feedback) {
                    submission.answers[i].conversation.push({
                        role: 'Teacher',
                        message: a.feedback,
                        timestamp: new Date()
                    });
                }
            }
        });
    }

    submission.totalMarks = totalMarks ?? submission.totalMarks;
    submission.status = 'evaluated';

    const updated = await submission.save();
    res.json(updated);
});

// @desc    Return a submission back to student (teacher requests redo)
// @route   PUT /api/submissions/:id/return
// @access  Private (Admin/Teacher)
const returnSubmission = asyncHandler(async (req, res) => {
    const { returnNote } = req.body;

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
        res.status(404);
        throw new Error('Submission not found');
    }

    // Reset the submission so student must redo it
    submission.status = 'returned';
    submission.returnedAt = new Date();
    submission.returnNote = returnNote || '';
    // Reset marks so student starts fresh
    submission.totalMarks = 0;
    submission.answers = submission.answers.map(a => ({
        ...a.toObject(),
        marks: 0,
        reaction: '',
        conversation: a.conversation || []
    }));

    const updated = await submission.save();
    res.json(updated);
});

module.exports = { getSubmissions, getSubmissionsByTest, getSubmissionById, evaluateSubmission, returnSubmission };
