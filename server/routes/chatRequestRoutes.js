const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getRequestStatus,
    sendChatRequest,
    acceptChatRequest,
    rejectChatRequest,
    cancelChatRequest,
    updatePermissions,
    getPendingRequests
} = require('../controllers/chatRequestController');

router.post('/', protect, sendChatRequest);
router.get('/pending', protect, getPendingRequests);
router.get('/status/:userId', protect, getRequestStatus);
router.put('/:requestId/accept', protect, acceptChatRequest);
router.put('/:requestId/reject', protect, rejectChatRequest);
router.delete('/:requestId/cancel', protect, cancelChatRequest);
router.put('/:requestId/permissions', protect, updatePermissions);

module.exports = router;
