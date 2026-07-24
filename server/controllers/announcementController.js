const asyncHandler = require('express-async-handler');
const Announcement = require('../models/Announcement');

// @desc    Create an announcement
// @route   POST /api/announcements
// @access  Private (Admin, Editor, Staff, Accountant, Teacher)
const createAnnouncement = asyncHandler(async (req, res) => {
    const { title, content, instituteId, targetAudience, endDate, studentAudienceType, selectedStudents } = req.body;

    if (!title || !content) {
        res.status(400);
        throw new Error('Title and content are required');
    }

    let finalInstituteId = instituteId || null;
    if (finalInstituteId === 'null' || finalInstituteId === 'undefined') {
        finalInstituteId = null;
    }
    if (req.user.role !== 'Admin') {
        finalInstituteId = req.user.institute || null;
    }

    let attachmentUrl = '';
    let attachmentName = '';
    if (req.file) {
        attachmentUrl = `/api/uploads/attachments/${req.file.filename}`;
        attachmentName = req.file.originalname;
    }

    let parsedSelectedStudents = [];
    if (selectedStudents) {
        try {
            parsedSelectedStudents = typeof selectedStudents === 'string' ? JSON.parse(selectedStudents) : selectedStudents;
        } catch (e) {
            parsedSelectedStudents = [];
        }
    }

    const announcement = await Announcement.create({
        title,
        content,
        institute: finalInstituteId,
        targetAudience: targetAudience || 'All',
        endDate: endDate ? new Date(endDate) : null,
        studentAudienceType: studentAudienceType || 'All',
        selectedStudents: parsedSelectedStudents,
        createdBy: req.user._id,
        attachmentUrl,
        attachmentName
    });

    res.status(201).json(announcement);
});

// @desc    Get announcements for the current user (based on role & institute)
// @route   GET /api/announcements
// @access  Private (All)
const getAnnouncements = asyncHandler(async (req, res) => {
    let query = { isDeleted: false };

    const isManagementRole = ['Admin', 'Editor', 'Staff', 'Accountant', 'Teacher'].includes(req.user.role);

    // If user is Student, only show active and unexpired announcements
    if (!isManagementRole) {
        query.isActive = { $ne: false };
        query.$and = [{
            $or: [
                { endDate: null },
                { endDate: { $gte: new Date() } }
            ]
        }];
    }

    // Filter by institute and targetAudience
    if (req.user.role !== 'Admin') {
        query.$or = [
            { institute: null },
            { institute: req.user.institute }
        ];

        if (req.user.role === 'Student') {
            if (!query.$and) query.$and = [];
            query.$and.push({
                $or: [
                    { targetAudience: 'All' },
                    {
                        targetAudience: 'Student',
                        $or: [
                            { studentAudienceType: 'All' },
                            { studentAudienceType: 'Selected', selectedStudents: req.user._id }
                        ]
                    }
                ]
            });
        } else {
            query.targetAudience = { $in: ['All', req.user.role] };
        }
    } else {
        const { institute } = req.query;
        if (institute && institute !== 'All') {
            query.institute = institute;
        }
    }

    const announcements = await Announcement.find(query)
        .populate('institute', 'name')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });

    res.json(announcements);
});

// @desc    Update an announcement
// @route   PUT /api/announcements/:id
// @access  Private (Admin, Editor, Staff, Accountant, Teacher)
const updateAnnouncement = asyncHandler(async (req, res) => {
    const { title, content, instituteId, targetAudience, clearAttachment, endDate, studentAudienceType, selectedStudents, isActive } = req.body;
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
        res.status(404);
        throw new Error('Announcement not found');
    }

    // Check permissions (Admin, or creator)
    if (req.user.role !== 'Admin' && announcement.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to update this announcement');
    }

    if (title) announcement.title = title;
    if (content) announcement.content = content;

    let finalInstituteId = instituteId;
    if (finalInstituteId === 'null' || finalInstituteId === 'undefined') {
        finalInstituteId = null;
    }
    if (finalInstituteId !== undefined) {
        if (req.user.role !== 'Admin') {
            announcement.institute = req.user.institute || null;
        } else {
            announcement.institute = finalInstituteId || null;
        }
    }
    if (targetAudience) announcement.targetAudience = targetAudience;
    if (endDate !== undefined) {
        announcement.endDate = endDate ? new Date(endDate) : null;
    }
    if (studentAudienceType) announcement.studentAudienceType = studentAudienceType;
    if (isActive !== undefined) {
        announcement.isActive = Boolean(isActive === true || isActive === 'true');
    }

    if (selectedStudents !== undefined) {
        try {
            announcement.selectedStudents = typeof selectedStudents === 'string' ? JSON.parse(selectedStudents) : selectedStudents;
        } catch (e) {
            announcement.selectedStudents = selectedStudents;
        }
    }

    if (req.file) {
        announcement.attachmentUrl = `/api/uploads/attachments/${req.file.filename}`;
        announcement.attachmentName = req.file.originalname;
    } else if (clearAttachment === 'true' || clearAttachment === true) {
        announcement.attachmentUrl = '';
        announcement.attachmentName = '';
    }

    const updatedAnnouncement = await announcement.save();
    res.json(updatedAnnouncement);
});

// @desc    Delete an announcement (soft delete)
// @route   DELETE /api/announcements/:id
// @access  Private (Admin, Editor, Staff, Accountant, Teacher)
const deleteAnnouncement = asyncHandler(async (req, res) => {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
        res.status(404);
        throw new Error('Announcement not found');
    }

    // Check permissions (Admin, or creator)
    if (req.user.role !== 'Admin' && announcement.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to delete this announcement');
    }

    announcement.isDeleted = true;
    await announcement.save();

    res.json({ message: 'Announcement deleted successfully' });
});

// @desc    Get soft-deleted announcements
// @route   GET /api/announcements/trash
// @access  Private (Admin, Institute, Staff)
const getDeletedAnnouncements = asyncHandler(async (req, res) => {
    let query = { isDeleted: true };
    if (req.user.role !== 'Admin') {
        query.institute = req.user.institute;
    }
    const announcements = await Announcement.find(query)
        .populate('institute')
        .populate('createdBy', 'name email role');
    res.json(announcements);
});

// @desc    Restore a soft-deleted announcement
// @route   PUT /api/announcements/:id/restore
// @access  Private (Admin, Institute, Staff)
const restoreAnnouncement = asyncHandler(async (req, res) => {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
        res.status(404);
        throw new Error('Announcement not found');
    }
    // Check permissions
    if (req.user.role !== 'Admin' && announcement.createdBy.toString() !== req.user._id.toString() && announcement.institute?.toString() !== req.user.institute?.toString()) {
        res.status(403);
        throw new Error('Not authorized to restore this announcement');
    }
    announcement.isDeleted = false;
    await announcement.save();
    res.json({ message: 'Announcement restored successfully', announcement });
});

// @desc    Permanently delete an announcement
// @route   DELETE /api/announcements/:id/permanent
// @access  Private (Admin, Institute, Staff)
const permanentlyDeleteAnnouncement = asyncHandler(async (req, res) => {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
        res.status(404);
        throw new Error('Announcement not found');
    }
    // Check permissions
    if (req.user.role !== 'Admin' && announcement.createdBy.toString() !== req.user._id.toString() && announcement.institute?.toString() !== req.user.institute?.toString()) {
        res.status(403);
        throw new Error('Not authorized to permanently delete this announcement');
    }
    await announcement.deleteOne();
    res.json({ message: 'Announcement permanently deleted' });
});

module.exports = {
    createAnnouncement,
    getAnnouncements,
    updateAnnouncement,
    deleteAnnouncement,
    getDeletedAnnouncements,
    restoreAnnouncement,
    permanentlyDeleteAnnouncement
};
