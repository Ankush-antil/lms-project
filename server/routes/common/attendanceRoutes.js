const express = require('express');
const router = express.Router();
const path = require('path');
const { protect } = require('../../middleware/authMiddleware');
const { uploadLeaveFile } = require('../../middleware/uploadMiddleware');
const {
    createSession,
    endSession,
    getActiveSessions,
    getSessionDetails,
    getSessionByToken,
    markAttendance,
    manualMark,
    getSessionRecords,
    getMyAttendanceRecords,
    getStudentAttendanceHistory,
    deletePhysicalAttendance,
    submitLeaveApplication,
    approveOrRejectLeave,
    getAutoConfig,
    saveAutoConfig
} = require('../../controllers/common/attendanceController');

// Teacher routes
router.post('/session', protect, createSession);
router.post('/session/:id/end', protect, endSession);
router.get('/session/active', protect, getActiveSessions);
router.get('/session/:id', protect, getSessionDetails);
router.get('/session/:sessionId/records', protect, getSessionRecords);
router.post('/session/:sessionId/manual', protect, manualMark);

router.get('/auto-config', protect, getAutoConfig);
router.post('/auto-config', protect, saveAutoConfig);

// Teacher — student attendance history, delete & leave approval
router.get('/student/:studentId/history', protect, getStudentAttendanceHistory);
router.delete('/student/:studentId/date/:date', protect, deletePhysicalAttendance);
router.post('/student/:studentId/date/:date/leave-approve', protect, approveOrRejectLeave);

// Student routes
router.get('/my-records', protect, getMyAttendanceRecords);
router.get('/session/qr/:qrToken', protect, getSessionByToken);
router.post('/mark', protect, markAttendance);

// Student leave application (student submits leave with note + optional PDF)
router.post('/leave-application', protect, (req, res, next) => {
    uploadLeaveFile(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message });
        next();
    });
}, submitLeaveApplication);

module.exports = router;
