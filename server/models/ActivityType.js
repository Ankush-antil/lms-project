const mongoose = require('mongoose');

const activityTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

const ActivityType = mongoose.model('ActivityType', activityTypeSchema);
module.exports = ActivityType;
