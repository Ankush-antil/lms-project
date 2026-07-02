const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['USER_CREATED', 'COURSE_CREATED', 'COURSE_UPDATED', 'INSTITUTE_CREATED', 'TEST_CREATED', 'COURSE_SUBMITTED', 'COURSE_APPROVED', 'COURSE_DECLINED', 'INSTITUTE_UPDATED', 'INSTITUTE_DELETED', 'COURSE_DELETED']
    },
    message: {
        type: String,
        required: true
    },
    detail: {
        type: String
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

const Activity = mongoose.model('Activity', activitySchema);
module.exports = Activity;
