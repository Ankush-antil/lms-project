require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const AttendanceSession = require('../models/AttendanceSession');

async function run() {
    await connectDB();
    console.log("Database connected.");

    const qrToken = 'c13c7df4-cfbb-4f35-ab35-2ea66fe48a97'; // we can find it from the session
    const studentId = '6a43f64a9055410721b9bffd';
    
    // Find active session
    const session = await AttendanceSession.findOne({ isActive: true });
    if (!session) {
        console.log("No active session found.");
        // Let's find the last session
        const lastSession = await AttendanceSession.findOne().sort({ createdAt: -1 });
        console.log("Last session:", lastSession);
        
        const record = await Attendance.findOne({ student: studentId, date: lastSession.date });
        console.log("Record check for last session date:", record);
        const checkStatus = record ? (record.checkOutTime ? 'completed' : 'checked-in') : 'not-started';
        console.log("checkStatus is:", checkStatus);
    } else {
        console.log("Active session:", session);
        const record = await Attendance.findOne({ student: studentId, date: session.date });
        console.log("Record check for active session date:", record);
        const checkStatus = record ? (record.checkOutTime ? 'completed' : 'checked-in') : 'not-started';
        console.log("checkStatus is:", checkStatus);
    }

    mongoose.connection.close();
}

run().catch(console.error);
