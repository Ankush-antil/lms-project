const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const LOCAL_URI = process.env.LOCAL_MONGO_URI || 'mongodb://127.0.0.1:27017/lms-prod';

async function resetAdminPassword() {
    console.log(`Connecting to ${LOCAL_URI}...`);
    const conn = await mongoose.createConnection(LOCAL_URI, { serverSelectionTimeoutMS: 5000 }).asPromise();
    const db = conn.db;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin123!', salt);

    const result = await db.collection('users').updateOne(
        { email: 'admin@lms.com' },
        { $set: { password: hashedPassword, isActive: true } }
    );

    console.log('Update result:', result);
    console.log('✅ Admin password set to: Admin123! for admin@lms.com');

    await conn.close();
}

resetAdminPassword().catch(console.error);
