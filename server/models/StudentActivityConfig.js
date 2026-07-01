const mongoose = require('mongoose');

const studentActivityConfigSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    test: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test',
        required: true
    },
    visible: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Composite index to ensure unique configurations per student and test
studentActivityConfigSchema.index({ student: 1, test: 1 }, { unique: true });

const StudentActivityConfig = mongoose.model('StudentActivityConfig', studentActivityConfigSchema);
module.exports = StudentActivityConfig;
