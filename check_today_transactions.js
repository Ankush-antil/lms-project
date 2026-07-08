const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });
const connectDB = require('./server/config/db');
const FeeRecord = require('./server/models/FeeRecord');
const User = require('./server/models/User');

async function check() {
    await connectDB();
    console.log('Connected to DB');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    console.log('Today boundary (local):', today.toString(), 'ISO:', today.toISOString());

    const records = await FeeRecord.find({}).populate('student', 'name');
    console.log('Total Fee Records in DB:', records.length);

    let count = 0;
    let sum = 0;
    const matchingTx = [];

    records.forEach(r => {
        (r.transactions || []).forEach(t => {
            const tDate = new Date(t.date);
            if (tDate >= today) {
                count++;
                sum += t.amount;
                matchingTx.push({
                    studentName: r.student ? r.student.name : 'Unknown',
                    amount: t.amount,
                    date: t.date,
                    receiptNo: t.receiptNo,
                    remark: t.remark
                });
            }
        });
    });

    console.log(`\nFound ${count} transactions matching tDate >= today, Total Amount: ₹${sum}`);
    console.log('Matching Transactions:', JSON.stringify(matchingTx, null, 2));

    process.exit(0);
}

check().catch(e => {
    console.error(e);
    process.exit(1);
});
