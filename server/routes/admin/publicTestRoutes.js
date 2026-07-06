const express = require('express');
const router = express.Router();
const {
    getPublicTestsDashboard,
    getPublicTestStats,
    getPublicTestSubmissions,
    togglePublicTestStatus,
    updatePublicTestSettings,
    deletePublicSubmission,
    getAllPublicSubmissions,
    evaluatePublicSubmission
} = require('../../controllers/admin/publicTestController');
const { protect, adminOrEditor } = require('../../middleware/authMiddleware');

router.get('/admin/dashboard', protect, adminOrEditor, getPublicTestsDashboard);
router.get('/admin/submissions', protect, adminOrEditor, getAllPublicSubmissions);
router.get('/admin/:id/stats', protect, adminOrEditor, getPublicTestStats);
router.get('/admin/:id/submissions', protect, adminOrEditor, getPublicTestSubmissions);
router.put('/admin/:id/toggle-status', protect, adminOrEditor, togglePublicTestStatus);
router.put('/admin/:id/settings', protect, adminOrEditor, updatePublicTestSettings);
router.delete('/admin/submissions/:id', protect, adminOrEditor, deletePublicSubmission);
router.put('/admin/submissions/:id/evaluate', protect, adminOrEditor, evaluatePublicSubmission);

module.exports = router;
