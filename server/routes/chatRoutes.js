const express = require('express');
const router = express.Router();
const {
    getContacts,
    getMessages,
    sendMessage,
    markAsRead,
    editMessage,
    getStudentTests,
    getTestDoubtMessages,
    uploadFile,
    getDirectoryUsers
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const uploadAttachment = require('../middleware/uploadAttachment');

router.get('/contacts', protect, getContacts);
router.get('/directory', protect, getDirectoryUsers);
router.get('/messages/:userId', protect, getMessages);
router.post('/messages', protect, sendMessage);
router.post('/upload', protect, uploadAttachment.single('file'), uploadFile);
router.put('/messages/:userId/read', protect, markAsRead);
router.put('/messages/:id', protect, editMessage);
router.get('/student-tests/:studentId', protect, getStudentTests);
router.get('/test-doubt-messages/:studentId/:testId', protect, getTestDoubtMessages);

module.exports = router;
