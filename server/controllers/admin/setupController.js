const asyncHandler = require('express-async-handler');
const Institute = require('../../models/Institute');
const Course = require('../../models/Course');
const Activity = require('../../models/Activity');
const Application = require('../../models/Application');
const Otp = require('../../models/Otp');
const User = require('../../models/User');
const twilio = require('twilio');

// @desc    Get all institutes
// @route   GET /api/institutes
// @access  Public (or Private)
const getInstitutes = asyncHandler(async (req, res) => {
    const { landing } = req.query;
    const matchQuery = { isDeleted: { $ne: true } };
    if (landing === 'true') {
        matchQuery.showOnLanding = true;
    }
    // Get all institutes and their course counts
    const institutes = await Institute.aggregate([
        {
            $match: matchQuery
        },
        {
            $lookup: {
                from: 'courses',
                localField: '_id',
                foreignField: 'institute',
                as: 'courses'
            }
        },
        {
            $project: {
                name: 1,
                code: 1,
                address: 1,
                contactEmail: 1,
                imageUrl: 1,
                description: 1,
                termsAndPolicies: 1,
                phone: 1,
                helplineNumber: 1,
                courseCount: { $size: '$courses' },
                courses: { $slice: ['$courses', 5] }, // Just some preview courses
                admissionOpen: 1,
                teacherHiring: 1,
                editorHiring: 1,
                showOnLanding: 1,
                controls: 1
            }
        }
    ]);
    res.json(institutes);
});

// @desc    Toggle admission/hiring flag (Institute self-service)
// @route   PATCH /api/setup/institutes/:id/toggle
// @access  Private/Admin or Institute
const toggleInstituteFlag = asyncHandler(async (req, res) => {
    const { flag } = req.body; // 'admissionOpen' | 'teacherHiring' | 'editorHiring' | 'showOnLanding'
    const allowed = ['admissionOpen', 'teacherHiring', 'editorHiring', 'showOnLanding'];
    if (!allowed.includes(flag)) {
        res.status(400);
        throw new Error('Invalid flag');
    }
    const institute = await Institute.findById(req.params.id);
    if (!institute) {
        res.status(404);
        throw new Error('Institute not found');
    }
    // Only the linked institute user or admin can toggle
    if (req.user.role !== 'Admin' && String(req.user.institute) !== String(institute._id)) {
        res.status(403);
        throw new Error('Not authorised');
    }
    institute[flag] = !institute[flag];
    await institute.save();
    res.json({ flag, value: institute[flag] });
});

// @desc    Toggle course flag (Admin only)
// @route   PATCH /api/setup/courses/:id/toggle
// @access  Private/Admin
const toggleCourseFlag = asyncHandler(async (req, res) => {
    const { flag } = req.body; // 'showOnLanding'
    const allowed = ['showOnLanding'];
    if (!allowed.includes(flag)) {
        res.status(400);
        throw new Error('Invalid flag');
    }
    const course = await Course.findById(req.params.id);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }
    course[flag] = !course[flag];
    await course.save();
    res.json({ flag, value: course[flag] });
});

// @desc    Get single institute details
// @route   GET /api/setup/institutes/:id
// @access  Private/Admin
const getInstituteDetails = asyncHandler(async (req, res) => {
    const institute = await Institute.findById(req.params.id);
    if (!institute) {
        res.status(404);
        throw new Error('Institute not found');
    }

    if (req.user.role !== 'Admin' && String(req.user.institute) !== String(institute._id)) {
        res.status(403);
        throw new Error('Not authorised to access this institute details');
    }

    const courses = await Course.find({ institute: req.params.id, status: 'active' });
    res.json({ ...institute._doc, courses });
});

// @desc    Upload institute image
// @route   POST /api/setup/institutes/upload-image
// @access  Private/Admin
const uploadInstituteImageController = asyncHandler(async (req, res) => {
    const { uploadInstituteImage } = require('../../middleware/uploadMiddleware');
    uploadInstituteImage(req, res, async (err) => {
        if (err) {
            res.status(400);
            return res.json({ message: err.message || 'Image upload failed' });
        }
        if (!req.file) {
            res.status(400);
            return res.json({ message: 'No image file provided' });
        }
        const imageUrl = `/uploads/institutes/${req.file.filename}`;
        res.json({ imageUrl });
    });
});

// @desc    Upload course syllabus file
// @route   POST /api/setup/courses/upload-syllabus
// @access  Private/Admin or Institute
const uploadSyllabusController = asyncHandler(async (req, res) => {
    const { uploadSyllabus } = require('../../middleware/uploadMiddleware');
    uploadSyllabus(req, res, async (err) => {
        if (err) {
            res.status(400);
            return res.json({ message: err.message || 'Syllabus upload failed' });
        }
        if (!req.file) {
            res.status(400);
            return res.json({ message: 'No syllabus file provided' });
        }
        const syllabusUrl = `/uploads/syllabus/${req.file.filename}`;
        res.json({ syllabusUrl, originalName: req.file.originalname });
    });
});

// @desc    Upload institute document (Terms/Policies)
// @route   POST /api/setup/institutes/upload-document
// @access  Private/Admin
const uploadInstituteDocumentController = asyncHandler(async (req, res) => {
    const { uploadInstituteDocument } = require('../../middleware/uploadMiddleware');
    uploadInstituteDocument(req, res, async (err) => {
        if (err) {
            res.status(400);
            return res.json({ message: err.message || 'Document upload failed' });
        }
        if (!req.file) {
            res.status(400);
            return res.json({ message: 'No document file provided' });
        }
        const documentUrl = `/uploads/documents/${req.file.filename}`;
        res.json({ documentUrl, originalName: req.file.originalname });
    });
});

// @desc    Update institute
// @route   PUT /api/setup/institutes/:id
// @access  Private/Admin
const updateInstitute = asyncHandler(async (req, res) => {
    const { name, code, address, contactEmail, password, imageUrl, description, termsAndPolicies, phone, helplineNumber, admissionOpen, teacherHiring, editorHiring, controls } = req.body;
    const institute = await Institute.findById(req.params.id);

    if (institute) {
        institute.name = name || institute.name;
        institute.code = code || institute.code;
        institute.address = address || institute.address;
        institute.contactEmail = contactEmail || institute.contactEmail;
        if (imageUrl !== undefined) institute.imageUrl = imageUrl;
        if (description !== undefined) institute.description = description;
        if (termsAndPolicies !== undefined) institute.termsAndPolicies = termsAndPolicies;
        if (phone !== undefined) institute.phone = phone;
        if (helplineNumber !== undefined) institute.helplineNumber = helplineNumber;
        if (admissionOpen !== undefined) institute.admissionOpen = admissionOpen;
        if (teacherHiring !== undefined) institute.teacherHiring = teacherHiring;
        if (editorHiring !== undefined) institute.editorHiring = editorHiring;
        if (controls !== undefined) {
            institute.controls = controls;
            institute.markModified('controls');
        }

        const updatedInstitute = await institute.save();

        // Update the corresponding 'Institute' role user credentials
        let linkedUser = await User.findOne({ institute: institute._id, role: 'Institute' });

        if (!linkedUser && contactEmail) {
            linkedUser = await User.findOne({ email: contactEmail });
        }

        if (linkedUser) {
            if (contactEmail) {
                if (contactEmail !== linkedUser.email) {
                    const emailExists = await User.findOne({ email: contactEmail });
                    if (emailExists) {
                        res.status(400);
                        throw new Error('A user account with this email address already exists');
                    }
                    linkedUser.email = contactEmail;
                }
            }
            if (password) {
                linkedUser.password = password; // Hashed automatically on save
            }
            // Ensure role and institute linkage are correctly set
            linkedUser.role = 'Institute';
            linkedUser.institute = institute._id;

            await linkedUser.save();
        } else if (contactEmail) {
            // Auto-provision if user didn't exist previously
            const emailExists = await User.findOne({ email: contactEmail });
            if (emailExists) {
                res.status(400);
                throw new Error('A user account with this email address already exists');
            }
            const userPass = password || Math.random().toString(36).slice(-8);
            await User.create({
                name: `${name || institute.name} Admin`,
                email: contactEmail,
                password: userPass,
                role: 'Institute',
                institute: institute._id
            });
        }

        await Activity.create({
            type: 'INSTITUTE_UPDATED',
            message: 'Institute details and user credentials updated',
            detail: `${updatedInstitute.name} (${updatedInstitute.code})`,
            user: req.user._id
        });

        res.json(updatedInstitute);
    } else {
        res.status(404);
        throw new Error('Institute not found');
    }
});

// @desc    Create new institute
// @route   POST /api/institutes
// @access  Private/Admin
const createInstitute = asyncHandler(async (req, res) => {
    const { name, code, address, contactEmail } = req.body;

    if (!contactEmail) {
        res.status(400);
        throw new Error('Contact email is required to provision the institute admin account');
    }

    const instituteExists = await Institute.findOne({ code });
    if (instituteExists) {
        res.status(400);
        throw new Error('Institute code already exists');
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: contactEmail });
    if (userExists) {
        res.status(400);
        throw new Error('A user account with this email address already exists');
    }

    const { description, termsAndPolicies, phone, helplineNumber, imageUrl, controls } = req.body;

    const institute = await Institute.create({
        name,
        code,
        address,
        contactEmail,
        imageUrl: imageUrl || '',
        description: description || '',
        termsAndPolicies: termsAndPolicies || '',
        phone: phone || '',
        helplineNumber: helplineNumber || '',
        controls: controls || undefined
    });

    // Auto-generate or accept custom password
    const userPass = req.body.password || Math.random().toString(36).slice(-8);

    const user = await User.create({
        name: `${name} Admin`,
        email: contactEmail,
        password: userPass,
        role: 'Institute',
        institute: institute._id
    });

    // Log Activity
    await Activity.create({
        type: 'INSTITUTE_CREATED',
        message: 'New Institute registered and admin account created',
        detail: `${institute.name} (${institute.code})`,
        user: req.user._id
    });

    res.status(201).json({
        institute,
        user: {
            email: user.email,
            password: userPass
        }
    });
});

// @desc    Get all courses (optionally filter by institute)
// @route   GET /api/courses
// @access  Public
const getCourses = asyncHandler(async (req, res) => {
    const { instituteId, status, landing } = req.query;
    const query = { isDeleted: { $ne: true } };
    if (instituteId) query.institute = instituteId;

    if (status !== 'all') {
        query.status = status || 'active';
    }

    if (landing === 'true') {
        query.showOnLanding = true;
    }

    // Isolate courses for Institute and Editor roles
    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor')) {
        query.institute = req.user.institute;
    }

    // If teacher role, limit to assigned courses
    if (req.user && req.user.role === 'Teacher') {
        const teacher = await User.findById(req.user._id);
        const assignedCourses = teacher?.teacherProfile?.assignedCourses || [];
        query._id = { $in: assignedCourses };
    }

    // Populate institute and createdBy details
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 0;
    const skip = (page - 1) * limit;

    let dbQuery = Course.find(query);
    if (limit > 0) {
        dbQuery = dbQuery.skip(skip).limit(limit);
    }

    const courses = await dbQuery
        .populate('institute')
        .populate('createdBy', 'name email role');

    // Filter subjects and durations for teachers
    if (req.user && req.user.role === 'Teacher') {
        const teacher = await User.findById(req.user._id);
        const teacherSubjects = teacher?.teacherProfile?.subjects || [];
        const filteredCourses = courses.map(course => {
            const courseObj = course.toObject();
            courseObj.subjects = (courseObj.subjects || []).filter(subject => teacherSubjects.includes(subject));
            courseObj.subjectDurations = (courseObj.subjectDurations || []).filter(sd => teacherSubjects.includes(sd.subjectName));
            return courseObj;
        });
        return res.json(filteredCourses);
    }

    res.json(courses);
});

// @desc    Create new course
// @route   POST /api/courses
// @access  Private/Admin
const createCourse = asyncHandler(async (req, res) => {
    const { name, code, description, instituteId, subjects, syllabusUrl, syllabusType, maxStudentsPerSection, duration, fee, isDemo, sectionsCount } = req.body;

    // Determine status based on user role (req.user is populated by protect middleware)
    const status = 'active';
    const createdBy = req.user ? req.user._id : null;

    // Enforce Editor's or Institute's own institute if creator is Editor or Institute
    const finalInstituteId = (req.user && (req.user.role === 'Editor' || req.user.role === 'Institute'))
        ? req.user.institute
        : instituteId;

    if (!finalInstituteId) {
        res.status(400);
        throw new Error('Institute is required');
    }

    const courseExists = await Course.findOne({ code, institute: finalInstituteId });
    if (courseExists) {
        res.status(400);
        throw new Error('Course code already exists for this institute');
    }

    // subjects can be comma separated string or array
    const subjectsArray = Array.isArray(subjects) ? subjects : subjects.split(',').map(s => s.trim());

    const course = await Course.create({
        name,
        code,
        description,
        institute: finalInstituteId,
        subjects: subjectsArray,
        status,
        createdBy,
        syllabusUrl: syllabusUrl || '',
        syllabusType: syllabusType || 'link',
        maxStudentsPerSection: maxStudentsPerSection ? parseInt(maxStudentsPerSection) : 30,
        sectionsCount: sectionsCount ? parseInt(sectionsCount) : 1,
        duration: duration ? parseInt(duration) : 0,
        fee: fee ? parseFloat(fee) : 0,
        isDemo: isDemo === true || isDemo === 'true'
    });

    // Log Activity
    await Activity.create({
        type: 'COURSE_CREATED',
        message: 'New Course added',
        detail: `${course.name} (${course.code})`,
        user: createdBy
    });

    res.status(201).json(course);
});

// Helper: compute section letter for a student based on enrollment count in course
const computeSection = async (courseId) => {
    const course = await Course.findById(courseId);
    if (!course) return 'A';
    const sectionsCount = course.sectionsCount || 1;
    const capacity = course.maxStudentsPerSection || 30;

    // Find the first section (from A to sectionsCount) that has space
    for (let i = 0; i < sectionsCount; i++) {
        const sectionLetter = String.fromCharCode(65 + i);
        const sectionCount = await User.countDocuments({ 
            role: 'Student', 
            'studentProfile.course': courseId,
            'studentProfile.section': sectionLetter,
            isDeleted: { $ne: true }
        });
        if (sectionCount < capacity) {
            return sectionLetter;
        }
    }
    // If all are full, return the last section
    return String.fromCharCode(65 + (sectionsCount - 1));
};

// @desc    Update course
// @route   PUT /api/setup/courses/:id
// @access  Private/Admin or Editor or Institute
const updateCourse = asyncHandler(async (req, res) => {
    const { name, code, description, instituteId, subjects, syllabusUrl, syllabusType, maxStudentsPerSection, duration, fee, isDemo, sectionsCount } = req.body;
    const course = await Course.findById(req.params.id);

    if (course) {
        // Enforce institute boundary for non-admins
        if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor') && course.institute.toString() !== req.user.institute.toString()) {
            res.status(403);
            throw new Error('Not authorized to update courses of other institutes');
        }

        // Check code uniqueness if code is changed
        if (code && code !== course.code) {
            const codeExists = await Course.findOne({ code, institute: course.institute });
            if (codeExists) {
                res.status(400);
                throw new Error('Course code already exists for this institute');
            }
            course.code = code;
        }

        course.name = name || course.name;
        course.description = description !== undefined ? description : course.description;

        // Only Admin can change the institute of a course
        if (req.user && req.user.role === 'Admin' && instituteId) {
            course.institute = instituteId;
        }

        if (subjects !== undefined) {
            course.subjects = Array.isArray(subjects) ? subjects : subjects.split(',').map(s => s.trim());
        }

        if (syllabusUrl !== undefined) course.syllabusUrl = syllabusUrl;
        if (syllabusType !== undefined) course.syllabusType = syllabusType;
        if (maxStudentsPerSection !== undefined) course.maxStudentsPerSection = parseInt(maxStudentsPerSection);
        if (sectionsCount !== undefined) course.sectionsCount = parseInt(sectionsCount) || 1;
        if (duration !== undefined) course.duration = parseInt(duration) || 0;
        if (fee !== undefined) course.fee = parseFloat(fee) || 0;
        if (isDemo !== undefined) course.isDemo = isDemo === true || isDemo === 'true';

        const updatedCourse = await course.save();

        await Activity.create({
            type: 'COURSE_UPDATED',
            message: 'Course details updated',
            detail: `${updatedCourse.name} (${updatedCourse.code})`,
            user: req.user._id
        });

        res.json(updatedCourse);
    } else {
        res.status(404);
        throw new Error('Course not found');
    }
});

// @desc    Delete institute
// @route   DELETE /api/setup/institutes/:id
// @access  Private/Admin
const deleteInstitute = asyncHandler(async (req, res) => {
    const institute = await Institute.findById(req.params.id);

    if (institute) {
        institute.isDeleted = true;
        await institute.save();

        await Activity.create({
            type: 'INSTITUTE_DELETED',
            message: 'Institute moved to Recycle Bin',
            detail: `${institute.name} (${institute.code})`,
            user: req.user._id
        });

        res.json({ message: 'Institute moved to Recycle Bin' });
    } else {
        res.status(404);
        throw new Error('Institute not found');
    }
});

// @desc    Delete course
// @route   DELETE /api/setup/courses/:id
// @access  Private/Admin
const deleteCourse = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);

    if (course) {
        // Enforce institute boundary
        if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor') && course.institute.toString() !== req.user.institute.toString()) {
            res.status(403);
            throw new Error('Not authorized to delete courses of other institutes');
        }
        course.isDeleted = true;
        await course.save();

        await Activity.create({
            type: 'COURSE_DELETED',
            message: 'Course moved to Recycle Bin',
            detail: `${course.name} (${course.code})`,
            user: req.user._id
        });

        res.json({ message: 'Course moved to Recycle Bin' });
    } else {
        res.status(404);
        throw new Error('Course not found');
    }
});



// @desc    Submit a course application
// @route   POST /api/setup/apply
// @access  Public
const submitApplication = asyncHandler(async (req, res) => {
    const { guestName, guestPhone, guestEmail, courseId, instituteId, statement, role } = req.body;

    if (!guestName || !guestPhone || !courseId || !instituteId) {
        res.status(400);
        throw new Error('Please provide name, phone, course and institute');
    }

    // Verify course and institute exist
    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    const institute = await Institute.findById(instituteId);
    if (!institute) {
        res.status(404);
        throw new Error('Institute not found');
    }

    const application = await Application.create({
        guestName,
        guestPhone,
        guestEmail,
        course: courseId,
        institute: instituteId,
        statement,
        role: role || 'Student'
    });

    res.status(201).json(application);
});

// @desc    Get applications by phone number
// @route   GET /api/setup/applications
// @access  Public
const getApplications = asyncHandler(async (req, res) => {
    const { phone } = req.query;

    if (!phone) {
        res.status(400);
        throw new Error('Please provide a phone number or email');
    }

    const searchStr = phone.trim();

    const applications = await Application.find({
        $or: [{ guestPhone: searchStr }, { guestEmail: searchStr }]
    })
        .populate('course', 'name code description')
        .populate('institute', 'name code address contactEmail helplineNumber');

    // Fetch Teacher, Editor, Institute registration requests matching phone OR email
    const RegistrationRequest = require('../../models/RegistrationRequest');
    const regRequests = await RegistrationRequest.find({
        $or: [{ phone: searchStr }, { email: searchStr }]
    }).populate('targetInstitute', 'name code address contactEmail helplineNumber');

    const formattedRegRequests = regRequests.map(r => ({
        _id: r._id,
        isRegistrationRequest: true,
        role: r.role,
        course: {
            name: `${r.role} Application`,
            code: r.role.toUpperCase(),
            description: r.subjectSpecialization ? `Subjects: ${r.subjectSpecialization}` : (r.eligibility || `Application to join as ${r.role}`)
        },
        institute: r.targetInstitute || { name: 'Admin / System', code: 'MAIN' },
        status: r.status === 'Approved' ? 'Accepted' : (r.status === 'Pending' ? 'Under Review' : r.status),
        guestName: r.name,
        guestEmail: r.email,
        guestPhone: r.phone || '',
        createdAt: r.createdAt
    }));

    res.json([...applications, ...formattedRegRequests]);
});

// @desc    Generate and send simulated OTP (logs to console & saves in DB)
// @route   POST /api/setup/send-otp
// @access  Public
const sendOtp = asyncHandler(async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        res.status(400);
        throw new Error('Please provide a phone number or email');
    }

    const isEmail = phone.includes('@');
    // Generate random 4-digit OTP code (random for email, fixed '1234' for phone simulation)
    const otpCode = isEmail 
        ? Math.floor(1000 + Math.random() * 9000).toString() 
        : '1234';

    let isSentViaEmail = false;
    let isSentViaTwilio = false;

    if (isEmail) {
        const nodemailer = require('nodemailer');
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            try {
                const dns = require('dns');
                if (typeof dns.setDefaultResultOrder === 'function') {
                    dns.setDefaultResultOrder('ipv4first');
                }

                let mailConfig = {};
                if (process.env.EMAIL_HOST && process.env.EMAIL_HOST !== 'smtp.gmail.com') {
                    mailConfig = {
                        host: process.env.EMAIL_HOST,
                        port: parseInt(process.env.EMAIL_PORT, 10) || 465,
                        secure: process.env.EMAIL_PORT === '465',
                        auth: {
                            user: process.env.EMAIL_USER,
                            pass: process.env.EMAIL_PASS,
                        },
                        tls: {
                            rejectUnauthorized: false
                        }
                    };
                } else {
                    mailConfig = {
                        service: 'gmail',
                        auth: {
                            user: process.env.EMAIL_USER,
                            pass: process.env.EMAIL_PASS,
                        },
                        tls: {
                            rejectUnauthorized: false
                        }
                    };
                }

                const transporter = nodemailer.createTransport(mailConfig);

                await transporter.sendMail({
                    from: `"LMS Portal" <${process.env.EMAIL_USER}>`,
                    to: phone.trim(),
                    subject: "Verification Code for Course Application",
                    text: `Your LMS verification OTP is ${otpCode}. It is valid for 5 minutes.`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px;">
                            <h2 style="color: #3E3ADD; margin-top: 0;">LMS Verification Code</h2>
                            <p>Thank you for applying. Use the following OTP to verify your email address:</p>
                            <div style="font-size: 24px; font-weight: bold; background: #f5f5f5; padding: 12px; text-align: center; border-radius: 8px; letter-spacing: 4px; color: #3E3ADD;">
                                ${otpCode}
                            </div>
                            <p style="color: #666; font-size: 12px; margin-top: 15px;">This OTP is valid for 5 minutes.</p>
                        </div>
                    `
                });
                console.log(`[Email] OTP ${otpCode} sent successfully to ${phone}`);
                isSentViaEmail = true;
            } catch (mailErr) {
                console.error("Nodemailer SMTP email sending failed:", mailErr);
            }
        }
    } else {
        // Check if Twilio config is available
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        let fromPhone = process.env.TWILIO_PHONE_NUMBER;

        if (accountSid && authToken && fromPhone) {
            try {
                const twilio = require('twilio');
                const client = twilio(accountSid, authToken);

                // Format recipient number (e.g. prepend +91 for India if not present and 10 digits)
                let formattedPhone = phone.trim();
                if (!formattedPhone.startsWith('+')) {
                    if (formattedPhone.length === 10) {
                        formattedPhone = `+91${formattedPhone}`;
                    } else {
                        formattedPhone = `+${formattedPhone}`;
                    }
                }

                // Format sender number (typically US number starting with +1)
                if (!fromPhone.startsWith('+')) {
                    if (fromPhone.length === 10) {
                        fromPhone = `+1${fromPhone}`;
                    } else {
                        fromPhone = `+${fromPhone}`;
                    }
                }

                await client.messages.create({
                    body: `Your LMS verification OTP is ${otpCode}. It is valid for 5 minutes.`,
                    from: fromPhone,
                    to: formattedPhone
                });
                console.log(`[Twilio] OTP ${otpCode} sent successfully to ${formattedPhone}`);
                isSentViaTwilio = true;
            } catch (twilioErr) {
                console.error("Twilio SMS sending failed:", twilioErr);
                // Fallback console log
                console.log('\n======================================');
                console.log('📬 [SMS GATEWAY FALLBACK] SENDING OTP');
                console.log(`📱 Phone: ${phone}`);
                console.log(`🔑 OTP Code: ${otpCode}`);
                console.log('======================================\n');
            }
        } else {
            // Fallback simulation
            console.log('\n======================================');
            console.log('📬 [SMS GATEWAY SIMULATION] SENDING OTP');
            console.log(`📱 Phone: ${phone}`);
            console.log(`🔑 OTP Code: ${otpCode}`);
            console.log('======================================\n');
        }
    }

    // Save to DB (or update if an OTP exists for this phone)
    await Otp.findOneAndUpdate(
        { phone },
        { otp: otpCode, createdAt: new Date() },
        { upsert: true, new: true }
    );

    res.json({
        message: isSentViaEmail
            ? 'OTP sent successfully to your email.'
            : isSentViaTwilio
                ? 'OTP sent successfully to your mobile number.'
                : 'OTP simulated successfully. Please check the server console logs.'
    });
});

// @desc    Verify the generated OTP
// @route   POST /api/setup/verify-otp
// @access  Public
const verifyOtp = asyncHandler(async (req, res) => {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
        res.status(400);
        throw new Error('Please provide phone number and OTP code');
    }

    // Find the OTP document
    const otpDoc = await Otp.findOne({ phone });

    const isEmail = phone.includes('@');
    const isBypassAllowed = !isEmail && otp === '1234';

    if (!isBypassAllowed && (!otpDoc || otpDoc.otp !== otp)) {
        res.status(400);
        throw new Error('Invalid or expired OTP code');
    }

    // Successful verification: delete the OTP document so it can't be reused
    if (otpDoc) {
        await otpDoc.deleteOne();
    }

    res.json({ message: 'OTP verified successfully' });
});

// @desc    Get applications for a specific institute (for logged-in Institute user or Admin)
// @route   GET /api/setup/institute-applications
// @access  Private/Institute or Admin
const getInstituteApplications = asyncHandler(async (req, res) => {
    let query = { isDeleted: { $ne: true } };
    if (req.user.role === 'Institute' || req.user.role === 'Marketer') {
        query.institute = req.user.institute;
    } else if (req.user.role !== 'Admin') {
        res.status(403);
        throw new Error('Not authorized to view applications');
    }

    const applications = await Application.find(query)
        .populate('course', 'name code description')
        .populate('institute', 'name code address contactEmail')
        .populate('user')
        .sort({ createdAt: -1 });

    res.json(applications);
});

// @desc    Update application status
// @route   PUT /api/setup/applications/:id/status
// @access  Private/Institute or Admin
const updateApplicationStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!['Applied', 'Under Review', 'Accepted', 'Rejected', 'Registered'].includes(status)) {
        res.status(400);
        throw new Error('Invalid status value');
    }

    const application = await Application.findById(req.params.id);
    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    // Access check: Institute users can only manage applications of their own institute
    if (req.user.role === 'Institute' && application.institute.toString() !== req.user.institute.toString()) {
        res.status(403);
        throw new Error('Not authorized to update applications of other institutes');
    }

    application.status = status;
    await application.save();

    res.json(application);
});

// @desc    Register a student whose application was accepted
// @route   POST /api/setup/register-student
// @access  Public
const registerStudent = asyncHandler(async (req, res) => {
    const { applicationId, email, password } = req.body;

    if (!applicationId || !email || !password) {
        res.status(400);
        throw new Error('Please provide application ID, email and password');
    }

    const application = await Application.findById(applicationId);
    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    if (application.status !== 'Accepted') {
        res.status(400);
        throw new Error('This application has not been accepted yet or has already been registered');
    }

    // Check if email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('A user account with this email address already exists');
    }

    // Create the User with the specified application role
    const role = application.role || 'Student';
    const userFields = {
        name: application.guestName,
        email: email,
        password: password, // Hashed on save
        role: role,
        institute: application.institute,
        mobileNumber: application.guestPhone
    };

    if (role === 'Student') {
        // Auto-assign section based on course capacity
        const assignedSection = await computeSection(application.course);
        userFields.studentProfile = {
            course: application.course,
            section: assignedSection,
            enrollmentDate: new Date()
        };
    } else if (role === 'Teacher') {
        userFields.teacherProfile = {
            assignedCourses: [application.course],
            subjects: []
        };
    }

    const user = await User.create(userFields);

    // Mark application as Registered and link user
    application.status = 'Registered';
    application.user = user._id;
    await application.save();

    // Log Activity
    await Activity.create({
        type: 'USER_CREATED',
        message: 'Student account created from application',
        detail: `${user.name} (${user.email})`,
        user: user._id
    });

    res.status(201).json({
        message: 'Student account registered successfully! You can now log in.',
        user: {
            id: user._id,
            name: user.name,
            email: user.email
        }
    });
});

// @desc    Get all subjects aggregated with course, institute, teacher and test details
// @route   GET /api/setup/subjects
// @access  Private/Admin
const getSubjects = asyncHandler(async (req, res) => {
    const Test = require('../../models/Test');

    const courseQuery = { status: 'active' };
    const teacherQuery = { role: 'Teacher' };
    const testQuery = {};

    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor')) {
        courseQuery.institute = req.user.institute;
        teacherQuery.institute = req.user.institute;

        // Find institute to get its name (since test.institute is a string name)
        const userWithInst = await User.findById(req.user._id).populate('institute');
        if (userWithInst && userWithInst.institute) {
            const escapedName = userWithInst.institute.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            testQuery.institute = { $regex: new RegExp(`^\\s*${escapedName}\\s*$`, 'i') };
        } else {
            testQuery.institute = 'NON_EXISTENT_INSTITUTE';
        }
    }

    const courses = await Course.find(courseQuery).populate('institute', 'name');
    const teachers = await User.find(teacherQuery);
    const tests = await Test.find(testQuery);

    const subjectsList = [];

    courses.forEach(course => {
        if (!course.subjects || course.subjects.length === 0) return;

        course.subjects.forEach(subName => {
            // Find teachers teaching this subject in this course
            const teachingTeachers = teachers.filter(t => {
                const assignedCourses = t.teacherProfile?.assignedCourses || [];
                const tSubjects = t.teacherProfile?.subjects || [];

                const hasCourse = assignedCourses.some(cId => cId.toString() === course._id.toString());
                const hasSubject = tSubjects.some(sName => sName.toLowerCase() === subName.toLowerCase());

                return hasCourse && hasSubject;
            });

            // Find tests created for this subject (check name or id matching)
            const subjectTests = tests.filter(t => {
                const courseMatch = t.course === course.name || (t.course && t.course.toString() === course._id.toString());
                const subjectMatch = t.subject?.toLowerCase() === subName.toLowerCase();
                return courseMatch && subjectMatch;
            });

            // Count assignments: questions of type 'Assignment' or type containing 'assign'
            let assignmentCount = 0;
            subjectTests.forEach(t => {
                const hasAssignmentQuestion = t.questions?.some(q => q.type === 'Assignment' || q.type?.toLowerCase().includes('assign'));
                if (hasAssignmentQuestion) {
                    assignmentCount++;
                }
            });

            // Find allocated duration in course.subjectDurations if exists
            const durationEntry = course.subjectDurations?.find(sd => sd.subjectName?.toLowerCase() === subName.toLowerCase());
            const allocatedDuration = durationEntry ? durationEntry.duration : 0;

            subjectsList.push({
                name: subName,
                duration: allocatedDuration,
                course: {
                    _id: course._id,
                    name: course.name,
                    duration: course.duration || 0
                },
                institute: course.institute ? {
                    _id: course.institute._id,
                    name: course.institute.name
                } : null,
                teachers: teachingTeachers.map(t => ({
                    _id: t._id,
                    name: t.name,
                    email: t.email
                })),
                testCount: subjectTests.length,
                assignmentCount: assignmentCount,
                tests: subjectTests.map(t => ({
                    _id: t._id,
                    title: t.title,
                    questionsCount: t.questions?.length || 0,
                    status: t.status,
                    publishMode: t.publishMode
                }))
            });
        });
    });

    res.json(subjectsList);
});

// @desc    Delete application (soft delete)
// @route   DELETE /api/setup/applications/:id
// @access  Private/Institute or Admin
const deleteApplication = asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id);
    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }

    // Enforce institute isolation
    if (req.user.role === 'Institute' && application.institute.toString() !== req.user.institute.toString()) {
        res.status(403);
        throw new Error('Not authorized to delete this application');
    }

    application.isDeleted = true;
    await application.save();
    res.json({ message: 'Application moved to Recycle Bin' });
});

// @desc    Get soft-deleted applications
// @route   GET /api/setup/applications/trash
// @access  Private/Institute or Admin
const getDeletedApplications = asyncHandler(async (req, res) => {
    let query = { isDeleted: true };
    if (req.user.role === 'Institute' || req.user.role === 'Marketer') {
        query.institute = req.user.institute;
    }
    const applications = await Application.find(query)
        .populate('course', 'name code description')
        .populate('institute', 'name code address contactEmail')
        .populate('user')
        .sort({ updatedAt: -1 });
    res.json(applications);
});

// @desc    Restore a soft-deleted application
// @route   PUT /api/setup/applications/:id/restore
// @access  Private/Institute or Admin
const restoreApplication = asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id);
    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }
    if (req.user.role === 'Institute' && application.institute.toString() !== req.user.institute.toString()) {
        res.status(403);
        throw new Error('Not authorized to restore applications of other institutes');
    }
    application.isDeleted = false;
    await application.save();
    res.json({ message: 'Application restored successfully', application });
});

// @desc    Permanently delete an application
// @route   DELETE /api/setup/applications/:id/permanent
// @access  Private/Institute or Admin
const permanentlyDeleteApplication = asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id);
    if (!application) {
        res.status(404);
        throw new Error('Application not found');
    }
    if (req.user.role === 'Institute' && application.institute.toString() !== req.user.institute.toString()) {
        res.status(403);
        throw new Error('Not authorized to delete applications of other institutes');
    }
    if (application.user) {
        await User.findByIdAndDelete(application.user);
    } else {
        if (application.guestEmail) {
            await User.findOneAndDelete({ email: application.guestEmail });
        }
    }
    await application.deleteOne();
    res.json({ message: 'Application permanently deleted' });
});

// @desc    Import guest applications in bulk
// @route   POST /api/setup/applications/import
// @access  Private/Institute or Admin
const importApplications = asyncHandler(async (req, res) => {
    const { applications } = req.body;
    if (!Array.isArray(applications)) {
        res.status(400);
        throw new Error('Applications must be an array');
    }

    let creatorInstitute = req.user.institute;
    if (req.user.role === 'Admin' && req.body.institute) {
        creatorInstitute = req.body.institute;
    }

    const results = {
        successCount: 0,
        errors: []
    };

    for (const appItem of applications) {
        const { guestName, guestEmail, guestPhone, courseName, status, role, statement } = appItem;
        if (!guestName || !guestPhone || !courseName) {
            results.errors.push({ row: appItem, error: 'guestName, guestPhone, and courseName are required' });
            continue;
        }

        try {
            // Find Course
            const courseObj = await Course.findOne({
                name: { $regex: new RegExp(`^${courseName.trim()}$`, 'i') },
                institute: creatorInstitute
            });
            if (!courseObj) {
                results.errors.push({ row: appItem, error: `Course "${courseName}" not found in this institute` });
                continue;
            }

            await Application.create({
                guestName,
                guestEmail: guestEmail || '',
                guestPhone,
                course: courseObj._id,
                institute: creatorInstitute,
                status: status || 'Applied',
                role: role || 'Student',
                statement: statement || ''
            });

            results.successCount++;
        } catch (error) {
            results.errors.push({ row: appItem, error: error.message });
        }
    }

    res.status(200).json({
        success: true,
        message: `Successfully imported ${results.successCount} guest applications`,
        results
    });
});

// @desc    Public: get which section the next student will be assigned to
// @route   GET /api/setup/courses/:id/section-preview
// @access  Public
const getSectionPreview = asyncHandler(async (req, res) => {
    const courseId = req.params.id;
    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }
    const capacity = course.maxStudentsPerSection || 30;
    const count = await User.countDocuments({ role: 'Student', 'studentProfile.course': courseId });
    const sectionIndex = Math.floor(count / capacity);
    const section = String.fromCharCode(65 + sectionIndex); // 0=A,1=B,2=C...
    res.json({ section, currentCount: count, capacity });
});

// @desc    Get deleted courses
// @route   GET /api/setup/courses/trash
// @access  Private/Admin or Editor
const getDeletedCourses = asyncHandler(async (req, res) => {
    const query = { isDeleted: true };
    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor')) {
        query.institute = req.user.institute;
    }
    const courses = await Course.find(query)
        .populate('institute')
        .populate('createdBy', 'name email role');
    res.json(courses);
});

// @desc    Restore a deleted course
// @route   PUT /api/setup/courses/:id/restore
// @access  Private/Admin or Editor
const restoreCourse = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }
    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor') && course.institute.toString() !== req.user.institute.toString()) {
        res.status(403);
        throw new Error('Not authorized to restore courses of other institutes');
    }
    course.isDeleted = false;
    await course.save();
    res.json({ message: 'Course restored successfully', course });
});

// @desc    Permanently delete a course
// @route   DELETE /api/setup/courses/:id/permanent
// @access  Private/Admin or Editor
const permanentlyDeleteCourse = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }
    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor') && course.institute.toString() !== req.user.institute.toString()) {
        res.status(403);
        throw new Error('Not authorized to delete courses of other institutes');
    }
    await course.deleteOne();
    res.json({ message: 'Course permanently deleted' });
});

// @desc    Get deleted institutes
// @route   GET /api/setup/institutes/trash
// @access  Private/Admin
const getDeletedInstitutes = asyncHandler(async (req, res) => {
    const institutes = await Institute.find({ isDeleted: true });
    res.json(institutes);
});

// @desc    Restore a deleted institute
// @route   PUT /api/setup/institutes/:id/restore
// @access  Private/Admin
const restoreInstitute = asyncHandler(async (req, res) => {
    const institute = await Institute.findById(req.params.id);
    if (!institute) {
        res.status(404);
        throw new Error('Institute not found');
    }
    institute.isDeleted = false;
    await institute.save();
    res.json({ message: 'Institute restored successfully', institute });
});

// @desc    Permanently delete an institute
// @route   DELETE /api/setup/institutes/:id/permanent
// @access  Private/Admin
const permanentlyDeleteInstitute = asyncHandler(async (req, res) => {
    const institute = await Institute.findById(req.params.id);
    if (!institute) {
        res.status(404);
        throw new Error('Institute not found');
    }
    await institute.deleteOne();
    res.json({ message: 'Institute permanently deleted' });
});

// @desc    Get all students in a specific course
// @route   GET /api/setup/courses/:id/students
// @access  Private/Admin
const getCourseStudents = asyncHandler(async (req, res) => {
    const students = await User.find({
        role: 'Student',
        'studentProfile.course': req.params.id,
        isDeleted: { $ne: true }
    }).select('name email studentProfile.subject');
    res.json(students);
});

// @desc    Add a new subject to a course
// @route   POST /api/setup/subjects
// @access  Private/Admin
const createSubject = asyncHandler(async (req, res) => {
    const { courseId, courseIds, subjectName, duration, assignedStudentIds, assignToAll, teacherIds } = req.body;

    const ids = courseIds && Array.isArray(courseIds) ? courseIds : (courseId ? [courseId] : []);
    if (ids.length === 0 || !subjectName) {
        res.status(400);
        throw new Error('Course ID(s) and subject name are required');
    }

    const createdCourses = [];

    for (const cId of ids) {
        const course = await Course.findById(cId);
        if (!course) continue;

        // Check if subject already exists in this course
        const exists = course.subjects.some(s => s.toLowerCase() === subjectName.trim().toLowerCase());
        if (!exists) {
            course.subjects.push(subjectName.trim());
        }

        // Add or update duration allocation
        if (!course.subjectDurations) {
            course.subjectDurations = [];
        }
        const durIndex = course.subjectDurations.findIndex(sd => sd.subjectName.toLowerCase() === subjectName.trim().toLowerCase());
        if (durIndex !== -1) {
            course.subjectDurations[durIndex].duration = Number(duration) || 0;
        } else {
            course.subjectDurations.push({
                subjectName: subjectName.trim(),
                duration: Number(duration) || 0
            });
        }

        await course.save();
        createdCourses.push(course);

        // Assign subject to students of this course
        if (assignToAll !== false) {
            const studentsToUpdate = await User.find({ role: 'Student', 'studentProfile.course': cId });
            for (const student of studentsToUpdate) {
                let studentSubjects = student.studentProfile.subject ? student.studentProfile.subject.split(',').map(s => s.trim()) : [];
                if (!studentSubjects.some(s => s.toLowerCase() === subjectName.trim().toLowerCase())) {
                    studentSubjects.push(subjectName.trim());
                    student.studentProfile.subject = studentSubjects.join(', ');
                    await student.save();
                }
            }
        } else if (assignedStudentIds && Array.isArray(assignedStudentIds)) {
            const studentsToUpdate = await User.find({
                _id: { $in: assignedStudentIds },
                role: 'Student',
                'studentProfile.course': cId
            });
            for (const student of studentsToUpdate) {
                let studentSubjects = student.studentProfile.subject ? student.studentProfile.subject.split(',').map(s => s.trim()) : [];
                if (!studentSubjects.some(s => s.toLowerCase() === subjectName.trim().toLowerCase())) {
                    studentSubjects.push(subjectName.trim());
                    student.studentProfile.subject = studentSubjects.join(', ');
                    await student.save();
                }
            }
        }
    }

    // Assign teachers to the new subject in these courses
    if (teacherIds && Array.isArray(teacherIds)) {
        for (const tId of teacherIds) {
            const teacher = await User.findById(tId);
            if (teacher && teacher.role === 'Teacher') {
                if (!teacher.teacherProfile) {
                    teacher.teacherProfile = { assignedCourses: [], subjects: [] };
                }
                
                // Add all course IDs
                ids.forEach(cId => {
                    if (!teacher.teacherProfile.assignedCourses.some(id => id.toString() === cId.toString())) {
                        teacher.teacherProfile.assignedCourses.push(cId);
                    }
                });

                // Add subject name
                if (!teacher.teacherProfile.subjects.some(sName => sName.toLowerCase() === subjectName.trim().toLowerCase())) {
                    teacher.teacherProfile.subjects.push(subjectName.trim());
                }

                await teacher.save();
            }
        }
    }

    res.status(201).json({
        success: true,
        message: 'Subject added successfully',
        courses: createdCourses
    });
});

// @desc    Update a subject's name and duration allocation in a course
// @route   PUT /api/setup/subjects/update
// @access  Private/Admin
const updateSubjectDetails = asyncHandler(async (req, res) => {
    const { courseId, oldSubjectName, newSubjectName, duration, teacherIds, courseIds } = req.body;

    if (!courseId || !oldSubjectName || !newSubjectName) {
        res.status(400);
        throw new Error('Course ID, old subject name, and new subject name are required');
    }

    // Determine the set of course IDs to operate on
    // If courseIds is provided, we use it; otherwise we default to the single courseId
    const targetCourseIds = courseIds && Array.isArray(courseIds) ? courseIds : [courseId];

    // 1. Find all courses that currently have oldSubjectName
    const query = { status: 'active' };
    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor')) {
        query.institute = req.user.institute;
    }
    const allCourses = await Course.find(query);

    // Track which courses had the subject originally
    const coursesWithSubject = allCourses.filter(c => 
        c.subjects.some(s => s.toLowerCase() === oldSubjectName.toLowerCase())
    );
    const originalCourseIds = coursesWithSubject.map(c => c._id.toString());

    // Update or add subject in target courses
    for (const cId of targetCourseIds) {
        const course = allCourses.find(c => c._id.toString() === cId.toString());
        if (!course) continue;

        // Rename subject in subjects array
        const subIndex = course.subjects.findIndex(s => s.toLowerCase() === oldSubjectName.toLowerCase());
        if (subIndex !== -1) {
            course.subjects[subIndex] = newSubjectName.trim();
        } else {
            // If it doesn't exist, add it
            if (!course.subjects.some(s => s.toLowerCase() === newSubjectName.trim().toLowerCase())) {
                course.subjects.push(newSubjectName.trim());
            }
        }

        // Manage subjectDurations array
        if (!course.subjectDurations) {
            course.subjectDurations = [];
        }
        // Remove old duration entries if exists
        course.subjectDurations = course.subjectDurations.filter(
            sd => sd.subjectName?.toLowerCase() !== oldSubjectName.toLowerCase() &&
                  sd.subjectName?.toLowerCase() !== newSubjectName.trim().toLowerCase()
        );
        // Add new duration entry
        course.subjectDurations.push({
            subjectName: newSubjectName.trim(),
            duration: Number(duration) || 0
        });

        await course.save();

        // Update student subject names if renaming, or add subject to course students if new
        const students = await User.find({ role: 'Student', 'studentProfile.course': cId });
        for (const student of students) {
            if (student.studentProfile?.subject) {
                let studentSubjects = student.studentProfile.subject.split(',').map(s => s.trim());
                let updated = false;
                
                // If it's a rename in an existing course
                studentSubjects = studentSubjects.map(s => {
                    if (s.toLowerCase() === oldSubjectName.toLowerCase()) {
                        updated = true;
                        return newSubjectName.trim();
                    }
                    return s;
                });

                // If it's a new course assignment, add the subject name
                if (!originalCourseIds.includes(cId.toString()) && 
                    !studentSubjects.some(s => s.toLowerCase() === newSubjectName.trim().toLowerCase())) {
                    studentSubjects.push(newSubjectName.trim());
                    updated = true;
                }

                if (updated) {
                    student.studentProfile.subject = studentSubjects.join(', ');
                    await student.save();
                }
            } else if (!originalCourseIds.includes(cId.toString())) {
                // If student has no subject set, initialize it with the new subject
                student.studentProfile = student.studentProfile || {};
                student.studentProfile.subject = newSubjectName.trim();
                await student.save();
            }
        }

        // Update test subjects associated with this course and old subject
        const Test = require('../../models/Test');
        try {
            await Test.updateMany(
                { course: course.name, subject: oldSubjectName },
                { subject: newSubjectName.trim() }
            );
        } catch (err) {
            console.error('Error updating test subjects:', err);
        }
    }

    // Remove subject from courses that are no longer selected
    const coursesToRemove = originalCourseIds.filter(cId => !targetCourseIds.includes(cId));
    for (const cId of coursesToRemove) {
        const course = allCourses.find(c => c._id.toString() === cId);
        if (!course) continue;

        course.subjects = course.subjects.filter(s => s.toLowerCase() !== oldSubjectName.toLowerCase());
        if (course.subjectDurations) {
            course.subjectDurations = course.subjectDurations.filter(sd => sd.subjectName?.toLowerCase() !== oldSubjectName.toLowerCase());
        }
        await course.save();

        // Remove subject name from students in that course
        const students = await User.find({ role: 'Student', 'studentProfile.course': cId });
        for (const student of students) {
            if (student.studentProfile?.subject) {
                let studentSubjects = student.studentProfile.subject.split(',').map(s => s.trim());
                studentSubjects = studentSubjects.filter(s => s.toLowerCase() !== oldSubjectName.toLowerCase());
                student.studentProfile.subject = studentSubjects.join(', ');
                await student.save();
            }
        }
    }

    // 2. Update Teacher Assignments if teacherIds is provided
    if (teacherIds && Array.isArray(teacherIds)) {
        const teacherQuery = { role: 'Teacher' };
        if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor')) {
            teacherQuery.institute = req.user.institute;
        }
        const teachers = await User.find(teacherQuery);

        for (const teacher of teachers) {
            const isAssigned = teacherIds.includes(teacher._id.toString());
            if (!teacher.teacherProfile) {
                teacher.teacherProfile = { assignedCourses: [], subjects: [] };
            }

            let profileChanged = false;

            if (isAssigned) {
                // Add new courses to assignedCourses
                targetCourseIds.forEach(cId => {
                    if (!teacher.teacherProfile.assignedCourses.some(id => id.toString() === cId.toString())) {
                        teacher.teacherProfile.assignedCourses.push(cId);
                        profileChanged = true;
                    }
                });

                // Remove old subject name if renaming
                if (oldSubjectName.toLowerCase() !== newSubjectName.toLowerCase()) {
                    const originalLen = teacher.teacherProfile.subjects.length;
                    teacher.teacherProfile.subjects = teacher.teacherProfile.subjects.filter(
                        s => s.toLowerCase() !== oldSubjectName.toLowerCase()
                    );
                    if (teacher.teacherProfile.subjects.length !== originalLen) {
                        profileChanged = true;
                    }
                }

                // Add new subject name
                if (!teacher.teacherProfile.subjects.some(s => s.toLowerCase() === newSubjectName.trim().toLowerCase())) {
                    teacher.teacherProfile.subjects.push(newSubjectName.trim());
                    profileChanged = true;
                }
            } else {
                // If not assigned to this subject anymore:
                // Check if they taught this subject (old or new name) in any of the original/target courses
                const teachesThisSubject = teacher.teacherProfile.subjects.some(
                    s => s.toLowerCase() === oldSubjectName.toLowerCase() || 
                         s.toLowerCase() === newSubjectName.trim().toLowerCase()
                );

                if (teachesThisSubject) {
                    // Remove subject names
                    teacher.teacherProfile.subjects = teacher.teacherProfile.subjects.filter(
                        s => s.toLowerCase() !== oldSubjectName.toLowerCase() &&
                             s.toLowerCase() !== newSubjectName.trim().toLowerCase()
                    );
                    profileChanged = true;

                    // Clean up assignedCourses: if teacher has no other subjects left for a course, remove that course from their profile
                    const remainingSubjects = teacher.teacherProfile.subjects;
                    const coursesToKeep = [];

                    for (const cId of teacher.teacherProfile.assignedCourses) {
                        const course = allCourses.find(c => c._id.toString() === cId.toString());
                        if (course) {
                            const hasOtherSubject = course.subjects.some(sName => 
                                remainingSubjects.some(remSub => remSub.toLowerCase() === sName.toLowerCase())
                            );
                            if (hasOtherSubject) {
                                coursesToKeep.push(cId);
                            }
                        } else {
                            coursesToKeep.push(cId);
                        }
                    }

                    if (teacher.teacherProfile.assignedCourses.length !== coursesToKeep.length) {
                        teacher.teacherProfile.assignedCourses = coursesToKeep;
                        profileChanged = true;
                    }
                }
            }

            if (profileChanged) {
                await teacher.save();
            }
        }
    }

    res.json({
        success: true,
        message: 'Subject details updated successfully'
    });
});

// @desc    Delete a subject from a course (or all courses)
// @route   DELETE /api/setup/subjects
// @access  Private/Admin
const deleteSubject = asyncHandler(async (req, res) => {
    const { courseId, subjectName } = req.body;

    if (!subjectName) {
        res.status(400);
        throw new Error('Subject name is required');
    }

    const query = {};
    if (courseId) {
        query._id = courseId;
    }
    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor')) {
        query.institute = req.user.institute;
    }

    const courses = await Course.find(query);

    for (const course of courses) {
        const filteredSubjects = (course.subjects || []).filter(s => typeof s === 'string' && s.toLowerCase() !== subjectName.toLowerCase());
        const filteredDurations = (course.subjectDurations || []).filter(sd => sd && sd.subjectName?.toLowerCase() !== subjectName.toLowerCase());
        
        await Course.updateOne(
            { _id: course._id },
            { 
                $set: { 
                    subjects: filteredSubjects,
                    subjectDurations: filteredDurations
                } 
            }
        );

        // Also remove from students in that course
        const students = await User.find({ role: 'Student', 'studentProfile.course': course._id });
        for (const student of students) {
            if (student.studentProfile?.subject) {
                let studentSubjects = student.studentProfile.subject.split(',').map(s => s.trim());
                const filtered = studentSubjects.filter(s => typeof s === 'string' && s.toLowerCase() !== subjectName.toLowerCase());
                if (filtered.length !== studentSubjects.length) {
                    await User.updateOne(
                        { _id: student._id },
                        { $set: { 'studentProfile.subject': filtered.join(', ') } }
                    );
                }
            }
        }
        
        // Also remove from teachers teaching this course
        const teachers = await User.find({ role: 'Teacher', 'teacherProfile.assignedCourses': course._id });
        for (const teacher of teachers) {
            if (teacher.teacherProfile?.subjects) {
                const originalSubjects = teacher.teacherProfile.subjects;
                const filtered = originalSubjects.filter(s => typeof s === 'string' && s.toLowerCase() !== subjectName.toLowerCase());
                if (filtered.length !== originalSubjects.length) {
                    await User.updateOne(
                        { _id: teacher._id },
                        { $set: { 'teacherProfile.subjects': filtered } }
                    );
                }
            }
        }
    }

    res.json({ message: 'Subject deleted successfully' });
});

const importInstitutes = asyncHandler(async (req, res) => {
    const { institutes } = req.body;
    if (!Array.isArray(institutes)) {
        res.status(400);
        throw new Error('Institutes array is required');
    }

    let successCount = 0;
    const errors = [];

    for (const inst of institutes) {
        try {
            const { name, code, address, contactEmail, password, description, helplineNumber, phone, controls } = inst;
            if (!name || !code || !contactEmail) {
                errors.push({ name: name || code || 'Unknown', error: 'Name, code, and contactEmail are required' });
                continue;
            }

            // Check if institute already exists
            const instExists = await Institute.findOne({ code });
            if (instExists) {
                errors.push({ name, error: 'Institute code already exists' });
                continue;
            }

            // Check if user already exists
            const userExists = await User.findOne({ email: contactEmail });
            if (userExists) {
                errors.push({ name, error: `A user account with email ${contactEmail} already exists` });
                continue;
            }

            let parsedControls = undefined;
            if (controls) {
                try {
                    parsedControls = typeof controls === 'string' ? JSON.parse(controls) : controls;
                } catch (e) {
                    console.error("Failed to parse controls during import", e);
                }
            }

            // Create Institute
            const institute = await Institute.create({
                name,
                code,
                address: address || '',
                contactEmail,
                imageUrl: '',
                description: description || '',
                termsAndPolicies: '',
                phone: phone || '',
                helplineNumber: helplineNumber || '',
                controls: parsedControls || undefined
            });

            // Create User
            const userPass = password || Math.random().toString(36).slice(-8);
            await User.create({
                name: `${name} Admin`,
                email: contactEmail,
                password: userPass,
                role: 'Institute',
                institute: institute._id
            });

            // Log Activity
            await Activity.create({
                type: 'INSTITUTE_CREATED',
                message: 'New Institute registered via Bulk Import and admin account created',
                detail: `${institute.name} (${institute.code})`,
                user: req.user._id
            });

            successCount++;
        } catch (err) {
            errors.push({ name: inst.name || 'Unknown', error: err.message });
        }
    }

    res.status(200).json({
        message: 'Import completed',
        results: {
            successCount,
            errors
        }
    });
});

const getActivityTypes = asyncHandler(async (req, res) => {
    const ActivityType = require('../../models/ActivityType');
    const types = await ActivityType.find({});
    res.status(200).json(types);
});

const createActivityType = asyncHandler(async (req, res) => {
    const ActivityType = require('../../models/ActivityType');
    const { name } = req.body;
    if (!name || !name.trim()) {
        res.status(400);
        throw new Error('Activity type name is required');
    }

    const reserved = ['viva', 'exam', 'assignment', 'test', 'quiz'];
    if (reserved.includes(name.trim().toLowerCase())) {
        res.status(400);
        throw new Error('This activity type is reserved and cannot be created as a custom type');
    }
    
    // Check if it already exists
    const exists = await ActivityType.findOne({ name: name.trim() });
    if (exists) {
        res.status(400);
        throw new Error('Activity type already exists');
    }
    
    const newType = await ActivityType.create({
        name: name.trim(),
        createdBy: req.user._id
    });
    
    res.status(201).json(newType);
});

const updateActivityType = asyncHandler(async (req, res) => {
    const ActivityType = require('../../models/ActivityType');
    const { name } = req.body;
    if (!name || !name.trim()) {
        res.status(400);
        throw new Error('Activity type name is required');
    }

    const reserved = ['viva', 'exam', 'assignment', 'test', 'quiz'];
    if (reserved.includes(name.trim().toLowerCase())) {
        res.status(400);
        throw new Error('This activity type is reserved and cannot be used');
    }
    
    const type = await ActivityType.findById(req.params.id);
    if (!type) {
        res.status(404);
        throw new Error('Activity type not found');
    }
    
    // Check ownership
    if (type.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('You are not authorized to edit this activity type');
    }
    
    // Check if name conflict
    const exists = await ActivityType.findOne({ name: name.trim(), _id: { $ne: req.params.id } });
    if (exists) {
        res.status(400);
        throw new Error('Activity type name already exists');
    }
    
    type.name = name.trim();
    await type.save();
    
    res.status(200).json(type);
});

const deleteActivityType = asyncHandler(async (req, res) => {
    const ActivityType = require('../../models/ActivityType');
    const type = await ActivityType.findById(req.params.id);
    if (!type) {
        res.status(404);
        throw new Error('Activity type not found');
    }
    
    // Check ownership
    if (type.createdBy.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('You are not authorized to delete this activity type');
    }
    
    await type.deleteOne();
    res.status(200).json({ message: 'Activity type deleted successfully' });
});

module.exports = {
    getInstitutes,
    createInstitute,
    updateInstitute,
    getInstituteDetails,
    deleteInstitute,
    getCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    uploadInstituteImageController,
    uploadSyllabusController,
    uploadInstituteDocumentController,

    submitApplication,
    getApplications,
    sendOtp,
    verifyOtp,
    getInstituteApplications,
    updateApplicationStatus,
    registerStudent,
    getSubjects,
    deleteApplication,
    toggleInstituteFlag,
    getSectionPreview,
    getDeletedCourses,
    restoreCourse,
    permanentlyDeleteCourse,
    getDeletedInstitutes,
    restoreInstitute,
    permanentlyDeleteInstitute,
    getCourseStudents,
    createSubject,
    updateSubjectDetails,
    importInstitutes,
    getDeletedApplications,
    restoreApplication,
    permanentlyDeleteApplication,
    importApplications,
    toggleCourseFlag,
    deleteSubject,
    
    getActivityTypes,
    createActivityType,
    updateActivityType,
    deleteActivityType
};
