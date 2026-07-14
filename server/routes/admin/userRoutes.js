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
    saveActivityConfig,
    getDeletedUsers,
    restoreUser,
    permanentlyDeleteUser,
    createRoleRequest,
    getRoleRequests,
    approveRoleRequest,
    rejectRoleRequest,
    importRoleRequests,
    importUsers,
    switchRole,
    deleteRoleRequest,
    getDeletedRoleRequests,
    restoreRoleRequest,
    permanentlyDeleteRoleRequest
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

// Trash routes
router.get('/trash', protect, adminOrEditor, getDeletedUsers);
router.put('/:id/restore', protect, adminOrEditor, restoreUser);
router.delete('/:id/permanent', protect, adminOrEditor, permanentlyDeleteUser);

// Role requests & Switch role (placed before :id to prevent matching as params)
router.post('/role-requests', protect, createRoleRequest);
router.post('/role-requests/import', protect, importRoleRequests);
router.get('/role-requests', protect, getRoleRequests);
router.get('/role-requests/trash', protect, getDeletedRoleRequests);
router.put('/role-requests/:id/restore', protect, restoreRoleRequest);
router.delete('/role-requests/:id/permanent', protect, permanentlyDeleteRoleRequest);
router.delete('/role-requests/:id', protect, deleteRoleRequest);
router.put('/role-requests/:id/approve', protect, approveRoleRequest);
router.put('/role-requests/:id/reject', protect, rejectRoleRequest);
router.put('/switch-role', protect, switchRole);

// Specific routes
router.post('/import', protect, adminOrEditor, importUsers);
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
