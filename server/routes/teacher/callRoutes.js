const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const uploadAudio = require('../../middleware/uploadAudio');

const {
    getAllTeachers,
    toggleTeacherCall,
    getMissedCalls,
    clearMissedCalls,
    markCallAsRead,
    uploadCallRecording,
    getStudentCallHistory
} = require('../../controllers/teacher/callController');

router.get(
    '/teachers',
    protect,
    getAllTeachers
);

router.put(
    '/teachers/:teacherId/toggle',
    protect,
    toggleTeacherCall
);

router.get(
    '/missed',
    protect,
    getMissedCalls
);

router.post(
    '/missed/clear',
    protect,
    clearMissedCalls
);

router.post(
    '/missed/:id/read',
    protect,
    markCallAsRead
);

router.post(
    '/recordings/:callLogId',
    protect,
    uploadAudio.single('recording'),
    uploadCallRecording
);

router.get(
    '/history/:studentId',
    protect,
    getStudentCallHistory
);

module.exports = router;
