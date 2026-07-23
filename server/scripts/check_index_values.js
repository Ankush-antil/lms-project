const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

async function checkIndexValues() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    // Get distinct index values for HARTRON tests
    const indexes = await db.collection('tests').distinct('index', {
        institute: { $regex: /hartron ganaur/i },
        isAssigned: true
    });
    console.log('Distinct index values in tests:', indexes.slice(0, 20));

    // Count tests with "Inbox" prefix vs "Index" prefix
    const inboxCount = await db.collection('tests').countDocuments({
        institute: { $regex: /hartron ganaur/i },
        index: { $regex: /^Inbox/i }
    });
    const indexCount = await db.collection('tests').countDocuments({
        institute: { $regex: /hartron ganaur/i },
        index: { $regex: /^Index/i }
    });
    console.log('Tests with "Inbox" prefix:', inboxCount);
    console.log('Tests with "Index" prefix:', indexCount);

    await mongoose.disconnect();
}

checkIndexValues().catch(console.error);
