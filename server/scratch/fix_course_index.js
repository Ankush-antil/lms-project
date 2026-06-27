const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '../.env') });

const fixIndex = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const db = mongoose.connection.db;
        const collection = db.collection('courses');

        console.log('Existing indexes:');
        const indexes = await collection.indexes();
        console.log(indexes);

        // Check if code_1 index exists
        const hasCodeIndex = indexes.some(idx => idx.name === 'code_1');
        if (hasCodeIndex) {
            console.log('Dropping index: code_1...');
            await collection.dropIndex('code_1');
            console.log('Index code_1 dropped successfully!');
        } else {
            console.log('No index named code_1 found.');
        }

        console.log('Indexes after drop:');
        console.log(await collection.indexes());

        process.exit(0);
    } catch (err) {
        console.error('Error fixing index:', err);
        process.exit(1);
    }
};

fixIndex();
