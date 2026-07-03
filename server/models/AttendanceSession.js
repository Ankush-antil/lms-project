const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema({
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    },
    subject: {
        type: String,
        required: true
    },
    section: {
        type: String,
        required: true
    },
    date: {
        type: String, // YYYY-MM-DD
        required: true
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date,
        required: true
    },
    duration: {
        type: Number, // in minutes
        required: true
    },
    qrToken: {
        type: String,
        required: true,
        unique: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    wifiSSID: {
        type: String
    },
    wifiIP: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
