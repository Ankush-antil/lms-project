const express = require('express');
const router = express.Router();
const { loginUser, registerUser, getMe, logoutUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', loginUser);
router.post('/register', registerUser);
router.get('/me', protect, getMe);
router.post('/logout', logoutUser);

module.exports = router;
