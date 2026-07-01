const mongoose = require('mongoose');

const studentInboxConfigSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    inboxId: {
        type: String,
        required: true
    },
    displayName: {
        type: String,
        default: ''
    },
    visible: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Composite index to ensure unique configurations per student and inbox
studentInboxConfigSchema.index({ student: 1, inboxId: 1 }, { unique: true });

const StudentInboxConfig = mongoose.model('StudentInboxConfig', studentInboxConfigSchema);
module.exports = StudentInboxConfig;
