const mongoose = require('mongoose');
const Test = require('../models/Test');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://digitalstudy5555_db_user:t040XELTgLuIXZgq@digitalstudycluster.tkpcaax.mongodb.net/');
    
    // Find the test "Language" under "Default Institute"
    const test = await Test.findOne({ title: 'Language', institute: 'Default Institute' });
    if (test) {
        console.log("Found test:", test);
        test.institute = 'Digital study';
        await test.save();
        console.log("Updated test institute to 'Digital study'");
    } else {
        console.log("Test not found");
    }
    await mongoose.disconnect();
}
run();
