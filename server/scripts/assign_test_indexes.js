const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

async function assignTestIndexes() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    // Get all HARTRON GANAUR assigned tests without index field
    const tests = await db.collection('tests').find(
        { 
            institute: { $regex: /hartron ganaur/i }, 
            isAssigned: true,
            $or: [{ index: { $exists: false } }, { index: null }, { index: '' }]
        },
        { projection: { _id: 1, title: 1, subject: 1 } }
    ).toArray();

    console.log(`Found ${tests.length} tests without index field`);

    // Assign sequential index values (distribute across inboxes)
    let updateCount = 0;
    for (let i = 0; i < tests.length; i++) {
        const indexNum = (i % 26) + 1; // distribute across 26 inboxes (Index 1 to Index 26)
        await db.collection('tests').updateOne(
            { _id: tests[i]._id },
            { $set: { index: `Index ${indexNum}` } }
        );
        updateCount++;
    }

    console.log(`Updated ${updateCount} tests with index fields`);

    // Verify
    const sample = await db.collection('tests').findOne(
        { institute: { $regex: /hartron ganaur/i }, isAssigned: true },
        { projection: { title: 1, index: 1 } }
    );
    console.log('Sample after update:', JSON.stringify(sample, null, 2));

    await mongoose.disconnect();
    console.log('Done!');
}

assignTestIndexes().catch(console.error);
