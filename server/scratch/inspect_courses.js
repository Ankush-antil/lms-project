const mongoose = require('mongoose');
const Course = require('../models/Course');
const Institute = require('../models/Institute');
const dotenv = require('dotenv');

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lms-project');
        console.log('Connected to DB');

        const courses = await Course.find({}).populate('institute', 'name');
        console.log(`Found ${courses.length} courses:`);
        courses.forEach(c => {
            console.log(`- Name: ${c.name}, Code: ${c.code}, Duration: ${c.duration || 0} days, Institute: ${c.institute?.name || 'N/A'}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

run();
