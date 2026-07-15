const asyncHandler = require('express-async-handler');
const User = require('../../models/User');
const Test = require('../../models/Test');
const Submission = require('../../models/Submission');

// @desc    Get students for the logged in teacher
// @route   GET /api/users/teacher-students
// @access  Private (Teacher)
const getTeacherStudents = asyncHandler(async (req, res) => {
    try {
        const teacher = await User.findById(req.user._id).populate('teacherProfile.assignedCourses', 'name');
        if (!teacher || teacher.role !== 'Teacher') {
            return res.status(403).json({ message: 'Not authorized as a teacher' });
        }

        const assignedCourses = teacher.teacherProfile?.assignedCourses || [];
        const courseIds = assignedCourses.map(c => c._id || c);
        console.log(`[API] Teacher ${teacher.name} fetching students for courses:`, courseIds);

        const mode = teacher.teacherProfile?.studentAssignmentMode || 'all';
        const assignedSections = teacher.teacherProfile?.assignedSections || [];
        const assignedStudents = teacher.teacherProfile?.assignedStudents || [];

        let query = {
            role: 'Student',
            $or: [
                { 'studentProfile.course': { $in: courseIds } },
                { 'studentProfile.coursesList.course': { $in: courseIds } }
            ]
        };

        if (mode === 'section') {
            query['studentProfile.section'] = { $in: assignedSections };
        } else if (mode === 'selected') {
            query['_id'] = { $in: assignedStudents };
        }

        // Find students matching assignment filters
        const students = await User.find(query)
            .select('-password')
            .populate([
                { path: 'institute', select: 'name' },
                { path: 'studentProfile.course', select: 'name subjects duration subjectDurations' },
                { path: 'studentProfile.coursesList.course', select: 'name subjects duration subjectDurations' }
            ]);

        const teacherSubjects = teacher.teacherProfile?.subjects || [];
        const studentsWithStats = await Promise.all(students.map(async (student) => {
            try {
                const studentObj = student.toObject();

                // Filter subjects of student courses to only include teacher subjects
                if (studentObj.studentProfile) {
                    const teacherSubjectsLower = teacherSubjects.map(s => s.toLowerCase());
                    if (studentObj.studentProfile.subject) {
                        const studentSubs = studentObj.studentProfile.subject.split(',').map(s => s.trim()).filter(Boolean);
                        studentObj.studentProfile.subject = studentSubs.filter(sub => teacherSubjectsLower.includes(sub.toLowerCase())).join(', ');
                    }
                    if (studentObj.studentProfile.course) {
                        studentObj.studentProfile.course.subjects = (studentObj.studentProfile.course.subjects || []).filter(sub => teacherSubjectsLower.includes(sub.toLowerCase()));
                        studentObj.studentProfile.course.subjectDurations = (studentObj.studentProfile.course.subjectDurations || []).filter(sd => teacherSubjectsLower.includes((sd.subjectName || '').toLowerCase()));
                    }
                    if (studentObj.studentProfile.coursesList) {
                        studentObj.studentProfile.coursesList = studentObj.studentProfile.coursesList.map(item => {
                            if (item.course) {
                                item.course.subjects = (item.course.subjects || []).filter(sub => teacherSubjectsLower.includes(sub.toLowerCase()));
                                item.course.subjectDurations = (item.course.subjectDurations || []).filter(sd => teacherSubjectsLower.includes((sd.subjectName || '').toLowerCase()));
                            }
                            if (item.subjects) {
                                item.subjects = (item.subjects || []).filter(sub => teacherSubjectsLower.includes(sub.toLowerCase()));
                            }
                            return item;
                        });
                    }
                }

                // Find tests matching teacher's assignments
                const teacherCourseNames = teacher.teacherProfile?.assignedCourses?.map(c => c.name) || [];
                const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                const testOrQueries = [];
                teacherCourseNames.forEach(cName => {
                    testOrQueries.push({ course: { $regex: new RegExp(`(^|,)\\s*${escapeRegex(cName)}\\s*(,|$)`, 'i') } });
                });
                teacherSubjects.forEach(sub => {
                    testOrQueries.push({ subject: { $regex: new RegExp(`(^|,)\\s*${escapeRegex(sub)}\\s*(,|$)`, 'i') } });
                });

                const matchingTests = await Test.find(
                    testOrQueries.length > 0 ? { $or: testOrQueries } : { _id: null }
                ).select('_id');
                const testIds = matchingTests.map(t => t._id);

                const subs = await Submission.find({
                    student: student._id,
                    test: { $in: testIds }
                });

                return {
                    ...studentObj,
                    stats: {
                        pending: subs.filter(s => s.status === 'submitted').length,
                        completed: subs.filter(s => s.status === 'evaluated').length,
                        total: subs.length
                    }
                };
            } catch (err) {
                console.error(`Error processing stats for student ${student._id}:`, err);
                const fallbackObj = student.toObject();
                return { ...fallbackObj, stats: { pending: 0, completed: 0, total: 0 } };
            }
        }));

        res.json(studentsWithStats);
    } catch (error) {
        console.error('CRITICAL ERROR IN getTeacherStudents:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = {
    getTeacherStudents
};
