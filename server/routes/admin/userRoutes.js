const express = require('express');
const router = express.Router();
const {
    getUsers,
    createUser,
    deleteUser,
    updateUser,
    markPhysicalAttendance,
    deletePhysicalAttendance,
    updateFeeStatus,
    markBulkPhysicalAttendance,
    getInboxConfigs,
    saveInboxConfig,
    getActivityConfigs,
    saveActivityConfig
} = require('../../controllers/admin/userController');
const { getUserById } = require('../../controllers/common/profileController');
const { protect, adminOrEditor } = require('../../middleware/authMiddleware');

// Public view - accessible by ANY logged in user (student, teacher, admin)
router.get('/view/:id', protect, getUserById);

// Student Inbox Configs
router.get('/inbox-configs', protect, getInboxConfigs);
router.get('/inbox-configs/:studentId', protect, getInboxConfigs);
router.post('/inbox-configs', protect, saveInboxConfig);

// Student Activity Configs
router.get('/activity-configs', protect, getActivityConfigs);
router.get('/activity-configs/:studentId', protect, getActivityConfigs);
router.post('/activity-configs', protect, saveActivityConfig);

// Specific routes
router.post('/bulk-physical-attendance', protect, markBulkPhysicalAttendance);
router.get('/:id', protect, getUserById);
router.delete('/:id', protect, adminOrEditor, deleteUser);
router.put('/:id', protect, adminOrEditor, updateUser);

// ERP student services
router.post('/:id/physical-attendance', protect, markPhysicalAttendance);
router.delete('/:id/physical-attendance/:date', protect, deletePhysicalAttendance);
router.put('/:id/fee-status', protect, updateFeeStatus);

// Base routes
router.get('/', protect, adminOrEditor, getUsers);
router.post('/', protect, adminOrEditor, createUser);

module.exports = router;
