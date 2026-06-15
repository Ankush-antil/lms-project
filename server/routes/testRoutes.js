const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

const adminTestRoutes = require('./admin/testRoutes');
const studentTestRoutes = require('./student/testRoutes');

// Gateway router that forwards requests dynamically based on user role
router.use((req, res, next) => {
    protect(req, res, () => {
        if (req.user && req.user.role === 'Student') {
            studentTestRoutes(req, res, next);
        } else {
            adminTestRoutes(req, res, next);
        }
    });
});

module.exports = router;
