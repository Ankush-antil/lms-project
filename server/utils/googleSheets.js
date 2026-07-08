const { google } = require('googleapis');

// Flag to temporarily disable sync (prevents sync loops)
let isSyncDisabled = false;

function setSyncDisabled(value) {
    isSyncDisabled = value;
}

function getSyncDisabled() {
    return isSyncDisabled;
}

/**
 * Get Google Sheets API client
 */
async function getSheetsClient(instId = null) {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY;
    
    let spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    let sheetName = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

    if (instId) {
        try {
            const Institute = require('../models/Institute');
            const inst = await Institute.findById(instId);
            if (inst && inst.googleSpreadsheetId) {
                spreadsheetId = inst.googleSpreadsheetId;
                if (inst.googleSheetName) {
                    sheetName = inst.googleSheetName;
                }
            }
        } catch (e) {
            console.error('Error fetching institute sheet configuration:', e.message);
        }
    }

    if (!email || !key || !spreadsheetId) {
        console.warn('⚠️ Google Sheets Sync is not fully configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SPREADSHEET_ID in .env');
        return null;
    }

    try {
        const auth = new google.auth.JWT({
            email,
            key: key.trim().replace(/^"/, '').replace(/"$/, '').replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        return {
            sheets: google.sheets({ version: 'v4', auth }),
            spreadsheetId,
            sheetName
        };
    } catch (err) {
        console.error('❌ Failed to initialize Google Sheets API client:', err.message);
        return null;
    }
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MONTHLY_HEADERS = [];
MONTH_NAMES.forEach(month => {
    MONTHLY_HEADERS.push(`${month} Fee`);
    MONTHLY_HEADERS.push(`${month} Fee Mode`);
    MONTHLY_HEADERS.push(`${month} Extra Name`);
    MONTHLY_HEADERS.push(`${month} Extra Amount`);
    MONTHLY_HEADERS.push(`${month} Extra Mode`);
});

const SHEET_RANGE = 'A:BT';
const SHEET_LAST_COL = 'BT';

const SHEET_HEADER = [
    'Adm. no.',
    'Ledger  No.',
    'Mobile no.',
    'Mobile1',
    'Date of Joining ',
    'Name ',
    'Father name',
    'Course Name',
    'Course fees',
    'fine',
    'Balance',
    'Mode',
    ...MONTHLY_HEADERS
];

/**
 * Format a fee record document into a row array matching the column layout.
 */
function formatRow(record) {
    const student = record.student || {};

    const enrollmentDate = student.studentProfile?.enrollmentDate
        ? new Date(student.studentProfile.enrollmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '';

    const totalExtraCharges = (record.extraCharges || []).reduce((sum, ec) => sum + (ec.amount || 0), 0);
    const courseName = student.studentProfile?.course?.name || record.course || '';
    
    // Find payment mode from transactions
    let mode = 'Cash';
    if (record.transactions && record.transactions.length > 0) {
        mode = record.transactions[record.transactions.length - 1].paymentMode || 'Cash';
    }

    // Group transactions and extra charges by month
    const monthlyData = {};
    MONTH_NAMES.forEach(month => {
        monthlyData[month] = {
            feePaid: 0,
            feeModes: new Set(),
            extraNames: [],
            extraAmounts: [],
            extraModes: new Set()
        };
    });

    const extraCharges = record.extraCharges || [];
    const transactions = record.transactions || [];

    // Process extra charges
    extraCharges.forEach(ec => {
        const d = ec.date || record.updatedAt || new Date();
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return;
        const monthName = MONTH_NAMES[dateObj.getMonth()];
        
        monthlyData[monthName].extraNames.push(ec.label || 'Extra');
        monthlyData[monthName].extraAmounts.push(ec.amount || 0);
    });

    // Process transactions
    transactions.forEach(t => {
        if (!t.date) return;
        const dateObj = new Date(t.date);
        if (isNaN(dateObj.getTime())) return;
        const monthName = MONTH_NAMES[dateObj.getMonth()];
        const remarkLower = (t.remark || '').toLowerCase();
        
        // Match transactions to extra charges by remark label
        let isExtraPayment = false;
        extraCharges.forEach(ec => {
            const labelLower = (ec.label || '').toLowerCase();
            if (labelLower && remarkLower.includes(labelLower)) {
                isExtraPayment = true;
            }
        });

        if (isExtraPayment) {
            if (t.paymentMode) {
                monthlyData[monthName].extraModes.add(t.paymentMode);
            }
        } else {
            monthlyData[monthName].feePaid += (t.amount || 0);
            if (t.paymentMode) {
                monthlyData[monthName].feeModes.add(t.paymentMode);
            }
        }
    });

    // Fallback: associate extra charges with any payment transaction in the same month if no exact remark match
    extraCharges.forEach(ec => {
        if (!ec.date) return;
        const dateObj = new Date(ec.date);
        if (isNaN(dateObj.getTime())) return;
        const monthName = MONTH_NAMES[dateObj.getMonth()];
        
        if (monthlyData[monthName].extraModes.size === 0) {
            transactions.forEach(t => {
                const tDateObj = new Date(t.date);
                if (!isNaN(tDateObj.getTime()) && MONTH_NAMES[tDateObj.getMonth()] === monthName) {
                    if (t.paymentMode) {
                        monthlyData[monthName].extraModes.add(t.paymentMode);
                    }
                }
            });
        }
    });

    const rowValues = [
        student.admissionNo || '',                      // A: Adm. no.
        student.studentProfile?.ledgerNo || '',         // B: Ledger No.
        student.mobileNumber || '',                     // C: Mobile no.
        student.mobile2 || '',                          // D: Mobile1
        enrollmentDate,                                 // E: Date of Joining
        student.name || '',                             // F: Name
        student.fatherName || '',                       // G: Father name
        courseName,                                     // H: Course Name
        record.totalFee || 0,                           // I: Course Fee
        totalExtraCharges || 0,                         // J: fine
        record.pendingAmount || 0,                      // K: Balance
        mode                                            // L: Mode
    ];

    MONTH_NAMES.forEach(month => {
        const m = monthlyData[month];
        rowValues.push(m.feePaid || '');
        rowValues.push(Array.from(m.feeModes).join(', ') || '');
        rowValues.push(m.extraNames.join(', ') || '');
        rowValues.push(m.extraAmounts.join(', ') || '');
        rowValues.push(Array.from(m.extraModes).join(', ') || '');
    });

    return rowValues;
}

/**
 * Helper to apply soft green background formatting to columns M to BT (index 12 to 71)
 */
async function applyGreenFormatting(sheets, spreadsheetId, sheetName, startRow, endRow) {
    try {
        const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
        const sheet = sheetMetadata.data.sheets.find(s => s.properties.title === sheetName);
        const sheetId = sheet ? sheet.properties.sheetId : 0;

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [
                    {
                        repeatCell: {
                            range: {
                                sheetId: sheetId,
                                startRowIndex: startRow,
                                endRowIndex: endRow,
                                startColumnIndex: 12,
                                endColumnIndex: 72
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: {
                                        red: 0.718,
                                        green: 0.882,
                                        blue: 0.804
                                    }
                                }
                            },
                            fields: 'userEnteredFormat.backgroundColor'
                        }
                    }
                ]
            }
        });
    } catch (err) {
        console.error('⚠️ [Google Sheets Formatting] Failed to apply background color:', err.message);
    }
}

/**
 * Sync a FeeRecord to Google Sheets (Insert or Update)
 */
async function syncToSheets(record) {
    if (isSyncDisabled) {
        console.log('[Google Sheets Sync] Sync is temporarily disabled (webhook origin). Skipping.');
        return;
    }

    let instId = null;
    if (record.student) {
        if (record.student.institute) {
            instId = record.student.institute.toString();
        } else {
            try {
                const User = require('../models/User');
                const user = await User.findById(record.student).select('institute');
                if (user && user.institute) {
                    instId = user.institute.toString();
                }
            } catch (e) {}
        }
    }

    const client = await getSheetsClient(instId);
    if (!client) return;

    const { sheets, spreadsheetId, sheetName } = client;
    const recordId = record._id.toString();

    try {
        // Ensure student relation is populated with all needed fields
        if (record.student) {
            await record.populate({
                path: 'student',
                select: 'name email mobileNumber mobile2 fatherName admissionNo studentProfile',
                populate: { path: 'studentProfile.course', select: 'name' }
            });
        }

        const student = record.student || {};
        console.log(`[Google Sheets Sync] Syncing FeeRecord ${recordId} for ${student.name || 'unknown'}...`);

        // Read all values from Column A to BT to find the student
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A1:BT1000`,
        });

        const rows = res.data.values || [];
        let rowIndex = -1;
        let matchedRow = null;

        // Search for student row by Admission No. or Name
        for (let i = 2; i < rows.length; i++) {
            const row = rows[i];
            if (!row) continue;
            const rowAdmNo = row[0] ? row[0].toString().trim() : '';
            const rowName = row[5] ? row[5].toString().trim().toLowerCase() : '';
            const targetAdmNo = student.admissionNo ? student.admissionNo.toString().trim() : '';
            const targetName = student.name ? student.name.toString().trim().toLowerCase() : '';

            if ((targetAdmNo && rowAdmNo === targetAdmNo) || (targetName && rowName === targetName)) {
                rowIndex = i + 1; // 1-indexed row number
                matchedRow = row;
                break;
            }
        }

        const updatedRow = formatRow(record);

        if (rowIndex !== -1 && matchedRow) {
            console.log(`[Google Sheets Sync] Updating existing row ${rowIndex} in Sheet...`);
            // Preserve Ledger No from the sheet if not set in DB
            if (matchedRow[1] && !updatedRow[1]) {
                updatedRow[1] = matchedRow[1];
            }
            // Preserve Mode from sheet if default in DB
            if (matchedRow[11] && updatedRow[11] === 'Cash') {
                updatedRow[11] = matchedRow[11];
            }

            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheetName}!A${rowIndex}:BT${rowIndex}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [updatedRow] }
            });
        } else {
            console.log(`[Google Sheets Sync] Appending new row to Sheet...`);
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `${sheetName}!A1:BT`,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                resource: { values: [updatedRow] }
            });
        }
        
        // Apply soft green background to columns M to BT for all data rows (Row 3 onwards)
        await applyGreenFormatting(sheets, spreadsheetId, sheetName, 2, 1000);
        console.log('✅ [Google Sheets Sync] Successfully synced to Sheets.');
    } catch (err) {
        console.error('❌ [Google Sheets Sync] Error syncing to Sheets:', err.message);
    }
}

/**
 * Remove/Clear a FeeRecord from Google Sheets
 */
async function deleteFromSheets(recordId, admissionNo, studentName, instId = null) {
    if (isSyncDisabled) return;

    const client = await getSheetsClient(instId);
    if (!client) return;

    const { sheets, spreadsheetId, sheetName } = client;

    try {
        console.log(`[Google Sheets Sync] Deleting student from Sheet: AdmNo=${admissionNo}, Name=${studentName}...`);

        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A1:BT1000`,
        });

        const rows = res.data.values || [];
        let rowIndex = -1;

        // Search for student row by Admission No. or Name
        for (let i = 2; i < rows.length; i++) {
            const row = rows[i];
            if (!row) continue;
            const rowAdmNo = row[0] ? row[0].toString().trim() : '';
            const rowName = row[5] ? row[5].toString().trim().toLowerCase() : '';
            const targetAdmNo = admissionNo ? admissionNo.toString().trim() : '';
            const targetName = studentName ? studentName.toString().trim().toLowerCase() : '';

            if ((targetAdmNo && rowAdmNo === targetAdmNo) || (targetName && rowName === targetName)) {
                rowIndex = i + 1; // 1-indexed row number
                break;
            }
        }

        if (rowIndex !== -1) {
            console.log(`[Google Sheets Sync] Clearing row ${rowIndex} in Sheet...`);
            await sheets.spreadsheets.values.clear({
                spreadsheetId,
                range: `${sheetName}!A${rowIndex}:BT${rowIndex}`,
            });
            console.log('✅ [Google Sheets Sync] Successfully cleared row from Sheets.');
        } else {
            console.log(`[Google Sheets Sync] Student not found in Sheet. Nothing to delete.`);
        }
    } catch (err) {
        console.error('❌ [Google Sheets Sync] Error deleting from Sheets:', err.message);
    }
}

/**
 * Import all data from Google Sheets into MongoDB
 */
async function importFromSheets(instId = null) {
    const User = require('../models/User');
    const FeeRecord = require('../models/FeeRecord');
    const Course = require('../models/Course');
    const Institute = require('../models/Institute');

    if (!instId) {
        const defaultInst = await Institute.findOne({ name: /hartron/i }) || await Institute.findOne({});
        instId = defaultInst ? defaultInst._id : null;
    }

    const client = await getSheetsClient(instId);
    if (!client) throw new Error('Google Sheets client not configured');

    const { sheets, spreadsheetId, sheetName } = client;

    // Robust date parser helper
    const parseDate = (dateStr) => {
        if (!dateStr) return new Date();
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d;
        const parts = dateStr.split(/[-/]/);
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            const parsedD = new Date(year, month, day);
            if (!isNaN(parsedD.getTime())) return parsedD;
        }
        return new Date();
    };

    console.log(`[Google Sheets Import] Fetching range A:BT from: ${spreadsheetId}...`);
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:BT`,
    });

    const rows = res.data.values || [];
    if (rows.length <= 2) {
        return { importedCount: 0, message: 'No student rows found' };
    }

    let importedCount = 0;
    const updatedRows = [];
    updatedRows.push(rows[0]); // Metadata row
    updatedRows.push(rows[1]); // Header row

    isSyncDisabled = true;

    try {
        // Start from Row 3 (index 2)
        for (let i = 2; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) {
                updatedRows.push([]);
                continue;
            }

            // Map custom columns:
            const admissionNo  = row[0] ? row[0].toString().trim() : '';  // A: Adm. no.
            const ledgerNo     = row[1] ? row[1].toString().trim() : '';  // B: Ledger No.
            const mobile1      = row[2] ? row[2].toString().trim() : '';  // C: Mobile no.
            const mobile2      = row[3] ? row[3].toString().trim() : '';  // D: Mobile1
            const joiningStr   = row[4] ? row[4].toString().trim() : '';  // E: Date of Joining
            const name         = row[5] ? row[5].toString().trim() : '';  // F: Name
            const fatherName   = row[6] ? row[6].toString().trim() : '';  // G: Father name
            const courseName   = row[7] ? row[7].toString().trim() : '';  // H: Course Name
            const totalFee     = row[8] ? parseFloat(row[8]) : 0;   // I: Course fees
            const fine         = row[9] ? parseFloat(row[9]) : 0;   // J: fine
            const balance      = row[10] ? parseFloat(row[10]) : 0;  // K: Balance
            const mode         = row[11] ? row[11].toString().trim() : 'Cash'; // L: Mode

            if (!name) {
                updatedRows.push(row);
                continue;
            }

            // Try to find existing student by ledgerNo or compound fields
            let student = null;
            if (ledgerNo && instId) {
                student = await User.findOne({ "studentProfile.ledgerNo": ledgerNo, institute: instId, role: 'Student' });
            }
            if (!student && instId) {
                const query = { name, institute: instId, role: 'Student' };
                if (fatherName) query.fatherName = fatherName;
                if (admissionNo) query.admissionNo = admissionNo;
                student = await User.findOne(query);
            }

            const enrollmentDate = parseDate(joiningStr);

            // Generate unique email if student is new
            if (!student) {
                console.log(`[Import] Creating new Student: ${name}`);
                const cleanName = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '').replace(/\s+/g, '.');
                let suffix = ledgerNo || Math.floor(10000 + Math.random() * 90000);
                let email = `${cleanName}.${suffix}@lms.com`;
                let emailExists = await User.findOne({ email });
                let attempts = 0;
                while (emailExists && attempts < 10) {
                    suffix = `${ledgerNo || 'rand'}-${Math.floor(1000 + Math.random() * 9000)}`;
                    email = `${cleanName}.${suffix}@lms.com`;
                    emailExists = await User.findOne({ email });
                    attempts++;
                }

                student = new User({
                    name,
                    email,
                    password: 'password123',
                    role: 'Student',
                    admissionNo: admissionNo || '',
                    fatherName: fatherName || '',
                    mobileNumber: mobile1 || '',
                    mobile2: mobile2 || '',
                    institute: instId,
                    studentProfile: {
                        ledgerNo: ledgerNo || '',
                        batch: 'Batch-A',
                        section: 'A',
                        enrollmentDate: enrollmentDate
                    }
                });
                await student.save();
            } else {
                // Update existing student details
                student.admissionNo = admissionNo || student.admissionNo || '';
                student.fatherName = fatherName || student.fatherName || '';
                student.mobileNumber = mobile1 || student.mobileNumber || '';
                student.mobile2 = mobile2 || student.mobile2 || '';
                student.institute = instId || student.institute;
                if (!student.studentProfile) student.studentProfile = {};
                student.studentProfile.ledgerNo = ledgerNo || student.studentProfile.ledgerNo || '';
                student.studentProfile.enrollmentDate = enrollmentDate;
            }

            // Link Course
            let courseDoc = null;
            if (courseName) {
                const courseCode = courseName.toUpperCase().replace(/[^A-Z0-9]/g, '');

                const escapedCourseName = courseName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                courseDoc = await Course.findOne({ 
                    institute: instId, 
                    name: { $regex: new RegExp("^" + escapedCourseName + "$", "i") } 
                });

                if (!courseDoc) {
                    courseDoc = await Course.findOne({
                        institute: instId,
                        $or: [
                            { name: { $regex: new RegExp("^" + escapedCourseName, "i") } },
                            { name: { $regex: new RegExp(escapedCourseName + ".*", "i") } }
                        ]
                    });
                }

                if (!courseDoc && courseCode) {
                    courseDoc = await Course.findOne({ 
                        institute: instId, 
                        code: courseCode 
                    });
                }

                if (!courseDoc && instId) {
                    console.log(`[Import] Course ${courseName} not found. Creating it...`);
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

                if (courseDoc) {
                    if (!student.studentProfile) student.studentProfile = {};
                    student.studentProfile.course = courseDoc._id;
                }
            }

            await student.save();

            // Find or create FeeRecord
            let record = await FeeRecord.findOne({ student: student._id });
            if (!record) {
                record = new FeeRecord({ student: student._id });
            }

            record.course = courseName || record.course || '';
            record.totalFee = isNaN(totalFee) ? 0 : totalFee;
            if (courseDoc && courseDoc.duration) {
                record.months = courseDoc.duration;
            }

            // Handle extra charges / fine
            if (!isNaN(fine) && fine > 0) {
                record.extraCharges = [{
                    label: 'Fine',
                    amount: fine,
                    remark: 'Imported Fine'
                }];
                record.totalFee += fine;
            }

            await record.save();

            // Update balance
            if (!isNaN(balance)) {
                record.pendingAmount = balance;
                record.paidAmount = Math.max(0, record.totalFee - balance);
                if (record.pendingAmount === 0) record.status = 'Paid';
                else if (record.paidAmount > 0) record.status = 'Partial';
                else record.status = 'Pending';
                
                await FeeRecord.updateOne({ _id: record._id }, {
                    $set: {
                        pendingAmount: record.pendingAmount,
                        paidAmount: record.paidAmount,
                        status: record.status
                    }
                });
            }

            importedCount++;
            
            // Build updated row for write-back
            const updatedRow = formatRow({ ...record.toObject(), student });
            updatedRows.push(updatedRow);
        }

        // Overwrite Sheet with updated layout data
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1:BT${updatedRows.length}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: updatedRows }
        });

        return { success: true, importedCount };
    } finally {
        isSyncDisabled = false;
    }
}

/**
 * Export all data from MongoDB into Google Sheets
 */
async function exportToSheets(instId = null) {
    const client = await getSheetsClient(instId);
    if (!client) throw new Error('Google Sheets client not configured');

    const { sheets, spreadsheetId, sheetName } = client;
    const FeeRecord = require('../models/FeeRecord');
    const User = require('../models/User');

    let query = {};
    if (instId) {
        const studentIds = await User.find({ institute: instId, role: 'Student' }).distinct('_id');
        query = { student: { $in: studentIds } };
    }

    const records = await FeeRecord.find(query)
        .populate({
            path: 'student',
            select: 'name email mobileNumber mobile2 fatherName admissionNo studentProfile avatar',
            populate: { path: 'studentProfile.course', select: 'name' }
        });

    const rows = [SHEET_HEADER];
    records.forEach(record => {
        rows.push(formatRow(record));
    });

    // Clear old data starting from Row 2 to protect Row 1 formulas
    await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A2:${SHEET_LAST_COL}1000`,
    });

    // Write all rows starting at Row 2 (A2)
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A2:${SHEET_LAST_COL}${rows.length + 1}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: rows }
    });

    // Apply soft green background to columns M to BT for all data rows (Row 3 onwards)
    await applyGreenFormatting(sheets, spreadsheetId, sheetName, 2, 1000);

    return { success: true, exportedCount: records.length };
}

module.exports = {
    syncToSheets,
    deleteFromSheets,
    setSyncDisabled,
    getSyncDisabled,
    importFromSheets,
    exportToSheets
};
