/**
 * Fee Seed Script
 * Run: node server/seeders/feeSeed.js
 * Creates realistic FeeRecord documents for all existing students
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const FeeRecord = require('../models/FeeRecord');

const COURSES = [
    { name: 'Python Full Stack', fee: 40000 },
    { name: 'Web Development', fee: 35000 },
    { name: 'ADCA', fee: 25000 },
    { name: 'DCA', fee: 15000 },
    { name: 'Tally Prime', fee: 8000 },
    { name: 'Graphic Design', fee: 22000 },
    { name: 'Digital Marketing', fee: 20000 },
    { name: 'MS Office', fee: 5000 },
];

const BATCHES = ['Batch-A1', 'Batch-A2', 'Batch-B1', 'Batch-B2', 'Batch-C1'];
const MODES = ['Cash', 'UPI', 'Bank', 'Card', 'Cheque'];

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generateReceiptNo = (index) => {
    const year = new Date().getFullYear();
    return `RCPT-${year}-${String(100000 + index).padStart(6, '0')}`;
};

const randomPastDate = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d;
};

const randomFutureDate = (daysAhead) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d;
};

async function seedFees() {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Get all students
    const students = await User.find({ role: 'Student' }).lean();
    console.log(`📚 Found ${students.length} students`);

    if (students.length === 0) {
        console.log('❌ No students found. Please add students first.');
        process.exit(1);
    }

    // Delete existing fee records
    await FeeRecord.deleteMany({});
    console.log('🗑️  Cleared existing fee records');

    let receiptIndex = 1;
    const records = [];

    for (const student of students) {
        const courseData = randomItem(COURSES);
        const batch = randomItem(BATCHES);
        const totalFee = courseData.fee;

        // Randomly decide payment status
        const roll = Math.random();
        let transactions = [];

        if (roll < 0.2) {
            // Fully PAID
            const installments = randomInt(1, 3);
            let remaining = totalFee;
            for (let i = 0; i < installments; i++) {
                const amt = i === installments - 1 ? remaining : Math.floor(remaining / (installments - i));
                remaining -= amt;
                transactions.push({
                    receiptNo: generateReceiptNo(receiptIndex++),
                    amount: amt,
                    paymentMode: randomItem(MODES),
                    referenceNo: Math.random() > 0.5 ? `REF-${randomInt(10000, 99999)}` : '',
                    remark: i === 0 ? 'First installment' : i === installments - 1 ? 'Final payment' : 'Installment payment',
                    collectedBy: 'Admin',
                    date: randomPastDate(randomInt(30, 180))
                });
            }
        } else if (roll < 0.6) {
            // PARTIAL — paid some amount
            const paidPercent = randomInt(20, 80) / 100;
            const paidTotal = Math.floor(totalFee * paidPercent);
            const installments = randomInt(1, 2);
            let remaining = paidTotal;

            for (let i = 0; i < installments; i++) {
                const amt = i === installments - 1 ? remaining : Math.floor(remaining / (installments - i));
                remaining -= amt;
                transactions.push({
                    receiptNo: generateReceiptNo(receiptIndex++),
                    amount: amt,
                    paymentMode: randomItem(MODES),
                    referenceNo: Math.random() > 0.5 ? `REF-${randomInt(10000, 99999)}` : '',
                    remark: i === 0 ? 'First installment' : 'Installment payment',
                    collectedBy: 'Admin',
                    date: randomPastDate(randomInt(5, 120))
                });
            }
        }
        // else: PENDING — no transactions

        const record = new FeeRecord({
            student: student._id,
            totalFee,
            course: courseData.name,
            batch,
            nextDueDate: transactions.length === 0
                ? randomFutureDate(randomInt(5, 60))
                : roll < 0.2
                    ? randomFutureDate(randomInt(30, 90))
                    : randomFutureDate(randomInt(10, 45)),
            transactions
        });

        records.push(record);
    }

    // Save all
    for (const record of records) {
        await record.save();
    }

    const paid = records.filter(r => r.status === 'Paid').length;
    const partial = records.filter(r => r.status === 'Partial').length;
    const pending = records.filter(r => r.status === 'Pending').length;

    console.log(`\n🎉 Fee records created: ${records.length}`);
    console.log(`   ✅ Paid:    ${paid}`);
    console.log(`   🟡 Partial: ${partial}`);
    console.log(`   🔴 Pending: ${pending}`);
    console.log(`   🧾 Total receipts generated: ${receiptIndex - 1}`);

    process.exit(0);
}

seedFees().catch(err => {
    console.error('❌ Seed error:', err);
    process.exit(1);
});
