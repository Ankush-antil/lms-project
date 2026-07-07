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

const validateInboxSubjectConflict = async (testId, testDetails, currentInstitute, res) => {
    const index = testDetails?.index;
    const subject = testDetails?.subject;
    const course = testDetails?.course;
    const institute = testDetails?.institute || currentInstitute;

    if (index && index.trim() && subject && subject.trim() && course && course.trim() && institute) {
        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const Test = require('../../models/Test');
        
        const query = {
            isDeleted: { $ne: true },
            institute: { $regex: new RegExp(`^\\s*${escapeRegex(institute)}\\s*$`, 'i') },
            course: { $regex: new RegExp(`^\\s*${escapeRegex(course)}\\s*$`, 'i') },
            index: { $regex: new RegExp(`^\\s*${escapeRegex(index)}\\s*$`, 'i') }
        };
        
        if (testId) {
            query._id = { $ne: testId };
        }
        
        const existingTest = await Test.findOne(query);
        if (existingTest && existingTest.subject && existingTest.subject.trim().toLowerCase() !== subject.trim().toLowerCase()) {
            if (res) res.status(400);
            throw new Error(`This inbox (${index}) is already assigned to a different subject: "${existingTest.subject}". Only tests of the same subject can be added to this inbox.`);
        }
    }
};

const createTest = asyncHandler(async (req, res) => {
    const { testDetails, settings, questions } = req.body;

    validateWebpageQuestions(questions);

    // Enforce institute name for Institute, Teacher and Editor roles
    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Teacher' || req.user.role === 'Editor')) {
        let userWithInst = await User.findById(req.user._id).populate('institute');
        if (req.user.role === 'Teacher' && (!userWithInst || !userWithInst.institute)) {
            const teacher = await User.findById(req.user._id);
            const courses = teacher?.teacherProfile?.assignedCourses || [];
            if (courses.length > 0) {
                const Course = require('../../models/Course');
                const firstCourse = await Course.findById(courses[0]).populate('institute');
                if (firstCourse && firstCourse.institute) {
                    teacher.institute = firstCourse.institute._id;
                    await teacher.save();
                    userWithInst = await User.findById(req.user._id).populate('institute');
                }
            }
        }
        if (userWithInst && userWithInst.institute) {
            testDetails.institute = userWithInst.institute.name;
        }
    }

    await validateInboxSubjectConflict(null, testDetails, testDetails.institute, res);

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
    let query = { isDeleted: { $ne: true } };
    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor' || req.user.role === 'Teacher')) {
        let userWithInst = await User.findById(req.user._id).populate('institute');
        if (req.user.role === 'Teacher' && (!userWithInst || !userWithInst.institute)) {
            const teacher = await User.findById(req.user._id);
            const courses = teacher?.teacherProfile?.assignedCourses || [];
            if (courses.length > 0) {
                const Course = require('../../models/Course');
                const firstCourse = await Course.findById(courses[0]).populate('institute');
                if (firstCourse && firstCourse.institute) {
                    teacher.institute = firstCourse.institute._id;
                    await teacher.save();
                    userWithInst = await User.findById(req.user._id).populate('institute');
                }
            }
        }
        if (userWithInst && userWithInst.institute) {
            const escapedName = userWithInst.institute.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            query = {
                isDeleted: { $ne: true },
                $or: [
                    { institute: { $regex: new RegExp(`^\\s*${escapedName}\\s*$`, 'i') } },
                    { createdBy: req.user._id }
                ]
            };
        } else {
            query = { isDeleted: { $ne: true }, createdBy: req.user._id };
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
    const test = await Test.findById(req.params.id).populate('createdBy', 'name email role');
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
            let userWithInst = await User.findById(req.user._id).populate('institute');
            if (req.user.role === 'Teacher' && (!userWithInst || !userWithInst.institute)) {
                const teacher = await User.findById(req.user._id);
                const courses = teacher?.teacherProfile?.assignedCourses || [];
                if (courses.length > 0) {
                    const Course = require('../../models/Course');
                    const firstCourse = await Course.findById(courses[0]).populate('institute');
                    if (firstCourse && firstCourse.institute) {
                        teacher.institute = firstCourse.institute._id;
                        await teacher.save();
                        userWithInst = await User.findById(req.user._id).populate('institute');
                    }
                }
            }
            const instName = userWithInst?.institute?.name?.trim().toLowerCase();
            const testInstName = test.institute?.trim().toLowerCase();
            const isCreator = test.createdBy && test.createdBy.toString() === req.user._id.toString();

            if (!isCreator && (!instName || instName !== testInstName)) {
                res.status(403);
                throw new Error('Not authorized to update tests of other institutes');
            }
            // Enforce edit permission for teachers
            if (req.user.role === 'Teacher') {
                const isCreator = test.createdBy && test.createdBy.toString() === req.user._id.toString();
                const hasEditPermission = isCreator || test.allowTeacherEdit;

                if (!hasEditPermission) {
                    if (questions !== undefined) {
                        res.status(403);
                        throw new Error('Not authorized to edit questions (Editor permission required)');
                    }
                    if (testDetails) {
                        const forbiddenDetails = Object.keys(testDetails).filter(key => key !== 'isAssigned' && key !== 'institute' && key !== 'assignedStudents' && key !== 'assignmentType');
                        for (const key of forbiddenDetails) {
                            if (testDetails[key] !== undefined && testDetails[key] !== test[key]) {
                                res.status(403);
                                throw new Error(`Not authorized to edit test detail: ${key} (Editor permission required)`);
                            }
                        }
                    }
                    if (settings) {
                        const forbiddenSettings = Object.keys(settings).filter(key => key !== 'endTime' && key !== 'activeDays');
                        for (const key of forbiddenSettings) {
                            if (settings[key] !== undefined && test.settings && settings[key] !== test.settings[key]) {
                                res.status(403);
                                throw new Error(`Not authorized to edit test setting: ${key} (Editor permission required)`);
                            }
                        }
                    }
                }
            }
            // Enforce their own institute name on update
            if (testDetails && testDetails.institute !== undefined && userWithInst?.institute) {
                testDetails.institute = userWithInst.institute.name;
            }
        }

        // Validate inbox subject conflict
        if (testDetails) {
            const mergedDetails = {
                index: testDetails.index !== undefined ? testDetails.index : test.index,
                subject: testDetails.subject !== undefined ? testDetails.subject : test.subject,
                course: testDetails.course !== undefined ? testDetails.course : test.course,
                institute: testDetails.institute !== undefined ? testDetails.institute : test.institute
            };
            await validateInboxSubjectConflict(test._id, mergedDetails, test.institute, res);
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
        if (testDetails.isAssigned !== undefined) test.isAssigned = testDetails.isAssigned;
        if (testDetails.assignedStudents !== undefined) test.assignedStudents = testDetails.assignedStudents;
        if (testDetails.assignmentType !== undefined) test.assignmentType = testDetails.assignmentType;

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

        test.isDeleted = true;
        await test.save();
        res.json({ message: 'Test moved to Recycle Bin' });
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

// @desc    Get all deleted tests
// @route   GET /api/tests/trash
// @access  Private
const getDeletedTests = asyncHandler(async (req, res) => {
    let query = { isDeleted: true };
    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor' || req.user.role === 'Teacher')) {
        let userWithInst = await User.findById(req.user._id).populate('institute');
        if (userWithInst && userWithInst.institute) {
            const escapedName = userWithInst.institute.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            query = {
                isDeleted: true,
                $or: [
                    { institute: { $regex: new RegExp(`^\\s*${escapedName}\\s*$`, 'i') } },
                    { createdBy: req.user._id }
                ]
            };
        } else {
            query = { isDeleted: true, createdBy: req.user._id };
        }
    }
    const tests = await Test.find(query)
        .populate('createdBy', 'name email role')
        .populate('collaborators', 'name email role')
        .sort({ createdAt: -1 });
    res.json(tests);
});

// @desc    Restore a deleted test
// @route   PUT /api/tests/:id/restore
// @access  Private
const restoreTest = asyncHandler(async (req, res) => {
    const test = await Test.findById(req.params.id);
    if (!test) {
        res.status(404);
        throw new Error('Test not found');
    }
    
    // Check permission
    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor' || req.user.role === 'Teacher')) {
        const userWithInst = await User.findById(req.user._id).populate('institute');
        const instName = userWithInst?.institute?.name?.trim().toLowerCase();
        const testInstName = test.institute?.trim().toLowerCase();
        if (!instName || instName !== testInstName) {
            res.status(403);
            throw new Error('Not authorized to restore tests of other institutes');
        }
        if (req.user.role === 'Teacher') {
            const isCreator = test.createdBy && test.createdBy.toString() === req.user._id.toString();
            if (!isCreator && !test.allowTeacherEdit) {
                res.status(403);
                throw new Error('Not authorized to restore this test');
            }
        }
    }

    test.isDeleted = false;
    await test.save();
    res.json({ message: 'Test restored successfully', test });
});

// @desc    Permanently delete a test
// @route   DELETE /api/tests/:id/permanent
// @access  Private
const permanentlyDeleteTest = asyncHandler(async (req, res) => {
    const test = await Test.findById(req.params.id);
    if (!test) {
        res.status(404);
        throw new Error('Test not found');
    }

    // Check permission
    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor' || req.user.role === 'Teacher')) {
        const userWithInst = await User.findById(req.user._id).populate('institute');
        const instName = userWithInst?.institute?.name?.trim().toLowerCase();
        const testInstName = test.institute?.trim().toLowerCase();
        if (!instName || instName !== testInstName) {
            res.status(403);
            throw new Error('Not authorized to delete tests of other institutes');
        }
        if (req.user.role === 'Teacher') {
            const isCreator = test.createdBy && test.createdBy.toString() === req.user._id.toString();
            if (!isCreator && !test.allowTeacherEdit) {
                res.status(403);
                throw new Error('Not authorized to delete this test permanently');
            }
        }
    }

    await test.deleteOne();
    res.json({ message: 'Test permanently deleted' });
});

module.exports = { 
    createTest, 
    getTests, 
    getTestById, 
    updateTest, 
    deleteTest,
    getInstituteEditors,
    updateTestCollaborators,
    getDeletedTests,
    restoreTest,
    permanentlyDeleteTest
};
