const asyncHandler = require('express-async-handler');
const Note = require('../models/Note');

// @desc    Create or update student note
// @route   POST /api/notes
// @access  Private (Student)
const saveNote = asyncHandler(async (req, res) => {
    const { id, title, content, inboxId, shareWithTeacher } = req.body;

    if (!title) {
        res.status(400);
        throw new Error('Please enter a note title');
    }

    let note;
    if (id) {
        note = await Note.findById(id);
        if (!note) {
            res.status(404);
            throw new Error('Note not found');
        }
        // Authorize student ownership
        if (note.student.toString() !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Not authorized to update this note');
        }
        note.title = title;
        note.content = content !== undefined ? content : note.content;
        note.shareWithTeacher = shareWithTeacher !== undefined ? shareWithTeacher : note.shareWithTeacher;
        if (inboxId !== undefined) note.inboxId = inboxId;
        
        await note.save();
    } else {
        note = await Note.create({
            student: req.user._id,
            title,
            content: content || '',
            inboxId: inboxId || '',
            shareWithTeacher: shareWithTeacher || false
        });
    }

    res.status(201).json(note);
});

// @desc    Get student's notes
// @route   GET /api/notes
// @access  Private (Student)
const getNotes = asyncHandler(async (req, res) => {
    const query = { student: req.user._id };
    
    if (req.query.inboxId) {
        query.inboxId = req.query.inboxId;
    }

    const notes = await Note.find(query).sort({ updatedAt: -1 });
    res.json(notes);
});

// @desc    Get student's shared notes for teacher
// @route   GET /api/notes/shared
// @access  Private (Teacher/Admin)
const getSharedNotes = asyncHandler(async (req, res) => {
    const { studentId, inboxId } = req.query;

    if (!studentId) {
        res.status(400);
        throw new Error('Please provide studentId');
    }

    const query = {
        student: studentId,
        shareWithTeacher: true
    };

    if (inboxId) {
        query.inboxId = inboxId;
    }

    const notes = await Note.find(query).sort({ updatedAt: -1 });
    res.json(notes);
});

// @desc    Delete student note
// @route   DELETE /api/notes/:id
// @access  Private (Student)
const deleteNote = asyncHandler(async (req, res) => {
    const note = await Note.findById(req.params.id);

    if (!note) {
        res.status(404);
        throw new Error('Note not found');
    }

    // Authorize student ownership
    if (note.student.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
        res.status(403);
        throw new Error('Not authorized to delete this note');
    }

    await note.deleteOne();
    res.json({ message: 'Note deleted successfully' });
});

module.exports = {
    saveNote,
    getNotes,
    getSharedNotes,
    deleteNote
};
