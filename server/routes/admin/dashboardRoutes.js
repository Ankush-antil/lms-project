const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../../controllers/admin/dashboardController');
const { protect, adminOrEditor } = require('../../middleware/authMiddleware');

router.get('/stats', protect, adminOrEditor, getDashboardStats);

module.exports = router;
