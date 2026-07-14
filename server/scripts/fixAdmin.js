const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const connectDB = require('../config/db');

dotenv.config({ path: require('path').join(__dirname, '../.env') });

const fixAdmin = async () => {
    try {
        await connectDB();
        console.log('Finding user admin@lms.com...');
        const user = await User.findOne({ email: 'admin@lms.com' });
        if (user) {
            user.role = 'Admin';
            user.allowedRoles = ['Admin', 'Student'];
            await user.save();
            console.log('Successfully reset admin@lms.com back to Admin role and allowedRoles = [Admin, Student]');
        } else {
            console.log('User admin@lms.com not found');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

fixAdmin();
