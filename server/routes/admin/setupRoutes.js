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
    createSubject,
    updateSubjectDetails,
    getCourseStudents,
    deleteApplication,
    getSectionPreview,
    getDeletedCourses,
    restoreCourse,
    permanentlyDeleteCourse,
    getDeletedInstitutes,
    restoreInstitute,
    permanentlyDeleteInstitute,
    importInstitutes,
    getDeletedApplications,
    restoreApplication,
    permanentlyDeleteApplication,
    importApplications,
    deleteSubject,
    getActivityTypes,
    createActivityType,
    updateActivityType,
    deleteActivityType
} = require('../../controllers/admin/setupController');
const { toggleInstituteFlag, toggleCourseFlag } = require('../../controllers/admin/setupController');
const { protect, admin, adminOrEditor, adminOrInstitute, parseUserOptional } = require('../../middleware/authMiddleware');

router.route('/institutes')
    .get(getInstitutes)
    .post(protect, admin, createInstitute);

router.route('/institutes/import')
    .post(protect, admin, importInstitutes);

// Institute image upload (must be before /institutes/:id to avoid conflict)
router.route('/institutes/upload-image')
    .post(protect, admin, uploadInstituteImageController);

// Institute document upload (must be before /institutes/:id to avoid conflict)
router.route('/institutes/upload-document')
    .post(protect, admin, uploadInstituteDocumentController);

router.route('/institutes/trash')
    .get(protect, admin, getDeletedInstitutes);

router.route('/institutes/:id/restore')
    .put(protect, admin, restoreInstitute);

router.route('/institutes/:id/permanent')
    .delete(protect, admin, permanentlyDeleteInstitute);

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
    .get(protect, adminOrEditor, getSubjects)
    .post(protect, adminOrEditor, createSubject)
    .delete(protect, adminOrEditor, deleteSubject);

router.route('/subjects/update')
    .put(protect, adminOrEditor, updateSubjectDetails);

// Syllabus upload (must be before /courses/:id)
router.route('/courses/upload-syllabus')
    .post(protect, adminOrInstitute, uploadSyllabusController);

router.route('/courses/trash')
    .get(protect, adminOrEditor, getDeletedCourses);

router.route('/courses/:id/restore')
    .put(protect, adminOrEditor, restoreCourse);

router.route('/courses/:id/students')
    .get(protect, adminOrEditor, getCourseStudents);

router.route('/courses/:id/permanent')
    .delete(protect, adminOrEditor, permanentlyDeleteCourse);

router.route('/courses/:id')
    .put(protect, adminOrEditor, updateCourse)
    .delete(protect, adminOrEditor, deleteCourse);

// Course toggle for landing page visibility etc
router.route('/courses/:id/toggle')
    .patch(protect, adminOrEditor, toggleCourseFlag);

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

router.route('/applications/trash')
    .get(protect, adminOrInstitute, getDeletedApplications);

router.route('/applications/import')
    .post(protect, adminOrInstitute, importApplications);

router.route('/applications/:id/restore')
    .put(protect, adminOrInstitute, restoreApplication);

router.route('/applications/:id/permanent')
    .delete(protect, adminOrInstitute, permanentlyDeleteApplication);

router.route('/applications/:id/status')
    .put(protect, adminOrInstitute, updateApplicationStatus);

router.route('/applications/:id')
    .delete(protect, adminOrInstitute, deleteApplication);

// Activity types routes
router.route('/activity-types')
    .get(protect, getActivityTypes)
    .post(protect, createActivityType);

router.route('/activity-types/:id')
    .put(protect, updateActivityType)
    .delete(protect, deleteActivityType);

module.exports = router;


