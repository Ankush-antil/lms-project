const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    inboxId: {
        type: String,
        default: ''
    },
    shareWithTeacher: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const Note = mongoose.model('Note', noteSchema);
module.exports = Note;
