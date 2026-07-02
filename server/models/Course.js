const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    description: String,
    institute: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institute',
        required: true
    },
    subjects: [String], // List of subjects in this course
    status: {
        type: String,
        enum: ['active', 'pending', 'declined'],
        default: 'active'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    syllabusUrl: String,           // URL to syllabus (either uploaded file or external link)
    syllabusType: {
        type: String,
        enum: ['link', 'file'],
        default: 'link'
    },
    maxStudentsPerSection: {
        type: Number,
        default: 30,
        min: 1
    }
}, {
    timestamps: true
});

// Compound index for unique code per institute
courseSchema.index({ institute: 1, code: 1 }, { unique: true });

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;
