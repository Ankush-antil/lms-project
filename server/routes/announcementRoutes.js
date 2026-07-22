const express = require('express');
const router = express.Router();
const { 
    createAnnouncement, 
    getAnnouncements, 
    updateAnnouncement, 
    deleteAnnouncement 
} = require('../controllers/announcementController');
const { protect } = require('../middleware/authMiddleware');
const uploadAttachment = require('../middleware/uploadAttachment');

router.route('/')
    .post(protect, uploadAttachment.single('attachment'), createAnnouncement)
    .get(protect, getAnnouncements);

router.route('/:id')
    .put(protect, uploadAttachment.single('attachment'), updateAnnouncement)
    .delete(protect, deleteAnnouncement);

module.exports = router;
