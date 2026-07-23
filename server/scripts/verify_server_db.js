const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const LOCAL_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms-prod';

async function verifyLocalDatabase() {
    console.log('==================================================');
    console.log(`🔍 VERIFYING DATABASE CONNECTION: ${LOCAL_URI}`);
    console.log('==================================================');

    const conn = await mongoose.createConnection(LOCAL_URI, { serverSelectionTimeoutMS: 5000 }).asPromise();
    const db = conn.db;

    const collections = await db.listCollections().toArray();
    console.log(`📦 Database Name: "${db.databaseName}" (Found ${collections.length} collections)\n`);

    for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`   ├─ Collection "${col.name}": ${count} documents`);
    }

    const admin = await db.collection('users').findOne({ role: 'Admin' });
    console.log('\n👤 Sample Admin User:', admin ? `${admin.name} (${admin.email}) ID: ${admin._id}` : 'NONE FOUND');

    await conn.close();
}

verifyLocalDatabase().catch(console.error);
