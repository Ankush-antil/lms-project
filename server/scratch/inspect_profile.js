const mongoose = require('mongoose');
require('../models/Institute');
require('../models/Course');
const User = require('../models/User');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://digitalstudy5555_db_user:t040XELTgLuIXZgq@digitalstudycluster.tkpcaax.mongodb.net/');
    const user = await User.findOne({ email: 'govind@lms.com' })
        .select('-password')
        .populate('institute', 'name imageUrl')
        .populate('studentProfile.course', 'name subjects')
        .populate('teacherProfile.assignedCourses', 'name');
        
    console.log("Populated User Info:");
    console.log(JSON.stringify(user, null, 2));
    await mongoose.disconnect();
}
run();
