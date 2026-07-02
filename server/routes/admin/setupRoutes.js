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
    updateCourse,
    deleteCourse,
    uploadInstituteImageController,
    uploadInstituteDocumentController,
    uploadSyllabusController,
    submitApplication,
    getApplications,
    sendOtp,
    verifyOtp,
    getInstituteApplications,
    updateApplicationStatus,
    registerStudent,
    getSubjects,
    deleteApplication,
    getSectionPreview
} = require('../../controllers/admin/setupController');
const { toggleInstituteFlag } = require('../../controllers/admin/setupController');
const { protect, admin, adminOrEditor, adminOrInstitute, parseUserOptional } = require('../../middleware/authMiddleware');

router.route('/institutes')
    .get(getInstitutes)
    .post(protect, admin, createInstitute);

// Institute image upload (must be before /institutes/:id to avoid conflict)
router.route('/institutes/upload-image')
    .post(protect, admin, uploadInstituteImageController);

// Institute document upload (must be before /institutes/:id to avoid conflict)
router.route('/institutes/upload-document')
    .post(protect, admin, uploadInstituteDocumentController);

router.route('/institutes/:id')
    .get(protect, adminOrInstitute, getInstituteDetails)
    .put(protect, admin, updateInstitute)
    .delete(protect, admin, deleteInstitute);

// Institute self-service toggle (Admin or Institute role)
router.route('/institutes/:id/toggle')
    .patch(protect, adminOrInstitute, toggleInstituteFlag);

router.route('/courses')
    .get(parseUserOptional, getCourses)
    .post(protect, adminOrEditor, createCourse);

router.route('/subjects')
    .get(protect, adminOrEditor, getSubjects);

// Syllabus upload (must be before /courses/:id)
router.route('/courses/upload-syllabus')
    .post(protect, adminOrInstitute, uploadSyllabusController);

router.route('/courses/:id')
    .put(protect, adminOrEditor, updateCourse)
    .delete(protect, adminOrEditor, deleteCourse);

// Public: get section preview for a course (no auth needed)
router.route('/courses/:id/section-preview')
    .get(getSectionPreview);

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

router.route('/applications/:id')
    .delete(protect, adminOrInstitute, deleteApplication);

module.exports = router;


