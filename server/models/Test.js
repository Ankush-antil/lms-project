const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    institute: {
        type: String
    },
    course: {
        type: String
    },
    subject: {
        type: String
    },
    date: {
        type: String
    },
    activity: {
        type: String
    },
    questions: [{
        id: String,
        text: String,
        type: { type: String },
        marks: Number,
        options: [{
            text: String,
            isCorrect: Boolean
        }]
    }],
    settings: {
        duration: Number,
        passingMarks: Number,
        startTime: Date,
        endTime: Date
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

const Test = mongoose.model('Test', testSchema);
module.exports = Test;
