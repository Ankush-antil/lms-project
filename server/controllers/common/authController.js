const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const getCookieOptions = (req) => {
    const isProd = req.headers.host && req.headers.host.includes('digitalstudyacademy.com');
    const options = {
        httpOnly: true,
        secure: isProd || process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    };
    if (isProd) {
        options.domain = '.digitalstudyacademy.com';
    }
    return options;
};

const getLogoutCookieOptions = (req) => {
    const isProd = req.headers.host && req.headers.host.includes('digitalstudyacademy.com');
    const options = {
        httpOnly: true,
        secure: isProd || process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: new Date(0)
    };
    if (isProd) {
        options.domain = '.digitalstudyacademy.com';
    }
    return options;
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Log for debugging
        console.log(`Login attempt for: ${email}`);

                const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } })
            .populate([
                { path: 'institute', select: 'name imageUrl controls' },
                { path: 'studentProfile.course', select: 'name subjects duration subjectDurations' },
                { path: 'studentProfile.coursesList.course', select: 'name subjects duration subjectDurations' },
                { path: 'teacherProfile.assignedCourses', select: 'name subjects subjectDurations' },
                { path: 'editorProfile.assignedCourses', select: 'name subjects subjectDurations' },
                { path: 'guestProfile.demoCourse', select: 'name' }
            ]);

        if (user && (await user.matchPassword(password))) {
            if (user.isActive === false) {
                res.status(403).json({ message: 'disabled by admin' });
                return;
            }

            // Portal shutdown check: skip for Admin role
            if (user.role !== 'Admin') {
                if (user.institute) {
                    const Institute = require('../../models/Institute');
                    const institute = await Institute.findById(user.institute)
                        .select('portalShutdown portalShutdownMessage shutdownRoles');
                    if (institute) {
                        // Full institute shutdown
                        if (institute.portalShutdown) {
                            const msg = institute.portalShutdownMessage || 'Portal is temporarily shut down. Please contact your administrator.';
                            return res.status(503).json({ message: 'portal_shutdown', details: msg });
                        }
                        // Role-level shutdown
                        if (institute.shutdownRoles && institute.shutdownRoles.includes(user.role)) {
                            const msg = institute.portalShutdownMessage || `Access for ${user.role}s has been temporarily disabled. Please contact your administrator.`;
                            return res.status(503).json({ message: 'portal_shutdown', details: msg });
                        }
                    }
                }
            }

            const token = generateToken(user._id, user.role);

            // Set Cookie
            res.cookie('token', token, getCookieOptions(req));

            const userObj = user.toObject();
            if (userObj.role === 'Teacher') {
                const teacherSubjects = userObj.teacherProfile?.subjects || [];
                if (userObj.teacherProfile && userObj.teacherProfile.assignedCourses) {
                    userObj.teacherProfile.assignedCourses = userObj.teacherProfile.assignedCourses.map(course => {
                        if (course) {
                            course.subjects = (course.subjects || []).filter(subject => teacherSubjects.includes(subject));
                            course.subjectDurations = (course.subjectDurations || []).filter(sd => teacherSubjects.includes(sd.subjectName));
                        }
                        return course;
                    });
                }
            }

            res.json({
                _id: userObj._id,
                name: userObj.name,
                email: userObj.email,
                role: userObj.role,
                allowedRoles: userObj.allowedRoles || [userObj.role],
                institute: userObj.institute,
                mobileNumber: userObj.mobileNumber,
                avatar: userObj.avatar,
                studentProfile: userObj.studentProfile,
                teacherProfile: userObj.teacherProfile,
                editorProfile: userObj.editorProfile,
                guestProfile: userObj.guestProfile,
                token: token
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('CRITICAL LOGIN ERROR:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate([
                { path: 'institute', select: 'name imageUrl controls' },
                { path: 'studentProfile.course', select: 'name subjects duration subjectDurations' },
                { path: 'studentProfile.coursesList.course', select: 'name subjects duration subjectDurations' },
                { path: 'teacherProfile.assignedCourses', select: 'name subjects subjectDurations' },
                { path: 'teacherProfile.assignedStudents', select: 'name email studentProfile' },
                { path: 'editorProfile.assignedCourses', select: 'name subjects subjectDurations' },
                { path: 'guestProfile.demoCourse', select: 'name' }
            ]);
        if (user) {
            const userObj = user.toObject();
            if (req.user && req.user.role) {
                userObj.role = req.user.role;
            }
            if (userObj.role === 'Teacher') {
                const teacherSubjects = userObj.teacherProfile?.subjects || [];
                if (userObj.teacherProfile && userObj.teacherProfile.assignedCourses) {
                    userObj.teacherProfile.assignedCourses = userObj.teacherProfile.assignedCourses.map(course => {
                        if (course) {
                            course.subjects = (course.subjects || []).filter(subject => teacherSubjects.includes(subject));
                            course.subjectDurations = (course.subjectDurations || []).filter(sd => teacherSubjects.includes(sd.subjectName));
                        }
                        return course;
                    });
                }
            }
            res.json(userObj);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = async (req, res) => {
    res.cookie('token', '', getLogoutCookieOptions(req));
    res.json({ message: 'Logged out successfully' });
};

// @desc    Register a new user (Admin specific for this use case, or public)
// @route   POST /api/auth/register
// @access  Public (for initial setup) / Admin
const registerUser = async (req, res) => {
    const { name, email, password, role, course, subjects } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const userFields = {
        name,
        email,
        password,
        role
    };

    if (role === 'Student') {
        userFields.studentProfile = {
            course: course,
            enrollmentDate: new Date()
        };
    } else if (role === 'Teacher') {
        userFields.teacherProfile = {
            assignedCourses: course ? [course] : [], // Simplified for now
            subjects: subjects ? subjects.split(',').map(s => s.trim()) : []
        };
    }

    const user = await User.create(userFields);

    if (user) {
        const token = generateToken(user._id, user.role);

        // Set Cookie
        res.cookie('token', token, getCookieOptions(req));

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: token
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Validate switchable saved accounts against database (detect deleted/disabled users)
// @route   POST /api/auth/validate-accounts
// @access  Public
const validateAccounts = async (req, res) => {
    try {
        const { emails } = req.body;
        if (!emails || !Array.isArray(emails)) {
            return res.status(400).json({ message: 'Invalid emails list' });
        }
        
        const validEmails = emails
            .filter(e => e && typeof e === 'string' && e.trim().length > 0)
            .map(e => e.trim());

        if (validEmails.length === 0) {
            return res.json({ activeEmails: [] });
        }

        // Find existing, active users safely
        const activeUsers = await User.find({
            email: { $in: validEmails.map(e => new RegExp(`^${e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) },
            isDeleted: { $ne: true }
        }).select('email');
        
        const activeEmails = activeUsers.map(u => u.email.toLowerCase());
        res.json({ activeEmails });
    } catch (error) {
        console.error('Error validating accounts:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Set cookie for a token (used during account switching across subdomains)
// @route   POST /api/auth/set-token-cookie
// @access  Public
const setTokenCookie = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }

        res.cookie('token', token, getCookieOptions(req));
        res.json({ success: true, message: 'Cookie updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { loginUser, registerUser, getMe, logoutUser, setTokenCookie, validateAccounts, generateToken, getCookieOptions };


