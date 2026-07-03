const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

const { getSubmissionFeedback, addSubmissionFeedback, toggleSubmissionReaction, getSubmissionComments, addSubmissionComment } = require('../controllers/student/submissionController');

const teacherEvaluationRoutes = require('./teacher/evaluationRoutes');
const studentSubmissionRoutes = require('./student/submissionRoutes');

// Shared feedback routes for both Students and Teachers/Admins
router.route('/:id/feedback')
    .get(protect, getSubmissionFeedback)
    .post(protect, addSubmissionFeedback);

router.route('/:id/reaction')
    .put(protect, toggleSubmissionReaction);

// Public discussion comments (YouTube-style, separate from private feedback)
router.route('/:id/comments')
    .get(protect, getSubmissionComments)
    .post(protect, addSubmissionComment);

// Gateway router that forwards requests dynamically based on user role
router.use((req, res, next) => {
    protect(req, res, () => {
        if (req.user && req.user.role === 'Student') {
            studentSubmissionRoutes(req, res, next);
        } else {
            teacherEvaluationRoutes(req, res, next);
        }
    });
});

module.exports = router;
