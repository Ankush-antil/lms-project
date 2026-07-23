const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

async function checkSaniyaTests() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    // Find Saniya
    const saniya = await db.collection('users').findOne(
        { name: { $regex: 'saniya', $options: 'i' } },
        { projection: { name: 1, email: 1, 'studentProfile': 1 } }
    );
    console.log('Saniya:', JSON.stringify(saniya, null, 2));

    if (!saniya) {
        console.log('Saniya not found!');
        await mongoose.disconnect();
        return;
    }

    // Find tests assigned to Saniya's institute
    const institute = saniya.studentProfile?.institute || saniya.studentProfile?.instituteName;
    console.log('Institute:', institute);

    // Find tests for that institute
    const tests = await db.collection('tests').find(
        { institute: { $regex: institute || '', $options: 'i' }, isAssigned: true },
        { projection: { title: 1, inboxId: 1, isAssigned: 1, expiryDate: 1, institute: 1 } }
    ).limit(5).toArray();

    console.log('Tests for Saniya institute (assigned):', JSON.stringify(tests, null, 2));

    // Count all tests for institute
    const totalForInstitute = await db.collection('tests').countDocuments({ 
        institute: { $regex: institute || '', $options: 'i' } 
    });
    console.log('Total tests for institute:', totalForInstitute);

    await mongoose.disconnect();
}

checkSaniyaTests().catch(console.error);
