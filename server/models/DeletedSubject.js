const mongoose = require('mongoose');

const deletedSubjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    courseName: { type: String },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute' },
    duration: { type: Number, default: 0 },
    teachers: [{ type: String }],
    deletedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('DeletedSubject', deletedSubjectSchema);
