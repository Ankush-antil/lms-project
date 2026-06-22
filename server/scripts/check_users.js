require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        
        const users = await mongoose.connection.db.collection('users').find({}).toArray();
        console.log(`Found ${users.length} users:`);
        users.forEach(u => {
            console.log(`- ID: ${u._id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}`);
        });

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkUsers();
