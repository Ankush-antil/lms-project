const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const mongoURI = process.env.MONGO_URI || "mongodb+srv://digitalstudy:DigitalStudy123@digitalstudy.lzqs6z8.mongodb.net/?appName=Digitalstudy";

mongoose.connect(mongoURI)
    .then(async () => {
        console.log('MongoDB Connected.');
        const Course = mongoose.model('Course', new mongoose.Schema({}, { strict: false }));
        
        const courses = await Course.find({ isDeleted: { $ne: true } });
        console.log(`Total active courses: ${courses.length}`);
        
        const nameGroups = {};
        courses.forEach(c => {
            const name = c.get('name').trim();
            const lowerName = name.toLowerCase();
            if (!nameGroups[lowerName]) {
                nameGroups[lowerName] = [];
            }
            nameGroups[lowerName].push({
                id: c._id.toString(),
                name: name,
                code: c.get('code'),
                subjects: c.get('subjects') || []
            });
        });
        
        console.log('\n--- Duplicate groups by name (case-insensitive) ---');
        for (const [lowerName, list] of Object.entries(nameGroups)) {
            if (list.length > 1) {
                console.log(`Name: "${list[0].name}" (${list.length} courses)`);
                list.forEach(item => {
                    console.log(`  - ID: ${item.id}, Code: "${item.code}", Subjects: ${item.subjects.length}`);
                });
            }
        }
        
        await mongoose.disconnect();
        console.log('MongoDB Disconnected.');
    })
    .catch(err => {
        console.error(err);
    });
