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
    // Get all institutes and their course counts
    const institutes = await Institute.aggregate([
        {
            $match: { isDeleted: { $ne: true } }
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
    const { flag } = req.body; // 'admissionOpen' | 'teacherHiring' | 'editorHiring'
    const allowed = ['admissionOpen', 'teacherHiring', 'editorHiring'];
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
        const linkedUser = await User.findOne({ institute: institute._id, role: 'Institute' });
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
    const { instituteId, status } = req.query;
    const query = { isDeleted: { $ne: true } };
    if (instituteId) query.institute = instituteId;

    if (status !== 'all') {
        query.status = status || 'active';
    }

    // Isolate courses for Institute and Editor roles
    if (req.user && (req.user.role === 'Institute' || req.user.role === 'Editor')) {
        query.institute = req.user.institute;
    }

    // Populate institute and createdBy details
    const courses = await Course.find(query)
        .populate('institute')
        .populate('createdBy', 'name email role');
    res.json(courses);
});

// @desc    Create new course
// @route   POST /api/courses
// @access  Private/Admin
const createCourse = asyncHandler(async (req, res) => {
    const { name, code, description, instituteId, subjects, syllabusUrl, syllabusType, maxStudentsPerSection, duration } = req.body;

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
        duration: duration ? parseInt(duration) : 0
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
    const capacity = course.maxStudentsPerSection || 30;
    // Count existing students in this course
    const count = await User.countDocuments({ role: 'Student', 'studentProfile.course': courseId });
    const sectionIndex = Math.floor(count / capacity);
    // Convert index to letter: 0=A, 1=B, 2=C...
    const sectionLetter = String.fromCharCode(65 + sectionIndex); // 65 = 'A'
    return sectionLetter;
};

// @desc    Update course
// @route   PUT /api/setup/courses/:id
// @access  Private/Admin or Editor or Institute
const updateCourse = asyncHandler(async (req, res) => {
    const { name, code, description, instituteId, subjects, syllabusUrl, syllabusType, maxStudentsPerSection, duration } = req.body;
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
        if (duration !== undefined) course.duration = parseInt(duration) || 0;

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
        throw new Error('Please provide a phone number');
    }

    const applications = await Application.find({ guestPhone: phone })
        .populate('course', 'name code description')
        .populate('institute', 'name code address contactEmail');

    res.json(applications);
});

// @desc    Generate and send simulated OTP (logs to console & saves in DB)
// @route   POST /api/setup/send-otp
// @access  Public
const sendOtp = asyncHandler(async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        res.status(400);
        throw new Error('Please provide a phone number');
    }

    // Generate random 4-digit OTP code (fixed to 1234 by default as requested)
    const otpCode = '1234';

    // Check if Twilio config is available
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    let fromPhone = process.env.TWILIO_PHONE_NUMBER;
    let isSentViaTwilio = false;

    if (accountSid && authToken && fromPhone) {
        try {
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
            // Fallback console log in case credentials fail or credit finishes
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

    // Save to DB (or update if an OTP exists for this phone)
    await Otp.findOneAndUpdate(
        { phone },
        { otp: otpCode, createdAt: new Date() },
        { upsert: true, new: true }
    );

    res.json({
        message: isSentViaTwilio
            ? 'OTP sent successfully to your mobile number.'
            : 'OTP sent successfully. Please check the server console logs.'
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

    // Allow '1234' as default/fixed OTP bypass, otherwise check DB
    if (otp !== '1234' && (!otpDoc || otpDoc.otp !== otp)) {
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
    let query = {};
    if (req.user.role === 'Institute') {
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

            subjectsList.push({
                name: subName,
                course: {
                    _id: course._id,
                    name: course.name
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

// @desc    Delete application and associated user account if registered
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

    // Also delete the registered User if they exist!
    if (application.user) {
        await User.findByIdAndDelete(application.user);
    } else {
        // Fallback: search for user by email just in case
        if (application.guestEmail) {
            await User.findOneAndDelete({ email: application.guestEmail });
        }
    }

    await application.deleteOne();
    res.json({ message: 'Application and associated account removed successfully' });
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
    permanentlyDeleteInstitute
};
