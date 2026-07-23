const mongoose = require('mongoose');
const dns = require('dns');

// Safely configure DNS to prioritize IPv4 on DigitalOcean
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}
if (dns.setDefaultResultOrder) {
    try {
        dns.setDefaultResultOrder('ipv4first');
    } catch (e) {}
}

const mongoOptions = {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 20,
    minPoolSize: 5,
    family: 4, // Force IPv4 resolution
    autoIndex: false
};

let isConnecting = false;

const connectDB = async (retries = 5) => {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (isConnecting) {
        return;
    }

    isConnecting = true;

    while (retries > 0) {
        // Attempt 1: Primary SRV URI
        try {
            const primaryUri = process.env.MONGO_URI;
            if (primaryUri) {
                console.log("[DB] Connecting to Primary MongoDB URI...");
                const conn = await mongoose.connect(primaryUri, mongoOptions);
                console.log(`[DB] Connected to Primary MongoDB: ${conn.connection.host}`);
                isConnecting = false;
                return conn;
            }
        } catch (primaryErr) {
            console.warn(`[DB] Primary SRV Connection Failed (${primaryErr.message}). Switching to Direct Replica Set URI...`);
        }

        // Attempt 2: Direct Replica Set URI (Bypasses SRV lookup for DigitalOcean)
        try {
            const directUri = process.env.DIRECT_MONGO_URI;
            if (directUri) {
                console.log("[DB] Connecting via Direct Replica Set URI...");
                const conn = await mongoose.connect(directUri, mongoOptions);
                console.log(`[DB] Connected via Direct Replica Set: ${conn.connection.host}`);
                isConnecting = false;
                return conn;
            }
        } catch (directErr) {
            console.error(`[DB] Direct Replica Connection Failed: ${directErr.message}`);
        }

        retries -= 1;
        console.error(`[DB] Retries left: ${retries}`);
        if (retries === 0) {
            isConnecting = false;
            console.error("[DB] All connection attempts failed. Retrying in 10s...");
            setTimeout(() => connectDB(5), 10000);
            return;
        }
        await new Promise(res => setTimeout(res, 2000));
    }
};

module.exports = connectDB;
