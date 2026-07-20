const mongoose = require('mongoose');
const dns = require('dns');

const connectDB = async (retries = 5) => {
    while (retries > 0) {
        try {
            console.log("MONGO_URI =", process.env.MONGO_URI);

            const conn = await mongoose.connect(process.env.MONGO_URI, {
                serverSelectionTimeoutMS: 15000,
                maxPoolSize: 10,
                minPoolSize: 2,
            });
            console.log(`MongoDB Connected: ${conn.connection.host}`);
            return conn;
        } catch (error) {
            retries -= 1;
            console.error(`MongoDB Connection Error (${retries} retries left): ${error.message}`);
            if (retries === 0) {
                console.error("MongoDB Connection temporarily failed. Retrying in background in 10s...");
                setTimeout(() => connectDB(5), 10000);
                return;
            }
            await new Promise(res => setTimeout(res, 3000));
        }
    }
};

module.exports = connectDB;
