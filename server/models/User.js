const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['Admin', 'Teacher', 'Student', 'Editor', 'Institute'],
        default: 'Student'
    },
    institute: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institute'
    },
    avatar: {
        type: String,
        default: ''
    },
    mobileNumber: {
        type: String,
        default: ''
    },
    callEnabled: {
        type: Boolean,
        default: true
    },
    // Role specific fields
    studentProfile: {
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        subject: { type: String, default: '' },   // ← new: subject assigned by admin
        batch: { type: String },
        section: { type: String, default: '' },    // ← auto-assigned section e.g. 'A', 'B', 'C'
        enrollmentDate: { type: Date, default: Date.now },
        feeStatus: { type: String, enum: ['Paid', 'Pending'], default: 'Paid' },
        physicalAttendance: [{
            date: { type: String }, // e.g. "2026-06-30"
            status: { type: String, enum: ['Present', 'Absent'] }
        }]
    },

    teacherProfile: {
        assignedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
        subjects: [{ type: String }],
        studentAssignmentMode: {
            type: String,
            enum: ['all', 'section', 'selected'],
            default: 'all'
        },
        assignedSections: [{ type: String }],
        assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});

// Encrypt password using bcrypt
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
