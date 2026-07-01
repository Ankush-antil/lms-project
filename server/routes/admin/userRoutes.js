const express = require('express');
const router = express.Router();
const {
    getUsers,
    createUser,
    deleteUser,
    updateUser,
    markPhysicalAttendance,
    updateFeeStatus,
    markBulkPhysicalAttendance,
    getInboxConfigs,
    saveInboxConfig
} = require('../../controllers/admin/userController');
const { getUserById } = require('../../controllers/common/profileController');
const { protect, adminOrEditor } = require('../../middleware/authMiddleware');

// Public view - accessible by ANY logged in user (student, teacher, admin)
router.get('/view/:id', protect, getUserById);

// Specific routes
router.post('/bulk-physical-attendance', protect, markBulkPhysicalAttendance);
router.get('/:id', protect, getUserById);
router.delete('/:id', protect, adminOrEditor, deleteUser);
router.put('/:id', protect, adminOrEditor, updateUser);

// Student Inbox Configs
router.get('/inbox-configs', protect, getInboxConfigs);
router.get('/inbox-configs/:studentId', protect, getInboxConfigs);
router.post('/inbox-configs', protect, saveInboxConfig);

// ERP student services
router.post('/:id/physical-attendance', protect, markPhysicalAttendance);
router.put('/:id/fee-status', protect, updateFeeStatus);

// Base routes
router.get('/', protect, adminOrEditor, getUsers);
router.post('/', protect, adminOrEditor, createUser);

module.exports = router;
