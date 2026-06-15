const express = require('express');
const router = express.Router();
const {
    getPublicTestById,
    verifyPublicTestPassword,
    incrementPublicTestViews,
    submitPublicTest,
    savePublicTestDraft,
    checkPublicTestEmail
} = require('../../controllers/student/publicTestController');

router.get('/:id', getPublicTestById);
router.post('/:id/verify-password', verifyPublicTestPassword);
router.post('/:id/view', incrementPublicTestViews);
router.post('/:id/submit', submitPublicTest);
router.post('/:id/save-draft', savePublicTestDraft);
router.post('/:id/check-email', checkPublicTestEmail);

module.exports = router;
