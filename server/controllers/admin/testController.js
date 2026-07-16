const asyncHandler = require('express-async-handler');
const Test = require('../../models/Test');
const Activity = require('../../models/Activity');
const User = require('../../models/User');
const TestHistory = require('../../models/TestHistory');
const Institute = require('../../models/Institute');

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
    // Bypassed to allow multiple tests of different subjects in the same inbox
    return;

    const index = testDetails?.index;
    const subject = testDetails?.subject;
    const course = testDetails?.course;
    const institute = testDetails?.institute || currentInstitute;

    if (index && index.trim() && subject && subject.trim() && course && course.trim() && institute) {
        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const Test = require('../../models/Test');
        
        // Split courses and subjects to check each one individually
        const coursesArr = course.split(',').map(c => c.trim()).filter(Boolean);
        const subjectsArr = subject.split(',').map(s => s.trim()).filter(Boolean);

        const normalizeSubjectName = (name) => {
            if (!name) return '';
            return name.trim().toLowerCase().replace(/s$/, '');
        };

        for (const cName of coursesArr) {
            const query = {
                isDeleted: { $ne: true },
                institute: { $regex: new RegExp(`^\\s*${escapeRegex(institute)}\\s*$`, 'i') },
                course: { $regex: new RegExp(`(^|,)\\s*${escapeRegex(cName)}\\s*(,|$)`, 'i') },
                index: { $regex: new RegExp(`^\\s*${escapeRegex(index)}\\s*$`, 'i') }
            };
            
            if (testId) {
                query._id = { $ne: testId };
            }
            
            const existingTests = await Test.find(query);
            for (const existingTest of existingTests) {
                if (existingTest.subject && existingTest.subject.trim()) {
                    // Check if any subject in existingTest matches any in subjectsArr
                    const existingSubs = existingTest.subject.split(',').map(s => normalizeSubjectName(s)).filter(Boolean);
                    const newSubsLower = subjectsArr.map(s => normalizeSubjectName(s));
                    
                    const hasConflict = existingSubs.some(eSub => !newSubsLower.includes(eSub));
                    if (hasConflict) {
                        try {
                            const fs = require('fs');
                            const path = require('path');
                            const debugMsg = `[CONFLICT DEBUG] ${new Date().toISOString()}\nCourse: ${cName}\nIndex: ${index}\nExisting Test: ${existingTest.title} (ID: ${existingTest._id})\nExisting Subjects: ${existingTest.subject} (Normalized: ${existingSubs.join(',')})\nNew Subjects: ${subject} (Normalized: ${newSubsLower.join(',')})\n\n`;
                            fs.appendFileSync(path.join(__dirname, '../../error.log'), debugMsg);
                        } catch (_) {}

                        if (res) res.status(400);
                        throw new Error(`This inbox (${index}) in course "${cName}" is already assigned to a different subject: "${existingTest.subject}". Only tests of the same subject can be added to this inbox.`);
                    }
                }
            }
        }
    }
};

const getGlobalIdForSubjectDay = async (courseIdOrName, subjectName, localDayNum) => {
    const mongoose = require('mongoose');
    const Course = require('../../models/Course');
    let course;
    if (mongoose.Types.ObjectId.isValid(courseIdOrName)) {
        course = await Course.findById(courseIdOrName);
    } else {
        course = await Course.findOne({ name: courseIdOrName });
    }
    if (!course) return `Inbox ${localDayNum}`;

    const subjects = course.subjects || [];
    const durations = course.subjectDurations || [];
    const totalDuration = course.duration || 5;

    let currentDayIndex = 1;
    const mapping = [];

    if (durations && durations.length > 0) {
        durations.forEach(d => {
            const subName = d.subjectName;
            const subDur = Number(d.duration) || 0;
            const subDays = [];
            for (let i = 1; i <= subDur; i++) {
                subDays.push({
                    dayNum: i,
                    id: `Inbox ${currentDayIndex}`
                });
                currentDayIndex++;
            }
            if (subDays.length > 0) {
                mapping.push({
                    subjectName: subName,
                    days: subDays
                });
            }
        });
    }

    const matchedGroup = mapping.find(m => m.subjectName.toLowerCase() === subjectName.toLowerCase());
    if (matchedGroup) {
        const day = matchedGroup.days.find(d => d.dayNum === localDayNum);
        if (day) return day.id;
    }
    return `Inbox ${localDayNum}`;
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

    const subjects = (testDetails.subject || '').split(',').map(s => s.trim()).filter(Boolean);
    const match = (testDetails.index || '').match(/\d+/);
    const localDayNum = match ? parseInt(match[0], 10) : 1;

    let createdTest = null;

    if (subjects.length > 0) {
        for (let i = 0; i < subjects.length; i++) {
            const sub = subjects[i];
            const globalIndex = await getGlobalIdForSubjectDay(testDetails.course, sub, localDayNum);
            
            const detailsCopy = {
                ...testDetails,
                subject: sub,
                index: globalIndex
            };

            await validateInboxSubjectConflict(null, detailsCopy, detailsCopy.institute, res);

            const testDoc = await Test.create({
                ...detailsCopy,
                settings,
                questions,
                createdBy: req.user._id
            });

            if (i === 0) {
                createdTest = testDoc;
            }

            // Log Activity
            await Activity.create({
                type: 'TEST_CREATED',
                message: 'New Test created',
                detail: `${testDoc.title} (${testDoc.course} - ${sub})`,
                user: req.user._id
            });
        }
    } else {
        await validateInboxSubjectConflict(null, testDetails, testDetails.institute, res);
        
        createdTest = await Test.create({
            ...testDetails,
            settings,
            questions,
            createdBy: req.user._id
        });

        // Log Activity
        await Activity.create({
            type: 'TEST_CREATED',
            message: 'New Test created',
            detail: `${createdTest.title} (${createdTest.course})`,
            user: req.user._id
        });
    }

    res.status(201).json(createdTest);
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 0;
    const skip = (page - 1) * limit;

    let dbQuery = Test.find(query);
    if (limit > 0) {
        dbQuery = dbQuery.skip(skip).limit(limit);
    }

    const tests = await dbQuery
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

        // Validate inbox subject conflict and handle multi-subject auto-duplication on update
        if (testDetails) {
            const subjects = (testDetails.subject || test.subject || '').split(',').map(s => s.trim()).filter(Boolean);
            if (subjects.length > 1) {
                // Keep the first subject for the current test
                const firstSub = subjects[0];
                const match = (testDetails.index || test.index || '').match(/\d+/);
                const localDayNum = match ? parseInt(match[0], 10) : 1;
                const firstSubIndex = await getGlobalIdForSubjectDay(testDetails.course || test.course, firstSub, localDayNum);
                
                testDetails.subject = firstSub;
                testDetails.index = firstSubIndex;

                const mergedDetails = {
                    index: firstSubIndex,
                    subject: firstSub,
                    course: testDetails.course !== undefined ? testDetails.course : test.course,
                    institute: testDetails.institute !== undefined ? testDetails.institute : test.institute
                };
                await validateInboxSubjectConflict(test._id, mergedDetails, test.institute, res);

                // Create duplicate tests for the remaining subjects
                for (let i = 1; i < subjects.length; i++) {
                    const sub = subjects[i];
                    const subIndex = await getGlobalIdForSubjectDay(testDetails.course || test.course, sub, localDayNum);
                    
                    const detailsCopy = {
                        title: testDetails.title !== undefined ? testDetails.title : test.title,
                        description: testDetails.description !== undefined ? testDetails.description : test.description,
                        institute: testDetails.institute !== undefined ? testDetails.institute : test.institute,
                        course: testDetails.course !== undefined ? testDetails.course : test.course,
                        date: testDetails.date !== undefined ? testDetails.date : test.date,
                        activity: testDetails.activity !== undefined ? testDetails.activity : test.activity,
                        publishMode: testDetails.publishMode !== undefined ? testDetails.publishMode : test.publishMode,
                        publicSettings: testDetails.publicSettings !== undefined ? testDetails.publicSettings : test.publicSettings,
                        allowTeacherEdit: testDetails.allowTeacherEdit !== undefined ? testDetails.allowTeacherEdit : test.allowTeacherEdit,
                        discussionActivity: testDetails.discussionActivity !== undefined ? testDetails.discussionActivity : test.discussionActivity,
                        isAssigned: testDetails.isAssigned !== undefined ? testDetails.isAssigned : test.isAssigned,
                        assignedStudents: testDetails.assignedStudents !== undefined ? testDetails.assignedStudents : test.assignedStudents,
                        assignmentType: testDetails.assignmentType !== undefined ? testDetails.assignmentType : test.assignmentType,
                        subject: sub,
                        index: subIndex
                    };

                    await validateInboxSubjectConflict(null, detailsCopy, detailsCopy.institute, res);

                    await Test.create({
                        ...detailsCopy,
                        settings: settings !== undefined ? settings : test.settings,
                        questions: questions !== undefined ? questions : test.questions,
                        createdBy: req.user._id
                    });
                }
            } else {
                const mergedDetails = {
                    index: testDetails.index !== undefined ? testDetails.index : test.index,
                    subject: testDetails.subject !== undefined ? testDetails.subject : test.subject,
                    course: testDetails.course !== undefined ? testDetails.course : test.course,
                    institute: testDetails.institute !== undefined ? testDetails.institute : test.institute
                };
                await validateInboxSubjectConflict(test._id, mergedDetails, test.institute, res);
            }
        }

        if (testDetails.title !== undefined) test.title = testDetails.title;
        if (testDetails.description !== undefined) test.description = testDetails.description;
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

const importTests = asyncHandler(async (req, res) => {
    const { tests } = req.body;
    if (!Array.isArray(tests)) {
        res.status(400);
        throw new Error('Tests array is required');
    }

    let successCount = 0;
    const errors = [];

    // Fetch user's institute if role is Institute, Teacher or Editor
    let currentInstName = '';
    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Teacher' || req.user.role === 'Editor')) {
        const userWithInst = await User.findById(req.user._id).populate('institute');
        if (userWithInst && userWithInst.institute) {
            currentInstName = userWithInst.institute.name;
        }
    }

    for (const t of tests) {
        try {
            const { title, course, subject, index, description, publishMode, status, settings, questions, publicSettings, isAssigned, visibilityMode } = t;
            if (!title) {
                errors.push({ name: 'Unknown', error: 'Title is required' });
                continue;
            }

            // Set institute
            const testInst = currentInstName || t.institute || '';

            // Extract and parse nested fields (settings, questions, publicSettings) if they are JSON strings
            let parsedSettings = settings || {};
            if (typeof settings === 'string') {
                try { parsedSettings = JSON.parse(settings); } catch (e) { }
            }

            let parsedQuestions = questions || [];
            if (typeof questions === 'string') {
                try { parsedQuestions = JSON.parse(questions); } catch (e) { }
            }

            let parsedPublicSettings = publicSettings || {};
            if (typeof publicSettings === 'string') {
                try { parsedPublicSettings = JSON.parse(publicSettings); } catch (e) { }
            }

            // If duration is specified on root, set it on settings
            if (t.duration && !parsedSettings.duration) {
                parsedSettings.duration = Number(t.duration);
            }

            validateWebpageQuestions(parsedQuestions);

            // Determine isAssigned boolean: checked upcoming = true, checked assign = false
            let finalIsAssigned = false;
            const checkVal = isAssigned !== undefined ? isAssigned : visibilityMode;
            if (checkVal !== undefined) {
                if (typeof checkVal === 'string') {
                    finalIsAssigned = checkVal.toLowerCase().trim() === 'upcoming';
                } else {
                    finalIsAssigned = !!checkVal;
                }
            }

            const testDetails = {
                title,
                description: description || '',
                institute: testInst,
                course: course || '',
                subject: subject || '',
                index: index || '',
                publishMode: publishMode || 'connected',
                status: status || 'active',
                isAssigned: finalIsAssigned,
                publicSettings: parsedPublicSettings
            };

            await validateInboxSubjectConflict(null, testDetails, testDetails.institute, null);

            const createdTest = await Test.create({
                ...testDetails,
                settings: parsedSettings,
                questions: parsedQuestions,
                createdBy: req.user._id
            });

            // Log Activity
            await Activity.create({
                type: 'TEST_CREATED',
                message: 'New Test created via Bulk Import',
                detail: `${createdTest.title} (${createdTest.course})`,
                user: req.user._id
            });

            successCount++;
        } catch (err) {
            errors.push({ name: t.title || 'Unknown', error: err.message });
        }
    }

    res.status(200).json({
        message: 'Import completed',
        results: {
            successCount,
            errors
        }
    });
});

const duplicateTest = asyncHandler(async (req, res) => {
    const test = await Test.findById(req.params.id);
    if (!test) {
        res.status(404);
        throw new Error('Test not found');
    }

    // Enforce institute ownership check for Institute, Teacher and Editor roles
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
            throw new Error('Not authorized to duplicate tests of other institutes');
        }
    }

    const testObj = test.toObject();

    // Delete document identifiers and timestamps
    delete testObj._id;
    delete testObj.createdAt;
    delete testObj.updatedAt;

    // Remove _id from questions subdocuments to let MongoDB generate new ones
    if (testObj.questions && Array.isArray(testObj.questions)) {
        testObj.questions.forEach(q => {
            delete q._id;
        });
    }

    const duplicatedTest = await Test.create({
        ...testObj,
        title: `${test.title} - Duplicate`,
        createdBy: req.user._id
    });

    // Log Activity
    await Activity.create({
        type: 'TEST_CREATED',
        message: 'Test duplicated',
        detail: `${duplicatedTest.title} (from ${test.title})`,
        user: req.user._id
    });

    res.status(201).json(duplicatedTest);
});

// @desc    Get history for a test
// @route   GET /api/tests/:id/history
// @access  Private
const getTestHistory = asyncHandler(async (req, res) => {
    const history = await TestHistory.find({ test: req.params.id })
        .sort({ createdAt: -1 })
        .limit(100);
    res.json(history);
});

// @desc    Add a history entry for a test
// @route   POST /api/tests/:id/history
// @access  Private
const addTestHistory = asyncHandler(async (req, res) => {
    const { action, description, meta } = req.body;
    const entry = await TestHistory.create({
        test: req.params.id,
        user: req.user._id,
        userName: req.user.name || 'Unknown',
        userRole: req.user.role || 'Admin',
        action: action || 'saved',
        description: description || '',
        meta: meta || {}
    });
    res.status(201).json(entry);
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
    permanentlyDeleteTest,
    importTests,
    duplicateTest,
    getTestHistory,
    addTestHistory
};

