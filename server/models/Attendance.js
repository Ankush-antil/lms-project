const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AttendanceSession',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: String, // YYYY-MM-DD
        required: true
    },
    checkInTime: {
        type: Date
    },
    checkInPhoto: {
        type: String // Server file path or URL to stored image
    },
    checkOutTime: {
        type: Date
    },
    checkOutPhoto: {
        type: String // Server file path or URL to stored image
    },
    status: {
        type: String,
        enum: ['In', 'Present', 'Absent', 'Holiday'],
        default: 'Absent'
    },
    isManual: {
        type: Boolean,
        default: false
    },
    teacherNote: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Compound index to ensure a student has at most one record per session
attendanceSchema.index({ session: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
