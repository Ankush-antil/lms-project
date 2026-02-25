const express = require('express');
const router = express.Router();
const {
    submitTest,
    getSubmissions,
    getSubmissionsByTest,
    getSubmissionById,
    evaluateSubmission,
    updateStudentComment
} = require('../controllers/submissionController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getSubmissions)
    .post(protect, submitTest);

router.route('/test/:testId')
    .get(protect, getSubmissionsByTest);

router.route('/:id')
    .get(protect, getSubmissionById);

router.route('/:id/evaluate')
    .put(protect, evaluateSubmission);

router.route('/:id/student-comment')
    .put(protect, updateStudentComment);

module.exports = router;
