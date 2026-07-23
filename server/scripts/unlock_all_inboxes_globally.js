const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const LOCAL_URI = process.env.LOCAL_MONGO_URI || 'mongodb://127.0.0.1:27017/lms-prod';

async function unlockAllInboxesGlobally() {
    console.log('==================================================');
    console.log(`🔓 UNLOCKING ALL INBOXES GLOBALLY IN DATABASE: ${LOCAL_URI}`);
    console.log('==================================================');

    const conn = await mongoose.createConnection(LOCAL_URI, { serverSelectionTimeoutMS: 5000 }).asPromise();
    const db = conn.db;

    // 1. Set disabled = false on all StudentInboxConfig documents
    const inboxConfigResult = await db.collection('studentinboxconfigs').updateMany(
        {},
        { $set: { disabled: false, visible: true } }
    );
    console.log(`✅ Updated ${inboxConfigResult.modifiedCount} StudentInboxConfig documents (disabled: false).`);

    // 2. Ensure all students have active enrollment dates so past inboxes are unlocked
    const pastEnrollmentDate = new Date('2020-01-01T00:00:00.000Z');
    const userResult = await db.collection('users').updateMany(
        { role: 'Student' },
        { $set: { 'studentProfile.enrollmentDate': pastEnrollmentDate } }
    );
    console.log(`✅ Updated ${userResult.modifiedCount} Student profiles with unlocked enrollment date.`);

    // 3. Ensure all tests are active (isAssigned = true, isDeleted != true)
    const testResult = await db.collection('tests').updateMany(
        { isAssigned: false },
        { $set: { isAssigned: true } }
    );
    console.log(`✅ Updated ${testResult.modifiedCount} tests to isAssigned: true.`);

    console.log('\n==================================================');
    console.log('🎉 ALL INBOXES AND TESTS ARE 100% UNLOCKED AND VISIBLE!');
    console.log('==================================================');

    await conn.close();
    process.exit(0);
}

unlockAllInboxesGlobally().catch(err => {
    console.error('❌ Unlock Error:', err);
    process.exit(1);
});
