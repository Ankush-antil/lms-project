const mongoose = require('mongoose');
const Course = require('../models/Course');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://digitalstudy5555_db_user:t040XELTgLuIXZgq@digitalstudycluster.tkpcaax.mongodb.net/');
    const course = await Course.findById('6a41e20b8c0a569f17530d3b');
    console.log("Course Raw Info:");
    console.log(JSON.stringify(course, null, 2));
    await mongoose.disconnect();
}
run();
