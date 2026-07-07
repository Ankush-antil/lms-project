require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });
const mongoose = require('mongoose');
const User = require('../server/models/User');
const Course = require('../server/models/Course');
const FeeRecord = require('../server/models/FeeRecord');

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const courses = await Course.find({});
    console.log(`📚 Total courses in DB: ${courses.length}`);
    courses.forEach(c => {
        console.log(`  - Name: "${c.name}", Code: "${c.code}", ID: ${c._id}`);
    });

    const students = await User.find({ role: 'Student' });
    console.log(`\n👤 Total students: ${students.length}`);
    const noCourse = students.filter(s => !s.studentProfile?.course);
    console.log(`  - Students with NO course ID: ${noCourse.length}`);
    noCourse.slice(0, 5).forEach(s => {
        console.log(`    * Student: "${s.name}", AdmissionNo: "${s.admissionNo}"`);
    });

    // Check if there are corresponding FeeRecords with course names
    const feeRecords = await FeeRecord.find({});
    console.log(`\nTotal FeeRecords: ${feeRecords.length}`);
    const recordSample = feeRecords.slice(0, 5);
    recordSample.forEach(r => {
        console.log(`  - Record Course Name: "${r.course}", student ID: ${r.student}`);
    });

    await mongoose.disconnect();
}

check();
