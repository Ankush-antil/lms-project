const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

async function checkInboxIds() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    // Get distinct inboxId values from tests (HARTRON GANAUR)
    const testInboxIds = await db.collection('tests').distinct('inboxId', {
        institute: { $regex: /hartron ganaur/i },
        isAssigned: true
    });
    console.log('Test inboxIds (HARTRON GANAUR):', testInboxIds.slice(0, 20));

    // Get distinct inboxId values from studymaterials
    const matInboxIds = await db.collection('studymaterials').distinct('inboxId', {
        institute: { $regex: /hartron ganaur/i }
    });
    console.log('StudyMaterial inboxIds:', matInboxIds.slice(0, 10));

    // Get studentinboxconfigs inboxIds for Saniya
    const saniya = await db.collection('users').findOne({ name: { $regex: 'saniya', $options: 'i' } });
    const configs = await db.collection('studentinboxconfigs').find(
        { student: saniya?._id },
        { projection: { inboxId: 1 } }
    ).limit(10).toArray();
    console.log('Saniya inboxConfig inboxIds:', configs.map(c => c.inboxId));

    await mongoose.disconnect();
}

checkInboxIds().catch(console.error);
