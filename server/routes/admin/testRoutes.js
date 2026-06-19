const express = require('express');
const router = express.Router();
const { 
    createTest, 
    getTests, 
    getTestById, 
    updateTest, 
    deleteTest,
    getInstituteEditors,
    updateTestCollaborators
} = require('../../controllers/admin/testController');
const { protect, adminOrEditor } = require('../../middleware/authMiddleware');

router.route('/')
    .get(protect, getTests)
    .post(protect, adminOrEditor, createTest);

router.route('/editors')
    .get(protect, adminOrEditor, getInstituteEditors);

router.route('/:id')
    .get(protect, getTestById)
    .put(protect, adminOrEditor, updateTest)
    .delete(protect, adminOrEditor, deleteTest);

router.route('/:id/collaborate')
    .put(protect, adminOrEditor, updateTestCollaborators);

module.exports = router;
