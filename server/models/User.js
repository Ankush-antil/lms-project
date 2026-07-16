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
        enum: ['Admin', 'Teacher', 'Student', 'Editor', 'Institute', 'Accountant', 'Marketer', 'Staff', 'Parent', 'Guest'],
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
    isDeleted: {
        type: Boolean,
        default: false
    },
    // Role specific fields
    studentProfile: {
        ledgerNo: { type: String, default: '' },
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        coursesList: [{
            course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
            subjects: [{ type: String }]
        }],
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
            source: { type: String, enum: ['manual', 'qr', 'biometric'], default: 'manual' }, // kahan se aayi attendance
            checkInTime: { type: String, default: '' },
            checkOutTime: { type: String, default: '' },
            markedBy: { type: String, default: '' }
        }],
        controls: { type: mongoose.Schema.Types.Mixed, default: {} }
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
        physicalAttendance: [{
            date: { type: String }, // e.g. "2026-06-30"
            status: { type: String, enum: ['Present', 'Absent', 'Leave', 'Holiday'] },
            teacherNote: { type: String, default: '' },
            source: { type: String, enum: ['manual', 'qr', 'biometric'], default: 'manual' },
            checkInTime: { type: String, default: '' },
            checkOutTime: { type: String, default: '' },
            markedBy: { type: String, default: '' }
        }],
        autoQRConfig: {
            enabled: { type: Boolean, default: false },
            course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
            subject: { type: String, default: '' },
            section: { type: String, default: '' },
            duration: { type: Number, default: 60 },
            wifiSSID: { type: String, default: '' },
            locationRequired: { type: Boolean, default: false },
            scheduleTime: { type: String, default: '' }
        },
        controls: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    editorProfile: {
        assignedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
        subjects: [{ type: String }],
        controls: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    accountantProfile: {
        controls: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    marketerProfile: {
        controls: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    staffProfile: {
        designation: { type: String, default: '' },
        department: { type: String, default: '' },
        joiningDate: { type: Date, default: Date.now },
        salary: { type: Number, default: 0 },
        salaryStatus: { type: String, enum: ['Paid', 'Pending', 'Processing'], default: 'Pending' },
        minusPoints: { type: Number, default: 0 },
        plusPoints: { type: Number, default: 0 },
        physicalAttendance: [{
            date: { type: String }, // e.g. "2026-06-30"
            status: { type: String, enum: ['Present', 'Absent', 'Leave', 'Holiday'] },
            teacherNote: { type: String, default: '' },   // note written by institute
            leaveNote: { type: String, default: '' },     // staff ka leave application text
            leaveFile: { type: String, default: '' },     // staff ka leave PDF/file URL
            leaveStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' }, // leave approval status
            source: { type: String, enum: ['manual', 'qr', 'biometric'], default: 'manual' },
            checkInTime: { type: String, default: '' },
            checkOutTime: { type: String, default: '' },
            markedBy: { type: String, default: '' }
        }],
        controls: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    parentProfile: {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        controls: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    guestProfile: {
        demoCourse: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        demoDuration: { type: Number, default: 1 }, // in days
        demoExpiryDate: { type: Date }
    },
    isActive: { type: Boolean, default: true },
    allowedRoles: { type: [String], default: [] }
}, {
    timestamps: true
});

// Optimization Indexes
userSchema.index({ role: 1 });
userSchema.index({ role: 1, 'studentProfile.section': 1 });
userSchema.index({ isDeleted: 1 });
userSchema.index({ role: 1, isDeleted: 1 });
userSchema.index({ role: 1, 'studentProfile.course': 1 });
userSchema.index({ role: 1, 'studentProfile.coursesList.course': 1 });
userSchema.index({ 'teacherProfile.assignedCourses': 1 });

// Exclude Admin and Institute users when listing other roles
userSchema.pre(/^find/, function (next) {
    const query = this.getQuery();
    
    if (query.role && ['Student', 'Teacher', 'Editor', 'Accountant'].includes(query.role)) {
        this.where({ allowedRoles: { $nin: ['Admin', 'Institute'] } });
    }
    else if (query.$or && Array.isArray(query.$or)) {
        const hasSubRoleQuery = query.$or.some(cond => 
            cond.role && ['Student', 'Teacher', 'Editor', 'Accountant'].includes(cond.role)
        );
        if (hasSubRoleQuery) {
            this.where({ allowedRoles: { $nin: ['Admin', 'Institute'] } });
        }
    }
    
    next();
});

// Ensure active role is in allowedRoles list
userSchema.pre('save', function (next) {
    if (this.role && !this.allowedRoles.includes(this.role)) {
        this.allowedRoles.push(this.role);
    }
    next();
});

// Auto-generate unique admission number for Student if not provided
userSchema.pre('save', async function (next) {
    if (this.role === 'Student' && !this.admissionNo) {
        let uniqueFound = false;
        let generatedNo = '';
        let attempts = 0;
        
        while (!uniqueFound && attempts < 10) {
            const randNum = Math.floor(10000 + Math.random() * 90000); // 5 digits
            generatedNo = `UQ-${randNum}`;
            const exists = await mongoose.models.User.findOne({ admissionNo: generatedNo });
            if (!exists) {
                uniqueFound = true;
            }
            attempts++;
        }
        
        // Fallback to timestamp if random number collisions occur repeatedly (very rare)
        if (!uniqueFound) {
            generatedNo = `UQ-${Date.now().toString().slice(-5)}`;
        }
        
        this.admissionNo = generatedNo;
    }
    next();
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
