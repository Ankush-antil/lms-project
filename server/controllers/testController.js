const asyncHandler = require('express-async-handler');
const Test = require('../models/Test');
const Activity = require('../models/Activity');
const User = require('../models/User');
// Must import these to ensure they are registered for populate
const Institute = require('../models/Institute');
const Course = require('../models/Course');

// @desc    Create new test
// @route   POST /api/tests
// @access  Private/Admin
const createTest = asyncHandler(async (req, res) => {
    const { testDetails, settings, questions } = req.body;

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

// @desc    Get all tests
// @route   GET /api/tests
// @access  Private
const getTests = asyncHandler(async (req, res) => {
    let query = {};

    // For students: filter by institute + subject (mandatory) + course (if available)
    if (req.user.role === 'Student') {
        const user = await User.findById(req.user._id)
            .populate('institute')
            .populate('studentProfile.course');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const studentInstitute = user.institute?.name?.trim();
        const studentCourse = user.studentProfile?.course?.name?.trim();
        const studentSubject = user.studentProfile?.subject?.trim();

        console.log(`[Tests-Query] Processing for ${user.name}`);
        console.log(`[Tests-Query] Student Details: Inst="${studentInstitute}", Course="${studentCourse}", Subjects="${studentSubject}"`);

        if (!studentInstitute) {
            console.warn(`[Tests-Query] Student ${user.name} missing institute.`);
            return res.json([]);
        }

        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // 1. MUST match Institute (case-insensitive, flexible whitespace)
        query.institute = { $regex: new RegExp(`^\\s*${escapeRegex(studentInstitute)}\\s*$`, 'i') };

        // 2. MUST match at least one Subject from student's comma-separated list
        if (studentSubject) {
            const subjects = studentSubject.split(',').map(s => s.trim()).filter(Boolean);
            if (subjects.length > 0) {
                query.subject = {
                    $in: subjects.map(sub => new RegExp(`^\\s*${escapeRegex(sub)}\\s*$`, 'i'))
                };
            } else {
                query.subject = { $in: [null, '', undefined] };
            }
        } else {
            query.subject = { $in: [null, '', undefined] };
        }

        // 3. IF the student has a course AND the test has a course name, they should match
        // If the test has NO course name, it's visible to any course in that institute/subject.
        if (studentCourse) {
            // Match tests that either have NO course OR have the matching course name
            query.$or = [
                { course: { $in: [null, '', undefined] } },
                { course: { $regex: new RegExp(`^\\s*${escapeRegex(studentCourse)}\\s*$`, 'i') } }
            ];
        }

        console.log(`[Tests-Query] Formulated Query:`, JSON.stringify(query));
    }



    const tests = await Test.find(query).sort({ createdAt: -1 });
    console.log(`[Tests] Found ${tests.length} tests for ${req.user.name}`);
    if (tests.length > 0) {
        console.log(`[Tests] Titles: ${tests.map(t => t.title).join(', ')}`);
    }
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
    const test = await Test.findById(req.params.id);

    if (test) {
        if (testDetails.title !== undefined) test.title = testDetails.title;
        if (testDetails.institute !== undefined) test.institute = testDetails.institute;
        if (testDetails.course !== undefined) test.course = testDetails.course;
        if (testDetails.subject !== undefined) test.subject = testDetails.subject;
        if (testDetails.date !== undefined) test.date = testDetails.date;
        if (testDetails.index !== undefined) test.index = testDetails.index;
        if (testDetails.activity !== undefined) test.activity = testDetails.activity;

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
        await test.deleteOne();
        res.json({ message: 'Test removed' });
    } else {
        res.status(404);
        throw new Error('Test not found');
    }
});

module.exports = { createTest, getTests, getTestById, updateTest, deleteTest };
