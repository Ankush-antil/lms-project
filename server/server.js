// Final clean server file - Restarting for role-check verification
require('dotenv').config();
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

// Health check
app.get('/api/health', async (req, res) => {
    const status = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    res.json({ server: 'Running', database: status, time: new Date() });
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/setup', require('./routes/setupRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/tests', require('./routes/testRoutes'));
app.use('/api/submissions', require('./routes/submissionRoutes'));

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
    // Set static folder
    app.use(express.static(path.join(__dirname, '../client/dist')));

    app.get('*', (req, res) => {
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

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`=========================================`);
            console.log(`Server running on port ${PORT}`);
            console.log(`LMS API v1.0.1 Started`);
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