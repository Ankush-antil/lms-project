const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://digitalstudy5555_db_user:t040XELTgLuIXZgq@digitalstudycluster.tkpcaax.mongodb.net/');
        console.log("Connected to MongoDB");
        
        const users = await User.find({});
        console.log("\n--- All Users ---");
        users.forEach(u => {
            console.log(`ID: ${u._id}, Role: ${u.role}, Email: ${u.email}, Name: ${u.name}`);
        });

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
