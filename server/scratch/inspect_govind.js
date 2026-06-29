const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://digitalstudy5555_db_user:t040XELTgLuIXZgq@digitalstudycluster.tkpcaax.mongodb.net/');
    const user = await User.findOne({ email: 'govind@lms.com' });
    console.log("Govind Raw User Info:");
    console.log(JSON.stringify(user, null, 2));
    await mongoose.disconnect();
}
run();
