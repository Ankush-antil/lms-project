const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PracticeFile = require('../../models/PracticeFile');
const { protect } = require('../../middleware/authMiddleware');

const CLOUD_STORAGE_LIMIT_BYTES = 300 * 1024 * 1024; // 300 MB

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/practice');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB max per file
    }
});

// @route   GET /api/practice-files/analytics
// @desc    Get comprehensive tools usage analytics (who used which tool and how much)
// @access  Private (Admin / Staff / Editor)
router.get('/analytics', protect, async (req, res) => {
    try {
        const Note = require('../../models/Note');
        const Activity = require('../../models/Activity');
        const DriveItem = require('../../models/DriveItem');
        const User = require('../../models/User');

        let practiceUserMatch = {};
        let instId = null;
        let userIds = [];

        if (req.user && req.user.role === 'Institute') {
            instId = req.user.institute || req.user._id;
            const instUsers = await User.find({ institute: instId }).select('_id');
            userIds = instUsers.map(u => u._id);
            practiceUserMatch = { user: { $in: userIds } };
        }

        // 1. Practice files usage grouped by toolType
        const toolStats = await PracticeFile.aggregate([
            ...(req.user?.role === 'Institute' ? [{ $match: practiceUserMatch }] : []),
            {
                $group: {
                    _id: '$toolType',
                    count: { $sum: 1 },
                    totalSizeBytes: { $sum: '$size' }
                }
            }
        ]);

        // 2. Usage grouped by user and toolType
        const userToolStats = await PracticeFile.aggregate([
            ...(req.user?.role === 'Institute' ? [{ $match: practiceUserMatch }] : []),
            {
                $group: {
                    _id: { user: '$user', toolType: '$toolType' },
                    count: { $sum: 1 },
                    totalSizeBytes: { $sum: '$size' },
                    lastUsedAt: { $max: '$createdAt' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id.user',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: '$userInfo' },
            {
                $project: {
                    _id: 0,
                    userId: '$_id.user',
                    userName: '$userInfo.name',
                    userEmail: '$userInfo.email',
                    userRole: '$userInfo.role',
                    toolType: '$_id.toolType',
                    count: 1,
                    totalSizeBytes: 1,
                    lastUsedAt: 1
                }
            },
            { $sort: { lastUsedAt: -1 } }
        ]);

        // 3. User total usage summary (across all tools)
        const userSummary = await PracticeFile.aggregate([
            ...(req.user?.role === 'Institute' ? [{ $match: practiceUserMatch }] : []),
            {
                $group: {
                    _id: '$user',
                    totalCount: { $sum: 1 },
                    totalSizeBytes: { $sum: '$size' },
                    toolsUsed: { $addToSet: '$toolType' },
                    lastUsedAt: { $max: '$createdAt' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: '$userInfo' },
            {
                $project: {
                    _id: 0,
                    userId: '$_id',
                    userName: '$userInfo.name',
                    userEmail: '$userInfo.email',
                    userRole: '$userInfo.role',
                    totalCount: 1,
                    totalSizeBytes: 1,
                    toolsUsed: 1,
                    lastUsedAt: 1
                }
            },
            { $sort: { totalCount: -1 } }
        ]);

        // 4. Counts for other tools
        const [formBuilderCount, notesCount, driveCount] = await Promise.all([
            Activity.countDocuments(req.user?.role === 'Institute' ? { institute: instId } : {}).catch(() => 0),
            Note.countDocuments(req.user?.role === 'Institute' ? { student: { $in: userIds } } : {}).catch(() => 0),
            DriveItem.countDocuments(req.user?.role === 'Institute' ? { uploadedBy: { $in: userIds } } : {}).catch(() => 0)
        ]);

        // 5. Recent 30 activity logs
        const recentLogs = await PracticeFile.find(req.user?.role === 'Institute' ? practiceUserMatch : {})
            .sort({ createdAt: -1 })
            .limit(30)
            .populate('user', 'name email role');

        res.json({
            toolStats,
            userToolStats,
            userSummary,
            otherTools: {
                formBuilder: formBuilderCount,
                notes: notesCount,
                drive: driveCount
            },
            recentLogs
        });
    } catch (err) {
        console.error('[GET Tools Analytics Error]', err);
        res.status(500).json({ message: 'Server error retrieving tools analytics.' });
    }
});

// @route   GET /api/practice-files/detailed-analytics
// @desc    Get detailed per-student metrics for 7 sections of Tools Analytics
// @access  Private (Admin / Staff / Editor)
router.get('/detailed-analytics', protect, async (req, res) => {
    try {
        const Note = require('../../models/Note');
        const DriveItem = require('../../models/DriveItem');
        const Message = require('../../models/Message');
        const CallLog = require('../../models/CallLog');
        const User = require('../../models/User');

        const studentFilter = { role: 'Student', isDeleted: { $ne: true } };
        if (req.user && req.user.role === 'Institute') {
            const instId = req.user.institute || req.user._id;
            studentFilter.institute = instId;
        }

        // 1. Get active Student users for target scope
        const students = await User.find(studentFilter)
            .populate('institute', 'name')
            .select('name email role institute isActive studentProfile allowedRoles callEnabled mobileNumber batch section')
            .lean();

        // 2. Aggregate DriveItem stats
        const driveStats = await DriveItem.aggregate([
            {
                $group: {
                    _id: '$uploadedBy',
                    totalFiles: {
                        $sum: { $cond: [{ $and: [{ $eq: ['$type', 'file'] }, { $ne: ['$isDeleted', true] }] }, 1, 0] }
                    },
                    totalFolders: {
                        $sum: { $cond: [{ $and: [{ $eq: ['$type', 'folder'] }, { $ne: ['$isDeleted', true] }] }, 1, 0] }
                    },
                    usedStorage: {
                        $sum: { $cond: [{ $and: [{ $eq: ['$type', 'file'] }, { $ne: ['$isDeleted', true] }] }, '$fileSize', 0] }
                    },
                    totalUploads: {
                        $sum: { $cond: [{ $eq: ['$type', 'file'] }, 1, 0] }
                    },
                    trashFiles: {
                        $sum: { $cond: [{ $eq: ['$isDeleted', true] }, 1, 0] }
                    },
                    lastActivity: { $max: '$updatedAt' }
                }
            }
        ]);

        // 3. Aggregate Notes stats
        const noteStats = await Note.aggregate([
            {
                $group: {
                    _id: '$student',
                    totalNotes: { $sum: 1 },
                    usedStorage: { $sum: { $add: [{ $strLenCP: '$title' }, { $strLenCP: '$content' }] } },
                    lastActivity: { $max: '$updatedAt' }
                }
            }
        ]);

        // 4. Aggregate PracticeFiles grouped by user & toolType
        const practiceStats = await PracticeFile.aggregate([
            {
                $group: {
                    _id: { user: '$user', toolType: '$toolType' },
                    totalFiles: { $sum: 1 },
                    usedStorage: { $sum: '$size' },
                    lastActivity: { $max: '$createdAt' }
                }
            }
        ]);

        // 5. Aggregate Message stats (Sent)
        const messageSentStats = await Message.aggregate([
            {
                $group: {
                    _id: '$sender',
                    totalMessagesSent: { $sum: 1 },
                    totalFilesShared: { $sum: { $cond: [{ $and: [{ $ne: ['$fileUrl', ''] }, { $ne: ['$fileUrl', null] }] }, 1, 0] } },
                    totalImagesShared: { $sum: { $cond: [{ $regexMatch: { input: '$fileType', regex: /^image/i } }, 1, 0] } },
                    totalVideosShared: { $sum: { $cond: [{ $regexMatch: { input: '$fileType', regex: /^video/i } }, 1, 0] } },
                    totalAudioShared: { $sum: { $cond: [{ $regexMatch: { input: '$fileType', regex: /^audio/i } }, 1, 0] } },
                    totalDocumentsShared: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ['$fileUrl', ''] },
                                        { $ne: ['$fileUrl', null] },
                                        { $not: { $regexMatch: { input: '$fileType', regex: /^(image|video|audio)/i } } }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    lastMessageTime: { $max: '$createdAt' }
                }
            }
        ]);

        // 6. Aggregate Message stats (Received)
        const messageReceivedStats = await Message.aggregate([
            {
                $group: {
                    _id: '$receiver',
                    totalMessagesReceived: { $sum: 1 },
                    lastMessageTime: { $max: '$createdAt' }
                }
            }
        ]);

        // 7. Extract chat history for unique conversations / contacts
        const messageHistory = await Message.find({}, 'sender receiver').lean();
        const userChats = {};
        messageHistory.forEach(msg => {
            if (msg.sender && msg.receiver) {
                const s = msg.sender.toString();
                const r = msg.receiver.toString();
                if (!userChats[s]) userChats[s] = new Set();
                if (!userChats[r]) userChats[r] = new Set();
                userChats[s].add(r);
                userChats[r].add(s);
            }
        });

        // 8. Aggregate CallLogs (Callers)
        const callCallerStats = await CallLog.aggregate([
            {
                $project: {
                    caller: 1,
                    callType: 1,
                    duration: {
                        $cond: [
                            { $and: [{ $ne: ['$startTime', null] }, { $ne: ['$endTime', null] }] },
                            { $divide: [{ $subtract: ['$endTime', '$startTime'] }, 1000] },
                            0
                        ]
                    },
                    createdAt: 1
                }
            },
            {
                $group: {
                    _id: '$caller',
                    audioCalls: { $sum: { $cond: [{ $eq: ['$callType', 'audio'] }, 1, 0] } },
                    videoCalls: { $sum: { $cond: [{ $eq: ['$callType', 'video'] }, 1, 0] } },
                    totalDuration: { $sum: '$duration' },
                    lastCall: { $max: '$createdAt' }
                }
            }
        ]);

        // 9. Aggregate CallLogs (Receivers)
        const callReceiverStats = await CallLog.aggregate([
            {
                $project: {
                    receiver: 1,
                    callType: 1,
                    duration: {
                        $cond: [
                            { $and: [{ $ne: ['$startTime', null] }, { $ne: ['$endTime', null] }] },
                            { $divide: [{ $subtract: ['$endTime', '$startTime'] }, 1000] },
                            0
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: '$receiver',
                    audioCalls: { $sum: { $cond: [{ $eq: ['$callType', 'audio'] }, 1, 0] } },
                    videoCalls: { $sum: { $cond: [{ $eq: ['$callType', 'video'] }, 1, 0] } },
                    totalDuration: { $sum: '$duration' }
                }
            }
        ]);

        // Build mapping maps
        const driveMap = {};
        driveStats.forEach(s => { driveMap[s._id.toString()] = s; });

        const noteMap = {};
        noteStats.forEach(s => { noteMap[s._id.toString()] = s; });

        const practiceMap = {};
        practiceStats.forEach(s => {
            const u = s._id.user.toString();
            const t = s._id.toolType;
            if (!practiceMap[u]) practiceMap[u] = {};
            practiceMap[u][t] = s;
        });

        const sentMsgMap = {};
        messageSentStats.forEach(s => { sentMsgMap[s._id.toString()] = s; });

        const recMsgMap = {};
        messageReceivedStats.forEach(s => { recMsgMap[s._id.toString()] = s; });

        const callerCallMap = {};
        callCallerStats.forEach(s => { if (s._id) callerCallMap[s._id.toString()] = s; });

        const receiverCallMap = {};
        callReceiverStats.forEach(s => { if (s._id) receiverCallMap[s._id.toString()] = s; });

        // Merge everything per student
        const studentData = students.map(student => {
            const idStr = student._id.toString();

            const drive = driveMap[idStr] || {};
            const notes = noteMap[idStr] || {};
            const sent = sentMsgMap[idStr] || {};
            const rec = recMsgMap[idStr] || {};
            const totalChats = userChats[idStr] ? userChats[idStr].size : 0;
            
            const caller = callerCallMap[idStr] || {};
            const receiver = receiverCallMap[idStr] || {};

            const voiceCalls = (caller.audioCalls || 0) + (receiver.audioCalls || 0);
            const videoCalls = (caller.videoCalls || 0) + (receiver.videoCalls || 0);
            const callDuration = (caller.totalDuration || 0) + (receiver.totalDuration || 0);

            const pStats = practiceMap[idStr] || {};
            const getToolStats = (toolKey) => {
                const s = pStats[toolKey] || {};
                return {
                    totalFiles: s.totalFiles || 0,
                    totalFolders: 0,
                    totalStorage: 5 * 1024 * 1024 * 1024,
                    usedStorage: s.usedStorage || 0,
                    remainingStorage: (5 * 1024 * 1024 * 1024) - (s.usedStorage || 0),
                    totalUploads: s.totalFiles || 0,
                    totalDownloads: 0,
                    totalSharedFiles: 0,
                    trashFiles: 0,
                    lastActivity: s.lastActivity || null
                };
            };

            const activities = [
                drive.lastActivity,
                notes.lastActivity,
                sent.lastMessageTime,
                rec.lastMessageTime,
                caller.lastCall,
                getToolStats('screenshot').lastActivity,
                getToolStats('screen-recorder').lastActivity,
                getToolStats('voice-recorder').lastActivity,
                getToolStats('video-recorder').lastActivity
            ].filter(Boolean);
            const globalLastActivity = activities.length > 0 ? new Date(Math.max(...activities.map(a => new Date(a)))) : null;

            return {
                user: student,
                name: student.name,
                email: student.email,
                isActive: student.isActive,
                instituteName: student.institute?.name || 'Hartron Ganaur',
                globalLastActivity,
                drive: {
                    totalFiles: drive.totalFiles || 0,
                    totalFolders: drive.totalFolders || 0,
                    totalStorage: 5 * 1024 * 1024 * 1024,
                    usedStorage: drive.usedStorage || 0,
                    remainingStorage: (5 * 1024 * 1024 * 1024) - (drive.usedStorage || 0),
                    totalUploads: drive.totalUploads || 0,
                    totalDownloads: 0,
                    totalSharedFiles: 0,
                    trashFiles: drive.trashFiles || 0,
                    lastActivity: drive.lastActivity || null,
                    totalDevices: 1
                },
                notes: {
                    totalNotes: notes.totalNotes || 0,
                    totalSections: 0,
                    totalStorage: 5 * 1024 * 1024 * 1024,
                    usedStorage: notes.usedStorage || 0,
                    remainingStorage: (5 * 1024 * 1024 * 1024) - (notes.usedStorage || 0),
                    lastActivity: notes.lastActivity || null,
                    trashFiles: 0,
                    totalDevices: 1
                },
                chat: {
                    totalChats,
                    totalMessagesSent: sent.totalMessagesSent || 0,
                    totalMessagesReceived: rec.totalMessagesReceived || 0,
                    totalGroupsJoined: 0,
                    totalFilesShared: sent.totalFilesShared || 0,
                    totalImagesShared: sent.totalImagesShared || 0,
                    totalVideosShared: sent.totalVideosShared || 0,
                    totalAudioShared: sent.totalAudioShared || 0,
                    totalDocumentsShared: sent.totalDocumentsShared || 0,
                    totalVoiceCalls: voiceCalls,
                    totalVideoCalls: videoCalls,
                    totalCallDuration: callDuration,
                    totalChatStorageUsed: (sent.totalFilesShared || 0) * 1.5 * 1024 * 1024,
                    totalContacts: totalChats,
                    lastMessageTime: sent.lastMessageTime || rec.lastMessageTime || null,
                    lastActivity: sent.lastMessageTime || rec.lastMessageTime || caller.lastCall || null,
                    totalDevices: 1,
                    status: student.isActive ? 'Active' : 'Inactive'
                },
                screenshot: getToolStats('screenshot'),
                screenRecorder: getToolStats('screen-recorder'),
                voiceRecorder: getToolStats('voice-recorder'),
                videoRecorder: getToolStats('video-recorder')
            };
        });

        res.json({ students: studentData });
    } catch (err) {
        console.error('[GET Detailed Tools Analytics Error]', err);
        res.status(500).json({ message: 'Server error retrieving detailed tools analytics.' });
    }
});

// @route   GET /api/practice-files
// @desc    Get all practice files uploaded by the student and the storage space usage
// @access  Private (Student)
router.get('/', protect, async (req, res) => {
    try {
        let filter = { user: req.user._id };
        if ((req.user.role === 'Teacher' || req.user.role === 'Admin') && req.query.studentId) {
            filter = { user: req.query.studentId };
        }
        if (req.query.googleDriveEmail) {
            filter.googleDriveEmail = req.query.googleDriveEmail;
        }
        if (req.query.all === 'true') {
            // No inbox filter, return all files
        } else if (req.query.inbox) {
            filter.inbox = req.query.inbox;
        } else {
            filter.inbox = { $in: ['', null] };
        }
        const files = await PracticeFile.find(filter).sort({ createdAt: -1 });
        
        // Calculate total space used by all files of this user
        const allUserFiles = await PracticeFile.find({ user: filter.user });
        const totalUsedBytes = allUserFiles.reduce((sum, file) => sum + file.size, 0);
        
        res.json({
            files,
            limitBytes: CLOUD_STORAGE_LIMIT_BYTES,
            usedBytes: totalUsedBytes,
            remainingBytes: Math.max(0, CLOUD_STORAGE_LIMIT_BYTES - totalUsedBytes)
        });
    } catch (err) {
        console.error('[GET Practice Files Error]', err);
        res.status(500).json({ message: 'Server error retrieving practice files.' });
    }
});

// @route   POST /api/practice-files/upload
// @desc    Upload a practice file and verify storage limit
// @access  Private (Student)
router.post('/upload', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        const { toolType, duration, resolution, format, googleDriveEmail, inbox } = req.body;
        if (!toolType) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'Tool type is required.' });
        }

        // Fetch existing files size
        const existingFiles = await PracticeFile.find({ user: req.user._id });
        const totalUsedBytes = existingFiles.reduce((sum, file) => sum + file.size, 0);
        
        // Check if upload exceeds the 300MB limit
        if (totalUsedBytes + req.file.size > CLOUD_STORAGE_LIMIT_BYTES) {
            // Delete the file uploaded by multer
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                message: `Storage Limit Exceeded! You have used ${(totalUsedBytes / (1024 * 1024)).toFixed(1)}MB of your 300MB limit. This file requires ${(req.file.size / (1024 * 1024)).toFixed(1)}MB.`
            });
        }

        // Create practice file record
        const fileUrl = `/uploads/practice/${req.file.filename}`;
        const newFile = await PracticeFile.create({
            user: req.user._id,
            toolType,
            inbox: inbox || '',
            filename: req.file.originalname,
            fileUrl,
            size: req.file.size,
            mimeType: req.file.mimetype,
            googleDriveEmail: googleDriveEmail || '',
            metadata: {
                duration,
                resolution,
                format
            }
        });

        const updatedUsedBytes = totalUsedBytes + req.file.size;

        try {
            const { notifyStudentActivity } = require('../../socket');
            notifyStudentActivity({
                studentId: req.user._id,
                studentName: req.user.name,
                toolType,
                action: 'upload'
            });
        } catch (err) {
            console.error('[SOCKET] Error notifying practice upload activity:', err);
        }

        res.status(201).json({
            message: 'File uploaded to cloud successfully!',
            file: newFile,
            usedBytes: updatedUsedBytes,
            limitBytes: CLOUD_STORAGE_LIMIT_BYTES
        });
    } catch (err) {
        console.error('[Upload Practice File Error]', err);
        // Safely clean up file if it exists and error happened
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: 'Server error uploading practice file.' });
    }
});

// @route   DELETE /api/practice-files/:id
// @desc    Delete a practice file from cloud storage
// @access  Private (Student)
router.delete('/:id', protect, async (req, res) => {
    try {
        const file = await PracticeFile.findOne({ _id: req.params.id, user: req.user._id });
        if (!file) {
            return res.status(404).json({ message: 'File not found or unauthorized.' });
        }

        // Delete physical file
        const filePath = path.join(__dirname, '../../', file.fileUrl);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await file.deleteOne();

        // Recalculate space usage
        const remainingFiles = await PracticeFile.find({ user: req.user._id });
        const totalUsedBytes = remainingFiles.reduce((sum, f) => sum + f.size, 0);

        try {
            const { notifyStudentActivity } = require('../../socket');
            notifyStudentActivity({
                studentId: req.user._id,
                studentName: req.user.name,
                toolType: file.toolType,
                action: 'delete'
            });
        } catch (err) {
            console.error('[SOCKET] Error notifying practice deletion activity:', err);
        }

        res.json({
            message: 'File deleted from cloud storage.',
            usedBytes: totalUsedBytes,
            limitBytes: CLOUD_STORAGE_LIMIT_BYTES
        });
    } catch (err) {
        console.error('[Delete Practice File Error]', err);
        res.status(500).json({ message: 'Server error deleting practice file.' });
    }
});

// @route   GET /api/practice-files/share/:id
// @desc    Get public share info for a practice file (no auth required)
// @access  Public
router.get('/share/:id', async (req, res) => {
    try {
        const file = await PracticeFile.findById(req.params.id).select(
            'filename fileUrl mimeType size metadata toolType createdAt'
        );
        if (!file) {
            return res.status(404).json({ message: 'Recording not found or has been deleted.' });
        }
        res.json({ file });
    } catch (err) {
        console.error('[Share Practice File Error]', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

module.exports = router;
