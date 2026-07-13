const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Institute = require('../models/Institute');
const User = require('../models/User');
const connectDB = require('../config/db');

dotenv.config({ path: require('path').join(__dirname, '../.env') });

const checkInstitutes = async () => {
    try {
        await connectDB();
        console.log('Fetching all institutes...');
        const insts = await Institute.find({});
        insts.forEach(i => {
            console.log(`Institute: "${i.name}" (ID: ${i._id})`);
        });

        console.log('\nFetching users and their institute assignments...');
        const users = await User.find({ role: { $in: ['Teacher', 'Institute'] } }).populate('institute', 'name');
        users.forEach(u => {
            console.log(`User: ${u.name} (${u.email}) | Role: ${u.role} | Institute: ${u.institute?.name} (${u.institute?._id})`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkInstitutes();
