const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const User = require('../models/User');
const Course = require('../models/Course');
const Institute = require('../models/Institute');

async function main() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');
    
    console.log('Finding Hartron Ganaur institute...');
    const inst = await Institute.findOne({ name: /hartron/i });
    if (!inst) {
        console.error('❌ "Hartron Ganaur" institute not found in DB!');
        process.exit(1);
    }
    
    console.log(`Found institute: "${inst.name}" (ID: ${inst._id})`);
    
    // Update all Students
    const studentUpdateResult = await User.updateMany(
        { role: 'Student' },
        { $set: { institute: inst._id } }
    );
    console.log(`✅ Associated ${studentUpdateResult.modifiedCount} student users with "${inst.name}"`);

    // Update all Courses
    const courseUpdateResult = await Course.updateMany(
        {},
        { $set: { institute: inst._id } }
    );
    console.log(`✅ Associated ${courseUpdateResult.modifiedCount} courses with "${inst.name}"`);

    await mongoose.disconnect();
    process.exit(0);
}

main().catch(console.error);
