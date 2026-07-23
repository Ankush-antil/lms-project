const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

async function fixAllStudentsEnrollment() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    const db = mongoose.connection.db;

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Fix ALL students' enrollment dates to 1 year ago
    const result = await db.collection('users').updateMany(
        { 
            role: 'Student',
            $or: [
                { 'studentProfile.enrollmentDate': { $gt: oneYearAgo } },
                { 'studentProfile.enrollmentDate': { $exists: false } }
            ]
        },
        { $set: { 'studentProfile.enrollmentDate': oneYearAgo } }
    );

    console.log('Updated students:', result.modifiedCount, 'doc(s)');

    // Verify Saniya specifically
    const saniya = await db.collection('users').findOne(
        { name: { $regex: 'saniya', $options: 'i' } },
        { projection: { name: 1, email: 1, 'studentProfile.enrollmentDate': 1 } }
    );
    console.log('Saniya enrollment date:', saniya?.studentProfile?.enrollmentDate);

    await mongoose.disconnect();
    console.log('Done! All student inboxes should now be unlocked.');
}

fixAllStudentsEnrollment().catch(console.error);
