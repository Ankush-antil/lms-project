require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected');

    // Print all users details including allowedRoles
    const allUsers = await User.find({});
    console.log('All Users allowedRoles:');
    allUsers.forEach(u => {
        console.log(`- Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, allowedRoles: ${JSON.stringify(u.allowedRoles)}`);
    });

    // Simulate the controller query
    const sessionCourse = '6a57672937730ffc568277d7';
    const sessionSection = 'A';
    
    let studentQuery = { role: 'Student' };
    if (sessionCourse) {
        studentQuery.$or = [
            { 'studentProfile.course': sessionCourse },
            { 'studentProfile.coursesList.course': sessionCourse }
        ];
    }
    if (sessionSection) {
        studentQuery['studentProfile.section'] = sessionSection;
    }

    const matchedStudents = await User.find(studentQuery);
    console.log(`\nSimulated Query matched ${matchedStudents.length} students:`);
    matchedStudents.forEach(s => {
        console.log(`- Name: ${s.name}, Email: ${s.email}`);
    });

    // Print all active sessions
    const AttendanceSession = require('../models/AttendanceSession');
    const sessions = await AttendanceSession.find({});
    console.log(`\nFound ${sessions.length} sessions:`);
    sessions.forEach(s => {
        console.log(`- ID: ${s._id}, Teacher: ${s.teacher}, Subject: ${s.subject}, Section: ${s.section}, Course: ${s.course}, IsActive: ${s.isActive}`);
    });

    await mongoose.connection.close();
};

run();
