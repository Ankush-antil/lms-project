const { Server } = require('socket.io');
const mongoose = require('mongoose');
const CallLog = require('./models/CallLog');

const onlineUsers = {}; // Map of userId -> socket.id (Native app)
const onlineWebViews = {}; // Map of userId -> socket.id (WebView call pages)
let ioInstance = null;

const getCallSocketId = (targetId) => {
    return onlineWebViews[targetId] || onlineUsers[targetId];
};

const initSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: true,
            credentials: true
        }
    });
    ioInstance = io;

    io.on('connection', (socket) => {
        console.log(`[SOCKET] Socket connected: ${socket.id}`);

        // Register user
        socket.on('register', ({ userId, role, name, isWebView }) => {
            if (userId) {
                if (isWebView) {
                    onlineWebViews[userId] = socket.id;
                    socket.isWebView = true;
                } else {
                    onlineUsers[userId] = socket.id;
                    socket.isWebView = false;
                }
                socket.userId = userId;
                socket.userRole = role;
                socket.userName = name || '';
                console.log(`[SOCKET] User registered: ${userId} (${role}) (WebView: ${!!isWebView})`);
                io.emit('online-status-update', Object.keys(onlineUsers));
            }
        });

        // Request active list of online users
        socket.on('get-online-users', (callback) => {
            if (callback) {
                callback(Object.keys(onlineUsers));
            }
        });

        // Check if a user is online
        socket.on('check-online', ({ targetId }, callback) => {
            const isOnline = !!onlineUsers[targetId];
            if (callback) callback({ isOnline });
        });

        // Start a call
        socket.on('call-user', async ({ targetId, offer, callerName, callerId, callType }) => {
            const resolvedCallType = callType === 'video' ? 'video' : 'audio';
            console.log(`[SOCKET] ${resolvedCallType} call from ${callerId} (${callerName}) to target ${targetId}`);
            const receiverSocketId = getCallSocketId(targetId);
            const isGuest = callerId && callerId.toString().startsWith('guest_');

            if (!receiverSocketId) {
                console.log(`[SOCKET] Receiver ${targetId} is offline. Creating missed call.`);
                try {
                    await CallLog.create({
                        caller: isGuest ? null : callerId,
                        guestName: isGuest ? callerName : undefined,
                        guestEmail: isGuest ? callerId.replace('guest_', '') : undefined,
                        receiver: targetId,
                        status: 'missed',
                        callType: resolvedCallType,
                        isRead: false
                    });
                } catch (err) {
                    console.error('[SOCKET] Error logging missed call:', err);
                }
                socket.emit('user-offline', { targetId });
                return;
            }

            let callLogId = null;
            try {
                const log = await CallLog.create({
                    caller: isGuest ? null : callerId,
                    guestName: isGuest ? callerName : undefined,
                    guestEmail: isGuest ? callerId.replace('guest_', '') : undefined,
                    receiver: targetId,
                    status: 'initiated',
                    callType: resolvedCallType
                });
                callLogId = log._id;
            } catch (err) {
                console.error('[SOCKET] Error logging initiated call:', err);
            }

            io.to(receiverSocketId).emit('incoming-call', {
                offer,
                callerId,
                callerName,
                callLogId,
                callType: resolvedCallType
            });
        });

        // Answer call
        socket.on('accept-call', async ({ callerId, answer, callLogId }) => {
            console.log(`[SOCKET] Call accepted by ${socket.userId} for caller ${callerId}`);

            if (callLogId) {
                try {
                    await CallLog.findByIdAndUpdate(callLogId, {
                        status: 'connected',
                        startTime: new Date()
                    });
                } catch (err) {
                    console.error('[SOCKET] Error updating call log to connected:', err);
                }
            }

            // Deliver call-accepted to BOTH native app socket AND WebView socket of the caller
            // so that both the native UI and WebRTC WebView receive the answer
            const callerNativeSocketId = onlineUsers[callerId];
            const callerWebViewSocketId = onlineWebViews[callerId];

            if (callerNativeSocketId) {
                console.log(`[SOCKET] Sending call-accepted to native socket of ${callerId}`);
                io.to(callerNativeSocketId).emit('call-accepted', { answer, callLogId });
            }
            if (callerWebViewSocketId && callerWebViewSocketId !== callerNativeSocketId) {
                console.log(`[SOCKET] Sending call-accepted to WebView socket of ${callerId}`);
                io.to(callerWebViewSocketId).emit('call-accepted', { answer, callLogId });
            }
            if (!callerNativeSocketId && !callerWebViewSocketId) {
                console.warn(`[SOCKET] Caller ${callerId} has no active socket to deliver call-accepted`);
            }
        });

        // Reject call
        socket.on('reject-call', async ({ callerId, callLogId }) => {
            console.log(`[SOCKET] Call rejected by ${socket.userId} for caller ${callerId}`);

            if (callLogId) {
                try {
                    await CallLog.findByIdAndUpdate(callLogId, { status: 'rejected' });
                } catch (err) {
                    console.error('[SOCKET] Error updating call log to rejected:', err);
                }
            }

            // Deliver to both native and WebView sockets
            const callerNativeSocketId = onlineUsers[callerId];
            const callerWebViewSocketId = onlineWebViews[callerId];
            if (callerNativeSocketId) io.to(callerNativeSocketId).emit('call-rejected');
            if (callerWebViewSocketId && callerWebViewSocketId !== callerNativeSocketId) io.to(callerWebViewSocketId).emit('call-rejected');
        });

        // End call
        socket.on('end-call', async ({ targetId, callLogId }) => {
            console.log(`[SOCKET] Call ended by ${socket.userId} with target ${targetId}`);

            if (callLogId) {
                try {
                    await CallLog.findByIdAndUpdate(callLogId, {
                        status: 'ended',
                        endTime: new Date()
                    });
                } catch (err) {
                    console.error('[SOCKET] Error updating call log to ended:', err);
                }
            }

            // Deliver to both native and WebView sockets
            const targetNativeSocketId = onlineUsers[targetId];
            const targetWebViewSocketId = onlineWebViews[targetId];
            if (targetNativeSocketId) io.to(targetNativeSocketId).emit('call-ended');
            if (targetWebViewSocketId && targetWebViewSocketId !== targetNativeSocketId) io.to(targetWebViewSocketId).emit('call-ended');
        });

        // Exchange ICE candidates — deliver to both native and WebView
        socket.on('ice-candidate', ({ targetId, candidate }) => {
            const targetNativeSocketId = onlineUsers[targetId];
            const targetWebViewSocketId = onlineWebViews[targetId];
            if (targetNativeSocketId) io.to(targetNativeSocketId).emit('ice-candidate', { candidate });
            if (targetWebViewSocketId && targetWebViewSocketId !== targetNativeSocketId) io.to(targetWebViewSocketId).emit('ice-candidate', { candidate });
        });

        // Chat Events
        socket.on('send-message', (payload) => {
            const { receiverId } = payload;
            const receiverSocketId = onlineUsers[receiverId];
            if (receiverSocketId) {
                console.log(`[SOCKET] Forwarding message from ${socket.userId} to receiver ${receiverId}`);
                io.to(receiverSocketId).emit('receive-message', {
                    ...payload,
                    sender: socket.userId,
                    senderName: socket.userName || payload.senderName || '',
                    receiver: receiverId
                });
            } else {
                console.log(`[SOCKET] Receiver ${receiverId} is offline. Message saved to DB only.`);
            }
        });

        socket.on('edit-message', ({ messageId, receiverId, text, isEdited, originalText }) => {
            const receiverSocketId = onlineUsers[receiverId];
            if (receiverSocketId) {
                console.log(`[SOCKET] Forwarding message edit from ${socket.userId} to receiver ${receiverId}`);
                io.to(receiverSocketId).emit('message-edited', {
                    messageId,
                    text,
                    isEdited,
                    originalText
                });
            }
        });

        socket.on('typing', (data) => {
            const { targetId } = data || {};
            const targetSocketId = onlineUsers[targetId];
            if (targetSocketId) {
                io.to(targetSocketId).emit('typing-status', {
                    ...data,
                    senderId: socket.userId,
                    isTyping: true
                });
            }
        });

        socket.on('stop-typing', (data) => {
            const { targetId } = data || {};
            const targetSocketId = onlineUsers[targetId];
            if (targetSocketId) {
                io.to(targetSocketId).emit('typing-status', {
                    ...data,
                    senderId: socket.userId,
                    isTyping: false
                });
            }
        });

        // Student live activity updates
        socket.on('student-activity-update', (payload) => {
            console.log(`[SOCKET] Broadcast student activity:`, payload);
            socket.broadcast.emit('student-activity-sync', payload);
        });

        // Handle disconnect
        socket.on('disconnect', async () => {
            console.log(`[SOCKET] Socket disconnected: ${socket.id}`);
            const userId = socket.userId;
            if (userId) {
                if (socket.isWebView) {
                    if (onlineWebViews[userId] === socket.id) {
                        delete onlineWebViews[userId];
                        console.log(`[SOCKET] Deregistered WebView: ${userId}`);
                    }
                } else {
                    if (onlineUsers[userId] === socket.id) {
                        delete onlineUsers[userId];
                        console.log(`[SOCKET] Deregistered user: ${userId}`);
                        io.emit('online-status-update', Object.keys(onlineUsers));
                    }
                }

                // Only clean up active database call logs if the native socket disconnected OR no sockets are left
                if (!onlineUsers[userId] && !onlineWebViews[userId]) {
                    try {
                        const activeCalls = await CallLog.find({
                            $or: [
                                { caller: mongoose.Types.ObjectId.isValid(userId) ? userId : null },
                                { receiver: mongoose.Types.ObjectId.isValid(userId) ? userId : null },
                                { guestEmail: userId.toString().startsWith('guest_') ? userId.toString().replace('guest_', '') : null }
                            ],
                            status: { $in: ['initiated', 'connected'] }
                        });

                        for (const call of activeCalls) {
                            const isUserCaller = (call.caller && call.caller.toString() === userId.toString()) || 
                                                 (call.guestEmail && ('guest_' + call.guestEmail) === userId.toString());
                            const otherUserId = isUserCaller ? call.receiver : (call.caller || ('guest_' + call.guestEmail));
                            const otherSocketId = getCallSocketId(otherUserId);
                            
                            // Update DB status
                            call.status = call.status === 'initiated' ? 'missed' : 'ended';
                            call.endTime = new Date();
                            await call.save();

                            // Notify the other user
                            if (otherSocketId) {
                                io.to(otherSocketId).emit('call-ended');
                            }
                        }
                    } catch (err) {
                        console.error('[SOCKET] Error cleaning up active calls on disconnect:', err);
                    }
                }
            }
        });
    });

    return io;
};

const notifyStudentActivity = (payload) => {
    if (ioInstance) {
        console.log(`[SOCKET] Broadcasting student activity:`, payload);
        ioInstance.emit('student-activity-sync', payload);
    }
};

const notifyFeeRecordUpdate = (payload) => {
    if (ioInstance) {
        console.log(`[SOCKET] Broadcasting fee record update:`, payload);
        ioInstance.emit('fee-record-updated', payload);
    }
};

module.exports = {
    initSocket,
    notifyStudentActivity,
    notifyFeeRecordUpdate
};