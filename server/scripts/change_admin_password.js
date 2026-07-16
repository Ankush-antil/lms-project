const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const connectDB = require('../config/db');

dotenv.config({ path: require('path').join(__dirname, '../.env') });

const run = async () => {
    try {
        await connectDB();
        
        console.log('Finding user admin@lms.com...');
        const user = await User.findOne({ email: 'admin@lms.com' });
        
        if (user) {
            console.log('User found! Changing password to admin@5555...');
            user.password = 'admin@5555';
            await user.save();
            console.log('Successfully updated password for admin@lms.com.');
        } else {
            console.log('User admin@lms.com not found.');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Error changing password:', err);
        process.exit(1);
    }
};

run();
