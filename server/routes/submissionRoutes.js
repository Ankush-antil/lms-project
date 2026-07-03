const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

const { getSubmissionFeedback, addSubmissionFeedback } = require('../controllers/student/submissionController');

const teacherEvaluationRoutes = require('./teacher/evaluationRoutes');
const studentSubmissionRoutes = require('./student/submissionRoutes');

// Shared feedback routes for both Students and Teachers/Admins
router.route('/:id/feedback')
    .get(protect, getSubmissionFeedback)
    .post(protect, addSubmissionFeedback);

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
