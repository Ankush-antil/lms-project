const mongoose = require('mongoose');

const testHistorySchema = new mongoose.Schema({
    test: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test',
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: { type: String, default: 'Unknown' },
    userRole: { type: String, default: 'Admin' },
    action: {
        type: String,
        enum: ['created', 'saved', 'published', 'unpublished', 'connected', 'duplicated', 'imported', 'custom'],
        default: 'saved'
    },
    description: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
    timestamps: true
});

const TestHistory = mongoose.model('TestHistory', testHistorySchema);
module.exports = TestHistory;
