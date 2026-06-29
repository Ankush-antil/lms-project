const mongoose = require('mongoose');

const registrationRequestSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['Institute', 'Teacher', 'Editor'],
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        default: ''
    },
    targetInstitute: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institute'
    },
    subjectSpecialization: {
        type: String,
        default: ''
    },
    eligibility: {
        type: String,
        default: ''
    },
    instituteDetails: {
        code: { type: String, default: '' },
        address: { type: String, default: '' },
        contactEmail: { type: String, default: '' },
        phone: { type: String, default: '' }
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('RegistrationRequest', registrationRequestSchema);
