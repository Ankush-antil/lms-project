const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');

// @desc    Get contacts list for chat
// @route   GET /api/chat/contacts
// @access  Private
const getContacts = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const userRole = req.user.role;

    let relatedUserIds = new Set();

    // 1. Fetch relations based on course/assigned courses
    if (userRole === 'Student') {
        const studentCourse = req.user.studentProfile?.course;
        if (studentCourse) {
            // Find teachers teaching this course
            const teachers = await User.find({
                role: 'Teacher',
                'teacherProfile.assignedCourses': studentCourse
            }).select('_id');
            teachers.forEach(t => relatedUserIds.add(t._id.toString()));
        }
    } else if (userRole === 'Teacher') {
        const assignedCourses = req.user.teacherProfile?.assignedCourses || [];
        if (assignedCourses.length > 0) {
            // Find students in these courses
            const students = await User.find({
                role: 'Student',
                'studentProfile.course': { $in: assignedCourses }
            }).select('_id');
            students.forEach(s => relatedUserIds.add(s._id.toString()));
        }
    }

    // 2. Fetch history-based relations (anyone we have exchanged messages with)
    const historyMessages = await Message.find({
        $or: [{ sender: userId }, { receiver: userId }]
    }).select('sender receiver');

    historyMessages.forEach(msg => {
        const senderStr = msg.sender.toString();
        const receiverStr = msg.receiver.toString();
        if (senderStr !== userId.toString()) relatedUserIds.add(senderStr);
        if (receiverStr !== userId.toString()) relatedUserIds.add(receiverStr);
    });

    // Convert Set back to Array of ObjectIds
    const contactIds = Array.from(relatedUserIds).map(id => new mongoose.Types.ObjectId(id));

    // 3. Fetch user details and aggregate messages
    const contacts = await User.find({
        _id: { $in: contactIds }
    }).select('name email role avatar mobileNumber isActive');

    const contactsWithMeta = await Promise.all(contacts.map(async (contact) => {
        // Last message
        const lastMessage = await Message.findOne({
            $or: [
                { sender: userId, receiver: contact._id },
                { sender: contact._id, receiver: userId }
            ]
        }).sort({ createdAt: -1 });

        // Unread messages count sent from this contact to current user
        const unreadCount = await Message.countDocuments({
            sender: contact._id,
            receiver: userId,
            isRead: false
        });

        return {
            _id: contact._id,
            name: contact.name,
            email: contact.email,
            role: contact.role,
            avatar: contact.avatar,
            mobileNumber: contact.mobileNumber,
            isActive: contact.isActive,
            lastMessage: lastMessage ? {
                text: lastMessage.text,
                sender: lastMessage.sender,
                createdAt: lastMessage.createdAt
            } : null,
            unreadCount
        };
    }));

    // Sort contacts: contacts with messages first (ordered by last message time DESC), then alphabetical
    contactsWithMeta.sort((a, b) => {
        if (a.lastMessage && b.lastMessage) {
            return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
        }
        if (a.lastMessage) return -1;
        if (b.lastMessage) return 1;
        return a.name.localeCompare(b.name);
    });

    res.json(contactsWithMeta);
});

// @desc    Get message history with a user
// @route   GET /api/chat/messages/:userId
// @access  Private
const getMessages = asyncHandler(async (req, res) => {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    const messages = await Message.find({
        $or: [
            { sender: currentUserId, receiver: targetUserId },
            { sender: targetUserId, receiver: currentUserId }
        ]
    }).sort({ createdAt: 1 });

    res.json(messages);
});

// @desc    Send a message
// @route   POST /api/chat/messages
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
    const { receiver, text } = req.body;
    const sender = req.user._id;

    if (!receiver || !text) {
        return res.status(400).json({ message: 'Receiver and text are required' });
    }

    const message = await Message.create({
        sender,
        receiver,
        text,
        isRead: false
    });

    res.status(201).json(message);
});

// @desc    Mark messages as read
// @route   PUT /api/chat/messages/:userId/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    await Message.updateMany(
        { sender: targetUserId, receiver: currentUserId, isRead: false },
        { $set: { isRead: true } }
    );

    res.json({ success: true });
});

// @desc    Edit a message
// @route   PUT /api/chat/messages/:id
// @access  Private
const editMessage = asyncHandler(async (req, res) => {
    const { text } = req.body;
    const messageId = req.params.id;
    const userId = req.user._id;

    if (!text) {
        return res.status(400).json({ message: 'Text is required to edit message' });
    }

    const message = await Message.findById(messageId);

    if (!message) {
        return res.status(404).json({ message: 'Message not found' });
    }

    // Check if logged in user is the sender of this message
    if (message.sender.toString() !== userId.toString()) {
        return res.status(403).json({ message: 'Not authorized to edit this message' });
    }

    // Set original text if this is the first edit
    if (!message.isEdited) {
        message.originalText = message.text;
        message.isEdited = true;
    }

    message.text = text;
    await message.save();

    res.json(message);
});

module.exports = {
    getContacts,
    getMessages,
    sendMessage,
    markAsRead,
    editMessage
};
