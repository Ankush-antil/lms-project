require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Test = require('../models/Test');
const Institute = require('../models/Institute');
const Course = require('../models/Course');

const checkStudentTests = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const student = await User.findOne({ email: 'student@lms.com' })
            .populate('institute')
            .populate('studentProfile.course');
        
        console.log('Student Info:');
        console.log('- Name:', student.name);
        console.log('- Institute:', student.institute?.name);
        console.log('- Course:', student.studentProfile?.course?.name);
        console.log('- Subject:', student.studentProfile?.subject);

        const studentInstitute = student.institute?.name?.trim();
        const studentCourse = student.studentProfile?.course?.name?.trim();
        const studentSubject = student.studentProfile?.subject?.trim();

        if (!studentInstitute) {
            console.log('Student has no institute assigned');
            process.exit();
        }

        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let query = {};

        query.institute = { $regex: new RegExp(`^\\s*${escapeRegex(studentInstitute)}\\s*$`, 'i') };

        if (studentSubject) {
            const subjects = studentSubject.split(',').map(s => s.trim()).filter(Boolean);
            if (subjects.length > 0) {
                query.subject = {
                    $in: subjects.map(sub => new RegExp(`^\\s*${escapeRegex(sub)}\\s*$`, 'i'))
                };
            } else {
                query.subject = { $in: [null, '', undefined] };
            }
        } else {
            query.subject = { $in: [null, '', undefined] };
        }

        if (studentCourse) {
            query.$or = [
                { course: { $in: [null, '', undefined] } },
                { course: { $regex: new RegExp(`^\\s*${escapeRegex(studentCourse)}\\s*$`, 'i') } }
            ];
        }

        const tests = await Test.find(query).sort({ createdAt: -1 });
        console.log(`Found ${tests.length} tests assigned to student:`);
        tests.forEach(t => {
            console.log(`- ID: ${t._id}, Title: ${t.title}, Index: ${t.index}, Subject: ${t.subject}, Course: ${t.course}, Inst: ${t.institute}`);
        });

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkStudentTests();
