const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const User = require('../models/User');

const test = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const adminUser = await User.findOne({ role: 'Admin' });
        if (!adminUser) {
            console.log("No Admin user found in database!");
            await mongoose.connection.close();
            return;
        }
        console.log("Found Admin user:", adminUser.email);
        
        // Generate JWT token
        const token = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        
        // Make authenticated request to local API
        const { data } = await axios.get('http://localhost:5000/api/users?role=Student', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        
        console.log("Success! Fetched", data.length, "users.");
        if (data.length > 0) {
            console.log("Sample Student:", JSON.stringify(data[0], null, 2));
        }
        await mongoose.connection.close();
    } catch (e) {
        console.error("API GET Error:", e.response?.data || e.message);
        try { await mongoose.connection.close(); } catch(err) {}
    }
};

test();
