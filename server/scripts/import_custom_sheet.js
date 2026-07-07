/**
 * Custom import script for the new Google Sheets layout.
 * Automatically creates student users and links them to FeeRecords.
 * Run: node server/scripts/import_custom_sheet.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { google } = require('googleapis');
const User = require('../models/User');
const FeeRecord = require('../models/FeeRecord');
const Course = require('../models/Course');
const Institute = require('../models/Institute');
const { setSyncDisabled } = require('../utils/googleSheets');

// Robust date parser helper
const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    
    // Parse DD-MM-YYYY (e.g. "1-4-2026")
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // 0-indexed month
        const year = parseInt(parts[2], 10);
        const parsedD = new Date(year, month, day);
        if (!isNaN(parsedD.getTime())) return parsedD;
    }
    return new Date();
};

async function main() {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected.');

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    
    if (!email || !key || !spreadsheetId) {
        console.error('❌ Google Sheets credentials missing in .env');
        process.exit(1);
    }

    const auth = new google.auth.JWT({
        email,
        key: key.trim().replace(/^"/, '').replace(/"$/, '').replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetName = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

    console.log(`📥 Fetching data from spreadsheet: ${spreadsheetId}...`);
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:M200`,
    });

    const rows = res.data.values || [];
    if (rows.length <= 2) {
        console.log('❌ No student rows found in the sheet (row count <= 2).');
        process.exit(0);
    }

    console.log(`📊 Processing ${rows.length - 2} rows from Google Sheets...`);
    let importedCount = 0;

    // TEMPORARILY DISABLE SHEET SYNC DURING IMPORT TO PREVENT WRITE-BACK LOOPS
    setSyncDisabled(true);

    try {
        // Start from Row 3 (index 2) to skip metadata and header rows
        for (let i = 2; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            // Map column offsets
            const admissionNo = row[0] ? row[0].toString().trim() : '';
            const mobile1 = row[2] ? row[2].toString().trim() : '';
            const mobile2 = row[3] ? row[3].toString().trim() : '';
            const dateOfJoiningStr = row[4] ? row[4].toString().trim() : '';
            const name = row[5] ? row[5].toString().trim() : '';
            const fatherName = row[6] ? row[6].toString().trim() : '';
            const courseName = row[7] ? row[7].toString().trim() : '';
            const totalFee = row[8] ? parseFloat(row[8]) : 0;
            const fine = row[9] ? parseFloat(row[9]) : 0;
            const balance = row[10] ? parseFloat(row[10]) : 0;

            if (!name) {
                console.log(`⚠️ Row ${i + 1} skipped: Name is empty.`);
                continue;
            }

            // Try to find existing student by admissionNo or name
            let student = null;
            if (admissionNo) {
                student = await User.findOne({ admissionNo, role: 'Student' });
            }
            if (!student) {
                student = await User.findOne({ name, role: 'Student' });
            }

            const enrollmentDate = parseDate(dateOfJoiningStr);

            let defaultInst = await Institute.findOne({ name: /hartron/i });
            if (!defaultInst) defaultInst = await Institute.findOne({});
            const instId = defaultInst ? defaultInst._id : null;

            let courseDoc = null;
            if (courseName) {
                courseDoc = await Course.findOne({ name: { $regex: new RegExp("^" + courseName.trim() + "$", "i") } });
                if (!courseDoc) {
                    if (instId) {
                        console.log(`[Import] Course ${courseName} not found. Creating it...`);
                        const courseCode = courseName.toUpperCase().replace(/[^A-Z0-9]/g, '');
                        courseDoc = new Course({
                            name: courseName,
                            code: courseCode || 'TEMP',
                            institute: instId
                        });
                        await courseDoc.save().catch(err => {
                            console.log(`⚠️ Failed to create course: ${err.message}`);
                            courseDoc = null;
                        });
                    }
                }
            }

            // Generate unique email if student is new
            if (!student) {
                const cleanName = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '').replace(/\s+/g, '.');
                const suffix = admissionNo ? admissionNo : Math.floor(1000 + Math.random() * 9000);
                const email = `${cleanName}.${suffix}@lms.com`;
                const password = 'password123';

                console.log(`👤 Creating new Student: ${name} (Email: ${email})`);
                student = new User({
                    name,
                    email,
                    password,
                    role: 'Student',
                    admissionNo: admissionNo || '',
                    fatherName: fatherName || '',
                    mobileNumber: mobile1 || '',
                    mobile2: mobile2 || '',
                    institute: instId,
                    studentProfile: {
                        course: courseDoc ? courseDoc._id : undefined,
                        batch: 'Batch-A',
                        section: 'A',
                        enrollmentDate: enrollmentDate
                    }
                });
                await student.save();
            } else {
                // Update existing student details
                console.log(`👤 Updating existing Student: ${name}`);
                student.admissionNo = admissionNo || student.admissionNo || '';
                student.fatherName = fatherName || student.fatherName || '';
                student.mobileNumber = mobile1 || student.mobileNumber || '';
                student.mobile2 = mobile2 || student.mobile2 || '';
                student.institute = instId || student.institute;
                if (!student.studentProfile) student.studentProfile = {};
                student.studentProfile.enrollmentDate = enrollmentDate;
                if (courseDoc) {
                    student.studentProfile.course = courseDoc._id;
                }
                await student.save();
            }

            // Find or create FeeRecord
            let record = await FeeRecord.findOne({ student: student._id });
            if (!record) {
                record = new FeeRecord({ student: student._id });
            }

            record.course = courseName || record.course || '';
            record.totalFee = isNaN(totalFee) ? 0 : totalFee;
            
            // Handle extra charges / fine
            if (!isNaN(fine) && fine > 0) {
                record.extraCharges = [{
                    label: 'Fine',
                    amount: fine,
                    remark: 'Imported Fine'
                }];
                record.totalFee += fine;
            }

            // Save record (pre-save hook will automatically compute paidAmount, pendingAmount, status)
            await record.save();
            
            // Force sync details to match balance sheet if there is custom payment
            if (!isNaN(balance)) {
                record.pendingAmount = balance;
                record.paidAmount = Math.max(0, record.totalFee - balance);
                if (record.pendingAmount === 0) record.status = 'Paid';
                else if (record.paidAmount > 0) record.status = 'Partial';
                else record.status = 'Pending';
                
                // Bypass hooks to set specific balance values
                await FeeRecord.updateOne({ _id: record._id }, {
                    $set: {
                        pendingAmount: record.pendingAmount,
                        paidAmount: record.paidAmount,
                        status: record.status
                    }
                });
            }

            importedCount++;
        }
    } finally {
        // ALWAYS RE-ENABLE SHEET SYNC HOOKS AT THE END
        setSyncDisabled(false);
    }

    console.log(`✅ Completed custom import! Processed ${importedCount} students.`);
    await mongoose.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error during import:', err.message);
    process.exit(1);
});
