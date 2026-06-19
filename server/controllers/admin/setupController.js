const asyncHandler = require('express-async-handler');
const Institute = require('../../models/Institute');
const Course = require('../../models/Course');
const Activity = require('../../models/Activity');

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
    const { name, code, address, contactEmail } = req.body;
    const institute = await Institute.findById(req.params.id);

    if (institute) {
        institute.name = name || institute.name;
        institute.code = code || institute.code;
        institute.address = address || institute.address;
        institute.contactEmail = contactEmail || institute.contactEmail;

        const updatedInstitute = await institute.save();

        await Activity.create({
            type: 'INSTITUTE_UPDATED',
            message: 'Institute details updated',
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

    const instituteExists = await Institute.findOne({ code });
    if (instituteExists) {
        res.status(400);
        throw new Error('Institute code already exists');
    }

    const institute = await Institute.create({
        name,
        code,
        address,
        contactEmail
    });

    // Log Activity
    await Activity.create({
        type: 'INSTITUTE_CREATED',
        message: 'New Institute registered',
        detail: `${institute.name} (${institute.code})`,
        user: req.user._id
    });

    res.status(201).json(institute);
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
    const status = req.user && req.user.role === 'Editor' ? 'pending' : 'active';
    const createdBy = req.user ? req.user._id : null;

    // Enforce Editor's own institute if creator is Editor
    const finalInstituteId = (req.user && req.user.role === 'Editor') 
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
        type: status === 'pending' ? 'COURSE_SUBMITTED' : 'COURSE_CREATED',
        message: status === 'pending' ? 'Course submitted for approval' : 'New Course added',
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

// @desc    Approve a course
// @route   PUT /api/setup/courses/:id/approve
// @access  Private/Admin
const approveCourse = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);

    if (course) {
        course.status = 'active';
        await course.save();

        await Activity.create({
            type: 'COURSE_APPROVED',
            message: 'Course approved',
            detail: `${course.name} (${course.code})`,
            user: req.user._id
        });

        res.json({ message: 'Course approved successfully', course });
    } else {
        res.status(404);
        throw new Error('Course not found');
    }
});

// @desc    Decline a course (deletes the course)
// @route   PUT /api/setup/courses/:id/decline
// @access  Private/Admin
const declineCourse = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);

    if (course) {
        await course.deleteOne();

        await Activity.create({
            type: 'COURSE_DECLINED',
            message: 'Course declined and removed',
            detail: `${course.name} (${course.code})`,
            user: req.user._id
        });

        res.json({ message: 'Course declined and removed' });
    } else {
        res.status(404);
        throw new Error('Course not found');
    }
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
    approveCourse,
    declineCourse
};
