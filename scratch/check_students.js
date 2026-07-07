const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const User = require('../server/models/User');
const Course = require('../server/models/Course');

mongoose.connect("mongodb+srv://digitalstudy:DigitalStudy123@digitalstudy.lzqs6z8.mongodb.net/?appName=Digitalstudy")
    .then(async () => {
        console.log("Connected to MongoDB");
        
        // Let's print all courses in the DB
        const courses = await Course.find({});
        console.log(`📚 Total Courses in DB: ${courses.length}`);
        courses.forEach(c => {
            console.log(`  - Course: name="${c.name}", code="${c.code}", ID=${c._id}`);
        });

        // Let's print Saniya, Payal, Nitin, Khushi
        const users = await User.find({ name: { $regex: /Saniya|Payal|Nitin|Khushi/i } }).populate('studentProfile.course');
        console.log(`👤 Found ${users.length} users:`);
        users.forEach(u => {
            console.log(`Student: "${u.name}"`);
            console.log(`  admissionNo: "${u.admissionNo}"`);
            console.log(`  fatherName: "${u.fatherName}"`);
            console.log(`  studentProfile.course:`, u.studentProfile?.course);
        });
        mongoose.disconnect();
    })
    .catch(err => {
        console.error("Connection error:", err);
    });
