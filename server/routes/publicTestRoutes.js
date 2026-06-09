const express = require('express');
const router = express.Router();
const {
    getPublicTestById,
    verifyPublicTestPassword,
    incrementPublicTestViews,
    submitPublicTest,
    getPublicTestStats,
    getPublicTestSubmissions,
    togglePublicTestStatus,
    updatePublicTestSettings,
    checkPublicTestEmail,
    getPublicTestsDashboard,
    deletePublicSubmission
} = require('../controllers/publicTestController');
const { protect, admin } = require('../middleware/authMiddleware');

// Admin-only endpoints
router.get('/admin/dashboard', protect, admin, getPublicTestsDashboard);
router.get('/admin/:id/stats', protect, admin, getPublicTestStats);
router.get('/admin/:id/submissions', protect, admin, getPublicTestSubmissions);
router.put('/admin/:id/toggle-status', protect, admin, togglePublicTestStatus);
router.put('/admin/:id/settings', protect, admin, updatePublicTestSettings);
router.delete('/admin/submissions/:id', protect, admin, deletePublicSubmission);

// Public endpoints
router.get('/:id', getPublicTestById);
router.post('/:id/verify-password', verifyPublicTestPassword);
router.post('/:id/view', incrementPublicTestViews);
router.post('/:id/submit', submitPublicTest);
router.post('/:id/check-email', checkPublicTestEmail);

module.exports = router;
