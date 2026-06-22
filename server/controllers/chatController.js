const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');
const Test = require('../models/Test');
const Institute = require('../models/Institute');
const Course = require('../models/Course');


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

    let query = {
        $or: [
            { sender: currentUserId, receiver: targetUserId },
            { sender: targetUserId, receiver: currentUserId }
        ]
    };

    if (req.query.test !== undefined) {
        query.test = req.query.test || null;
    }
    if (req.query.questionIndex !== undefined) {
        query.questionIndex = Number(req.query.questionIndex);
    }

    const messages = await Message.find(query).sort({ createdAt: 1 });

    res.json(messages);
});

// @desc    Send a message
// @route   POST /api/chat/messages
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
    const { receiver, text, test, testTitle, questionIndex, questionText } = req.body;
    const sender = req.user._id;

    if (!receiver || !text) {
        return res.status(400).json({ message: 'Receiver and text are required' });
    }

    const message = await Message.create({
        sender,
        receiver,
        text,
        isRead: false,
        test: test || null,
        testTitle: testTitle || '',
        questionIndex: questionIndex !== undefined ? Number(questionIndex) : undefined,
        questionText: questionText || ''
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

// @desc    Get assigned tests for a student (for teacher/admin view in chat)
// @route   GET /api/chat/student-tests/:studentId
// @access  Private
const getStudentTests = asyncHandler(async (req, res) => {
    const studentId = req.params.studentId;
    const student = await User.findById(studentId)
        .populate('institute')
        .populate('studentProfile.course');

    if (!student) {
        return res.status(404).json({ message: 'Student not found' });
    }

    const studentInstitute = student.institute?.name?.trim();
    const studentCourse = student.studentProfile?.course?.name?.trim();
    const studentSubject = student.studentProfile?.subject?.trim();

    if (!studentInstitute) {
        return res.json([]);
    }

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let query = {};

    query.institute = { $regex: new RegExp(`^\\s*${escapeRegex(studentInstitute)}\\s*$`, 'i') };

    if (studentSubject) {
        const subjects = studentSubject.split(',').map(s => s.trim()).filter(Boolean);
        if (subjects.length > 0) {
            query.subject = {
                $in: subjects.map(sub => new RegExp(`^\\s*${escapeRegex(sub)}\\s*$`, 'i'))
            };
        } else {
            query.subject = { $in: [null, '', undefined] };
        }
    } else {
        query.subject = { $in: [null, '', undefined] };
    }

    if (studentCourse) {
        query.$or = [
            { course: { $in: [null, '', undefined] } },
            { course: { $regex: new RegExp(`^\\s*${escapeRegex(studentCourse)}\\s*$`, 'i') } }
        ];
    }

    const tests = await Test.find(query).sort({ createdAt: -1 });
    res.json(tests);
});

// @desc    Get all doubt messages for a specific test + student (ignores which teacher/creator is receiver)
// @route   GET /api/chat/test-doubt-messages/:studentId/:testId
// @access  Private (Teacher)
const getTestDoubtMessages = asyncHandler(async (req, res) => {
    const { studentId, testId } = req.params;
    const { questionIndex } = req.query;

    // Fetch all messages where this student sent a doubt about this test (to any receiver)
    // OR where any user sent a reply to this student about this test
    let query = {
        test: testId,
        $or: [
            { sender: studentId },
            { receiver: studentId }
        ]
    };

    if (questionIndex !== undefined) {
        query.questionIndex = Number(questionIndex);
    }

    const messages = await Message.find(query).sort({ createdAt: 1 });
    res.json(messages);
});

module.exports = {
    getContacts,
    getMessages,
    sendMessage,
    markAsRead,
    editMessage,
    getStudentTests,
    getTestDoubtMessages
};
