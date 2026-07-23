const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    institute: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institute',
        default: null
    },
    targetAudience: {
        type: String,
        enum: ['All', 'Student', 'Teacher', 'Staff', 'Editor', 'Accountant', 'Marketer', 'Parent', 'limited', 'guest'],
        default: 'All'
    },
    endDate: {
        type: Date,
        default: null
    },
    studentAudienceType: {
        type: String,
        enum: ['All', 'Selected'],
        default: 'All'
    },
    selectedStudents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    attachmentUrl: {
        type: String,
        default: ''
    },
    attachmentName: {
        type: String,
        default: ''
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    versionKey: false
});

const Announcement = mongoose.model('Announcement', announcementSchema);
module.exports = Announcement;
