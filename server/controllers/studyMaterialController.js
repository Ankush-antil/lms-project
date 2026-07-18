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

    try {
        fs.appendFileSync(path.join(__dirname, '../upload_debug.log'), `[${new Date().toISOString()}] Upload payload: ${JSON.stringify(req.body)}\n`);
    } catch (logErr) {
        console.error("Failed to write upload log:", logErr);
    }
    const { title, inboxId, fileUrl, isPrivate, status, studentId, studentIds, subject, course, dayNum, materialType } = req.body;

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

    // Auto-detect materialType if not provided
    let detectedType = materialType;
    if (!detectedType) {
        detectedType = 'pdf';
        if (req.file) {
            const ext = path.extname(req.file.originalname).toLowerCase();
            if (['.mp4', '.webm', '.ogg', '.mov', '.avi'].includes(ext)) {
                detectedType = 'video';
            } else if (['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(ext)) {
                detectedType = 'audio';
            } else if (['.pdf'].includes(ext)) {
                detectedType = 'pdf';
            } else if (['.html', '.htm'].includes(ext)) {
                detectedType = 'web';
            }
        } else if (fileUrl) {
            detectedType = 'web';
        }
    }

    let studentList = [];
    if (studentIds) {
        try {
            studentList = JSON.parse(studentIds);
        } catch (e) {
            studentList = Array.isArray(studentIds) ? studentIds : [studentIds];
        }
    } else if (studentId) {
        studentList = [studentId];
    }

    if (studentList.length > 0) {
        const createdMaterials = [];
        for (const sId of studentList) {
            const material = await StudyMaterial.create({
                title,
                filename: finalFilename,
                fileUrl: finalFileUrl,
                materialType: detectedType,
                inboxId,
                institute: instituteName,
                uploadedBy: req.user._id,
                isPrivate: isPrivate === 'true' || isPrivate === true,
                status: status || 'study-material',
                student: sId || null,
                subject: subject || '',
                course: course || '',
                dayNum: dayNum ? parseInt(dayNum, 10) : null
            });
            createdMaterials.push(material);
        }
        res.status(201).json(createdMaterials);
    } else {
        const material = await StudyMaterial.create({
            title,
            filename: finalFilename,
            fileUrl: finalFileUrl,
            materialType: detectedType,
            inboxId,
            institute: instituteName,
            uploadedBy: req.user._id,
            isPrivate: isPrivate === 'true' || isPrivate === true,
            status: status || 'study-material',
            student: null,
            subject: subject || '',
            course: course || '',
            dayNum: dayNum ? parseInt(dayNum, 10) : null
        });
        res.status(201).json(material);
    }
});

// @desc    Get study materials for an inbox
// @route   GET /api/study-materials
// @access  Private
const getStudyMaterials = asyncHandler(async (req, res) => {
    const { inboxId, isPrivate, status, studentId } = req.query;

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

    // Filter by student if studentId is provided, or if the requester is a student
    if (studentId) {
        query.$or = [
            { student: studentId },
            { student: { $exists: false } },
            { student: null }
        ];
    } else if (req.user.role === 'Student') {
        query.$or = [
            { student: req.user._id },
            { student: { $exists: false } },
            { student: null }
        ];
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
        .populate('student', 'name email')
        .populate('views.student', 'name email')
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

    // Check ownership, admin status, or same-institute teacher access
    const isUploadedByCurrentUser = material.uploadedBy && material.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'Admin';

    let isTeacherOfSameInst = false;
    if (req.user.role === 'Teacher') {
        const userWithInst = await User.findById(req.user._id).populate('institute');
        const userInstName = userWithInst?.institute?.name?.trim().toLowerCase();
        const matInstName = material.institute?.trim().toLowerCase();
        if (userInstName && matInstName && userInstName === matInstName) {
            isTeacherOfSameInst = true;
        }
    }

    if (!isUploadedByCurrentUser && !isAdmin && !isTeacherOfSameInst) {
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

    const isUploadedByCurrentUser = material.uploadedBy && material.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'Admin';
    let isTeacherOfSameInst = false;
    if (req.user.role === 'Teacher') {
        const userWithInst = await User.findById(req.user._id).populate('institute');
        const userInstName = userWithInst?.institute?.name?.trim().toLowerCase();
        const matInstName = material.institute?.trim().toLowerCase();
        if (userInstName && matInstName && userInstName === matInstName) {
            isTeacherOfSameInst = true;
        }
    }

    if (!isUploadedByCurrentUser && !isAdmin && !isTeacherOfSameInst) {
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

// @desc    Record study material view by student
// @route   POST /api/study-materials/:id/view
// @access  Private (Student)
const recordStudyMaterialView = asyncHandler(async (req, res) => {
    // Only record views for students
    if (req.user.role !== 'Student') {
        return res.json({ message: 'View not recorded (not a student)' });
    }

    const material = await StudyMaterial.findById(req.params.id);

    if (!material) {
        res.status(404);
        throw new Error('Study material not found');
    }

    if (!material.views) {
        material.views = [];
    }

    const studentId = req.user._id.toString();
    const existingViewIdx = material.views.findIndex(v => v.student.toString() === studentId);

    if (existingViewIdx > -1) {
        material.views[existingViewIdx].count += 1;
        material.views[existingViewIdx].lastViewed = new Date();
    } else {
        material.views.push({
            student: req.user._id,
            count: 1,
            lastViewed: new Date()
        });
    }

    await material.save();
    res.json({ message: 'View recorded successfully', totalViews: material.views.reduce((acc, v) => acc + v.count, 0) });
});

// @desc    Update study material details (Title, URL/file, etc.)
// @route   PUT /api/study-materials/:id
// @access  Private (Teacher/Admin)
const updateStudyMaterial = asyncHandler(async (req, res) => {
    const material = await StudyMaterial.findById(req.params.id);

    if (!material) {
        res.status(404);
        throw new Error('Study material not found');
    }

    const isUploadedByCurrentUser = material.uploadedBy && material.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'Admin';
    let isTeacherOfSameInst = false;
    if (req.user.role === 'Teacher') {
        const userWithInst = await User.findById(req.user._id).populate('institute');
        const userInstName = userWithInst?.institute?.name?.trim().toLowerCase();
        const matInstName = material.institute?.trim().toLowerCase();
        if (userInstName && matInstName && userInstName === matInstName) {
            isTeacherOfSameInst = true;
        }
    }

    if (!isUploadedByCurrentUser && !isAdmin && !isTeacherOfSameInst) {
        res.status(403);
        throw new Error('Not authorized to update this study material');
    }

    const { title, materialType, fileUrl, filename } = req.body;
    
    if (title) material.title = title;
    if (materialType) material.materialType = materialType;
    if (fileUrl) material.fileUrl = fileUrl;
    if (filename) material.filename = filename;
    
    if (req.file) {
        const url = `${req.protocol}://${req.get('host')}/uploads/attachments/${req.file.filename}`;
        material.fileUrl = url;
        material.filename = req.file.originalname;
    }

    await material.save();
    res.json(material);
});

module.exports = {
    uploadStudyMaterial,
    getStudyMaterials,
    deleteStudyMaterial,
    updateStudyMaterialStatus,
    recordStudyMaterialView,
    updateStudyMaterial
};
