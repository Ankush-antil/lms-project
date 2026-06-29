const mongoose = require('mongoose');
const Course = require('../models/Course');
const Institute = require('../models/Institute');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://digitalstudy5555_db_user:t040XELTgLuIXZgq@digitalstudycluster.tkpcaax.mongodb.net/');
    const courses = await Course.find({}).populate('institute');
    console.log("Courses in DB:");
    courses.forEach(c => {
        console.log(`Course ID: ${c._id}, Name: ${c.name}, Subjects:`, c.subjects, `, Institute: ${c.institute?.name}`);
    });
    await mongoose.disconnect();
}
run();
