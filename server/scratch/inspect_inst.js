const mongoose = require('mongoose');
const Institute = require('../models/Institute');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://digitalstudy5555_db_user:t040XELTgLuIXZgq@digitalstudycluster.tkpcaax.mongodb.net/');
    const inst = await Institute.findById('6a34e64bf498a0fe54642d3c');
    console.log("Institute Raw Info:");
    console.log(JSON.stringify(inst, null, 2));
    await mongoose.disconnect();
}
run();
