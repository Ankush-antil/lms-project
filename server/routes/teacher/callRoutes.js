const express = require("express");
const router = express.Router();

const { protect } = require("../../middleware/authMiddleware");

const {
    getTeachersBySubject,
    startCall,
    getMissedCalls
} = require("../../controllers/teacher/callController");

router.get(
    "/teachers/:subject",
    protect,
    getTeachersBySubject
);

router.post(
    "/start",
    protect,
    startCall
);

router.get(
    "/missed",
    protect,
    getMissedCalls
);

module.exports = router;