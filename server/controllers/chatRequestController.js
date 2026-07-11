const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const ChatRequest = require('../models/ChatRequest');
const User = require('../models/User');

// Helper function to check if Teacher and Student are assigned to each other
const isAssignedRelation = async (userAId, userBId) => {
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

// @desc    Get chat request status with a specific user
// @route   GET /api/chat/request/status/:userId
// @access  Private
const getRequestStatus = asyncHandler(async (req, res) => {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        return res.status(400).json({ message: 'Invalid target user ID' });
    }

    // 1. Check if assigned Student-Teacher relation (bypasses request completely)
    const isAssigned = await isAssignedRelation(currentUserId, targetUserId);
    if (isAssigned) {
        return res.json({
            status: 'accepted',
            isBypassed: true,
            permissions: { chat: true, audioCall: true, videoCall: true }
        });
    }

    // 2. Query ChatRequest DB
    const request = await ChatRequest.findOne({
        $or: [
            { sender: currentUserId, receiver: targetUserId },
            { sender: targetUserId, receiver: currentUserId }
        ]
    });

    if (!request) {
        return res.json({ status: 'none', canRequest: true });
    }

    // 3. If rejected, check if 24 hours lock is active
    let canRequest = true;
    let blockTimeLeft = 0; // in milliseconds

    if (request.status === 'rejected') {
        const rejectTime = new Date(request.rejectedAt).getTime();
        const lockDuration = 24 * 60 * 60 * 1000; // 24 hours
        const elapsed = Date.now() - rejectTime;

        if (elapsed < lockDuration) {
            canRequest = false;
            blockTimeLeft = lockDuration - elapsed;
        }
    }

    res.json({
        status: request.status,
        request,
        canRequest,
        blockTimeLeft
    });
});

// @desc    Send a chat request
// @route   POST /api/chat/request
// @access  Private
const sendChatRequest = asyncHandler(async (req, res) => {
    const sender = req.user._id;
    const { receiverId, permissions } = req.body;

    if (!receiverId) {
        return res.status(400).json({ message: 'Receiver ID is required' });
    }

    if (sender.toString() === receiverId.toString()) {
        return res.status(400).json({ message: 'You cannot send a chat request to yourself' });
    }

    // 1. Check if assigned relation
    const isAssigned = await isAssignedRelation(sender, receiverId);
    if (isAssigned) {
        return res.status(400).json({ message: 'You are already assigned to this user and can talk directly' });
    }

    // 2. Check existing request
    const existing = await ChatRequest.findOne({
        $or: [
            { sender, receiver: receiverId },
            { sender: receiverId, receiver: sender }
        ]
    });

    if (existing) {
        if (existing.status === 'accepted') {
            return res.status(400).json({ message: 'Chat request is already accepted' });
        }

        if (existing.status === 'pending') {
            return res.status(400).json({ message: 'A pending request already exists between you' });
        }

        // If rejected, check 24 hours lock
        if (existing.status === 'rejected') {
            const rejectTime = new Date(existing.rejectedAt).getTime();
            const elapsed = Date.now() - rejectTime;
            const lockDuration = 24 * 60 * 60 * 1000;

            if (elapsed < lockDuration) {
                const hoursLeft = Math.ceil((lockDuration - elapsed) / (1000 * 60 * 60));
                return res.status(400).json({
                    message: `Request was rejected. You can send another request after ${hoursLeft} hour(s)`
                });
            }

            // Lock expired, we can reset/overwrite or delete this request and create new one
            await ChatRequest.findByIdAndDelete(existing._id);
        }
    }

    // 3. Create new request
    const newRequest = await ChatRequest.create({
        sender,
        receiver: receiverId,
        status: 'pending',
        permissions: {
            chat: true,
            audioCall: permissions?.audioCall === true,
            videoCall: permissions?.videoCall === true
        }
    });

    res.status(201).json(newRequest);
});

// @desc    Accept chat request
// @route   PUT /api/chat/request/:requestId/accept
// @access  Private
const acceptChatRequest = asyncHandler(async (req, res) => {
    const requestId = req.params.requestId;
    const request = await ChatRequest.findById(requestId);

    if (!request) {
        return res.status(404).json({ message: 'Request not found' });
    }

    if (request.receiver.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Only the receiver can accept the chat request' });
    }

    request.status = 'accepted';
    await request.save();

    res.json(request);
});

// @desc    Reject chat request
// @route   PUT /api/chat/request/:requestId/reject
// @access  Private
const rejectChatRequest = asyncHandler(async (req, res) => {
    const requestId = req.params.requestId;
    const request = await ChatRequest.findById(requestId);

    if (!request) {
        return res.status(404).json({ message: 'Request not found' });
    }

    if (request.receiver.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Only the receiver can reject the chat request' });
    }

    request.status = 'rejected';
    request.rejectedAt = new Date();
    await request.save();

    res.json(request);
});

// @desc    Cancel chat request
// @route   DELETE /api/chat/request/:requestId/cancel
// @access  Private
const cancelChatRequest = asyncHandler(async (req, res) => {
    const requestId = req.params.requestId;
    const request = await ChatRequest.findById(requestId);

    if (!request) {
        return res.status(404).json({ message: 'Request not found' });
    }

    if (request.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Only the sender can cancel the chat request' });
    }

    if (request.status !== 'pending') {
        return res.status(400).json({ message: 'You can only cancel pending requests' });
    }

    await ChatRequest.findByIdAndDelete(requestId);

    res.json({ success: true, message: 'Request cancelled successfully' });
});

// @desc    Update request permissions
// @route   PUT /api/chat/request/:requestId/permissions
// @access  Private
const updatePermissions = asyncHandler(async (req, res) => {
    const requestId = req.params.requestId;
    const { audioCall, videoCall } = req.body;
    const request = await ChatRequest.findById(requestId);

    if (!request) {
        return res.status(404).json({ message: 'Request not found' });
    }

    // Only the original sender can update permissions
    const isSender = request.sender.toString() === req.user._id.toString();

    if (!isSender) {
        return res.status(403).json({ message: 'Only the sender of the request can change permissions' });
    }

    request.permissions.audioCall = audioCall === true;
    request.permissions.videoCall = videoCall === true;
    await request.save();

    res.json(request);
});


// @desc    Get all pending requests received by current user
// @route   GET /api/chat/request/pending
// @access  Private
const getPendingRequests = asyncHandler(async (req, res) => {
    const currentUserId = req.user._id;

    const pending = await ChatRequest.find({
        receiver: currentUserId,
        status: 'pending'
    }).populate('sender', 'name email role avatar');

    res.json(pending);
});

module.exports = {
    getRequestStatus,
    sendChatRequest,
    acceptChatRequest,
    rejectChatRequest,
    cancelChatRequest,
    updatePermissions,
    getPendingRequests
};
