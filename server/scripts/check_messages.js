require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const checkMessages = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        
        const messages = await mongoose.connection.db.collection('messages').find({}).toArray();
        console.log(`Found ${messages.length} messages in total.`);
        
        const testMsgs = messages.filter(m => m.test);
        console.log(`Found ${testMsgs.length} test-related messages:`);
        testMsgs.forEach(m => {
            console.log(`- ID: ${m._id}, Sender: ${m.sender}, Receiver: ${m.receiver}, Test: ${m.test}, Title: ${m.testTitle}, QIndex: ${m.questionIndex}, QText: ${m.questionText}, Text: "${m.text}"`);
        });

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkMessages();
