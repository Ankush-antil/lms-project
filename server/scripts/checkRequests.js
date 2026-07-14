const mongoose = require('mongoose');
const dotenv = require('dotenv');
const RoleRequest = require('../models/RoleRequest');
const User = require('../models/User');
const Institute = require('../models/Institute'); // Register the schema!
const connectDB = require('../config/db');

dotenv.config({ path: require('path').join(__dirname, '../.env') });

const checkRequests = async () => {
    try {
        await connectDB();
        console.log('Fetching role requests...');
        const requests = await RoleRequest.find({})
            .populate('user', 'name email role institute')
            .populate('institute', 'name');
        
        console.log(`Total requests found: ${requests.length}`);
        requests.forEach((req, idx) => {
            console.log(`\n--- Request ${idx + 1} ---`);
            console.log(`ID: ${req._id}`);
            console.log(`Requester: ${req.user?.name} (${req.user?.email})`);
            console.log(`Requester Current Role: ${req.user?.role}`);
            console.log(`Requester User.institute ID: ${req.user?.institute}`);
            console.log(`Requested Role: ${req.requestedRole}`);
            console.log(`Request.institute (populated): ${req.institute?.name} (${req.institute?._id})`);
            console.log(`Target Approver: ${req.targetApprover}`);
            console.log(`Status: ${req.status}`);
            console.log(`Created At: ${req.createdAt}`);
        });

        // Let's also print the logged in Institute users to see their institute IDs
        console.log('\n--- Institute Users ---');
        const instUsers = await User.find({ role: 'Institute' }).populate('institute', 'name');
        instUsers.forEach(u => {
            console.log(`Name: ${u.name}, Email: ${u.email}, user.institute: ${u.institute?.name} (${u.institute?._id})`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkRequests();
