const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const ResearchContact = require('../models/ResearchContact');
const ResearchMessage = require('../models/ResearchMessage');

// @desc    Create a new research contact
// @route   POST /api/research/contacts
// @access  Private
const createResearchContact = asyncHandler(async (req, res) => {
    const { name } = req.body;
    const userId = req.user._id;

    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Contact name is required' });
    }

    const contact = await ResearchContact.create({
        name: name.trim(),
        owner: userId
    });

    res.status(201).json(contact);
});

// @desc    Get all research contacts for current user
// @route   GET /api/research/contacts
// @access  Private
const getResearchContacts = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const contacts = await ResearchContact.find({ owner: userId }).sort({ createdAt: -1 });

    // Fetch meta information for each contact: last message and unreadCount (always 0 since it's self-usage, but keep structural similarity)
    const contactsWithMeta = await Promise.all(contacts.map(async (contact) => {
        const lastMessage = await ResearchMessage.findOne({
            researchContact: contact._id,
            owner: userId,
            isDeleted: false
        }).sort({ createdAt: -1 });

        return {
            _id: contact._id,
            name: contact.name,
            owner: contact.owner,
            createdAt: contact.createdAt,
            lastMessage: lastMessage ? {
                text: lastMessage.text,
                fileUrl: lastMessage.fileUrl,
                fileName: lastMessage.fileName,
                fileType: lastMessage.fileType,
                createdAt: lastMessage.createdAt
            } : null,
            unreadCount: 0 // Local contacts don't have unread messages since they are for self-usage
        };
    }));

    res.json(contactsWithMeta);
});

// @desc    Get active messages for a research contact
// @route   GET /api/research/messages/:contactId
// @access  Private
const getResearchMessages = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { contactId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contactId)) {
        return res.status(400).json({ message: 'Invalid contact ID' });
    }

    const messages = await ResearchMessage.find({
        researchContact: contactId,
        owner: userId,
        isDeleted: false
    }).sort({ createdAt: 1 });

    res.json(messages);
});

// @desc    Get soft-deleted messages for a research contact (trash)
// @route   GET /api/research/messages/:contactId/deleted
// @access  Private
const getDeletedResearchMessages = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { contactId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contactId)) {
        return res.status(400).json({ message: 'Invalid contact ID' });
    }

    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    const messages = await ResearchMessage.find({
        researchContact: contactId,
        owner: userId,
        isDeleted: true,
        deletedAt: { $gte: tenDaysAgo }
    }).sort({ deletedAt: 1 });

    res.json(messages);
});

// @desc    Send a message to a research contact
// @route   POST /api/research/messages
// @access  Private
const sendResearchMessage = asyncHandler(async (req, res) => {
    const { researchContact, text, fileUrl, fileName, fileType } = req.body;
    const userId = req.user._id;

    if (!researchContact) {
        return res.status(400).json({ message: 'Research contact ID is required' });
    }

    if (!text && !fileUrl) {
        return res.status(400).json({ message: 'Either text or attachment is required' });
    }

    const message = await ResearchMessage.create({
        researchContact,
        owner: userId,
        text: text || '',
        fileUrl: fileUrl || '',
        fileName: fileName || '',
        fileType: fileType || '',
        isDeleted: false
    });

    res.status(201).json(message);
});

// @desc    Edit a research message (only allowed once)
// @route   PUT /api/research/messages/:messageId
// @access  Private
const editResearchMessage = asyncHandler(async (req, res) => {
    const { text, fileName } = req.body;
    const { messageId } = req.params;
    const userId = req.user._id;

    if (!text || !text.trim()) {
        return res.status(400).json({ message: 'Text is required to edit message' });
    }

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return res.status(400).json({ message: 'Invalid message ID' });
    }

    const message = await ResearchMessage.findOne({ _id: messageId, owner: userId });

    if (!message) {
        return res.status(404).json({ message: 'Message not found' });
    }

    if (message.editCount >= 1) {
        return res.status(400).json({ message: 'This message has already been edited once and cannot be edited again' });
    }

    message.originalText = message.text;
    message.text = text;
    if (fileName !== undefined) {
        message.fileName = fileName;
    }
    message.isEdited = true;
    message.editCount = 1;

    await message.save();

    res.json(message);
});

// @desc    Soft delete a message (moves to trash for 10 days)
// @route   DELETE /api/research/messages/:messageId
// @access  Private
const deleteResearchMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return res.status(400).json({ message: 'Invalid message ID' });
    }

    const message = await ResearchMessage.findOne({ _id: messageId, owner: userId });

    if (!message) {
        return res.status(404).json({ message: 'Message not found' });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();

    await message.save();

    res.json({ success: true, message: 'Message moved to recent deletes' });
});

// @desc    Restore a soft-deleted message from trash
// @route   POST /api/research/messages/:messageId/restore
// @access  Private
const restoreResearchMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return res.status(400).json({ message: 'Invalid message ID' });
    }

    const message = await ResearchMessage.findOne({ _id: messageId, owner: userId });

    if (!message) {
        return res.status(404).json({ message: 'Message not found' });
    }

    message.isDeleted = false;
    message.deletedAt = null;

    await message.save();

    res.json(message);
});

// @desc    Permanently delete a message
// @route   DELETE /api/research/messages/:messageId/permanent
// @access  Private
const deleteResearchMessagePermanent = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return res.status(400).json({ message: 'Invalid message ID' });
    }

    const message = await ResearchMessage.findOneAndDelete({ _id: messageId, owner: userId });

    if (!message) {
        return res.status(404).json({ message: 'Message not found' });
    }

    res.json({ success: true, message: 'Message permanently deleted' });
});

module.exports = {
    createResearchContact,
    getResearchContacts,
    getResearchMessages,
    getDeletedResearchMessages,
    sendResearchMessage,
    editResearchMessage,
    deleteResearchMessage,
    restoreResearchMessage,
    deleteResearchMessagePermanent
};
