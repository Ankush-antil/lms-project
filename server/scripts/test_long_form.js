const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const testLongForm = async () => {
    const uri = process.env.DIRECT_MONGO_URI || process.env.MONGO_URI;

    console.log("Attempting to connect with long-form URI...");
    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 15000,
        });
        console.log("SUCCESS: Connected to MongoDB Atlas!");
        process.exit(0);
    } catch (err) {
        console.error("CONNECTION FAILED:", err.message);
        process.exit(1);
    }
};

testLongForm();
