const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const LOCAL_URI = process.env.LOCAL_MONGO_URI || 'mongodb://127.0.0.1:27017/lms-prod';

function convertToBson(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
        // Convert 24-character hex string _id values to ObjectId
        if (/^[0-9a-fA-F]{24}$/.test(obj)) {
            try {
                return new mongoose.Types.ObjectId(obj);
            } catch (e) {
                return obj;
            }
        }
        // Convert ISO Date strings back to Date objects
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
            const parsedDate = new Date(obj);
            if (!isNaN(parsedDate.getTime())) return parsedDate;
        }
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(convertToBson);
    }
    if (typeof obj === 'object') {
        const converted = {};
        for (const [key, val] of Object.entries(obj)) {
            if (val && typeof val === 'object' && val.$oid) {
                converted[key] = new mongoose.Types.ObjectId(val.$oid);
            } else if (val && typeof val === 'object' && val.$date) {
                converted[key] = new Date(val.$date);
            } else {
                converted[key] = convertToBson(val);
            }
        }
        return converted;
    }
    return obj;
}

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

        // Convert string IDs to real BSON ObjectIds & Dates
        const bsonDocs = docs.map(doc => convertToBson(doc));

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
