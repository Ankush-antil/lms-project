// Helper script: Database se ek test user ka email nikalo
// Run: node server/scripts/get-test-user.js

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function getTestUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB\n');

        // Count total users
        const totalUsers = await User.countDocuments({ isDeleted: { $ne: true } });
        const totalStudents = await User.countDocuments({ role: 'Student', isDeleted: { $ne: true } });
        const totalTeachers = await User.countDocuments({ role: 'Teacher', isDeleted: { $ne: true } });
        const totalAdmins = await User.countDocuments({ role: 'Admin', isDeleted: { $ne: true } });

        console.log('=== Database Stats ===');
        console.log(`Total Users: ${totalUsers}`);
        console.log(`Students: ${totalStudents}`);
        console.log(`Teachers: ${totalTeachers}`);
        console.log(`Admins: ${totalAdmins}`);
        console.log('');

        // Get a sample student
        const sampleStudent = await User.findOne({ role: 'Student', isDeleted: { $ne: true } })
            .select('name email role');
        
        if (sampleStudent) {
            console.log('=== Sample Student (use for k6 test) ===');
            console.log(`Name: ${sampleStudent.name}`);
            console.log(`Email: ${sampleStudent.email}`);
            console.log('');
            console.log('Run load test with this command:');
            console.log(`k6 run -e TEST_EMAIL=${sampleStudent.email} -e TEST_PASSWORD=<password> k6-load-test.js`);
        } else {
            console.log('No students found in database!');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

getTestUser();
