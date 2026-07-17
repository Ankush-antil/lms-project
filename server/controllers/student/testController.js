const asyncHandler = require('express-async-handler');
const Test = require('../../models/Test');
const User = require('../../models/User');

// @desc    Get assigned tests for a Student
// @route   GET /api/student/tests
// @access  Private/Student
const getTests = asyncHandler(async (req, res) => {
    let targetUserId = req.user._id;
    if (req.user.role === 'Parent' && req.user.parentProfile?.student) {
        targetUserId = req.user.parentProfile.student;
    } else if (req.query.studentId && (req.user.role === 'Admin' || req.user.role === 'Institute')) {
        targetUserId = req.query.studentId;
    }

    const user = await User.findById(targetUserId)
        .populate('institute')
        .populate({
            path: 'studentProfile.course',
            populate: { path: 'institute' }
        })
        .populate({
            path: 'studentProfile.coursesList.course'
        });

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const studentInstitute = user.institute?.name?.trim() || user.studentProfile?.course?.institute?.name?.trim();

    console.log(`[Student-Tests-Query] Processing for ${user.name}`);
    console.log(`[Student-Tests-Query] Student Details: Inst="${studentInstitute}"`);

    if (!studentInstitute) {
        console.warn(`[Student-Tests-Query] Student ${user.name} missing institute.`);
        return res.json([]);
    }

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let query = { isDeleted: { $ne: true } };

    // 1. MUST match Institute (case-insensitive, flexible whitespace)
    query.institute = { $regex: new RegExp(`^\\s*${escapeRegex(studentInstitute)}\\s*$`, 'i') };

    // 2. Query matching courses and subjects from coursesList
    const assignedCourses = user.studentProfile?.coursesList && user.studentProfile.coursesList.length > 0
        ? user.studentProfile.coursesList
        : (user.studentProfile?.course ? [{ course: user.studentProfile.course, subjects: user.studentProfile.subject ? user.studentProfile.subject.split(',').map(s => s.trim()).filter(Boolean) : [] }] : []);

    let courseSubjectQueries = [];
    if (assignedCourses.length > 0) {
        for (const item of assignedCourses) {
            const courseObj = item.course;
            const courseName = courseObj?.name?.trim();
            const subjects = item.subjects || [];
            
            if (courseName && subjects.length > 0) {
                courseSubjectQueries.push({
                    $and: [
                        {
                            $or: [
                                { course: { $in: [null, '', undefined] } },
                                { course: { $regex: new RegExp(`(^|,)\\s*${escapeRegex(courseName)}\\s*(,|$)`, 'i') } }
                            ]
                        },
                        {
                            $or: subjects.map(sub => ({
                                subject: { $regex: new RegExp(`(^|,)\\s*${escapeRegex(sub)}\\s*(,|$)`, 'i') }
                            }))
                        }
                    ]
                });
            } else if (courseName) {
                courseSubjectQueries.push({
                    $or: [
                        { course: { $in: [null, '', undefined] } },
                        { course: { $regex: new RegExp(`(^|,)\\s*${escapeRegex(courseName)}\\s*(,|$)`, 'i') } }
                    ]
                });
            } else if (subjects.length > 0) {
                courseSubjectQueries.push({
                    $or: subjects.map(sub => ({
                        subject: { $regex: new RegExp(`(^|,)\\s*${escapeRegex(sub)}\\s*(,|$)`, 'i') }
                    }))
                });
            }
        }
    }

    if (courseSubjectQueries.length > 0) {
        query.$or = courseSubjectQueries;
    }

    // 3. MUST either be assigned to all students, or specifically assigned to this student
    query.$and = [
        {
            $or: [
                { assignedStudents: { $exists: false } },
                { assignedStudents: { $size: 0 } },
                { assignedStudents: targetUserId }
            ]
        }
    ];

    console.log(`[Student-Tests-Query] Formulated Query:`, JSON.stringify(query));

    const tests = await Test.find(query).populate('createdBy', 'name email role').sort({ createdAt: -1 });
    console.log(`[Student-Tests] Found ${tests.length} tests for ${user.name}`);
    
    const enrollmentDate = user.studentProfile?.enrollmentDate || user.createdAt || new Date();
    const modifiedTests = tests.map(t => {
        const testObj = t.toObject();
        if (testObj.settings && testObj.settings.activeDays) {
            const activeDaysMs = testObj.settings.activeDays * 24 * 60 * 60 * 1000;
            const match = (testObj.index || '').match(/\d+/);
            const idxNum = match ? parseInt(match[0], 10) : 1;
            const week = Math.ceil(idxNum / 7);
            const offsetDays = (week - 1) * 7;
            const inboxUnlockDateMs = new Date(enrollmentDate).getTime() + offsetDays * 24 * 60 * 60 * 1000;
            
            const testCreatedMs = new Date(testObj.createdAt || testObj.updatedAt || Date.now()).getTime();
            const countdownStartMs = Math.max(inboxUnlockDateMs, testCreatedMs);
            testObj.settings.endTime = new Date(countdownStartMs + activeDaysMs);
        }
        return testObj;
    });

    res.json(modifiedTests);
});

// @desc    Get test details by ID (for Student)
// @route   GET /api/student/tests/:id
// @access  Private/Student
const getTestById = asyncHandler(async (req, res) => {
    const test = await Test.findById(req.params.id).populate('createdBy', 'name email role');
    if (!test || test.isDeleted) {
        res.status(404);
        throw new Error('Test not found');
    }
    
    const testObj = test.toObject();
    if (testObj.settings && testObj.settings.activeDays) {
        const enrollmentDate = req.user.studentProfile?.enrollmentDate || req.user.createdAt || new Date();
        const activeDaysMs = testObj.settings.activeDays * 24 * 60 * 60 * 1000;
        const match = (testObj.index || '').match(/\d+/);
        const idxNum = match ? parseInt(match[0], 10) : 1;
        const week = Math.ceil(idxNum / 7);
        const offsetDays = (week - 1) * 7;
        const inboxUnlockDateMs = new Date(enrollmentDate).getTime() + offsetDays * 24 * 60 * 60 * 1000;
        
        const testCreatedMs = new Date(testObj.createdAt || testObj.updatedAt || Date.now()).getTime();
        const countdownStartMs = Math.max(inboxUnlockDateMs, testCreatedMs);
        testObj.settings.endTime = new Date(countdownStartMs + activeDaysMs);
    }
    
    res.json(testObj);
});

module.exports = { getTests, getTestById };
