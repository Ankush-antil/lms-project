const mongoose = require('mongoose');
const Course = require('../models/Course');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://digitalstudy5555_db_user:t040XELTgLuIXZgq@digitalstudycluster.tkpcaax.mongodb.net/');
    const courses = await Course.find({ syllabusUrl: { $exists: true, $ne: '' } });
    console.log("Syllabus URLs:");
    courses.forEach(c => {
        console.log(`Course: ${c.name}, SyllabusUrl: ${c.syllabusUrl}`);
    });
    await mongoose.disconnect();
}
run();
