const mongoose = require('mongoose');
const dns = require('dns');

const connectDB = async () => {
    try {
        console.log("MONGO_URI =", process.env.MONGO_URI);

        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            family: 4
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
