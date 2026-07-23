const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const ATLAS_URI = process.env.MONGO_URI || process.env.DIRECT_MONGO_URI;

async function exportAtlasData() {
    console.log('==================================================');
    console.log('📥 EXPORTING DATA FROM MONGO ATLAS (LOCAL PC)');
    console.log('==================================================');

    if (!ATLAS_URI) {
        console.error('❌ MONGO_URI missing');
        process.exit(1);
    }

    const conn = await mongoose.createConnection(ATLAS_URI, {
        serverSelectionTimeoutMS: 15000,
        family: 4
    }).asPromise();

    console.log('✅ Connected to MongoDB Atlas');

    const db = conn.db;
    const collections = await db.listCollections().toArray();
    console.log(`📦 Found ${collections.length} collections.`);

    const exportData = {};
    let totalDocs = 0;

    for (const colInfo of collections) {
        const colName = colInfo.name;
        if (colName.startsWith('system.')) continue;

        const docs = await db.collection(colName).find({}).toArray();
        exportData[colName] = docs;
        console.log(`   ├─ Extracted ${docs.length} docs from "${colName}"`);
        totalDocs += docs.length;
    }

    const outputPath = path.resolve(__dirname, 'atlas_dump.json');
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf8');

    console.log('\n==================================================');
    console.log(`🎉 EXPORT COMPLETE! Total Docs: ${totalDocs}`);
    console.log(`📁 File Saved At: ${outputPath}`);
    console.log('==================================================');

    await conn.close();
    process.exit(0);
}

exportAtlasData().catch(err => {
    console.error('❌ Export Error:', err);
    process.exit(1);
});
