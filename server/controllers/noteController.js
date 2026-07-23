const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const Note = require('../models/Note');

// @desc    Create or update student note
// @route   POST /api/notes
// @access  Private (Student)
const saveNote = asyncHandler(async (req, res) => {
    const { id, title, content, inboxId, shareWithTeacher, notebook, section, category, isPinned, reminderAt, images, attachedFile } = req.body;

    const noteTitle = (title && title.trim()) ? title.trim() : 'Untitled Note';

    let note;
    if (id && mongoose.Types.ObjectId.isValid(id)) {
        note = await Note.findById(id);
        if (note && note.student.toString() === req.user._id.toString()) {
            note.title = noteTitle;
            note.content = content !== undefined ? content : note.content;
            note.shareWithTeacher = shareWithTeacher !== undefined ? shareWithTeacher : note.shareWithTeacher;
            if (inboxId !== undefined) note.inboxId = inboxId;
            if (notebook !== undefined) note.notebook = notebook;
            if (section !== undefined) note.section = section;
            if (category !== undefined) note.category = category;
            if (isPinned !== undefined) note.isPinned = isPinned;
            if (reminderAt !== undefined) note.reminderAt = reminderAt;
            if (images !== undefined) note.images = images;
            if (attachedFile !== undefined) note.attachedFile = attachedFile;
            
            await note.save();
        } else {
            note = null;
        }
    }

    if (!note) {
        note = await Note.create({
            student: req.user._id,
            title: noteTitle,
            content: content || '',
            inboxId: inboxId || '',
            shareWithTeacher: shareWithTeacher || false,
            notebook: notebook || 'My Notebook',
            section: section || 'General',
            category: category || 'General',
            isPinned: isPinned || false,
            reminderAt: reminderAt || '',
            images: images || [],
            attachedFile: attachedFile || null
        });
    }

    try {
        const { notifyStudentActivity } = require('../socket');
        notifyStudentActivity({
            studentId: req.user._id,
            studentName: req.user.name,
            toolType: 'notes',
            action: id ? 'update' : 'save'
        });
    } catch (err) {
        console.error('[SOCKET] Error notifying note activity:', err);
    }

    res.status(201).json(note);
});

// @desc    Get student's notes
// @route   GET /api/notes
// @access  Private (Student)
const getNotes = asyncHandler(async (req, res) => {
    const query = { student: req.user._id };
    
    if (req.query.all === 'true') {
        // No inbox filter, return all notes
    } else if (req.query.inboxId) {
        query.inboxId = req.query.inboxId;
    } else {
        query.inboxId = { $in: ['', null] };
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
    } else {
        query.inboxId = { $in: ['', null] };
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

    try {
        const { notifyStudentActivity } = require('../socket');
        notifyStudentActivity({
            studentId: req.user._id,
            studentName: req.user.name,
            toolType: 'notes',
            action: 'delete'
        });
    } catch (err) {
        console.error('[SOCKET] Error notifying note deletion:', err);
    }

    res.json({ message: 'Note deleted successfully' });
});

// @desc    Delete all notes in a notebook
// @route   DELETE /api/notes/notebook/:notebookName
// @access  Private (Student)
const deleteNotebookNotes = asyncHandler(async (req, res) => {
    const { notebookName } = req.params;
    await Note.deleteMany({ student: req.user._id, notebook: notebookName });
    res.json({ message: `All notes in notebook "${notebookName}" deleted successfully` });
});

module.exports = {
    saveNote,
    getNotes,
    getSharedNotes,
    deleteNote,
    deleteNotebookNotes
};
