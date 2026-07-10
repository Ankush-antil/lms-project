const express = require('express');
const router = express.Router();
const {
    createResearchContact,
    getResearchContacts,
    getResearchMessages,
    getDeletedResearchMessages,
    sendResearchMessage,
    editResearchMessage,
    deleteResearchMessage,
    restoreResearchMessage,
    deleteResearchMessagePermanent
} = require('../controllers/researchController');
const { protect } = require('../middleware/authMiddleware');

router.get('/contacts', protect, getResearchContacts);
router.post('/contacts', protect, createResearchContact);
router.get('/messages/:contactId', protect, getResearchMessages);
router.get('/messages/:contactId/deleted', protect, getDeletedResearchMessages);
router.post('/messages', protect, sendResearchMessage);
router.put('/messages/:messageId', protect, editResearchMessage);
router.delete('/messages/:messageId', protect, deleteResearchMessage);
router.post('/messages/:messageId/restore', protect, restoreResearchMessage);
router.delete('/messages/:messageId/permanent', protect, deleteResearchMessagePermanent);

module.exports = router;
