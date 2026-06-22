const express = require('express');
const router = express.Router();
const {
    getInstitutes,
    createInstitute,
    updateInstitute,
    getInstituteDetails,
    deleteInstitute,
    getCourses,
    createCourse,
    deleteCourse,
    submitApplication,
    getApplications,
    sendOtp,
    verifyOtp,
    getInstituteApplications,
    updateApplicationStatus,
    registerStudent,
    getSubjects
} = require('../../controllers/admin/setupController');
const { protect, admin, adminOrEditor, adminOrInstitute, parseUserOptional } = require('../../middleware/authMiddleware');

router.route('/institutes')
    .get(getInstitutes)
    .post(protect, admin, createInstitute);

router.route('/institutes/:id')
    .get(protect, admin, getInstituteDetails)
    .put(protect, admin, updateInstitute)
    .delete(protect, admin, deleteInstitute);

router.route('/courses')
    .get(parseUserOptional, getCourses)
    .post(protect, adminOrEditor, createCourse);

router.route('/subjects')
    .get(protect, admin, getSubjects);

router.route('/courses/:id')
    .delete(protect, adminOrEditor, deleteCourse);



// Public landing page application routes
router.route('/apply')
    .post(submitApplication);

router.route('/applications')
    .get(getApplications);

// Public landing page OTP verification routes
router.route('/send-otp')
    .post(sendOtp);

router.route('/verify-otp')
    .post(verifyOtp);

router.route('/register-student')
    .post(registerStudent);

// Institute applications routes (Internal/Isolated)
router.route('/institute-applications')
    .get(protect, adminOrInstitute, getInstituteApplications);

router.route('/applications/:id/status')
    .put(protect, adminOrInstitute, updateApplicationStatus);

module.exports = router;
