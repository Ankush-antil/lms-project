const express = require('express');
const router = express.Router();
const {
    getUsers,
    getTeacherStudents,
    createUser,
    getUserProfile,
    deleteUser,
    updateUser,
    getUserById,
    updateUserProfile
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

// Specific routes first
router.get('/teacher-students', protect, getTeacherStudents);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

// Public (authenticated) profile view - accessible by ANY logged in user (student, teacher, admin)
// This allows teachers to view student profiles and vice versa
router.get('/view/:id', protect, getUserById);

// Routes with IDs
router.get('/:id', protect, getUserById);
router.delete('/:id', protect, admin, deleteUser);
router.put('/:id', protect, admin, updateUser);

// Base routes last
router.get('/', protect, admin, getUsers);
router.post('/', protect, admin, createUser);

module.exports = router;
