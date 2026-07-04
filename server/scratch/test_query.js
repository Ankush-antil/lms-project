require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const AttendanceSession = require('../models/AttendanceSession');

async function run() {
    await connectDB();
    console.log("Database connected.");

    // Student ID: 6a43f64a9055410721b9bffd
    const studentId = mongoose.Types.ObjectId.createFromHexString('6a43f64a9055410721b9bffd');
    const date = '2026-07-04';

    const record = await Attendance.findOne({ student: studentId, date: date });
    console.log("Querying by student ObjectId and date string:");
    console.log("Record found:", record);

    const record2 = await Attendance.findOne({ student: '6a43f64a9055410721b9bffd', date: date });
    console.log("Querying by student string ID and date string:");
    console.log("Record found:", record2);

    mongoose.connection.close();
}

run().catch(console.error);
