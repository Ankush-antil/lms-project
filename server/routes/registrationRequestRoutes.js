const express = require('express');
const router = express.Router();
const {
    createRequest,
    getAdminRequests,
    resolveAdminRequest,
    getInstituteRequests,
    resolveInstituteRequest
} = require('../controllers/registrationRequestController');
const { protect, admin, adminOrInstitute } = require('../middleware/authMiddleware');

// Public route to submit request
router.post('/', createRequest);

// Admin routes
router.get('/admin', protect, admin, getAdminRequests);
router.put('/:id/admin-resolve', protect, admin, resolveAdminRequest);

// Institute routes
router.get('/institute', protect, adminOrInstitute, getInstituteRequests);
router.put('/:id/institute-resolve', protect, adminOrInstitute, resolveInstituteRequest);

module.exports = router;
