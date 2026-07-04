require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Attendance = require('../models/Attendance');

async function run() {
    await connectDB();
    console.log("Database connected.");
    
    const records = await Attendance.find({ date: '2026-07-04' });
    for (const r of records) {
        console.log(`Record ID: ${r._id}, studentRef: ${r.student}, date: "${r.date}", status: ${r.status}, checkInTime: ${r.checkInTime}`);
    }
    
    mongoose.connection.close();
}

run().catch(console.error);
