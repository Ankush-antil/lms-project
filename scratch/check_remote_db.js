const mongoose = require('mongoose');

const REMOTE_URI = "mongodb+srv://digitalstudy:digitalstudy%23%405555@digitalstudy.lzqs6z8.mongodb.net/digitalstudy?retryWrites=true&w=majority&appName=Digitalstudy";

async function run() {
    try {
        await mongoose.connect(REMOTE_URI);
        console.log("Connected to remote MongoDB Atlas database.");
        
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log("Collections:", collections.map(c => c.name));
        
        // Check for users
        const User = mongoose.connection.model('User', new mongoose.Schema({
            email: String,
            role: String
        }), 'users');
        
        const count = await User.countDocuments({});
        console.log("Total users in remote db:", count);
        
        const sampleUsers = await User.find({}).limit(5);
        console.log("Sample users:", sampleUsers);
        
        await mongoose.disconnect();
    } catch (e) {
        console.error("Error:", e.message);
    }
}

run();
