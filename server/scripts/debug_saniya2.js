const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });
const User = require('../models/User');
const Test = require('../models/Test');

async function debugSaniyaAPI() {
    await mongoose.connect(process.env.MONGO_URI);

    const user = await User.findOne({ name: { $regex: 'saniya', $options: 'i' } })
        .populate('institute')
        .populate({ path: 'studentProfile.course', populate: { path: 'institute' } })
        .populate({ path: 'studentProfile.coursesList.course' });

    const studentInstitute = user?.institute?.name?.trim() || user?.studentProfile?.course?.institute?.name?.trim();
    
    console.log('user.institute:', user?.institute?.name);
    console.log('course.institute:', user?.studentProfile?.course?.institute?.name);
    console.log('Resolved studentInstitute:', studentInstitute);

    if (studentInstitute) {
        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const count = await Test.countDocuments({ 
            institute: { $regex: new RegExp(`^\\s*${escapeRegex(studentInstitute)}\\s*$`, 'i') },
            isAssigned: true,
            isDeleted: { $ne: true }
        });
        console.log('Tests matching institute (isAssigned=true):', count);
        
        const countAll = await Test.countDocuments({ 
            institute: { $regex: new RegExp(`^\\s*${escapeRegex(studentInstitute)}\\s*$`, 'i') },
            isDeleted: { $ne: true }
        });
        console.log('Tests matching institute (all):', countAll);
    }

    await mongoose.disconnect();
}

debugSaniyaAPI().catch(console.error);
