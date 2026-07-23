const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

async function checkTests() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    // Check test sample
    const test = await db.collection('tests').findOne(
        {},
        { projection: { title: 1, inboxId: 1, isAssigned: 1, expiryDate: 1, institute: 1, status: 1 } }
    );
    console.log('Test sample:', JSON.stringify(test, null, 2));

    const totalTests = await db.collection('tests').countDocuments();
    const expiredTests = await db.collection('tests').countDocuments({ expiryDate: { $lt: new Date() } });
    const notAssigned = await db.collection('tests').countDocuments({ isAssigned: false });

    console.log('Total tests:', totalTests);
    console.log('Expired tests:', expiredTests);
    console.log('Not assigned tests:', notAssigned);

    await mongoose.disconnect();
    console.log('Done!');
}

checkTests().catch(console.error);
