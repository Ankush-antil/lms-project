const express = require('express');
const router = express.Router();
const {
    submitTest,
    getSubmissions,
    getSubmissionById,
    updateStudentComment,
    getSharedSubmissionById,
    updateSharedComment,
    addSubmissionFeedback,
    getSubmissionFeedback
} = require('../../controllers/student/submissionController');
const { protect } = require('../../middleware/authMiddleware');

// Shared/Public result routes (no authentication required)
router.route('/shared/:id')
    .get(getSharedSubmissionById);

router.route('/shared/:id/comment')
    .put(updateSharedComment);

router.route('/')
    .get(protect, getSubmissions)
    .post(protect, submitTest);

router.route('/:id/feedback')
    .get(protect, getSubmissionFeedback)
    .post(protect, addSubmissionFeedback);

router.route('/:id')
    .get(protect, getSubmissionById);

router.route('/:id/student-comment')
    .put(protect, updateStudentComment);

module.exports = router;
