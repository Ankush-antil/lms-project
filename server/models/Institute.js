const mongoose = require('mongoose');

const instituteSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    address: String,
    contactEmail: String,
    // New extended fields
    imageUrl: String,              // Institute logo/banner image
    description: String,           // About the institute
    termsAndPolicies: String,      // Terms & admission policies
    phone: String,                 // Primary contact number
    helplineNumber: String,        // 24/7 active helpline number
    // Visibility toggles
    admissionOpen: { type: Boolean, default: false },   // Show Student apply button
    teacherHiring: { type: Boolean, default: false },   // Show Teacher apply button
    editorHiring: { type: Boolean, default: false },   // Show Editor apply button
    wifiNetworks: { type: [String], default: [] },
    controls: {
        dashboard: {
            show: { type: Boolean, default: true },
            application: { type: Boolean, default: true },
            staffRequest: { type: Boolean, default: true }
        },
        student: {
            show: { type: Boolean, default: true },
            admissionOpen: { type: Boolean, default: true },
            addStudent: { type: Boolean, default: true },
            editStudent: { type: Boolean, default: true }
        },
        teacher: {
            show: { type: Boolean, default: true },
            hiring: { type: Boolean, default: true },
            addTeacher: { type: Boolean, default: true },
            editTeacher: { type: Boolean, default: true }
        },
        editor: {
            show: { type: Boolean, default: true },
            hiring: { type: Boolean, default: true },
            addEditor: { type: Boolean, default: true },
            editEditor: { type: Boolean, default: true }
        },
        course: {
            show: { type: Boolean, default: true },
            addCourse: { type: Boolean, default: true },
            editCourse: { type: Boolean, default: true }
        },
        activities: {
            show: { type: Boolean, default: true }
        },
        chat: {
            show: { type: Boolean, default: true }
        }
    }
}, {
    timestamps: true
});

const Institute = mongoose.model('Institute', instituteSchema);
module.exports = Institute;
