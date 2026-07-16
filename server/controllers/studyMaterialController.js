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

    const { title, inboxId, fileUrl, isPrivate, status } = req.body;

    if (!req.file && !fileUrl) {
        res.status(400);
        throw new Error('Please upload a file or provide a Web Link (URL)');
    }

    if (!title || !inboxId) {
        // Cleanup uploaded file if missing parameters
        if (req.file) {
            const filePath = path.join(__dirname, '..', 'uploads/attachments', req.file.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        
        res.status(400);
        throw new Error('Please provide title and inboxId');
    }

    const user = await User.findById(req.user._id).populate('institute');
    const instituteName = user.institute?.name || '';

    if (!instituteName) {
        if (req.file) {
            const filePath = path.join(__dirname, '..', 'uploads/attachments', req.file.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        res.status(400);
        throw new Error('User has no assigned institute');
    }

    const finalFileUrl = req.file ? `/uploads/attachments/${req.file.filename}` : fileUrl;
    const finalFilename = req.file ? req.file.originalname : 'Web Link';

    const material = await StudyMaterial.create({
        title,
        filename: finalFilename,
        fileUrl: finalFileUrl,
        inboxId,
        institute: instituteName,
        uploadedBy: req.user._id,
        isPrivate: isPrivate === 'true' || isPrivate === true,
        status: status || 'study-material'
    });

    res.status(201).json(material);
});

// @desc    Get study materials for an inbox
// @route   GET /api/study-materials
// @access  Private
const getStudyMaterials = asyncHandler(async (req, res) => {
    const { inboxId, isPrivate, status } = req.query;

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

    if (status) {
        query.status = status;
    }

    // Role-based privacy filtering
    if (req.user.role === 'Student') {
        query.isPrivate = { $ne: true };
    } else {
        if (isPrivate === 'true' || isPrivate === true) {
            query.uploadedBy = req.user._id;
            query.isPrivate = true;
        } else {
            query.isPrivate = { $ne: true };
        }
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

    // Delete actual file if it is a local upload
    if (material.fileUrl && material.fileUrl.startsWith('/uploads/')) {
        const relativePath = material.fileUrl.startsWith('/') ? material.fileUrl.slice(1) : material.fileUrl;
        const filePath = path.join(__dirname, '..', relativePath);
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    await material.deleteOne();
    res.json({ message: 'Study material deleted successfully' });
});

// @desc    Update study material status (e.g. move to upcoming)
// @route   PATCH /api/study-materials/:id
// @access  Private (Teacher/Admin)
const updateStudyMaterialStatus = asyncHandler(async (req, res) => {
    const material = await StudyMaterial.findById(req.params.id);

    if (!material) {
        res.status(404);
        throw new Error('Study material not found');
    }

    if (material.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
        res.status(403);
        throw new Error('Not authorized to update this study material');
    }

    const { status } = req.body;
    const allowed = ['study-material', 'upcoming', 'assign'];
    if (!status || !allowed.includes(status)) {
        res.status(400);
        throw new Error(`Invalid status. Must be one of: ${allowed.join(', ')}`);
    }

    material.status = status;
    await material.save();
    res.json(material);
});

module.exports = {
    uploadStudyMaterial,
    getStudyMaterials,
    deleteStudyMaterial,
    updateStudyMaterialStatus
};
