const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const ATLAS_URI = process.env.DIRECT_MONGO_URI || process.env.MONGO_URI;
const LOCAL_URI = process.env.LOCAL_MONGO_URI || 'mongodb://127.0.0.1:27017/lms-prod';

async function migrateData() {
    console.log('==================================================');
    console.log('🚀 STARTING ATLAS TO LOCAL MONGODB MIGRATION');
    console.log('==================================================');
    console.log(`Source (Atlas): ${ATLAS_URI ? 'URI Configured' : 'MISSING'}`);
    console.log(`Target (Local): ${LOCAL_URI}`);
    console.log('--------------------------------------------------');

    if (!ATLAS_URI) {
        console.error('❌ MONGO_URI environment variable is missing.');
        process.exit(1);
    }

    // Connect Atlas Client
    const atlasConn = await mongoose.createConnection(ATLAS_URI, {
        serverSelectionTimeoutMS: 15000,
        family: 4
    }).asPromise();
    console.log('✅ Connected to Source (Atlas DB)');

    // Connect Local Client
    const localConn = await mongoose.createConnection(LOCAL_URI, {
        serverSelectionTimeoutMS: 5000
    }).asPromise();
    console.log('✅ Connected to Target (Local DB)');

    const atlasDb = atlasConn.db;
    const localDb = localConn.db;

    // Get all collections from Atlas
    const collections = await atlasDb.listCollections().toArray();
    console.log(`\n📦 Found ${collections.length} collections in Atlas.\n`);

    let totalDocsMigrated = 0;

    for (const colInfo of collections) {
        const colName = colInfo.name;
        if (colName.startsWith('system.')) continue;

        console.log(`⏳ Migrating collection: "${colName}"...`);
        const atlasCollection = atlasDb.collection(colName);
        const localCollection = localDb.collection(colName);

        const docs = await atlasCollection.find({}).toArray();

        if (docs.length > 0) {
            // Clear target collection first for clean sync
            await localCollection.deleteMany({});
            
            // Insert in batches of 500
            const chunkSize = 500;
            for (let i = 0; i < docs.length; i += chunkSize) {
                const chunk = docs.slice(i, i + chunkSize);
                await localCollection.insertMany(chunk, { ordered: false });
            }
            console.log(`   └─ ✅ Migrated ${docs.length} documents into "${colName}".`);
            totalDocsMigrated += docs.length;
        } else {
            console.log(`   └─ ⚪ Collection "${colName}" is empty. Skipped.`);
        }
    }

    console.log('\n==================================================');
    console.log(`🎉 MIGRATION COMPLETED SUCCESSFULLY! Total Docs: ${totalDocsMigrated}`);
    console.log('==================================================');

    await atlasConn.close();
    await localConn.close();
    process.exit(0);
}

migrateData().catch(err => {
    console.error('❌ Migration Error:', err);
    process.exit(1);
});
