const mongoose = require('mongoose');

const roleRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    requestedRole: {
        type: String,
        enum: ['Admin', 'Teacher', 'Student', 'Editor', 'Institute', 'Accountant', 'Marketer', 'Staff', 'Parent'],
        required: true
    },
    institute: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institute'
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    },
    targetApprover: {
        type: String,
        enum: ['Admin', 'Institute'],
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('RoleRequest', roleRequestSchema);
