const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');
const Test = require('../models/Test');
const Institute = require('../models/Institute');
const Course = require('../models/Course');


// @desc    Get contacts list for chat — only accepted connections + Teacher-Student bypass
// @route   GET /api/chat/contacts
// @access  Private
const getContacts = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const userRole = req.user.role;
    const ChatRequest = require('../models/ChatRequest');

    let contactIds = new Set();

    // 1. Get all accepted ChatRequest connections
    const acceptedRequests = await ChatRequest.find({
        $or: [
            { sender: userId, status: 'accepted' },
            { receiver: userId, status: 'accepted' }
        ]
    });
    acceptedRequests.forEach(req => {
        const otherId = req.sender.toString() === userId.toString()
            ? req.receiver.toString()
            : req.sender.toString();
        contactIds.add(otherId);
    });

    // 2. Teacher-Student bypass: find direct assignments
    if (userRole === 'Teacher') {
        // Students assigned to this teacher's courses or directly
        const teacher = await User.findById(userId);
        const assignedCourses = teacher?.teacherProfile?.assignedCourses || [];
        const assignedStudents = teacher?.teacherProfile?.assignedStudents || [];

        if (assignedCourses.length > 0 || assignedStudents.length > 0) {
            const studentsInCourses = assignedCourses.length > 0 ? await User.find({
                role: 'Student',
                'studentProfile.course': { $in: assignedCourses }
            }).select('_id') : [];

            studentsInCourses.forEach(s => contactIds.add(s._id.toString()));
            assignedStudents.forEach(sId => contactIds.add(sId.toString()));
        }
    } else if (userRole === 'Student') {
        // Teachers assigned to this student's course
        const student = await User.findById(userId);
        const studentCourse = student?.studentProfile?.course;
        if (studentCourse) {
            const assignedTeachers = await User.find({
                role: 'Teacher',
                $or: [
                    { 'teacherProfile.assignedCourses': studentCourse },
                    { 'teacherProfile.assignedStudents': userId }
                ]
            }).select('_id');
            assignedTeachers.forEach(t => contactIds.add(t._id.toString()));
        }
    }

    // 3. Also include anyone we already have message history with (legacy/backward-compat)
    const historyMessages = await Message.find({
        $or: [{ sender: userId }, { receiver: userId }]
    }).select('sender receiver');
    historyMessages.forEach(msg => {
        const senderStr = msg.sender.toString();
        const receiverStr = msg.receiver.toString();
        if (senderStr !== userId.toString()) contactIds.add(senderStr);
        if (receiverStr !== userId.toString()) contactIds.add(receiverStr);
    });

    // 4. Admin & Institute bypass: load all users in the same institute
    if (userRole === 'Institute' || userRole === 'Admin') {
        const query = {
            _id: { $ne: userId },
            isDeleted: { $ne: true }
        };
        if (req.user.institute) {
            query.institute = req.user.institute;
        }
        const instituteUsers = await User.find(query).select('_id');
        instituteUsers.forEach(u => contactIds.add(u._id.toString()));
    }

    const contactIdArray = Array.from(contactIds).map(id => new mongoose.Types.ObjectId(id));

    const contacts = await User.find({
        _id: { $in: contactIdArray }
    }).select('name email role avatar mobileNumber isActive');

    // 1. Pre-fetch last messages for all conversations involving the user
    const lastMessages = await Message.aggregate([
        {
            $match: {
                $or: [
                    { sender: userId },
                    { receiver: userId }
                ]
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $group: {
                _id: {
                    $cond: [
                        { $eq: ["$sender", userId] },
                        "$receiver",
                        "$sender"
                    ]
                },
                lastMsg: { $first: "$$ROOT" }
            }
        }
    ]);

    // 2. Pre-fetch unread message counts grouped by sender
    const unreadCounts = await Message.aggregate([
        {
            $match: {
                receiver: userId,
                isRead: false
            }
        },
        {
            $group: {
                _id: "$sender",
                count: { $sum: 1 }
            }
        }
    ]);

    // Convert aggregation results to maps for O(1) lookups
    const lastMsgMap = new Map();
    lastMessages.forEach(item => {
        if (item._id) lastMsgMap.set(item._id.toString(), item.lastMsg);
    });

    const unreadCountMap = new Map();
    unreadCounts.forEach(item => {
        if (item._id) unreadCountMap.set(item._id.toString(), item.count);
    });

    const contactsWithMeta = contacts.map((contact) => {
        const contactIdStr = contact._id.toString();
        const lastMessage = lastMsgMap.get(contactIdStr) || null;
        const unreadCount = unreadCountMap.get(contactIdStr) || 0;

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
                createdAt: lastMessage.createdAt,
                fileUrl: lastMessage.fileUrl,
                fileName: lastMessage.fileName,
                fileType: lastMessage.fileType
            } : null,
            unreadCount
        };
    });

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
    if (req.query.inboxId !== undefined) {
        query.inboxId = req.query.inboxId || '';
    } else {
        query.inboxId = { $in: [null, '', undefined] };
    }

    // Apply search keyword filter
    if (req.query.search) {
        query.text = { $regex: req.query.search, $options: 'i' };
    }

    // Apply date filter (YYYY-MM-DD)
    if (req.query.date) {
        const startOfDay = new Date(req.query.date + "T00:00:00.000Z");
        const endOfDay = new Date(req.query.date + "T23:59:59.999Z");
        query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    } else if (!req.query.search) {
        // Apply day-wise pagination if not searching
        const limitDays = Number(req.query.limitDays) || 3;
        
        let matchQuery = {
            $or: [
                { sender: currentUserId, receiver: new mongoose.Types.ObjectId(targetUserId) },
                { sender: new mongoose.Types.ObjectId(targetUserId), receiver: currentUserId }
            ]
        };

        if (req.query.test !== undefined) {
            matchQuery.test = (req.query.test && req.query.test !== 'null') ? new mongoose.Types.ObjectId(req.query.test) : null;
        }
        if (req.query.questionIndex !== undefined) {
            matchQuery.questionIndex = Number(req.query.questionIndex);
        }
        if (req.query.inboxId !== undefined) {
            matchQuery.inboxId = req.query.inboxId || '';
        } else {
            matchQuery.inboxId = { $in: [null, '', undefined] };
        }

        const dates = await Message.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                }
            },
            { $sort: { "_id": -1 } },
            { $limit: limitDays }
        ]);

        if (dates.length > 0) {
            const earliestDayStr = dates[dates.length - 1]._id;
            const startOfEarliestDay = new Date(earliestDayStr + "T00:00:00.000Z");
            query.createdAt = { $gte: startOfEarliestDay };
        }
    }

    const messages = await Message.find(query).sort({ createdAt: 1 });

    res.json(messages);
});

// @desc    Send a message
// @route   POST /api/chat/messages
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
    const { receiver, text, test, testTitle, questionIndex, questionText, fileUrl, fileName, fileType, inboxId } = req.body;
    const sender = req.user._id;

    if (!receiver || (!text && !fileUrl)) {
        return res.status(400).json({ message: 'Receiver and either text or file are required' });
    }

    // 1. Check if assigned Student-Teacher relation (bypasses request check)
    const isAssignedRelation = async (userAId, userBId) => {
        const User = require('../models/User');
        const userA = await User.findById(userAId);
        const userB = await User.findById(userBId);
        if (!userA || !userB) return false;
        
        const bypassRoles = ['Admin', 'Institute', 'Accountant'];

        // Administrative roles bypass
        if (bypassRoles.includes(userA.role) || bypassRoles.includes(userB.role)) return true;

        // Teacher-Student bypass
        if (
            (userA.role === 'Teacher' && userB.role === 'Student') ||
            (userA.role === 'Student' && userB.role === 'Teacher')
        ) {
            return true;
        }

        return false;
    };

    const isBypassed = await isAssignedRelation(sender, receiver);
    if (!isBypassed) {
        const ChatRequest = require('../models/ChatRequest');
        const request = await ChatRequest.findOne({
            $or: [
                { sender, receiver },
                { sender: receiver, receiver: sender }
            ],
            status: 'accepted'
        });
        if (!request) {
            return res.status(403).json({ message: 'You cannot send messages without an accepted chat request' });
        }
    }

    const message = await Message.create({
        sender,
        receiver,
        text: text || '',
        isRead: false,
        test: test || null,
        testTitle: testTitle || '',
        questionIndex: questionIndex !== undefined ? Number(questionIndex) : undefined,
        questionText: questionText || '',
        fileUrl: fileUrl || '',
        fileName: fileName || '',
        fileType: fileType || '',
        inboxId: inboxId || ''
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
    const { text, fileName } = req.body;
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
    if (fileName !== undefined) {
        message.fileName = fileName;
    }
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
            query.$and = [
                {
                    $or: subjects.map(sub => ({
                        subject: { $regex: new RegExp(`(^|,)\\s*${escapeRegex(sub)}\\s*(,|$)`, 'i') }
                    }))
                }
            ];
        } else {
            query.subject = { $in: [null, '', undefined] };
        }
    } else {
        query.subject = { $in: [null, '', undefined] };
    }

    if (studentCourse) {
        const courseMatchCondition = {
            $or: [
                { course: { $in: [null, '', undefined] } },
                { course: { $regex: new RegExp(`(^|,)\\s*${escapeRegex(studentCourse)}\\s*(,|$)`, 'i') } }
            ]
        };
        if (query.$and) {
            query.$and.push(courseMatchCondition);
        } else {
            query.$and = [courseMatchCondition];
        }
    }

    const tests = await Test.find(query).sort({ createdAt: -1 });
    res.json(tests);
});

// @desc    Get all doubt messages for a specific test + student (ignores which teacher/creator is receiver)
// @route   GET /api/chat/test-doubt-messages/:studentId/:testId
// @access  Private (Teacher)
const getTestDoubtMessages = asyncHandler(async (req, res) => {
    const { studentId, testId } = req.params;
    const { questionIndex, search, date, limitDays } = req.query;

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

    // Apply search keyword filter
    if (search) {
        query.text = { $regex: search, $options: 'i' };
    }

    // Apply date filter (YYYY-MM-DD)
    if (date) {
        const startOfDay = new Date(date + "T00:00:00.000Z");
        const endOfDay = new Date(date + "T23:59:59.999Z");
        query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    } else if (!search) {
        // Apply day-wise pagination if not searching
        const limit = Number(limitDays) || 3;
        
        let matchQuery = {
            test: new mongoose.Types.ObjectId(testId),
            $or: [
                { sender: new mongoose.Types.ObjectId(studentId) },
                { receiver: new mongoose.Types.ObjectId(studentId) }
            ]
        };

        if (questionIndex !== undefined) {
            matchQuery.questionIndex = Number(questionIndex);
        }

        const dates = await Message.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                }
            },
            { $sort: { "_id": -1 } },
            { $limit: limit }
        ]);

        if (dates.length > 0) {
            const earliestDayStr = dates[dates.length - 1]._id;
            const startOfEarliestDay = new Date(earliestDayStr + "T00:00:00.000Z");
            query.createdAt = { $gte: startOfEarliestDay };
        }
    }

    const messages = await Message.find(query).sort({ createdAt: 1 });
    res.json(messages);
});

// @desc    Upload file attachment for chat
// @route   POST /api/chat/upload
// @access  Private
const uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/attachments/${req.file.filename}`;
    res.json({
        fileUrl,
        fileName: req.file.originalname,
        fileType: req.file.mimetype
    });
});

// @desc    Get all users in the same institute for starting a new chat (search-driven)
// @route   GET /api/chat/directory?search=...
// @access  Private
const getDirectoryUsers = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const search = req.query.search?.trim() || '';

    // Require at least 1 character to search
    if (!search) {
        return res.json([]);
    }

    const searchRegex = new RegExp(search, 'i');

    const query = {
        _id: { $ne: userId },
        isActive: true,
        $or: [
            { name: { $regex: searchRegex } },
            { email: { $regex: searchRegex } },
            { role: { $regex: searchRegex } }
        ]
    };

    // Restrict by institute unless user is Admin
    if (req.user.role !== 'Admin' && req.user.institute) {
        query.institute = req.user.institute;
    }

    const users = await User.find(query)
        .select('name email role avatar mobileNumber isActive')
        .limit(30);

    res.json(users);
});

module.exports = {
    getContacts,
    getMessages,
    sendMessage,
    markAsRead,
    editMessage,
    getStudentTests,
    getTestDoubtMessages,
    uploadFile,
    getDirectoryUsers
};
