const mongoose = require('mongoose');

const videoAnalyticsSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: String,
        required: true
    },
    lesson: {
        type: String,
        required: true
    },
    video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudyMaterial',
        required: true
    },
    progress: {
        totalDuration: { type: Number, default: 0 },
        watchedDuration: { type: Number, default: 0 },
        completionPercentage: { type: Number, default: 0 },
        remainingDuration: { type: Number, default: 0 },
        lastWatchedPosition: { type: Number, default: 0 },
        firstWatchedDate: { type: Date, default: Date.now },
        lastWatchedDate: { type: Date, default: Date.now },
        isCompleted: { type: Boolean, default: false }
    },
    watchTimeline: [{
        segmentIndex: { type: Number, required: true },
        status: {
            type: String,
            enum: ['watched', 'partial', 'skipped'],
            default: 'skipped'
        },
        watchCount: { type: Number, default: 0 }
    }],
    skips: [{
        skipStart: { type: Number, required: true },
        skipEnd: { type: Number, required: true },
        skippedDuration: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    totalSkippedDuration: { type: Number, default: 0 },
    totalSkippedPercentage: { type: Number, default: 0 },
    replays: [{
        replayStart: { type: Number, required: true },
        replayEnd: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    totalReplaysCount: { type: Number, default: 0 },
    sessions: [{
        sessionId: { type: String, required: true },
        sessionStart: { type: Date, required: true },
        sessionEnd: { type: Date, required: true },
        sessionDuration: { type: Number, required: true }
    }],
    focusAnalytics: {
        focusedTime: { type: Number, default: 0 },
        unfocusedTime: { type: Number, default: 0 },
        focusPercentage: { type: Number, default: 100 }
    },
    playbackSpeedDurations: {
        speed_1x: { type: Number, default: 0 },
        speed_1_25x: { type: Number, default: 0 },
        speed_1_5x: { type: Number, default: 0 },
        speed_1_75x: { type: Number, default: 0 },
        speed_2x: { type: Number, default: 0 }
    },
    learningScore: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes for super-fast retrieval and preventing duplicate entries per student-video combination
videoAnalyticsSchema.index({ student: 1, video: 1 }, { unique: true });
videoAnalyticsSchema.index({ course: 1, lesson: 1 });
videoAnalyticsSchema.index({ video: 1 });

const VideoAnalytics = mongoose.model('VideoAnalytics', videoAnalyticsSchema);
module.exports = VideoAnalytics;
