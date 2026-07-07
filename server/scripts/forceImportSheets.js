/**
 * Force import all rows from Google Sheet to MongoDB, automatically creating students if they don't exist
 * Run: node server/scripts/forceImportSheets.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function main() {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected.');

    // Load models first
    require('../models/User');
    require('../models/FeeRecord');

    const { importFromSheets } = require('../utils/googleSheets');

    console.log('📥 Importing all rows from Google Sheets...');
    const result = await importFromSheets();
    console.log('✅ Import complete!', result);

    await mongoose.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
