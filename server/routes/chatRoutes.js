const express = require('express');
const router = express.Router();
const {
    getContacts,
    getMessages,
    sendMessage,
    markAsRead,
    editMessage
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.get('/contacts', protect, getContacts);
router.get('/messages/:userId', protect, getMessages);
router.post('/messages', protect, sendMessage);
router.put('/messages/:userId/read', protect, markAsRead);
router.put('/messages/:id', protect, editMessage);

module.exports = router;
