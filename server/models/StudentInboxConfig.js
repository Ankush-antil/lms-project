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
    subject: {
        type: String,
        default: ''
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    },
    displayName: {
        type: String,
        default: ''
    },
    visible: {
        type: Boolean,
        default: true
    },
    disabled: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Drop old composite index if it exists, to avoid unique conflicts without subject
mongoose.connection.on('open', async () => {
    try {
        const collection = mongoose.connection.collection('studentinboxconfigs');
        await collection.dropIndex('student_1_inboxId_1');
    } catch (e) {
        // Index might not exist, ignore
    }
});

// New unique index per student, inboxId, and subject
studentInboxConfigSchema.index({ student: 1, inboxId: 1, subject: 1 }, { unique: true });

const StudentInboxConfig = mongoose.model('StudentInboxConfig', studentInboxConfigSchema);
module.exports = StudentInboxConfig;
