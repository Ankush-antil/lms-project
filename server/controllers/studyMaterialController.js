const asyncHandler = require('express-async-handler');
const StudyMaterial = require('../models/StudyMaterial');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// Helper to escape regex special chars
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Upload new study material
// @route   POST /api/study-materials
// @access  Private (Teacher/Admin)
const uploadStudyMaterial = asyncHandler(async (req, res) => {
    if (req.user.role === 'Student') {
        if (req.file) {
            const filePath = path.join(__dirname, '..', 'uploads/attachments', req.file.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        res.status(403);
        throw new Error('Not authorized to upload study material');
    }

    const { title, inboxId } = req.body;

    if (!req.file) {
        res.status(400);
        throw new Error('Please upload a file');
    }

    if (!title || !inboxId) {
        // Cleanup uploaded file if missing parameters
        const filePath = path.join(__dirname, '..', 'uploads/attachments', req.file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        
        res.status(400);
        throw new Error('Please provide title and inboxId');
    }

    const user = await User.findById(req.user._id).populate('institute');
    const instituteName = user.institute?.name || '';

    if (!instituteName) {
        const filePath = path.join(__dirname, '..', 'uploads/attachments', req.file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        res.status(400);
        throw new Error('User has no assigned institute');
    }

    const fileUrl = `/uploads/attachments/${req.file.filename}`;

    const material = await StudyMaterial.create({
        title,
        filename: req.file.originalname,
        fileUrl,
        inboxId,
        institute: instituteName,
        uploadedBy: req.user._id
    });

    res.status(201).json(material);
});

// @desc    Get study materials for an inbox
// @route   GET /api/study-materials
// @access  Private
const getStudyMaterials = asyncHandler(async (req, res) => {
    const { inboxId } = req.query;

    const user = await User.findById(req.user._id).populate('institute');
    const instituteName = user.institute?.name || '';

    if (!instituteName) {
        return res.json([]);
    }

    const query = {
        institute: { $regex: new RegExp(`^\\s*${escapeRegex(instituteName)}\\s*$`, 'i') }
    };

    if (inboxId) {
        query.inboxId = inboxId;
    }

    const materials = await StudyMaterial.find(query)
        .populate('uploadedBy', 'name email role')
        .sort({ createdAt: -1 });

    res.json(materials);
});

// @desc    Delete study material
// @route   DELETE /api/study-materials/:id
// @access  Private (Teacher/Admin)
const deleteStudyMaterial = asyncHandler(async (req, res) => {
    const material = await StudyMaterial.findById(req.params.id);

    if (!material) {
        res.status(404);
        throw new Error('Study material not found');
    }

    // Check ownership or admin
    if (material.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
        res.status(403);
        throw new Error('Not authorized to delete this study material');
    }

    // Delete actual file
    // fileUrl starts with /uploads/attachments/filename
    const relativePath = material.fileUrl.startsWith('/') ? material.fileUrl.slice(1) : material.fileUrl;
    const filePath = path.join(__dirname, '..', relativePath);
    
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    await material.deleteOne();
    res.json({ message: 'Study material deleted successfully' });
});

module.exports = {
    uploadStudyMaterial,
    getStudyMaterials,
    deleteStudyMaterial
};
