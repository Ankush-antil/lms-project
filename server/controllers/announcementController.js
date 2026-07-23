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

    // Filter out expired announcements (where endDate is not null and in the past)
    // Using current time or start of day. Let's use current time.
    query.$and = [{
        $or: [
            { endDate: null },
            { endDate: { $gte: new Date() } }
        ]
    }];

    // If user is not Admin, filter by their institute and targetAudience
    if (req.user.role !== 'Admin') {
        // Show announcements that are global (institute is null) OR match user's institute
        query.$or = [
            { institute: null },
            { institute: req.user.institute }
        ];

        // Filter targetAudience
        if (req.user.role === 'Student') {
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
            // Other roles see All, or matching their specific role
            query.targetAudience = { $in: ['All', req.user.role] };
        }
    } else {
        // Admin gets all announcements, but if they pass an institute filter query parameter:
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
    const { title, content, instituteId, targetAudience, clearAttachment, endDate, studentAudienceType, selectedStudents } = req.body;
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

    announcement.title = title || announcement.title;
    announcement.content = content || announcement.content;

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
    announcement.targetAudience = targetAudience || announcement.targetAudience;
    announcement.endDate = endDate !== undefined ? (endDate ? new Date(endDate) : null) : announcement.endDate;
    announcement.studentAudienceType = studentAudienceType || announcement.studentAudienceType;

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

module.exports = {
    createAnnouncement,
    getAnnouncements,
    updateAnnouncement,
    deleteAnnouncement
};
