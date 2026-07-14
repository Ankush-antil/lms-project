const asyncHandler = require('express-async-handler');
const RegistrationRequest = require('../models/RegistrationRequest');
const User = require('../models/User');
const Institute = require('../models/Institute');

// @desc    Submit a registration request
// @route   POST /api/registration-requests
// @access  Public
const createRequest = asyncHandler(async (req, res) => {
    const { role, name, email, password, phone, targetInstitute, subjectSpecialization, eligibility, instituteDetails } = req.body;

    if (!role || !name || !email || !password) {
        res.status(400);
        throw new Error('Please provide role, name, email, and password');
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('Email is already registered as an active account');
    }

    // Check if pending request already exists
    const pendingExists = await RegistrationRequest.findOne({ email, status: 'Pending' });
    if (pendingExists) {
        res.status(400);
        throw new Error('A registration request is already pending for this email');
    }

    const request = await RegistrationRequest.create({
        role,
        name,
        email,
        password,
        phone,
        targetInstitute: (role === 'Teacher' || role === 'Editor') ? targetInstitute : undefined,
        subjectSpecialization: role === 'Teacher' ? subjectSpecialization : '',
        eligibility: role === 'Editor' ? eligibility : '',
        instituteDetails: role === 'Institute' ? instituteDetails : undefined
    });

    res.status(201).json({
        success: true,
        message: 'Registration request submitted successfully',
        request
    });
});

// @desc    Get all pending Institute registration requests
// @route   GET /api/registration-requests/admin
// @access  Private (Admin)
const getAdminRequests = asyncHandler(async (req, res) => {
    const requests = await RegistrationRequest.find({ role: 'Institute', status: 'Pending' }).sort({ createdAt: -1 });
    res.json(requests);
});

// @desc    Approve or reject Institute request
// @route   PUT /api/registration-requests/:id/admin-resolve
// @access  Private (Admin)
const resolveAdminRequest = asyncHandler(async (req, res) => {
    const { status } = req.body; // 'Approved' or 'Rejected'
    if (!['Approved', 'Rejected'].includes(status)) {
        res.status(400);
        throw new Error('Invalid status resolution');
    }

    const request = await RegistrationRequest.findById(req.params.id);
    if (!request || request.role !== 'Institute') {
        res.status(404);
        throw new Error('Institute registration request not found');
    }

    if (request.status !== 'Pending') {
        res.status(400);
        throw new Error('Request has already been resolved');
    }

    request.status = status;
    await request.save();

    if (status === 'Approved') {
        // Create Institute
        const instCode = request.instituteDetails.code || `INST-${Date.now().toString().slice(-6)}`;
        const institute = await Institute.create({
            name: request.name,
            code: instCode,
            address: request.instituteDetails.address || '',
            contactEmail: request.instituteDetails.contactEmail || request.email,
            phone: request.instituteDetails.phone || request.phone || ''
        });

        // Create User for Institute Admin
        await User.create({
            name: request.name,
            email: request.email,
            password: request.password,
            role: 'Institute',
            institute: institute._id,
            mobileNumber: request.phone || ''
        });
    }

    res.json({
        success: true,
        message: `Institute registration request ${status.toLowerCase()} successfully`,
        request
    });
});

// @desc    Get all pending Teacher & Editor registration requests for active Institute
// @route   GET /api/registration-requests/institute
// @access  Private (Institute or Admin)
const getInstituteRequests = asyncHandler(async (req, res) => {
    let query = {
        status: 'Pending',
        role: { $in: ['Teacher', 'Editor'] }
    };

    if (req.user.role === 'Institute') {
        if (!req.user.institute) {
            res.status(400);
            throw new Error('User is not associated with any institute');
        }
        query.targetInstitute = req.user.institute;
    } else if (req.user.role !== 'Admin') {
        res.status(403);
        throw new Error('Not authorized to view requests');
    }

    const requests = await RegistrationRequest.find(query)
        .populate('targetInstitute', 'name code')
        .sort({ createdAt: -1 });

    res.json(requests);
});

// @desc    Approve or reject Teacher/Editor request
// @route   PUT /api/registration-requests/:id/institute-resolve
// @access  Private (Institute or Admin)
const resolveInstituteRequest = asyncHandler(async (req, res) => {
    const { status } = req.body; // 'Approved' or 'Rejected'
    if (!['Approved', 'Rejected'].includes(status)) {
        res.status(400);
        throw new Error('Invalid status resolution');
    }

    const request = await RegistrationRequest.findById(req.params.id);
    if (!request || !['Teacher', 'Editor'].includes(request.role)) {
        res.status(404);
        throw new Error('Registration request not found');
    }

    // Verify it is for this institute (only for Institute role users)
    if (req.user.role === 'Institute' && request.targetInstitute.toString() !== req.user.institute.toString()) {
        res.status(403);
        throw new Error('Not authorized to resolve this request');
    }

    if (request.status !== 'Pending') {
        res.status(400);
        throw new Error('Request has already been resolved');
    }

    request.status = status;
    await request.save();

    if (status === 'Approved') {
        // Create User
        const userFields = {
            name: request.name,
            email: request.email,
            password: request.password,
            role: request.role,
            institute: req.user.role === 'Admin' ? request.targetInstitute : req.user.institute,
            mobileNumber: request.phone || ''
        };

        if (request.role === 'Teacher') {
            userFields.teacherProfile = {
                subjects: request.subjectSpecialization ? request.subjectSpecialization.split(',').map(s => s.trim()) : [],
                assignedCourses: []
            };
        }

        await User.create(userFields);
    }

    res.json({
        success: true,
        message: `Registration request for ${request.role} ${status.toLowerCase()} successfully`,
        request
    });
});

module.exports = {
    createRequest,
    getAdminRequests,
    resolveAdminRequest,
    getInstituteRequests,
    resolveInstituteRequest
};
