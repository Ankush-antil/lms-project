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
    statement: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Application', applicationSchema);
