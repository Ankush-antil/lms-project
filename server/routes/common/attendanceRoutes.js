const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const {
    createSession,
    endSession,
    getActiveSessions,
    getSessionDetails,
    getSessionByToken,
    markAttendance,
    manualMark,
    getSessionRecords
} = require('../../controllers/common/attendanceController');

// Teacher routes
router.post('/session', protect, createSession);
router.post('/session/:id/end', protect, endSession);
router.get('/session/active', protect, getActiveSessions);
router.get('/session/:id', protect, getSessionDetails);
router.get('/session/:sessionId/records', protect, getSessionRecords);
router.post('/session/:sessionId/manual', protect, manualMark);

// Student routes
router.get('/session/qr/:qrToken', protect, getSessionByToken);
router.post('/mark', protect, markAttendance);

module.exports = router;
