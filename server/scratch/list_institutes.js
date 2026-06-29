const mongoose = require('mongoose');
const Institute = require('../models/Institute');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://digitalstudy5555_db_user:t040XELTgLuIXZgq@digitalstudycluster.tkpcaax.mongodb.net/');
    const institutes = await Institute.find({});
    console.log("Institutes in DB:");
    institutes.forEach(i => {
        console.log(`ID: ${i._id}, Name: ${i.name}, Code: ${i.code}`);
    });
    await mongoose.disconnect();
}
run();
