const mongoose = require('mongoose');
const dns = require('dns');

// Safely configure DNS to prevent resolution timeouts on Ubuntu/DigitalOcean
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
    console.warn('Custom DNS setServers skipped:', e.message);
}
if (dns.setDefaultResultOrder) {
    try {
        dns.setDefaultResultOrder('ipv4first');
    } catch (e) {}
}

const mongoOptions = {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 20,
    minPoolSize: 5,
    family: 4, // Crucial for DigitalOcean: Force IPv4 resolution over IPv6
    autoIndex: false
};

let isConnecting = false;

const connectDB = async (retries = 5) => {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (isConnecting) {
        console.log('[DB] Connection attempt already in progress...');
        return;
    }

    isConnecting = true;

    while (retries > 0) {
        try {
            const primaryUri = process.env.MONGO_URI;
            if (!primaryUri) {
                throw new Error('MONGO_URI environment variable is missing.');
            }

            console.log("[DB] Connecting to MongoDB Atlas (IPv4 forced)...");
            const conn = await mongoose.connect(primaryUri, mongoOptions);
            console.log(`[DB] MongoDB Connected Successfully: ${conn.connection.host}`);
            isConnecting = false;
            return conn;
        } catch (error) {
            console.error(`[DB] Primary Mongo Connection Failed (${error.message}). Trying Fallback...`);
            try {
                const fallbackUri = process.env.DIRECT_MONGO_URI || process.env.MONGO_FALLBACK_URI;
                if (fallbackUri) {
                    const conn = await mongoose.connect(fallbackUri, mongoOptions);
                    console.log(`[DB] MongoDB Connected via Fallback URI: ${conn.connection.host}`);
                    isConnecting = false;
                    return conn;
                }
            } catch (fallbackError) {
                console.error(`[DB] Fallback Connection Error: ${fallbackError.message}`);
            }

            retries -= 1;
            console.error(`[DB] Connection Error (${retries} retries left)`);
            if (retries === 0) {
                isConnecting = false;
                console.error("[DB] Connection failed. Retrying in background in 10s...");
                setTimeout(() => connectDB(5), 10000);
                return;
            }
            await new Promise(res => setTimeout(res, 3000));
        }
    }
};

module.exports = connectDB;
