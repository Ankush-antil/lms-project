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
}, {
    timestamps: true
});

const Institute = mongoose.model('Institute', instituteSchema);
module.exports = Institute;
