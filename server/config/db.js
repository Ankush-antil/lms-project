const mongoose = require('mongoose');
const dns = require('dns');

// Safely configure DNS to prevent resolution timeouts on hosts with systemd-resolved
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (dnsErr) {
    console.warn('Custom DNS setServers skipped:', dnsErr.message);
}
if (dns.setDefaultResultOrder) {
    try {
        dns.setDefaultResultOrder('ipv4first');
    } catch (dnsErr) {}
}

const mongoOptions = {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2,
    family: 4 // Force IPv4 resolution to prevent socket secureConnect timeouts
};

const connectDB = async (retries = 5) => {
    while (retries > 0) {
        try {
            const primaryUri = process.env.MONGO_URI;
            console.log("Connecting to MongoDB Atlas...");

            const conn = await mongoose.connect(primaryUri, mongoOptions);
            console.log(`MongoDB Connected successfully: ${conn.connection.host}`);
            return conn;
        } catch (error) {
            console.error(`Primary Mongo Connection Failed (${error.message}). Retrying fallback URI...`);
            try {
                const fallbackUri = process.env.DIRECT_MONGO_URI || process.env.MONGO_FALLBACK_URI || 'mongodb+srv://digitalstudy5555_db_user:DigitalStudy123@cluster0.lstfruc.mongodb.net/?appName=Cluster0';
                const conn = await mongoose.connect(fallbackUri, mongoOptions);
                console.log(`MongoDB Connected via Fallback URI: ${conn.connection.host}`);
                return conn;
            } catch (fallbackError) {
                retries -= 1;
                console.error(`Direct DB Error (${retries} retries left): ${fallbackError.message}`);
                if (retries === 0) {
                    console.error("MongoDB Connection temporarily failed. Will retry in background in 10s...");
                    setTimeout(() => connectDB(5), 10000);
                    return;
                }
                await new Promise(res => setTimeout(res, 3000));
            }
        }
    }
};

module.exports = connectDB;

