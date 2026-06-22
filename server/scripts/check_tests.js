require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const checkTests = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        
        // Dynamically get the models or use Mongoose connection db
        const tests = await mongoose.connection.db.collection('tests').find({}).toArray();
        console.log(`Found ${tests.length} tests:`);
        tests.forEach(t => {
            console.log(`- ID: ${t._id}, Title: ${t.title}, Creator: ${t.createdBy || t.creator}, Question count: ${t.questions ? t.questions.length : 0}`);
        });

        const testsubmissions = await mongoose.connection.db.collection('testsubmissions').find({}).toArray();
        console.log(`Found ${testsubmissions.length} test submissions:`);
        testsubmissions.forEach(ts => {
            console.log(`- ID: ${ts._id}, Student: ${ts.student}, Test: ${ts.test}`);
        });

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkTests();
