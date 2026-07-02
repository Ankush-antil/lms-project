const express = require('express');
const router = express.Router();
const {
    getSubmissions,
    getSubmissionsByTest,
    getSubmissionById,
    evaluateSubmission,
    returnSubmission
} = require('../../controllers/teacher/evaluationController');
const { protect } = require('../../middleware/authMiddleware');

router.route('/')
    .get(protect, getSubmissions);

router.route('/test/:testId')
    .get(protect, getSubmissionsByTest);

router.route('/:id')
    .get(protect, getSubmissionById);

router.route('/:id/evaluate')
    .put(protect, evaluateSubmission);

router.route('/:id/return')
    .put(protect, returnSubmission);

module.exports = router;
