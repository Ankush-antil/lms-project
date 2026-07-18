const express = require('express');
const router = express.Router();
const { 
    uploadStudyMaterial, 
    getStudyMaterials, 
    deleteStudyMaterial,
    updateStudyMaterialStatus,
    recordStudyMaterialView
} = require('../controllers/studyMaterialController');
const { protect } = require('../middleware/authMiddleware');
const uploadAttachment = require('../middleware/uploadAttachment');

router.route('/')
    .post(protect, uploadAttachment.single('file'), uploadStudyMaterial)
    .get(protect, getStudyMaterials);

router.route('/:id')
    .delete(protect, deleteStudyMaterial)
    .patch(protect, updateStudyMaterialStatus);

router.route('/:id/view')
    .post(protect, recordStudyMaterialView);

module.exports = router;
