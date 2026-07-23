const express = require('express');
const router = express.Router();
const { 
    saveNote, 
    getNotes, 
    getSharedNotes, 
    deleteNote,
    deleteNotebookNotes
} = require('../controllers/noteController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, saveNote)
    .get(protect, getNotes);

router.route('/shared')
    .get(protect, getSharedNotes);

router.route('/notebook/:notebookName')
    .delete(protect, deleteNotebookNotes);

router.route('/:id')
    .delete(protect, deleteNote);

module.exports = router;
