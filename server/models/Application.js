const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    guestName: {
        type: String,
        required: true
    },
    guestPhone: {
        type: String,
        required: true
    },
    guestEmail: {
        type: String
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    institute: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institute',
        required: true
    },
    status: {
        type: String,
        enum: ['Applied', 'Under Review', 'Accepted', 'Rejected', 'Registered'],
        default: 'Applied'
    },
    role: {
        type: String,
        enum: ['Student', 'Teacher'],
        default: 'Student'
    },
    statement: {
        type: String
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Application', applicationSchema);
