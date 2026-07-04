require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const run = async () => {
    try {
        await connectDB();
        const teacher = await User.findOne({ email: 'teacher@lms.com' });
        const student = await User.findOne({ name: 'Student User' });
        
        console.log('Teacher assigned courses:', teacher.teacherProfile?.assignedCourses);
        console.log('Student course:', student.studentProfile?.course);
        
        const courseId = student.studentProfile?.course;
        const teachesCourse = teacher.teacherProfile?.assignedCourses?.some(c => c.toString() === courseId?.toString());
        console.log('Teaches course?', teachesCourse);

        // Check if there is an existing record
        const date = '2026-07-04';
        const existingIndex = student.studentProfile.physicalAttendance.findIndex(a => a.date === date);
        console.log('Existing index for date:', existingIndex);
        if (existingIndex !== -1) {
            console.log('Existing record status:', student.studentProfile.physicalAttendance[existingIndex].status);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
