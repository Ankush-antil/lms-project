const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    materialType: {
        type: String,
        enum: ['video', 'audio', 'pdf', 'web'],
        default: 'pdf'
    },
    inboxId: {
        type: String,
        required: true
    },
    institute: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isPrivate: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        default: 'study-material',
        enum: ['study-material', 'upcoming', 'assign']
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    subject: {
        type: String
    },
    course: {
        type: String
    },
    dayNum: {
        type: Number
    },
    views: {
        type: [{
            student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            count: { type: Number, default: 1 },
            lastViewed: { type: Date, default: Date.now }
        }],
        default: []
    }
}, {
    timestamps: true
});

const StudyMaterial = mongoose.model('StudyMaterial', studyMaterialSchema);
module.exports = StudyMaterial;
