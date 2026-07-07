const mongoose = require('mongoose');
const { google } = require('googleapis');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const User = require('../models/User');
const FeeRecord = require('../models/FeeRecord');
const { setSyncDisabled } = require('../utils/googleSheets');

// Helper to resolve transaction date
function getMonthDate(monthName, joinDateStr) {
    const monthsMap = {
        jan: 0, feb: 1, march: 2, apr: 3, may: 4, june: 5,
        july: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    
    const cleanMonth = monthName.toLowerCase().trim();
    const m = monthsMap[cleanMonth];
    if (m === undefined) return new Date();

    let joinYear = 2026;
    if (joinDateStr) {
        const parts = joinDateStr.split(/[-/]/);
        if (parts.length === 3) {
            const parsedYear = parseInt(parts[2], 10);
            if (!isNaN(parsedYear)) joinYear = parsedYear;
        }
    }

    // If month is Jan/Feb/March, it's next year in the standard academic session (April-March)
    const year = m < 3 ? joinYear + 1 : joinYear;
    return new Date(year, m, 10); // Default to 10th of that month
}

async function main() {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected.');

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    const auth = new google.auth.JWT({
        email,
        key: key.trim().replace(/^"/, '').replace(/"$/, '').replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetName = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

    console.log("Reading sheet rows...");
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:Z`
    });

    const rows = res.data.values || [];
    if (rows.length <= 2) {
        console.log("❌ No student data found.");
        process.exit(0);
    }

    const headers = rows[1]; // Row 2 has headers
    console.log("Headers:", headers);

    // Identify month columns (index 12 onwards)
    const monthColumns = [];
    const monthsList = ['jan', 'feb', 'march', 'apr', 'may', 'june', 'july', 'aug', 'sep', 'oct', 'nov', 'dec'];
    
    for (let col = 12; col < headers.length; col++) {
        const headerName = headers[col] ? headers[col].toLowerCase().trim() : '';
        if (monthsList.includes(headerName)) {
            monthColumns.push({ colIndex: col, name: headers[col] });
        }
    }
    console.log(`Detected Month Columns (count: ${monthColumns.length}):`, monthColumns.map(m => m.name));

    // Disable sync to sheets to prevent write-back loops
    setSyncDisabled(true);
    let updatedCount = 0;

    try {
        for (let i = 2; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const admissionNo = row[0] ? row[0].toString().trim() : '';
            const dateOfJoiningStr = row[4] ? row[4].toString().trim() : '';
            const name = row[5] ? row[5].toString().trim() : '';

            if (!name) continue;

            // Find student
            let student = null;
            if (admissionNo) {
                student = await User.findOne({ admissionNo, role: 'Student' });
            }
            if (!student) {
                student = await User.findOne({ name, role: 'Student' });
            }

            if (!student) {
                console.log(`⚠️ Student not found in DB for row ${i + 1}: ${name}`);
                continue;
            }

            // Find or create FeeRecord
            let record = await FeeRecord.findOne({ student: student._id });
            if (!record) {
                record = new FeeRecord({ student: student._id });
            }

            // Build transactions list from month columns
            const transactions = [];
            for (const month of monthColumns) {
                const cellVal = row[month.colIndex];
                if (cellVal) {
                    const amount = parseFloat(cellVal.toString().trim());
                    if (!isNaN(amount) && amount > 0) {
                        const receiptNo = `R-${admissionNo || '0'}-${month.name.toUpperCase()}`;
                        transactions.push({
                            receiptNo,
                            amount,
                            paymentMode: 'Cash',
                            remark: `${month.name} Payment`,
                            date: getMonthDate(month.name, dateOfJoiningStr),
                            collectedBy: 'Admin'
                        });
                    }
                }
            }

            record.transactions = transactions;
            await record.save();
            updatedCount++;
            console.log(`👤 Updated ${transactions.length} payments for student: ${student.name}`);
        }
    } finally {
        setSyncDisabled(false);
    }

    console.log(`✅ Completed payments history sync! Updated ${updatedCount} students.`);
    await mongoose.disconnect();
    process.exit(0);
}

main().catch(console.error);
