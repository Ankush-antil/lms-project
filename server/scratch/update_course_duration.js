const mongoose = require('mongoose');
const Course = require('../models/Course');
const Institute = require('../models/Institute');
const dotenv = require('dotenv');

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lms-project');
        console.log('Connected to DB');

        const course = await Course.findOne({});
        if (course) {
            course.duration = 6;
            await course.save();
            console.log(`Updated course ${course.name} duration to 6 days.`);
        } else {
            console.log('No course found to update.');
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
};

run();
