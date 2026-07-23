const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

async function checkAndUnlock() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    const db = mongoose.connection.db;

    // Check studentinboxconfigs
    const sample = await db.collection('studentinboxconfigs').findOne();
    console.log('studentinboxconfigs sample:', JSON.stringify(sample, null, 2));

    // Check activities sample
    const act = await db.collection('activities').findOne({ unlockDate: { $exists: true } });
    console.log('activities with unlockDate:', JSON.stringify(act, null, 2));

    await mongoose.disconnect();
}

checkAndUnlock().catch(console.error);
