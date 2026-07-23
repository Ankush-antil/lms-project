const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

async function unlockInboxes() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Check collection names
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    // Try common inbox collection names
    const possibleNames = ['inboxes', 'inbox', 'activities', 'activityinboxes'];
    for (const name of possibleNames) {
        const count = await db.collection(name).countDocuments();
        if (count > 0) {
            console.log(`Found ${count} docs in collection: ${name}`);
            const result = await db.collection(name).updateMany(
                { unlockDate: { $gt: new Date() } },
                { $set: { unlockDate: new Date('2024-01-01') } }
            );
            console.log(`Updated ${result.modifiedCount} inboxes in ${name}`);
        }
    }

    await mongoose.disconnect();
    console.log('Done!');
}

unlockInboxes().catch(console.error);
