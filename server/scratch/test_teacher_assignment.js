const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lms-project');
        console.log('Connected to DB');

        const teacher = await User.findOne({ role: 'Teacher' });
        if (!teacher) {
            console.log('No teacher user found in DB');
            await mongoose.disconnect();
            return;
        }

        console.log(`Original teacher settings for ${teacher.name}:`);
        console.log(`Mode: ${teacher.teacherProfile?.studentAssignmentMode}`);
        console.log(`Sections:`, teacher.teacherProfile?.assignedSections);
        console.log(`Selected Students:`, teacher.teacherProfile?.assignedStudents);

        // Test updating
        teacher.teacherProfile.studentAssignmentMode = 'section';
        teacher.teacherProfile.assignedSections = ['A', 'B'];
        await teacher.save();

        const updatedTeacher = await User.findById(teacher._id);
        console.log(`\nUpdated teacher settings for ${updatedTeacher.name}:`);
        console.log(`Mode: ${updatedTeacher.teacherProfile?.studentAssignmentMode}`);
        console.log(`Sections:`, updatedTeacher.teacherProfile?.assignedSections);
        console.log(`Selected Students:`, updatedTeacher.teacherProfile?.assignedStudents);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

run();
