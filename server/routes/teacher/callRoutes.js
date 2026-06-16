const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');

const {
    getAllTeachers,
    toggleTeacherCall,
    getMissedCalls,
    clearMissedCalls,
    markCallAsRead
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

module.exports = router;