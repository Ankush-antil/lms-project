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
    showOnLanding: { type: Boolean, default: false },  // Show institute on public landing page
    wifiNetworks: { type: [String], default: [] },
    controls: { type: mongoose.Schema.Types.Mixed, default: {} },
    portalShutdown: { type: Boolean, default: false },
    portalShutdownMessage: { type: String, default: '' },
    shutdownRoles: { type: [String], default: [] },  // Specific roles blocked from login
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const Institute = mongoose.model('Institute', instituteSchema);
module.exports = Institute;
