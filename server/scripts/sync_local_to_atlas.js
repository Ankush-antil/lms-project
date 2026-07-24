const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const LOCAL_URI = process.env.LOCAL_MONGO_URI || 'mongodb://127.0.0.1:27017/lms-prod';
const ATLAS_URI = process.env.MONGO_URI || process.env.DIRECT_MONGO_URI;

async function syncLocalToAtlas() {
    console.log('==================================================');
    console.log('🚀 SYNCING LOCAL DB (lms-prod) TO CLOUD ATLAS DB');
    console.log('==================================================');

    if (!ATLAS_URI) {
        console.error('❌ MONGO_URI missing in .env file.');
        process.exit(1);
    }

    // Connect Local DB
    const localConn = await mongoose.createConnection(LOCAL_URI, { serverSelectionTimeoutMS: 5000 }).asPromise();
    console.log('✅ Connected to Local DB (lms-prod)');

    // Connect Atlas DB
    const atlasConn = await mongoose.createConnection(ATLAS_URI, { serverSelectionTimeoutMS: 15000, family: 4 }).asPromise();
    console.log('✅ Connected to Cloud Atlas DB');

    const localDb = localConn.db;
    const atlasDb = atlasConn.db;

    const collections = await localDb.listCollections().toArray();
    console.log(`\n📦 Found ${collections.length} collections in Local DB.\n`);

    let totalDocs = 0;

    for (const colInfo of collections) {
        const colName = colInfo.name;
        if (colName.startsWith('system.')) continue;

        console.log(`⏳ Syncing collection: "${colName}"...`);
        const localCol = localDb.collection(colName);
        const atlasCol = atlasDb.collection(colName);

        const docs = await localCol.find({}).toArray();

        if (docs.length > 0) {
            await atlasCol.deleteMany({});
            const chunkSize = 500;
            for (let i = 0; i < docs.length; i += chunkSize) {
                const chunk = docs.slice(i, i + chunkSize);
                await atlasCol.insertMany(chunk, { ordered: false });
            }
            console.log(`   └─ ✅ Synced ${docs.length} documents into Cloud Atlas "${colName}".`);
            totalDocs += docs.length;
        } else {
            console.log(`   └─ ⚪ Collection "${colName}" is empty. Skipped.`);
        }
    }

    console.log('\n==================================================');
    console.log(`🎉 ALL DATA SYNCED TO CLOUD ATLAS! Total Docs: ${totalDocs}`);
    console.log('==================================================');

    await localConn.close();
    await atlasConn.close();
    process.exit(0);
}

syncLocalToAtlas().catch(err => {
    console.error('❌ Sync Error:', err);
    process.exit(1);
});
