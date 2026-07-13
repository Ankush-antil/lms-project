const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const RoleRequest = require('../models/RoleRequest');
const connectDB = require('../config/db');

dotenv.config({ path: require('path').join(__dirname, '../.env') });

const fixTeacherInstitute = async () => {
    try {
        await connectDB();
        
        // Digital Study Academy ID
        const targetInstituteId = '6a4da1519f893f7bfe142120';
        
        console.log('Updating teacher shaikhar@lms.com to belong to Digital Study Academy...');
        const teacher = await User.findOneAndUpdate(
            { email: 'shaikhar@lms.com' },
            { institute: targetInstituteId },
            { new: true }
        );
        if (teacher) {
            console.log(`Teacher shaikhar@lms.com updated successfully. New Institute: ${teacher.institute}`);
        } else {
            console.log('Teacher shaikhar@lms.com not found.');
        }

        console.log('Updating pending role request for shaikhar@lms.com to point to Digital Study Academy...');
        const request = await RoleRequest.findOneAndUpdate(
            { user: teacher?._id, status: 'Pending' },
            { institute: targetInstituteId },
            { new: true }
        );
        if (request) {
            console.log(`RoleRequest updated successfully. New Institute: ${request.institute}`);
        } else {
            console.log('Pending RoleRequest for shaikhar@lms.com not found.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

fixTeacherInstitute();
