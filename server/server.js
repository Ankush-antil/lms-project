// Final clean server file - Server loaded successfully
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

const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Rate limiter: limit each IP to 300 requests per 15 minutes
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { message: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Security & Compression Middlewares
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));
app.use(mongoSanitize());
app.use(compression());
app.use('/api', limiter);

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

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/ai', require('./routes/common/aiRoutes'));
app.use('/api/messages', require('./routes/common/messageRoutes'));
app.use('/api/practice-files', require('./routes/student/practiceFileRoutes'));
app.use('/api/study-materials', require('./routes/studyMaterialRoutes'));
app.use('/api/notes', require('./routes/noteRoutes'));
app.use('/api/registration-requests', require('./routes/registrationRequestRoutes'));
app.use('/api/attendance', require('./routes/common/attendanceRoutes'));
app.use('/api/fees', require('./routes/feeRoutes'));

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

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('[SERVER ERROR]', err);
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;

    // MongoDB duplicate key error (code 11000)
    if (err.code === 11000) {
        statusCode = 400;
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists in the database. Please use a different value.`;
    }

    res.status(statusCode).json({
        message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

const http = require('http');
const server = http.createServer(app);
const { initSocket } = require('./socket');

// Initialize Socket.io Connection Handlers
initSocket(server);

// Initialize Cron Jobs
const initAttendanceCron = require('./cron/attendanceCron');
initAttendanceCron();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`=========================================`);
            console.log(`Server running on: http://0.0.0.0:${PORT}`);
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