/**
 * One-time script: Force export all FeeRecords to Google Sheet with new 13-column layout
 * Run: node server/scripts/forceExportSheets.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function main() {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected.');

    // Load models first so mongoose knows about them
    require('../models/User');
    require('../models/FeeRecord');

    const { exportToSheets } = require('../utils/googleSheets');

    console.log('📤 Exporting all FeeRecords to Google Sheets with new 13-column layout...');
    const result = await exportToSheets();
    console.log('✅ Export complete!', result);

    await mongoose.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
