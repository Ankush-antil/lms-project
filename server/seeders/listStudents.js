require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

async function listStudents() {
    await connectDB();
    const students = await User.find({ role: 'Student' }).select('name email mobileNumber').lean();
    console.log('\n=== Students ===');
    students.forEach(s => console.log(`Name: ${s.name} | Email: ${s.email} | Mobile: ${s.mobileNumber}`));
    process.exit(0);
}
listStudents().catch(e => { console.error(e); process.exit(1); });
