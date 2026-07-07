const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const User = require('../models/User');
const FeeRecord = require('../models/FeeRecord');

async function main() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('Finding student with name "Mobile no."...');
    const student = await User.findOne({ name: 'Mobile no.' });
    if (student) {
        console.log(`Found student: ${student.name} (_id: ${student._id})`);
        
        // Delete FeeRecord
        const record = await FeeRecord.findOne({ student: student._id });
        if (record) {
            console.log(`Deleting associated FeeRecord: ${record._id}`);
            await record.deleteOne();
        }
        
        // Delete User
        await student.deleteOne();
        console.log('Student deleted successfully!');
    } else {
        console.log('Student not found.');
    }
    
    await mongoose.disconnect();
    process.exit(0);
}

main().catch(console.error);
