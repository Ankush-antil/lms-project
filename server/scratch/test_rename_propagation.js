const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Test = require('../models/Test');
const StudentInboxConfig = require('../models/StudentInboxConfig');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lms-project');
        console.log('Connected to DB');

        const teacher = await User.findOne({ role: 'Teacher' });
        if (!teacher) {
            console.log('No teacher found');
            await mongoose.disconnect();
            return;
        }

        const student = await User.findOne({ role: 'Student' });
        if (!student) {
            console.log('No student found');
            await mongoose.disconnect();
            return;
        }

        console.log(`Using Student: ${student.name}`);
        const courseId = student.studentProfile?.course;
        const subject = 'Computer Fundamentals'; // a default subject

        // Create a mock test for the student's course and subject
        const course = await Course.findById(courseId);
        if (!course) {
            console.log('No course found for student');
            await mongoose.disconnect();
            return;
        }

        console.log(`Course: ${course.name}`);

        // Create or update a test with index "Index 1"
        let test = await Test.findOne({ course: course.name, subject, index: 'Index 1' });
        if (!test) {
            test = await Test.create({
                title: 'Dummy Test for Verification',
                course: course.name,
                subject,
                index: 'Index 1'
            });
            console.log('Created dummy test with index "Index 1"');
        } else {
            console.log('Found existing test with index "Index 1"');
        }

        // Run the renaming logic (rename "Index 1" to "Fundamentals Basics")
        const inboxId = 'Index 1';
        const displayName = 'Fundamentals Basics';

        // 1. Update config for current student
        await StudentInboxConfig.findOneAndUpdate(
            { student: student._id, inboxId },
            { $set: { displayName } },
            { upsert: true, new: true }
        );

        // 2. Propagate displayName to all students in course
        const studentsInCourse = await User.find({
            $or: [
                { 'studentProfile.course': courseId },
                { 'studentProfile.coursesList.course': courseId }
            ]
        }).select('_id');
        const studentIds = studentsInCourse.map(s => s._id);

        console.log(`Students in course count: ${studentIds.length}`);
        if (studentIds.length > 0) {
            for (const sId of studentIds) {
                await StudentInboxConfig.findOneAndUpdate(
                    { student: sId, inboxId },
                    { $set: { displayName } },
                    { upsert: true, new: true }
                );
            }
        }

        // 3. Update tests
        const searchIndexNames = [inboxId, 'Index 1'];
        const updateResult = await Test.updateMany(
            {
                course: course.name,
                subject: { $regex: new RegExp(`^\\s*${subject.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*$`, 'i') },
                index: { $in: searchIndexNames }
            },
            { $set: { index: displayName } }
        );

        console.log(`Updated tests count: ${updateResult.modifiedCount}`);

        // Verify test is renamed
        const updatedTest = await Test.findById(test._id);
        console.log(`Updated test index is: ${updatedTest.index}`);

        // Clean up mock test
        if (test.title === 'Dummy Test for Verification') {
            await Test.deleteOne({ _id: test._id });
            console.log('Cleaned up dummy test');
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

run();
