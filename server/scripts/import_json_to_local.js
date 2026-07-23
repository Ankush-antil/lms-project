const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const LOCAL_URI = process.env.LOCAL_MONGO_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms-prod';

async function importLocalData() {
    console.log('==================================================');
    console.log('🚀 RESTORING DATA TO LOCAL MONGODB (DIGITALOCEAN)');
    console.log('==================================================');
    console.log(`Target Local DB: ${LOCAL_URI}`);

    const dumpPath = path.resolve(__dirname, 'atlas_dump.json');
    if (!fs.existsSync(dumpPath)) {
        console.error(`❌ Dump file not found at: ${dumpPath}`);
        process.exit(1);
    }

    console.log('📂 Reading atlas_dump.json file...');
    const rawData = fs.readFileSync(dumpPath, 'utf8');
    const exportData = JSON.parse(rawData);

    const conn = await mongoose.createConnection(LOCAL_URI, {
        serverSelectionTimeoutMS: 5000
    }).asPromise();

    console.log('✅ Connected to Local MongoDB Database');
    const db = conn.db;

    const collectionNames = Object.keys(exportData);
    console.log(`📦 Found ${collectionNames.length} collections in dump file.\n`);

    let totalRestored = 0;

    for (const colName of collectionNames) {
        const docs = exportData[colName];
        if (!Array.isArray(docs) || docs.length === 0) {
            console.log(`   ⚪ Collection "${colName}" has no documents. Skipped.`);
            continue;
        }

        console.log(`⏳ Restoring collection: "${colName}" (${docs.length} docs)...`);
        const collection = db.collection(colName);

        // Wipe collection for clean state
        await collection.deleteMany({});

        // Convert string Extended JSON ($oid, $date) back to BSON types if needed
        const bsonDocs = docs.map(doc => {
            return JSON.parse(JSON.stringify(doc), (key, val) => {
                if (val && typeof val === 'object') {
                    if (val.$oid) return new mongoose.Types.ObjectId(val.$oid);
                    if (val.$date) return new Date(val.$date);
                }
                return val;
            });
        });

        const chunkSize = 500;
        for (let i = 0; i < bsonDocs.length; i += chunkSize) {
            const chunk = bsonDocs.slice(i, i + chunkSize);
            await collection.insertMany(chunk, { ordered: false });
        }

        console.log(`   └─ ✅ Restored ${docs.length} documents into "${colName}".`);
        totalRestored += docs.length;
    }

    console.log('\n==================================================');
    console.log(`🎉 LOCAL DATABASE RESTORE COMPLETED! Total Docs: ${totalRestored}`);
    console.log('==================================================');

    await conn.close();
    process.exit(0);
}

importLocalData().catch(err => {
    console.error('❌ Import Error:', err);
    process.exit(1);
});
