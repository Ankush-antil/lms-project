const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Test = require('../models/Test');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://digitalstudy5555_db_user:t040XELTgLuIXZgq@digitalstudycluster.tkpcaax.mongodb.net/');
    
    const targetId = '6a34e64bf498a0fe54642d3c';
    
    console.log(`Searching for ID: ${targetId}`);
    
    const users = await User.find({ institute: targetId });
    console.log(`Users with institute ${targetId}:`, users.map(u => ({ name: u.name, role: u.role, email: u.email })));
    
    const courses = await Course.find({ institute: targetId });
    console.log(`Courses with institute ${targetId}:`, courses.map(c => ({ name: c.name, code: c.code })));

    // Let's also check if there is another institute that Govind and his course should belong to.
    // Who is Govind's creator, or which institute is active?
    // Let's check all users to see if there is an active institute admin.
    const allUsers = await User.find({});
    console.log("\nAll Users with role Admin/Institute/Editor:");
    allUsers.forEach(u => {
        if (['Admin', 'Institute', 'Editor'].includes(u.role)) {
            console.log(`Name: ${u.name}, Role: ${u.role}, Email: ${u.email}, Inst: ${u.institute}`);
        }
    });

    await mongoose.disconnect();
}
run();
