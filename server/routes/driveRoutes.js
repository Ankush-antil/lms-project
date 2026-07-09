const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const uploadAttachment = require('../middleware/uploadAttachment');
const {
    getDriveItems,
    createFolder,
    uploadFile,
    deleteDriveItem
} = require('../controllers/driveController');

router.use(protect);

router.get('/', getDriveItems);
router.post('/folder', createFolder);
router.post('/upload', uploadAttachment.single('file'), uploadFile);
router.delete('/:id', deleteDriveItem);

module.exports = router;
