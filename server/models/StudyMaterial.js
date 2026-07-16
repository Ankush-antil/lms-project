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
    }
}, {
    timestamps: true
});

const StudyMaterial = mongoose.model('StudyMaterial', studyMaterialSchema);
module.exports = StudyMaterial;
