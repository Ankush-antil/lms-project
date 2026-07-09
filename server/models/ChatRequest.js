const mongoose = require('mongoose');

const chatRequestSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    permissions: {
        chat: { type: Boolean, default: true },
        audioCall: { type: Boolean, default: false },
        videoCall: { type: Boolean, default: false }
    },
    rejectedAt: {
        type: Date
    }
}, { timestamps: true });

// Index for fast queries
chatRequestSchema.index({ sender: 1, receiver: 1 });

module.exports = mongoose.model('ChatRequest', chatRequestSchema);
