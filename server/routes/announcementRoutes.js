const express = require('express');
const router = express.Router();
const { 
    createAnnouncement, 
    getAnnouncements, 
    updateAnnouncement, 
    deleteAnnouncement,
    getDeletedAnnouncements,
    restoreAnnouncement,
    permanentlyDeleteAnnouncement
} = require('../controllers/announcementController');
const { protect } = require('../middleware/authMiddleware');
const uploadAttachment = require('../middleware/uploadAttachment');

router.route('/')
    .post(protect, uploadAttachment.single('attachment'), createAnnouncement)
    .get(protect, getAnnouncements);

// Specific paths must go before parameterized /:id route
router.get('/trash', protect, getDeletedAnnouncements);

router.route('/:id/restore')
    .put(protect, restoreAnnouncement);

router.route('/:id/permanent')
    .delete(protect, permanentlyDeleteAnnouncement);

router.route('/:id')
    .put(protect, uploadAttachment.single('attachment'), updateAnnouncement)
    .delete(protect, deleteAnnouncement);

module.exports = router;
