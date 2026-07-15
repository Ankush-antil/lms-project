const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const connectDB = require('../config/db');

dotenv.config({ path: require('path').join(__dirname, '../.env') });

const fixAdmin = async () => {
    try {
        await connectDB();
        
        console.log('Checking for user admin@lms.com...');
        let user = await User.findOne({ email: 'admin@lms.com' });
        
        if (user) {
            console.log('User found! Restoring role to Admin and updating allowedRoles...');
            user.role = 'Admin';
            user.allowedRoles = ['Admin', 'Student', 'Teacher', 'Institute', 'Accountant', 'Marketer', 'Staff', 'Parent'];
            await user.save();
            console.log('Successfully restored existing admin@lms.com user.');
        } else {
            console.log('User not found. Creating a NEW Admin account...');
            user = new User({
                name: 'Admin User',
                email: 'admin@lms.com',
                password: 'password', // Will be hashed by pre-save hook
                role: 'Admin',
                allowedRoles: ['Admin', 'Student', 'Teacher', 'Institute', 'Accountant', 'Marketer', 'Staff', 'Parent']
            });
            await user.save();
            console.log('Successfully created new Admin user:');
            console.log('- Email: admin@lms.com');
            console.log('- Password: password');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Error running fixAdmin:', err);
        process.exit(1);
    }
};

fixAdmin();
