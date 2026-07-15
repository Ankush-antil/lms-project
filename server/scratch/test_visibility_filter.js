const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lms-project');
        console.log('Connected to DB');

        const teacher = await User.findOne({ role: 'Teacher' })
            .populate({ path: 'teacherProfile.assignedCourses', select: 'name subjects subjectDurations' });

        if (!teacher) {
            console.log('No teacher user found in DB');
            await mongoose.disconnect();
            return;
        }

        console.log(`Teacher found: ${teacher.name}`);
        console.log(`Assigned Subjects on Profile:`, teacher.teacherProfile?.subjects);
        console.log(`Assigned Courses raw length:`, teacher.teacherProfile?.assignedCourses?.length);

        if (teacher.teacherProfile?.assignedCourses?.length > 0) {
            const firstCourse = teacher.teacherProfile.assignedCourses[0];
            console.log(`\nBefore Filtering First Course (${firstCourse.name}):`);
            console.log(`- Subjects:`, firstCourse.subjects);
            console.log(`- Durations:`, firstCourse.subjectDurations);

            // Let's filter
            const teacherSubjects = teacher.teacherProfile?.subjects || [];
            const courseObj = firstCourse.toObject ? firstCourse.toObject() : firstCourse;
            courseObj.subjects = (courseObj.subjects || []).filter(subject => teacherSubjects.includes(subject));
            courseObj.subjectDurations = (courseObj.subjectDurations || []).filter(sd => teacherSubjects.includes(sd.subjectName));

            console.log(`\nAfter Filtering First Course (${courseObj.name}) for Teacher's assigned subjects:`);
            console.log(`- Filtered Subjects:`, courseObj.subjects);
            console.log(`- Filtered Durations:`, courseObj.subjectDurations);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

run();
