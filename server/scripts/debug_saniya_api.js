const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

async function debugSaniyaAPI() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    // Get Saniya with populated institute and course
    const User = require('./server/models/User');

    const user = await User.findOne({ name: { $regex: 'saniya', $options: 'i' } })
        .populate('institute')
        .populate({ path: 'studentProfile.course', populate: { path: 'institute' } })
        .populate({ path: 'studentProfile.coursesList.course' });

    const studentInstitute = user?.institute?.name?.trim() || user?.studentProfile?.course?.institute?.name?.trim();
    
    console.log('User institute field:', user?.institute);
    console.log('Course institute:', user?.studentProfile?.course?.institute?.name);
    console.log('Resolved studentInstitute:', studentInstitute);
    console.log('CoursesList length:', user?.studentProfile?.coursesList?.length);

    if (studentInstitute) {
        // Simulate the query
        const Test = require('./server/models/Test');
        const count = await Test.countDocuments({ 
            institute: { $regex: new RegExp(`^\\s*${studentInstitute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') },
            isAssigned: true,
            isDeleted: { $ne: true }
        });
        console.log('Tests found for institute:', count);
    }

    await mongoose.disconnect();
}

debugSaniyaAPI().catch(console.error);
