const mongoose = require('mongoose');
const User = require('../server/models/User');

async function test() {
    try {
        await mongoose.connect('mongodb://localhost:27017/lms-project');
        console.log('Connected to MongoDB');
        const users = await User.find({}, 'name email role');
        console.log('Users in Database:', JSON.stringify(users, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

test();
