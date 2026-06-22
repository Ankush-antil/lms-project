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
                courseCount: { $size: '$courses' },
                courses: { $slice: ['$courses', 5] } // Just some preview courses
            }
        }
    ]);
    res.json(institutes);
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

    const courses = await Course.find({ institute: req.params.id, status: 'active' });
    res.json({ ...institute._doc, courses });
});

// @desc    Update institute
// @route   PUT /api/setup/institutes/:id
// @access  Private/Admin
const updateInstitute = asyncHandler(async (req, res) => {
    const { name, code, address, contactEmail, password } = req.body;
    const institute = await Institute.findById(req.params.id);

    if (institute) {
        institute.name = name || institute.name;
        institute.code = code || institute.code;
        institute.address = address || institute.address;
        institute.contactEmail = contactEmail || institute.contactEmail;

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

    const institute = await Institute.create({
        name,
        code,
        address,
        contactEmail
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
    const query = instituteId ? { institute: instituteId } : {};

    if (status !== 'all') {
        query.status = status || 'active';
    }

    // Isolate courses for Institute role
    if (req.user && req.user.role === 'Institute') {
        query.institute = req.user.institute;
    }

    // Populate institute and createdBy details
    const courses = await Course.find(query)
        .populate('institute', 'name code')
        .populate('createdBy', 'name email role');
    res.json(courses);
});

// @desc    Create new course
// @route   POST /api/courses
// @access  Private/Admin
const createCourse = asyncHandler(async (req, res) => {
    const { name, code, description, instituteId, subjects } = req.body;

    const courseExists = await Course.findOne({ code });
    if (courseExists) {
        res.status(400);
        throw new Error('Course code already exists');
    }

    // subjects can be comma separated string or array
    const subjectsArray = Array.isArray(subjects) ? subjects : subjects.split(',').map(s => s.trim());

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

    const course = await Course.create({
        name,
        code,
        description,
        institute: finalInstituteId,
        subjects: subjectsArray,
        status,
        createdBy
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

// @desc    Delete institute
// @route   DELETE /api/setup/institutes/:id
// @access  Private/Admin
const deleteInstitute = asyncHandler(async (req, res) => {
    const institute = await Institute.findById(req.params.id);

    if (institute) {
        await institute.deleteOne();

        await Activity.create({
            type: 'INSTITUTE_DELETED',
            message: 'Institute removed',
            detail: `${institute.name} (${institute.code})`,
            user: req.user._id
        });

        res.json({ message: 'Institute removed' });
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
        await course.deleteOne();

        await Activity.create({
            type: 'COURSE_DELETED',
            message: 'Course removed',
            detail: `${course.name} (${course.code})`,
            user: req.user._id
        });

        res.json({ message: 'Course removed' });
    } else {
        res.status(404);
        throw new Error('Course not found');
    }
});



// @desc    Submit a course application
// @route   POST /api/setup/apply
// @access  Public
const submitApplication = asyncHandler(async (req, res) => {
    const { guestName, guestPhone, guestEmail, courseId, instituteId, statement } = req.body;

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
        statement
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

    // Generate random 4-digit OTP code
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

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

    if (!otpDoc || otpDoc.otp !== otp) {
        res.status(400);
        throw new Error('Invalid or expired OTP code');
    }

    // Successful verification: delete the OTP document so it can't be reused
    await otpDoc.deleteOne();

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

    // Create the Student User
    const user = await User.create({
        name: application.guestName,
        email: email,
        password: password, // Hashed on save
        role: 'Student',
        institute: application.institute,
        mobileNumber: application.guestPhone,
        studentProfile: {
            course: application.course,
            enrollmentDate: new Date()
        }
    });

    // Mark application as Registered
    application.status = 'Registered';
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
    const courses = await Course.find({ status: 'active' }).populate('institute', 'name');
    const teachers = await User.find({ role: 'Teacher' });
    const tests = await Test.find({});

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

module.exports = {
    getInstitutes,
    createInstitute,
    updateInstitute,
    getInstituteDetails,
    deleteInstitute,
    getCourses,
    createCourse,
    deleteCourse,

    submitApplication,
    getApplications,
    sendOtp,
    verifyOtp,
    getInstituteApplications,
    updateApplicationStatus,
    registerStudent,
    getSubjects
};
