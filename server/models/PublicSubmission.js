const mongoose = require('mongoose');

const publicAnswerSchema = new mongoose.Schema({
    questionId: { type: String },
    questionText: { type: String },
    questionType: { type: String },
    textAnswer: { type: String, default: '' },
    audioData: { type: String, default: '' },
    videoData: { type: String, default: '' },
    marks: { type: mongoose.Schema.Types.Mixed, default: '0' },
    feedback: { type: String, default: '' }
});

const publicSubmissionSchema = new mongoose.Schema({
    test: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String
    },
    organization: {
        type: String
    },
    ipAddress: {
        type: String
    },
    deviceInfo: {
        type: String
    },
    answers: [publicAnswerSchema],
    score: {
        type: Number,
        default: 0
    },
    completedStatus: {
        type: String,
        enum: ['Completed', 'Incomplete'],
        default: 'Completed'
    },
    status: {
        type: String,
        enum: ['submitted', 'evaluated'],
        default: 'submitted'
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    likes: { type: [String], default: [] },
    dislikes: { type: [String], default: [] },
    reaction: { type: String, default: '' },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PublicSubmission', publicSubmissionSchema);
