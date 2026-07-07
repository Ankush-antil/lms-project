const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const mongoURI = process.env.MONGO_URI || "mongodb+srv://digitalstudy:DigitalStudy123@digitalstudy.lzqs6z8.mongodb.net/?appName=Digitalstudy";

const mergeMap = {
    // Duplicate ID -> Good ID
    "6a4ce53bce33cc6a9817564e": "6a4ca2b0059b9e355207c45a", // CDA (1 year)
    "6a4ce53ece33cc6a981756d2": "6a4cbde967d34427ac7fcf81", // CCCBA
    "6a4ce545ce33cc6a9817582f": "6a4cd1d3802c57b06c7d81e1"  // FC
};

mongoose.connect(mongoURI)
    .then(async () => {
        console.log('MongoDB Connected.');
        
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        const Course = mongoose.model('Course', new mongoose.Schema({}, { strict: false }));
        
        // Define simple schemas for other models referencing Course
        const AttendanceSession = mongoose.model('AttendanceSession', new mongoose.Schema({}, { strict: false }));
        const Application = mongoose.model('Application', new mongoose.Schema({}, { strict: false }));

        for (const [fromId, toId] of Object.entries(mergeMap)) {
            console.log(`\nMerging duplicate course ID: ${fromId} into good course ID: ${toId}...`);
            
            const fromObjId = new mongoose.Types.ObjectId(fromId);
            const toObjId = new mongoose.Types.ObjectId(toId);
            
            // 1. Update Student course references
            const studentsUpdated = await User.updateMany(
                { "studentProfile.course": fromObjId },
                { $set: { "studentProfile.course": toObjId } }
            );
            console.log(`  - Students course ID updated: ${studentsUpdated.modifiedCount}`);
            
            // 2. Update Teacher assignedCourses references
            // Let's find teachers who have the duplicate course assigned
            const teachers = await User.find({ "teacherProfile.assignedCourses": fromObjId });
            let teachersUpdatedCount = 0;
            for (const teacher of teachers) {
                const list = teacher.get('teacherProfile.assignedCourses') || [];
                // Replace fromObjId with toObjId, and filter out any duplicates
                const updatedList = list.map(id => id.toString() === fromId ? toObjId : id);
                const uniqueList = Array.from(new Set(updatedList.map(id => id.toString()))).map(id => new mongoose.Types.ObjectId(id));
                
                await User.updateOne(
                    { _id: teacher._id },
                    { $set: { "teacherProfile.assignedCourses": uniqueList } }
                );
                teachersUpdatedCount++;
            }
            console.log(`  - Teachers assignedCourses updated: ${teachersUpdatedCount}`);
            
            // 3. Update AttendanceSession references
            const sessionsUpdated = await AttendanceSession.updateMany(
                { course: fromObjId },
                { $set: { course: toObjId } }
            );
            console.log(`  - Attendance sessions updated: ${sessionsUpdated.modifiedCount}`);
            
            // 4. Update Application references
            const appsUpdated = await Application.updateMany(
                { course: fromObjId },
                { $set: { course: toObjId } }
            );
            console.log(`  - Applications updated: ${appsUpdated.modifiedCount}`);
            
            // 5. Delete the duplicate course from the database
            const deletedCourse = await Course.findByIdAndDelete(fromObjId);
            if (deletedCourse) {
                console.log(`  - Successfully deleted duplicate course "${deletedCourse.get('name')}" with code "${deletedCourse.get('code')}".`);
            } else {
                console.log(`  - Duplicate course not found in DB.`);
            }
        }
        
        await mongoose.disconnect();
        console.log('\nMongoDB Disconnected. Merge process complete.');
    })
    .catch(err => {
        console.error(err);
    });
