const express = require('express');
const router = express.Router();
const {
    getPublicTestsDashboard,
    getPublicTestStats,
    getPublicTestSubmissions,
    togglePublicTestStatus,
    updatePublicTestSettings,
    deletePublicSubmission,
    getAllPublicSubmissions
} = require('../../controllers/admin/publicTestController');
const { protect, admin } = require('../../middleware/authMiddleware');

router.get('/admin/dashboard', protect, admin, getPublicTestsDashboard);
router.get('/admin/submissions', protect, admin, getAllPublicSubmissions);
router.get('/admin/:id/stats', protect, admin, getPublicTestStats);
router.get('/admin/:id/submissions', protect, admin, getPublicTestSubmissions);
router.put('/admin/:id/toggle-status', protect, admin, togglePublicTestStatus);
router.put('/admin/:id/settings', protect, admin, updatePublicTestSettings);
router.delete('/admin/submissions/:id', protect, admin, deletePublicSubmission);

module.exports = router;
