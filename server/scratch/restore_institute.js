const mongoose = require('mongoose');
const Institute = require('../models/Institute');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://digitalstudy5555_db_user:t040XELTgLuIXZgq@digitalstudycluster.tkpcaax.mongodb.net/');
        console.log("Connected to MongoDB");

        const targetId = '6a34e64bf498a0fe54642d3c';
        
        let inst = await Institute.findById(targetId);
        if (inst) {
            console.log("Institute already exists:", inst);
        } else {
            console.log("Creating missing institute with ID:", targetId);
            inst = await Institute.create({
                _id: targetId,
                name: 'Digital study',
                code: 'DSI001',
                address: 'Main St, Education Hub',
                contactEmail: 'contact@digitalstudy.com'
            });
            console.log("Institute created successfully:", inst);
        }
    } catch (err) {
        console.error("Error restoring institute:", err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
