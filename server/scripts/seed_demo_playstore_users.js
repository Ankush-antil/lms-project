require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Institute = require('../models/Institute');

const DEMO_USERS = [
    {
        name: 'Demo Student',
        email: 'demo.student@digitalstudyacademy.com',
        password: 'PlayStore123!',
        role: 'Student'
    },
    {
        name: 'Demo Teacher',
        email: 'demo.teacher@digitalstudyacademy.com',
        password: 'PlayStore123!',
        role: 'Teacher'
    },
    {
        name: 'Demo Admin',
        email: 'demo.admin@digitalstudyacademy.com',
        password: 'PlayStore123!',
        role: 'Admin'
    },
    {
        name: 'Demo Editor',
        email: 'demo.editor@digitalstudyacademy.com',
        password: 'PlayStore123!',
        role: 'Editor'
    },
    {
        name: 'Demo Accountant',
        email: 'demo.accountant@digitalstudyacademy.com',
        password: 'PlayStore123!',
        role: 'Accountant'
    },
    {
        name: 'Demo Parent',
        email: 'demo.parent@digitalstudyacademy.com',
        password: 'PlayStore123!',
        role: 'Parent'
    },
    {
        name: 'Demo Institute',
        email: 'demo.institute@digitalstudyacademy.com',
        password: 'PlayStore123!',
        role: 'Institute'
    },
    {
        name: 'Demo Marketer',
        email: 'demo.marketer@digitalstudyacademy.com',
        password: 'PlayStore123!',
        role: 'Marketer'
    }
];

async function seedDemoUsers() {
    try {
        console.log('Connecting to MongoDB...');
        await connectDB();

        // Get or create default institute
        let defaultInst = await Institute.findOne();
        if (!defaultInst) {
            defaultInst = await Institute.create({
                name: 'Digital Study Academy Main Campus',
                email: 'info@digitalstudyacademy.com',
                code: 'DSA001'
            });
            console.log('Created default Institute:', defaultInst.name);
        }

        console.log('\n--- Seeding Google Play Store Review Accounts ---');
        for (const account of DEMO_USERS) {
            let user = await User.findOne({ email: account.email });
            if (user) {
                user.name = account.name;
                user.role = account.role;
                user.password = account.password; // pre-save hook will hash it
                user.isDeleted = false;
                user.institute = defaultInst._id;
                await user.save();
                console.log(`[UPDATED] ${account.role}: ${account.email} / Password: ${account.password}`);
            } else {
                user = new User({
                    name: account.name,
                    email: account.email,
                    password: account.password,
                    role: account.role,
                    institute: defaultInst._id,
                    isDeleted: false
                });
                await user.save();
                console.log(`[CREATED] ${account.role}: ${account.email} / Password: ${account.password}`);
            }
        }

        console.log('\n✅ All Demo Accounts Successfully Seeded in MongoDB!\n');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding demo users:', err);
        process.exit(1);
    }
}

seedDemoUsers();
