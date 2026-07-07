const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const User = require('../models/User');
const FeeRecord = require('../models/FeeRecord');

async function check() {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected.");
    const rec = await FeeRecord.findById('6a4b5d639156b8c01d5411dc').populate('student');
    console.log("Record Found:", JSON.stringify(rec, null, 2));
    await mongoose.disconnect();
}
check().catch(console.error);
