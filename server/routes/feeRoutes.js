const express = require('express');
const router = express.Router();
const { protect, adminOrEditor } = require('../middleware/authMiddleware');
const {
    getAllFeeRecords,
    getDashboardStats,
    getPendingDues,
    getAllReceipts,
    collectFee,
    setupFeeRecord,
    getStudentFeeRecord,
    getMyFees,
    getReports,
    deleteTransaction,
    deleteFeeRecord,
    getMergedDashboardData,
    deleteExtraCharge
} = require('../controllers/feeController');

// Admin routes
router.get('/admin/dashboard-data', protect, adminOrEditor, getMergedDashboardData);
router.get('/admin/all', protect, adminOrEditor, getAllFeeRecords);
router.get('/admin/stats', protect, adminOrEditor, getDashboardStats);
router.get('/admin/pending-dues', protect, adminOrEditor, getPendingDues);
router.get('/admin/receipts', protect, adminOrEditor, getAllReceipts);
router.get('/admin/reports', protect, adminOrEditor, getReports);
router.post('/admin/collect', protect, adminOrEditor, collectFee);
router.post('/admin/setup', protect, adminOrEditor, setupFeeRecord);
router.get('/admin/student/:id', protect, adminOrEditor, getStudentFeeRecord);
router.delete('/admin/transaction/:id', protect, adminOrEditor, deleteTransaction);
router.delete('/admin/record/:id', protect, adminOrEditor, deleteFeeRecord);
router.delete('/admin/student/:studentId/extra-charge/:chargeId', protect, adminOrEditor, deleteExtraCharge);

// Student routes
router.get('/student/my-fees', protect, getMyFees);

module.exports = router;
