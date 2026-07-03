const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    questionId: { type: String },
    questionText: { type: String },
    questionType: { type: String },
    textAnswer: { type: String, default: '' },
    // Base64-encoded media answers
    audioData: { type: String, default: '' },  // base64 audio/webm
    videoData: { type: String, default: '' },  // base64 video/webm
    marks: { type: Number, default: 0 },       // filled by teacher
    reaction: { type: String, default: '' },   // student feedback reaction (like/dislike)
    likes: { type: [String], default: [] },
    dislikes: { type: [String], default: [] },
    conversation: [{
        role: { type: String, enum: ['Teacher', 'Student', 'Guest'] },
        message: { type: String },
        timestamp: { type: Date, default: Date.now }
    }]
});

const submissionSchema = new mongoose.Schema({
    test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String },
    answers: [answerSchema],
    status: { type: String, enum: ['submitted', 'evaluated', 'returned', 'reported'], default: 'submitted' },
    returnedAt: { type: Date },          // timestamp when teacher returned it
    returnNote: { type: String, default: '' }, // optional note from teacher
    totalMarks: { type: Number, default: 0 },  // sum after teacher evaluation
    submittedAt: { type: Date, default: Date.now },
    conversation: [{
        role: { type: String, enum: ['Teacher', 'Student', 'Guest'] },
        message: { type: String },
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);
