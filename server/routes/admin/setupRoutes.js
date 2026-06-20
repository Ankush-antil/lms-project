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
    approveCourse,
    declineCourse,
    submitApplication,
    getApplications,
    sendOtp,
    verifyOtp,
    getInstituteApplications,
    updateApplicationStatus,
    registerStudent
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

router.route('/courses/:id')
    .delete(protect, adminOrEditor, deleteCourse);

router.route('/courses/:id/approve')
    .put(protect, admin, approveCourse);

router.route('/courses/:id/decline')
    .put(protect, admin, declineCourse);

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
