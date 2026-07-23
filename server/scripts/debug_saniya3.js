const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

async function debugSaniya() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    // Get Saniya raw
    const saniya = await db.collection('users').findOne(
        { name: { $regex: 'saniya', $options: 'i' } },
        { projection: { name: 1, institute: 1, 'studentProfile.course': 1, 'studentProfile.coursesList': 1 } }
    );
    
    console.log('Saniya institute field (raw):', saniya?.institute);
    console.log('Saniya course ID:', saniya?.studentProfile?.course);

    // Get course institute
    if (saniya?.studentProfile?.course) {
        const course = await db.collection('courses').findOne(
            { _id: saniya.studentProfile.course },
            { projection: { name: 1, institute: 1 } }
        );
        console.log('Course:', JSON.stringify(course, null, 2));
        
        if (course?.institute) {
            const inst = await db.collection('institutes').findOne(
                { _id: course.institute },
                { projection: { name: 1 } }
            );
            console.log('Institute name:', inst?.name);
            
            // Count tests for this institute
            const testCount = await db.collection('tests').countDocuments({
                institute: { $regex: new RegExp('^\\s*' + (inst?.name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i') },
                isAssigned: true,
                isDeleted: { $ne: true }
            });
            console.log('Assigned tests for institute:', testCount);
        }
    }

    await mongoose.disconnect();
}

debugSaniya().catch(console.error);
