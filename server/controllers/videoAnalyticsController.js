const asyncHandler = require('express-async-handler');
const VideoAnalytics = require('../models/VideoAnalytics');
const StudyMaterial = require('../models/StudyMaterial');
const User = require('../models/User');
const mongoose = require('mongoose');

// @desc    Track student video interactions
// @route   POST /api/video-analytics/track
// @access  Private (Student)
const trackVideoProgress = asyncHandler(async (req, res) => {
    const {
        course,
        lesson,
        video,
        totalDuration,
        currentPosition,
        sessionId,
        sessionDurationIncrement,
        focusTimeIncrement,
        unfocusTimeIncrement,
        playbackSpeed,
        watchedSegments,
        skips,
        replays
    } = req.body;

    const studentId = req.user._id;

    if (!video || !course || !lesson) {
        res.status(400);
        throw new Error('Missing required fields: video, course, or lesson');
    }

    // Find or create analytics record
    let analytics = await VideoAnalytics.findOne({ student: studentId, video });

    if (!analytics) {
        analytics = new VideoAnalytics({
            student: studentId,
            course,
            lesson,
            video,
            progress: {
                totalDuration: totalDuration || 0,
                firstWatchedDate: new Date(),
                lastWatchedDate: new Date()
            }
        });
    }

    // 1. Progress updates
    if (totalDuration) analytics.progress.totalDuration = totalDuration;
    analytics.progress.lastWatchedPosition = currentPosition || 0;
    analytics.progress.lastWatchedDate = new Date();

    // 2. Focus analytics updates
    if (focusTimeIncrement) analytics.focusAnalytics.focusedTime += Number(focusTimeIncrement);
    if (unfocusTimeIncrement) analytics.focusAnalytics.unfocusedTime += Number(unfocusTimeIncrement);
    const totalFocusTime = analytics.focusAnalytics.focusedTime + analytics.focusAnalytics.unfocusedTime;
    if (totalFocusTime > 0) {
        analytics.focusAnalytics.focusPercentage = Math.round((analytics.focusAnalytics.focusedTime / totalFocusTime) * 100);
    }

    // 3. Playback speed durations
    if (playbackSpeed && sessionDurationIncrement) {
        const speedKey = `speed_${playbackSpeed.replace('.', '_')}`;
        if (analytics.playbackSpeedDurations[speedKey] !== undefined) {
            analytics.playbackSpeedDurations[speedKey] += Number(sessionDurationIncrement);
        } else {
            // default to speed_1x if invalid speed
            analytics.playbackSpeedDurations.speed_1x += Number(sessionDurationIncrement);
        }
    }

    // 4. Session tracking
    if (sessionId) {
        const existingSession = analytics.sessions.find(s => s.sessionId === sessionId);
        if (existingSession) {
            existingSession.sessionDuration += Number(sessionDurationIncrement || 0);
            existingSession.sessionEnd = new Date();
            existingSession.lastWatchedPosition = currentPosition || 0;
            if (req.body.totalPauses !== undefined) existingSession.totalPauses = Number(req.body.totalPauses);
            if (req.body.totalResumed !== undefined) existingSession.totalResumed = Number(req.body.totalResumed);
            if (req.body.totalReturned !== undefined) existingSession.totalReturned = Number(req.body.totalReturned);
            if (req.body.totalForward !== undefined) existingSession.totalForward = Number(req.body.totalForward);
            if (req.body.totalRewind !== undefined) existingSession.totalRewind = Number(req.body.totalRewind);
            if (req.body.tabSwitch !== undefined) existingSession.tabSwitch = Number(req.body.tabSwitch);
            if (req.body.leftVideo !== undefined) existingSession.leftVideo = Number(req.body.leftVideo);
            if (req.body.completionAttempts !== undefined) existingSession.completionAttempts = Number(req.body.completionAttempts);
        } else {
            analytics.sessions.push({
                sessionId,
                sessionStart: new Date(Date.now() - Number(sessionDurationIncrement || 0) * 1000),
                sessionEnd: new Date(),
                sessionDuration: Number(sessionDurationIncrement || 0),
                lastWatchedPosition: currentPosition || 0,
                totalPauses: Number(req.body.totalPauses || 0),
                totalResumed: Number(req.body.totalResumed || 0),
                totalReturned: Number(req.body.totalReturned || 0),
                totalForward: Number(req.body.totalForward || 0),
                totalRewind: Number(req.body.totalRewind || 0),
                tabSwitch: Number(req.body.tabSwitch || 0),
                leftVideo: Number(req.body.leftVideo || 0),
                completionAttempts: Number(req.body.completionAttempts || 0)
            });
        }

        // Recalculate main aggregates
        analytics.completionAttempts = analytics.sessions.reduce((sum, s) => sum + (s.completionAttempts || 0), 0);
        analytics.totalWatchTime = analytics.sessions.reduce((sum, s) => sum + (s.sessionDuration || 0), 0);
    }

    // 5. Skips and Replays
    if (Array.isArray(skips) && skips.length > 0) {
        skips.forEach(s => {
            analytics.skips.push({
                skipStart: s.skipStart,
                skipEnd: s.skipEnd,
                skippedDuration: s.skippedDuration,
                timestamp: new Date()
            });
        });
    }

    if (Array.isArray(replays) && replays.length > 0) {
        replays.forEach(r => {
            analytics.replays.push({
                replayStart: r.replayStart,
                replayEnd: r.replayEnd,
                timestamp: new Date()
            });
        });
    }

    // Recalculate skip totals
    analytics.totalSkippedDuration = analytics.skips.reduce((sum, s) => sum + s.skippedDuration, 0);
    if (totalDuration > 0) {
        analytics.totalSkippedPercentage = Math.min(100, Math.round((analytics.totalSkippedDuration / totalDuration) * 100));
    }
    analytics.totalReplaysCount = analytics.replays.length;

    // 6. Timeline and watched duration updates
    const segmentLength = 5; // 5-second segments
    const totalSegmentsCount = Math.ceil((totalDuration || 1) / segmentLength);

    // Initialize watchTimeline to cover the full video duration if it's empty or smaller
    if (analytics.watchTimeline.length < totalSegmentsCount) {
        for (let i = analytics.watchTimeline.length; i < totalSegmentsCount; i++) {
            analytics.watchTimeline.push({
                segmentIndex: i,
                status: 'skipped',
                watchCount: 0
            });
        }
    }

    // Mark segments as watched
    if (Array.isArray(watchedSegments) && watchedSegments.length > 0) {
        watchedSegments.forEach(segIdx => {
            const index = Number(segIdx);
            if (index >= 0 && index < analytics.watchTimeline.length) {
                analytics.watchTimeline[index].watchCount += 1;
                analytics.watchTimeline[index].status = 'watched';
            }
        });
    }

    // Calculate watched duration as unique segments watched * 5 seconds
    const uniqueWatchedSegmentsCount = analytics.watchTimeline.filter(t => t.status === 'watched').length;
    analytics.progress.watchedDuration = Math.min(totalDuration || 0, uniqueWatchedSegmentsCount * segmentLength);

    if (totalDuration > 0) {
        analytics.progress.completionPercentage = Math.min(100, Math.round((analytics.progress.watchedDuration / totalDuration) * 100));
        analytics.progress.remainingDuration = Math.max(0, totalDuration - analytics.progress.watchedDuration);
    }

    if (analytics.progress.completionPercentage >= 95 && !analytics.progress.isCompleted) {
        analytics.progress.isCompleted = true;
    }

    // 7. Learning score calculations
    const completionPart = analytics.progress.completionPercentage * 0.4;
    const focusPart = analytics.focusAnalytics.focusPercentage * 0.3;
    const skipBonus = Math.max(0, 100 - analytics.totalSkippedPercentage) * 0.2;
    const replayBonus = Math.min(10, analytics.totalReplaysCount) * 1.0; // max 10 points bonus for replay reviews
    analytics.learningScore = Math.min(100, Math.round(completionPart + focusPart + skipBonus + replayBonus));

    await analytics.save();
    res.status(200).json(analytics);
});

// @desc    Get video analytics for a specific video (Teacher/Admin dashboard)
// @route   GET /api/video-analytics/details/:videoId
// @access  Private (Teacher/Admin)
const getVideoAnalyticsDetails = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { studentId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        res.status(400);
        throw new Error('Invalid video ID format');
    }

    const material = await StudyMaterial.findById(videoId);
    if (!material) {
        res.status(404);
        throw new Error('Study material/Video not found');
    }

    // Enforce teacher course enrollments check
    if (req.user.role === 'Teacher') {
        const teacherUser = await User.findById(req.user._id).populate('teacherProfile.assignedCourses');
        const teacherCourses = (teacherUser?.teacherProfile?.assignedCourses || []).map(c => c.name?.trim().toLowerCase());
        const materialCourseName = material.course?.trim().toLowerCase();

        if (materialCourseName && !teacherCourses.includes(materialCourseName)) {
            res.status(403);
            throw new Error('Not authorized to view analytics of courses not assigned to you');
        }
    }

    // Query builder
    const query = { video: videoId };
    if (studentId) {
        query.student = studentId;
    }

    const records = await VideoAnalytics.find(query)
        .populate('student', 'name email studentProfile')
        .sort({ updatedAt: -1 });

    res.json({
        material,
        records
    });
});

// @desc    Get complete summary table for teacher dashboard
// @route   GET /api/video-analytics/teacher/dashboard
// @access  Private (Teacher/Admin)
const getVideoAnalyticsForTeacher = asyncHandler(async (req, res) => {
    const { courseName, search, sortField, sortOrder, page = 1, limit = 10 } = req.query;

    let targetCourses = [];
    if (req.user.role === 'Teacher') {
        const teacher = await User.findById(req.user._id).populate('teacherProfile.assignedCourses');
        targetCourses = (teacher.teacherProfile?.assignedCourses || []).map(c => c.name);
    } else {
        // Admins can see all courses
        const courses = await VideoAnalytics.distinct('course');
        targetCourses = courses;
    }

    // If a specific course filter is requested and the teacher is authorized
    let coursesToQuery = targetCourses;
    if (courseName) {
        if (req.user.role === 'Teacher' && !targetCourses.includes(courseName)) {
            res.status(403);
            throw new Error('Not authorized to view this course analytics');
        }
        coursesToQuery = [courseName];
    }

    // Build aggregations/query
    const matchQuery = {
        course: { $in: coursesToQuery }
    };

    const records = await VideoAnalytics.find(matchQuery)
        .populate('student', 'name email studentProfile')
        .populate('video', 'title filename materialType')
        .sort({ updatedAt: -1 });

    // Filter results if search query is specified
    let filteredRecords = records;
    if (search) {
        const lowerSearch = search.toLowerCase();
        filteredRecords = records.filter(r => 
            (r.student && r.student.name && r.student.name.toLowerCase().includes(lowerSearch)) ||
            (r.student && r.student.email && r.student.email.toLowerCase().includes(lowerSearch)) ||
            (r.video && r.video.title && r.video.title.toLowerCase().includes(lowerSearch))
        );
    }

    // Sort results dynamically
    if (sortField) {
        const order = sortOrder === 'descend' ? -1 : 1;
        filteredRecords.sort((a, b) => {
            let valA = a;
            let valB = b;

            // Resolve nested fields
            if (sortField === 'studentName') {
                valA = a.student?.name || '';
                valB = b.student?.name || '';
            } else if (sortField === 'videoTitle') {
                valA = a.video?.title || '';
                valB = b.video?.title || '';
            } else if (sortField === 'completionPercentage') {
                valA = a.progress?.completionPercentage || 0;
                valB = b.progress?.completionPercentage || 0;
            } else if (sortField === 'learningScore') {
                valA = a.learningScore || 0;
                valB = b.learningScore || 0;
            } else if (sortField === 'watchedDuration') {
                valA = a.progress?.watchedDuration || 0;
                valB = b.progress?.watchedDuration || 0;
            } else {
                valA = a[sortField] || 0;
                valB = b[sortField] || 0;
            }

            if (typeof valA === 'string') {
                return order * valA.localeCompare(valB);
            }
            return order * (valA - valB);
        });
    }

    // Pagination
    const totalCount = filteredRecords.length;
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginatedRecords = filteredRecords.slice(startIndex, startIndex + Number(limit));

    res.json({
        totalCount,
        page: Number(page),
        limit: Number(limit),
        records: paginatedRecords
    });
});

module.exports = {
    trackVideoProgress,
    getVideoAnalyticsDetails,
    getVideoAnalyticsForTeacher
};
