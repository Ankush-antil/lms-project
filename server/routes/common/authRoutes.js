const express = require('express');
const router = express.Router();
const { loginUser, registerUser, getMe, logoutUser, setTokenCookie, validateAccounts } = require('../../controllers/common/authController');
const { protect } = require('../../middleware/authMiddleware');

router.post('/login', loginUser);
router.post('/register', registerUser);
router.get('/me', protect, getMe);
router.post('/logout', logoutUser);
router.post('/set-token-cookie', setTokenCookie);
router.post('/validate-accounts', validateAccounts);

module.exports = router;
