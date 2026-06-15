// const express = require('express');
// const router = express.Router();
// const { createTest, getTests, getTestById, updateTest, deleteTest } = require('../controllers/testController');
// const { protect, admin } = require('../middleware/authMiddleware');

// router.route('/').get(protect, getTests)
// router.route('/').post(protect, admin, createTest);

// router.route('/:id').get(protect, getTestById)
// router.route('/:id').put(protect, admin, updateTest)
// router.route('/:id').delete(protect, admin, deleteTest);


// module.exports = router;


const express = require('express');
const router = express.Router();

const {
    createTest,
    getTests,
    getTestById,
    updateTest,
    deleteTest
} = require('../controllers/testController');

const { protect, admin } = require('../middleware/authMiddleware');
const uploadVideo = require('../middleware/uploadVideo');


// Upload Video
router.post(
  '/upload/video',
  protect,
  admin,
  uploadVideo.single('video'),
  (req, res) => {

    console.log("FILE =>", req.file);

    res.json({
      success: true,
      videoUrl: `/uploads/videos/${req.file.filename}`
    });
  }
);

// Test Routes
router.route('/')
    .get(protect, getTests)
    .post(protect, admin, createTest);

router.route('/:id')
    .get(protect, getTestById)
    .put(protect, admin, updateTest)
    .delete(protect, admin, deleteTest);

module.exports = router;