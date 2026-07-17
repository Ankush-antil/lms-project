const mongoose = require('mongoose');
const path = require('path');
const Test = require('../models/Test');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        // Check the specific test ID from the error
        const testId = '6a59e188df255cd80e288ab1';
        const test = await Test.findById(testId);
        if (test) {
            console.log('TEST FOUND:');
            console.log('ID:', test._id);
            console.log('Title:', test.title);
            console.log('Institute:', test.institute);
            console.log('Course:', test.course);
            console.log('Subject:', test.subject);
            console.log('Index:', test.index);
            console.log('isDeleted:', test.isDeleted);
            console.log('publishMode:', test.publishMode);
        } else {
            console.log('TEST NOT FOUND with ID:', testId);
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await mongoose.disconnect();
    }
}
run();
