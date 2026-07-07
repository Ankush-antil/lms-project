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
    googleSpreadsheetId: { type: String, default: '' },
    googleSheetName: { type: String, default: 'Sheet1' },
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
            show: { type: Boolean, default: true },
            elementsControl: { type: Boolean, default: true },
            inputElements: { type: Boolean, default: true },
            displayingElements: { type: Boolean, default: true },
            recordingElements: { type: Boolean, default: true },
            advanceElements: { type: Boolean, default: true },
            addons: { type: Boolean, default: true },
            theme: { type: Boolean, default: true },
            createWithAi: { type: Boolean, default: true },
            integrate: { type: Boolean, default: true },
            import: { type: Boolean, default: true },
            saveAsTemplate: { type: Boolean, default: true },
            decideActivity: { type: Boolean, default: true },
            templates: { type: Boolean, default: true },
            locationLocked: { type: Boolean, default: true },
            logicRules: { type: Boolean, default: true },
            monitoring: { type: Boolean, default: true },
            connectIt: { type: Boolean, default: true },
            profileUnderSettings: { type: Boolean, default: true },
            moreSettings: { type: Boolean, default: true },
            responses: { type: Boolean, default: true },
            collaborate: { type: Boolean, default: true },
            manageAccess: { type: Boolean, default: true },
            publicToWeb: { type: Boolean, default: true }
        },
        chat: {
            show: { type: Boolean, default: true }
        }
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const Institute = mongoose.model('Institute', instituteSchema);
module.exports = Institute;
