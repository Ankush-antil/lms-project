const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const Test = require('../models/Test');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lms');
        console.log('DB connected');
        const list = await Submission.find({}).populate('test').limit(10);
        console.log('Submissions in DB:');
        list.forEach(s => {
            console.log(`Submission ID: ${s._id}, Student: ${s.studentName}, Test title: ${s.test?.title}, Status: ${s.status}`);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
