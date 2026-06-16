// Final clean server file - Restarting for role-check verification
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');


const app = express();
const path = require('path');

// Trust proxy for secure cookies behind reverse proxies (like DigitalOcean)
app.set('trust proxy', 1);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: true,
    credentials: true
}));

// Prevent Cloudflare/CDN from caching API responses
app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    next();
});

// Health check
app.get('/api/health', async (req, res) => {
    const status = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    res.json({ server: 'Running', database: status, time: new Date() });
});

app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/common/authRoutes'));
app.use('/api/users/profile', require('./routes/common/profileRoutes'));
app.use('/api/users/teacher-students', require('./routes/teacher/teacherRoutes'));
app.use('/api/users', require('./routes/admin/userRoutes'));
app.use('/api/setup', require('./routes/admin/setupRoutes'));
app.use('/api/dashboard', require('./routes/admin/dashboardRoutes'));
app.use('/api/tests', require('./routes/testRoutes'));
app.use('/api/submissions', require('./routes/submissionRoutes'));
app.use('/api/public-tests', require('./routes/publicTestRoutes'));
app.use('/api/calls', require('./routes/teacher/callRoutes'));

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
    // Serve React static files
    app.use(express.static(path.join(__dirname, '../client/dist')));

    // Catch-all: only serve index.html for non-API routes
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) {
            return next(); // Let API 404 handler respond
        }
        res.sendFile(path.resolve(__dirname, '../client', 'dist', 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
        res.json({
            message: 'LMS API is running',
            database: dbStatus,
            version: '1.0.0'
        });
    });
}

const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
    cors: {
        origin: true,
        credentials: true
    }
});

const CallLog = require('./models/CallLog');

const onlineUsers = {}; // Map of userId -> socket.id

io.on('connection', (socket) => {
    console.log(`[SOCKET] Socket connected: ${socket.id}`);

    // Register user
    socket.on('register', ({ userId, role }) => {
        if (userId) {
            onlineUsers[userId] = socket.id;
            socket.userId = userId;
            socket.userRole = role;
            console.log(`[SOCKET] User registered: ${userId} (${role})`);
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
    socket.on('call-user', async ({ targetId, offer, callerName, callerId }) => {
        console.log(`[SOCKET] Call from ${callerId} (${callerName}) to target ${targetId}`);
        const receiverSocketId = onlineUsers[targetId];
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
                status: 'initiated'
            });
            callLogId = log._id;
        } catch (err) {
            console.error('[SOCKET] Error logging initiated call:', err);
        }

        io.to(receiverSocketId).emit('incoming-call', {
            offer,
            callerId,
            callerName,
            callLogId
        });
    });

    // Answer call
    socket.on('accept-call', async ({ callerId, answer, callLogId }) => {
        console.log(`[SOCKET] Call accepted by ${socket.userId} for caller ${callerId}`);
        const callerSocketId = onlineUsers[callerId];

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

        if (callerSocketId) {
            io.to(callerSocketId).emit('call-accepted', { answer, callLogId });
        }
    });

    // Reject call
    socket.on('reject-call', async ({ callerId, callLogId }) => {
        console.log(`[SOCKET] Call rejected by ${socket.userId} for caller ${callerId}`);
        const callerSocketId = onlineUsers[callerId];

        if (callLogId) {
            try {
                await CallLog.findByIdAndUpdate(callLogId, {
                    status: 'rejected'
                });
            } catch (err) {
                console.error('[SOCKET] Error updating call log to rejected:', err);
            }
        }

        if (callerSocketId) {
            io.to(callerSocketId).emit('call-rejected');
        }
    });

    // End call
    socket.on('end-call', async ({ targetId, callLogId }) => {
        console.log(`[SOCKET] Call ended by ${socket.userId} with target ${targetId}`);
        const targetSocketId = onlineUsers[targetId];

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

        if (targetSocketId) {
            io.to(targetSocketId).emit('call-ended');
        }
    });

    // Exchange ICE candidates
    socket.on('ice-candidate', ({ targetId, candidate }) => {
        const targetSocketId = onlineUsers[targetId];
        if (targetSocketId) {
            io.to(targetSocketId).emit('ice-candidate', { candidate });
        }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
        console.log(`[SOCKET] Socket disconnected: ${socket.id}`);
        const userId = socket.userId;
        if (userId && onlineUsers[userId] === socket.id) {
            delete onlineUsers[userId];
            console.log(`[SOCKET] Deregistered user: ${userId}`);
            io.emit('online-status-update', Object.keys(onlineUsers));

            // Clean up any active/hanging calls this user was in
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
                    const otherSocketId = onlineUsers[otherUserId];
                    
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
    });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        server.listen(PORT, () => {
            console.log(`=========================================`);
            console.log(`Server running on: http://localhost:${PORT}`);
            console.log(`LMS API v1.0.1 Started with Socket.IO`);
            console.log(`MongoDB Connected successfully.`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`=========================================`);
        });
    } catch (error) {
        console.error('SERVER STARTUP FAILED:', error);
        process.exit(1);
    }
};

startServer();