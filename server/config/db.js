const mongoose = require('mongoose');
const dns = require('dns');

// Force Node.js DNS to use Google & Cloudflare Public DNS and prioritize IPv4
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
    console.warn('[DB] Custom DNS setServers warning:', e.message);
}

let isConnecting = false;

const connectDB = async () => {
    // If already connected, reuse existing connection pool
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }
    
    // Prevent duplicate simultaneous connection attempts
    if (isConnecting) {
        console.log('[DB] Connection attempt already in progress...');
        return;
    }

    isConnecting = true;

    try {
        const primaryUri = process.env.MONGO_URI;
        if (!primaryUri) {
            throw new Error('MONGO_URI environment variable is missing.');
        }

        console.log('[DB] Connecting to MongoDB (IPv4 forced)...');

        const conn = await mongoose.connect(primaryUri, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            maxPoolSize: 20,
            minPoolSize: 5,
            family: 4, // Crucial for DigitalOcean: Force IPv4 over IPv6
            autoIndex: false
        });

        console.log(`[DB] MongoDB Connected Successfully: ${conn.connection.host}`);
        isConnecting = false;
        return conn;
    } catch (error) {
        isConnecting = false;
        console.error(`[DB] Connection Failed (${error.message}). Retrying in 5 seconds...`);
        setTimeout(() => connectDB(), 5000);
    }
};

module.exports = connectDB;
