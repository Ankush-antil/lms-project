const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

async function checkTestFields() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    // Get sample HARTRON tests with all fields
    const tests = await db.collection('tests').find(
        { institute: { $regex: /hartron ganaur/i }, isAssigned: true },
        { projection: { title: 1, inboxId: 1, inbox: 1, week: 1, day: 1, subject: 1, course: 1, inboxKey: 1 } }
    ).limit(5).toArray();

    console.log('Sample tests:', JSON.stringify(tests, null, 2));

    await mongoose.disconnect();
}

checkTestFields().catch(console.error);
