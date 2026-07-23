const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        default: 'Untitled Note'
    },
    content: {
        type: String,
        default: ''
    },
    inboxId: {
        type: String,
        default: ''
    },
    shareWithTeacher: {
        type: Boolean,
        default: false
    },
    notebook: {
        type: String,
        default: 'My Notebook'
    },
    section: {
        type: String,
        default: 'General'
    },
    category: {
        type: String,
        default: 'General'
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    reminderAt: {
        type: String,
        default: ''
    },
    images: {
        type: [String],
        default: []
    },
    attachedFile: {
        type: Object,
        default: null
    }
}, {
    timestamps: true
});

const Note = mongoose.model('Note', noteSchema);
module.exports = Note;
