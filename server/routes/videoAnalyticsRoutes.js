const express = require('express');
const router = express.Router();
const {
    trackVideoProgress,
    getVideoAnalyticsDetails,
    getVideoAnalyticsForTeacher
} = require('../controllers/videoAnalyticsController');
const { protect } = require('../middleware/authMiddleware');

// Student endpoints
router.post('/track', protect, trackVideoProgress);

// Teacher/Admin endpoints
router.get('/details/:videoId', protect, getVideoAnalyticsDetails);
router.get('/teacher/dashboard', protect, getVideoAnalyticsForTeacher);

module.exports = router;
