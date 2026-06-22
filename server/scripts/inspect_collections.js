require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const inspect = async () => {
    try {
        const dns = require('dns');
        dns.setServers(['8.8.8.8', '8.8.4.4']);
        
        await mongoose.connect(process.env.MONGO_URI, {
            family: 4,
            serverSelectionTimeoutMS: 10000,
        });
        
        console.log("Connected to MongoDB database.");
        
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log("Collections in DB:");
        console.log(collections.map(c => c.name));
        
        for (const col of collections) {
            if (col.name.toLowerCase().includes('chat') || col.name.toLowerCase().includes('message')) {
                console.log(`\nFound chat/message collection: ${col.name}`);
                const count = await mongoose.connection.db.collection(col.name).countDocuments();
                console.log(`Document count: ${count}`);
                if (count > 0) {
                    const samples = await mongoose.connection.db.collection(col.name).find().limit(5).toArray();
                    console.log("Sample documents:", JSON.stringify(samples, null, 2));
                }
            }
        }
        
        // Also look in calllogs or activities in case messages are stored there
        const list = ['calllogs', 'activities', 'users'];
        for (const name of list) {
            const count = await mongoose.connection.db.collection(name).countDocuments();
            console.log(`Document count in ${name}: ${count}`);
        }
        
        process.exit(0);
    } catch (err) {
        console.error("Error inspecting database:", err);
        process.exit(1);
    }
};

inspect();
