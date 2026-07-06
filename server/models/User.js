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
    mobile2: {
        type: String,
        default: ''
    },
    fatherName: {
        type: String,
        default: ''
    },
    admissionNo: {
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
            status: { type: String, enum: ['Present', 'Absent', 'Leave', 'Holiday'] },
            teacherNote: { type: String, default: '' },   // teacher ka note — student dekh sakta hai
            leaveNote: { type: String, default: '' },     // student ka leave application text
            leaveFile: { type: String, default: '' },     // student ka leave PDF/file URL
            leaveStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' }, // leave approval status
            source: { type: String, enum: ['manual', 'qr'], default: 'manual' } // kahan se aayi attendance
        }],
        controls: {
            myActivity: {
                enabled: { type: Boolean, default: true },
                mode: { type: String, enum: ['hide', 'disable'], default: 'hide' },
                inbox: {
                    upcoming: { type: Boolean, default: true },
                    submitted: { type: Boolean, default: true },
                    returned: { type: Boolean, default: true },
                    evaluated: { type: Boolean, default: true },
                    expired: { type: Boolean, default: true },
                    studyMaterial: { type: Boolean, default: true },
                    tools: { type: Boolean, default: true },
                    analytics: { type: Boolean, default: true }
                }
            },
            dashboard: {
                enabled: { type: Boolean, default: true },
                mode: { type: String, enum: ['hide', 'disable'], default: 'hide' }
            },
            feePortal: {
                enabled: { type: Boolean, default: true },
                mode: { type: String, enum: ['hide', 'disable'], default: 'hide' }
            },
            tools: {
                enabled: { type: Boolean, default: true },
                mode: { type: String, enum: ['hide', 'disable'], default: 'hide' },
                voiceRecorder: { type: Boolean, default: true },
                videoRecorder: { type: Boolean, default: true },
                fileUploader: { type: Boolean, default: true },
                notesWriting: { type: Boolean, default: true },
                screenshotTool: { type: Boolean, default: true },
                screenRecorder: { type: Boolean, default: true },
                webCalling: { type: Boolean, default: true }
            },
            chat: {
                enabled: { type: Boolean, default: true },
                mode: { type: String, enum: ['hide', 'disable'], default: 'hide' },
                audioCall: { type: Boolean, default: true },
                videoCall: { type: Boolean, default: true },
                chatWithTeacher: { type: Boolean, default: true },
                chatWithAdmin: { type: Boolean, default: true },
                chatWithEditor: { type: Boolean, default: true }
            }
        }
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
        assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        autoQRConfig: {
            enabled: { type: Boolean, default: false },
            course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
            subject: { type: String, default: '' },
            section: { type: String, default: '' },
            duration: { type: Number, default: 60 },
            wifiSSID: { type: String, default: '' },
            locationRequired: { type: Boolean, default: false },
            scheduleTime: { type: String, default: '' }
        }
    },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});

// Optimization Indexes
userSchema.index({ role: 1 });
userSchema.index({ role: 1, 'studentProfile.section': 1 });

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
