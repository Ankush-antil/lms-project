const mongoose = require('mongoose');
const dns = require('dns');

// Force Node.js to use Google & Cloudflare Public DNS to prevent Ubuntu systemd-resolved timeouts
dns.setServers(['8.8.8.8', '1.1.1.1']);
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const DIRECT_MONGO_URI = 'mongodb://digitalstudy:DigitalStudy123@ac-khrbsml-shard-00-00.lzqs6z8.mongodb.net:27017,ac-khrbsml-shard-00-01.lzqs6z8.mongodb.net:27017,ac-khrbsml-shard-00-02.lzqs6z8.mongodb.net:27017/?ssl=true&replicaSet=atlas-khrbsml-shard-0&authSource=admin&retryWrites=true&w=majority';

const connectDB = async (retries = 5) => {
    while (retries > 0) {
        try {
            const uri = process.env.MONGO_URI || DIRECT_MONGO_URI;
            console.log("Connecting to MongoDB...");

            const conn = await mongoose.connect(uri, {
                serverSelectionTimeoutMS: 15000,
                maxPoolSize: 10,
                minPoolSize: 2,
            });
            console.log(`MongoDB Connected: ${conn.connection.host}`);
            return conn;
        } catch (error) {
            console.error(`SRV Connection Failed (${error.message}). Trying Direct Replica Set URI...`);
            try {
                const conn = await mongoose.connect(DIRECT_MONGO_URI, {
                    serverSelectionTimeoutMS: 15000,
                    maxPoolSize: 10,
                    minPoolSize: 2,
                });
                console.log(`MongoDB Connected via Direct Replica Set: ${conn.connection.host}`);
                return conn;
            } catch (fallbackError) {
                retries -= 1;
                console.error(`Direct DB Error (${retries} retries left): ${fallbackError.message}`);
                if (retries === 0) {
                    console.error("MongoDB Connection temporarily failed. Retrying in background in 10s...");
                    setTimeout(() => connectDB(5), 10000);
                    return;
                }
                await new Promise(res => setTimeout(res, 3000));
            }
        }
    }
};

module.exports = connectDB;
