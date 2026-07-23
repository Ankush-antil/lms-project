const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

async function fixDemoEnrollmentDate() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    const db = mongoose.connection.db;

    // Set demo.student enrollment date to 1 year ago so all inboxes unlock
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const result = await db.collection('users').updateOne(
        { email: 'demo.student@digitalstudyacademy.com' },
        { $set: { 'studentProfile.enrollmentDate': oneYearAgo, createdAt: oneYearAgo } }
    );

    console.log('Updated demo student:', result.modifiedCount, 'doc(s)');

    // Verify
    const user = await db.collection('users').findOne(
        { email: 'demo.student@digitalstudyacademy.com' },
        { projection: { 'studentProfile.enrollmentDate': 1, createdAt: 1 } }
    );
    console.log('Enrollment date now:', user?.studentProfile?.enrollmentDate || user?.createdAt);

    await mongoose.disconnect();
    console.log('Done!');
}

fixDemoEnrollmentDate().catch(console.error);
