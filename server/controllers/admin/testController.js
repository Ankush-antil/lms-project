const asyncHandler = require('express-async-handler');
const Test = require('../../models/Test');
const Activity = require('../../models/Activity');
const User = require('../../models/User');

// @desc    Create new test
// @route   POST /api/tests
// @access  Private/Admin

const validateWebpageQuestions = (questions = []) => {
    for (const question of questions) {

        if (question.type !== "webpage") continue;

        if (!question.webpageUrl) {
            throw new Error("Webpage URL is required");
        }

        let parsedUrl;

        try {
            parsedUrl = new URL(question.webpageUrl);
        } catch {
            throw new Error("Invalid webpage URL");
        }

        if (parsedUrl.protocol !== "https:") {
            throw new Error("Only HTTPS URLs are allowed");
        }

        const blockedHosts = [
            "localhost",
            "127.0.0.1"
        ];

        if (
            blockedHosts.includes(
                parsedUrl.hostname.toLowerCase()
            )
        ) {
            throw new Error("Invalid webpage URL");
        }
    }
};

const createTest = asyncHandler(async (req, res) => {
    const { testDetails, settings, questions } = req.body;

    validateWebpageQuestions(questions);

    // Enforce institute name for Institute, Teacher and Editor roles
    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Teacher' || req.user.role === 'Editor')) {
        const userWithInst = await User.findById(req.user._id).populate('institute');
        if (userWithInst && userWithInst.institute) {
            testDetails.institute = userWithInst.institute.name;
        }
    }

    const test = await Test.create({
        ...testDetails,
        settings,
        questions,
        createdBy: req.user._id
    });

    // Log Activity
    await Activity.create({
        type: 'TEST_CREATED',
        message: 'New Test created',
        detail: `${test.title} (${test.course})`,
        user: req.user._id
    });

    res.status(201).json(test);
});

// @desc    Get all tests (for Admin/Teacher/Institute)
// @route   GET /api/tests
// @access  Private/Admin
const getTests = asyncHandler(async (req, res) => {
    let query = {};
    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor' || req.user.role === 'Teacher')) {
        const userWithInst = await User.findById(req.user._id).populate('institute');
        if (userWithInst && userWithInst.institute) {
            const escapedName = userWithInst.institute.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            query.institute = { $regex: new RegExp(`^\\s*${escapedName}\\s*$`, 'i') };
        } else {
            query.institute = 'NON_EXISTENT_INSTITUTE';
        }
    }
    const tests = await Test.find(query)
        .populate('createdBy', 'name email role')
        .populate('collaborators', 'name email role')
        .sort({ createdAt: -1 });
    console.log(`[Admin-Tests] Found ${tests.length} tests`);
    res.json(tests);
});

// @desc    Get test by ID
// @route   GET /api/tests/:id
// @access  Private
const getTestById = asyncHandler(async (req, res) => {
    const test = await Test.findById(req.params.id);
    if (!test) {
        res.status(404);
        throw new Error('Test not found');
    }
    res.json(test);
});

// @desc    Update test
// @route   PUT /api/tests/:id
// @access  Private/Admin
const updateTest = asyncHandler(async (req, res) => {
    const { testDetails, settings, questions } = req.body;

    validateWebpageQuestions(questions);

    const test = await Test.findById(req.params.id);

    if (test) {
        // Enforce institute ownership for Institute, Teacher and Editor roles
        if (req.user && (req.user.role === 'Institute' || req.user.role === 'Teacher' || req.user.role === 'Editor')) {
            const userWithInst = await User.findById(req.user._id).populate('institute');
            const instName = userWithInst?.institute?.name?.trim().toLowerCase();
            const testInstName = test.institute?.trim().toLowerCase();
            if (!instName || instName !== testInstName) {
                res.status(403);
                throw new Error('Not authorized to update tests of other institutes');
            }
            // Enforce edit permission for teachers
            if (req.user.role === 'Teacher') {
                const isCreator = test.createdBy && test.createdBy.toString() === req.user._id.toString();
                if (!isCreator && !test.allowTeacherEdit) {
                    res.status(403);
                    throw new Error('Not authorized to edit this test (Editor permission required)');
                }
            }
            // Enforce their own institute name on update
            if (testDetails.institute !== undefined && userWithInst?.institute) {
                testDetails.institute = userWithInst.institute.name;
            }
        }

        if (testDetails.title !== undefined) test.title = testDetails.title;
        if (testDetails.institute !== undefined) test.institute = testDetails.institute;
        if (testDetails.course !== undefined) test.course = testDetails.course;
        if (testDetails.subject !== undefined) test.subject = testDetails.subject;
        if (testDetails.date !== undefined) test.date = testDetails.date;
        if (testDetails.index !== undefined) test.index = testDetails.index;
        if (testDetails.activity !== undefined) test.activity = testDetails.activity;
        if (testDetails.publishMode !== undefined) test.publishMode = testDetails.publishMode;
        if (testDetails.publicSettings !== undefined) test.publicSettings = testDetails.publicSettings;
        if (testDetails.status !== undefined) test.status = testDetails.status;
        if (testDetails.discussionActivity !== undefined) test.discussionActivity = testDetails.discussionActivity;
        if (testDetails.allowTeacherEdit !== undefined) test.allowTeacherEdit = testDetails.allowTeacherEdit;

        if (settings !== undefined) test.settings = settings;
        if (questions !== undefined) test.questions = questions;

        const updatedTest = await test.save();
        res.json(updatedTest);
    } else {
        res.status(404);
        throw new Error('Test not found');
    }
});

// @desc    Delete test
// @route   DELETE /api/tests/:id
// @access  Private/Admin
const deleteTest = asyncHandler(async (req, res) => {
    const test = await Test.findById(req.params.id);
    if (test) {
        // Enforce institute ownership for Institute, Teacher and Editor roles
        if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor' || req.user.role === 'Teacher')) {
            const userWithInst = await User.findById(req.user._id).populate('institute');
            const instName = userWithInst?.institute?.name?.trim().toLowerCase();
            const testInstName = test.institute?.trim().toLowerCase();
            if (!instName || instName !== testInstName) {
                res.status(403);
                throw new Error('Not authorized to delete tests of other institutes');
            }
            // Enforce delete permission for teachers
            if (req.user.role === 'Teacher') {
                const isCreator = test.createdBy && test.createdBy.toString() === req.user._id.toString();
                if (!isCreator && !test.allowTeacherEdit) {
                    res.status(403);
                    throw new Error('Not authorized to delete this test (Editor permission required)');
                }
            }
        }

        await test.deleteOne();
        res.json({ message: 'Test removed' });
    } else {
        res.status(404);
        throw new Error('Test not found');
    }
});

// @desc    Get editors in the same institute
// @route   GET /api/tests/editors
// @access  Private/Editor or Admin
const getInstituteEditors = asyncHandler(async (req, res) => {
    if (!req.user || !req.user.institute) {
        return res.json([]);
    }
    const editors = await User.find({
        role: 'Editor',
        institute: req.user.institute,
        _id: { $ne: req.user._id }
    }).select('name email role');
    res.json(editors);
});

// @desc    Update test collaborators
// @route   PUT /api/tests/:id/collaborate
// @access  Private/Editor or Admin
const updateTestCollaborators = asyncHandler(async (req, res) => {
    const test = await Test.findById(req.params.id);
    if (!test) {
        res.status(404);
        throw new Error('Test not found');
    }

    // Only creator or admin can update collaboration settings
    if (test.createdBy && test.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
        res.status(403);
        throw new Error('Only the creator can manage collaboration');
    }

    const { collaboratorIds } = req.body; // Array of editor user IDs
    test.collaborators = collaboratorIds;
    await test.save();

    res.json({ message: 'Collaboration updated successfully', collaborators: test.collaborators });
});

module.exports = { 
    createTest, 
    getTests, 
    getTestById, 
    updateTest, 
    deleteTest,
    getInstituteEditors,
    updateTestCollaborators
};
