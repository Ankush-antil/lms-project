const mongoose = require('mongoose');

const researchMessageSchema = new mongoose.Schema({
    researchContact: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ResearchContact',
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        default: ''
    },
    fileUrl: {
        type: String,
        default: ''
    },
    fileName: {
        type: String,
        default: ''
    },
    fileType: {
        type: String,
        default: ''
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editCount: {
        type: Number,
        default: 0
    },
    originalText: {
        type: String,
        default: ''
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null,
        index: { expires: 864000 } // 10 days in seconds = 864000
    }
}, {
    timestamps: true
});

const ResearchMessage = mongoose.model('ResearchMessage', researchMessageSchema);
module.exports = ResearchMessage;
