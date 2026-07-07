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
function getSheetsClient() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

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
            sheetName: process.env.GOOGLE_SHEET_NAME || 'Sheet1'
        };
    } catch (err) {
        console.error('❌ Failed to initialize Google Sheets API client:', err.message);
        return null;
    }
}

/**
 * Sheet column layout (A through M — 13 columns):
 * A: FeeRecord ID
 * B: Admission No.
 * C: Name
 * D: Father Name
 * E: Mobile No. 1
 * F: Mobile No. 2
 * G: Date of Joining
 * H: Course Name
 * I: Course Fee
 * J: Extra Charges
 * K: Balance (Pending)
 * L: Months
 * M: Status
 */
const SHEET_RANGE = 'A:M';
const SHEET_LAST_COL = 'M';

const SHEET_HEADER = [
    'FeeRecord ID',
    'Admission No.',
    'Name',
    'Father Name',
    'Mobile No. 1',
    'Mobile No. 2',
    'Date of Joining',
    'Course Name',
    'Course Fee',
    'Extra Charges',
    'Balance',
    'Months',
    'Status'
];

/**
 * Format a fee record document into a row array matching the column layout.
 * Requires `record.student` to be populated with:
 *   name, email, mobileNumber, mobile2, fatherName, admissionNo, studentProfile
 */
function formatRow(record) {
    const student = record.student || {};

    const enrollmentDate = student.studentProfile?.enrollmentDate
        ? new Date(student.studentProfile.enrollmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '';

    const totalExtraCharges = (record.extraCharges || []).reduce((sum, ec) => sum + (ec.amount || 0), 0);
    const extraChargesDetail = (record.extraCharges || [])
        .map(ec => `${ec.label || 'Extra'}: ₹${ec.amount}`)
        .join(', ') || '0';

    return [
        record._id.toString(),                          // A: FeeRecord ID
        student.admissionNo || '',                      // B: Admission No.
        student.name || '',                             // C: Name
        student.fatherName || '',                       // D: Father Name
        student.mobileNumber || '',                     // E: Mobile No. 1
        student.mobile2 || '',                          // F: Mobile No. 2
        enrollmentDate,                                 // G: Date of Joining
        record.course || '',                            // H: Course Name
        record.totalFee || 0,                           // I: Course Fee
        extraChargesDetail,                             // J: Extra Charges
        record.pendingAmount || 0,                      // K: Balance
        record.months || 0,                             // L: Months
        record.status || 'Pending'                      // M: Status
    ];
}

/**
 * Sync a FeeRecord to Google Sheets (Insert or Update)
 */
async function syncToSheets(record) {
    if (isSyncDisabled) {
        console.log('[Google Sheets Sync] Sync is temporarily disabled (webhook origin). Skipping.');
        return;
    }

    const client = getSheetsClient();
    if (!client) return;

    const { sheets, spreadsheetId, sheetName } = client;
    const recordId = record._id.toString();

    try {
        // Ensure student relation is populated with all needed fields
        if (!record.populated('student') && record.student && typeof record.student === 'object' && !record.student.name) {
            await record.populate('student', 'name email mobileNumber mobile2 fatherName admissionNo studentProfile');
        }

        const student = record.student || {};
        console.log(`[Google Sheets Sync] Syncing FeeRecord ${recordId} for ${student.name || 'unknown'}...`);

        const enrollmentDate = student.studentProfile?.enrollmentDate
            ? new Date(student.studentProfile.enrollmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : '';

        const totalExtraCharges = (record.extraCharges || []).reduce((sum, ec) => sum + (ec.amount || 0), 0);

        // Read all values from Column A to Z to find the student
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A1:Z300`,
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

        if (rowIndex !== -1 && matchedRow) {
            // Update existing row (preserve Ledger No. and Month Payments columns)
            console.log(`[Google Sheets Sync] Updating existing row ${rowIndex} in Sheet...`);
            
            // Pad array to ensure at least 12 elements
            while (matchedRow.length < 12) {
                matchedRow.push('');
            }
            
            matchedRow[0] = student.admissionNo || '';
            matchedRow[2] = student.mobileNumber || '';
            matchedRow[3] = student.mobile2 || '';
            matchedRow[4] = enrollmentDate;
            matchedRow[5] = student.name || '';
            matchedRow[6] = student.fatherName || '';
            matchedRow[7] = record.course || '';
            matchedRow[8] = record.totalFee || 0;
            matchedRow[9] = totalExtraCharges || 0;
            matchedRow[10] = record.pendingAmount || 0;
            matchedRow[11] = matchedRow[11] || 'Cash'; // Default payment mode to "Cash"

            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [matchedRow] }
            });
        } else {
            // Append new row matching the new layout
            console.log(`[Google Sheets Sync] Appending new row to Sheet...`);
            const newRow = [
                student.admissionNo || '',
                '', // Ledger No.
                student.mobileNumber || '',
                student.mobile2 || '',
                enrollmentDate,
                student.name || '',
                student.fatherName || '',
                record.course || '',
                record.totalFee || 0,
                totalExtraCharges || 0,
                record.pendingAmount || 0,
                'Cash' // Default Mode to Cash
            ];

            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `${sheetName}!A1:L`,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                resource: { values: [newRow] }
            });
        }
        console.log('✅ [Google Sheets Sync] Successfully synced to Sheets.');
    } catch (err) {
        console.error('❌ [Google Sheets Sync] Error syncing to Sheets:', err.message);
    }
}

/**
 * Remove/Clear a FeeRecord from Google Sheets
 */
async function deleteFromSheets(recordId, admissionNo, studentName) {
    if (isSyncDisabled) return;

    const client = getSheetsClient();
    if (!client) return;

    const { sheets, spreadsheetId, sheetName } = client;

    try {
        console.log(`[Google Sheets Sync] Deleting student from Sheet: AdmNo=${admissionNo}, Name=${studentName}...`);

        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A1:Z300`,
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
                range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
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
 * Note: Import reads columns B(email-replaced by name), H(course), I(totalFee), L(months) for update
 */
async function importFromSheets() {
    const client = getSheetsClient();
    if (!client) throw new Error('Google Sheets client not configured');

    const { sheets, spreadsheetId, sheetName } = client;
    const User = require('../models/User');
    const FeeRecord = require('../models/FeeRecord');

    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!${SHEET_RANGE}`,
    });

    const rows = res.data.values || [];
    if (rows.length <= 1) {
        return { importedCount: 0, message: 'No rows to import' };
    }

    let importedCount = 0;
    const updatedRows = [];
    updatedRows.push(rows[0]); // Keep header

    isSyncDisabled = true;

    try {
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) {
                updatedRows.push([]);
                continue;
            }

            // Map columns
            const id           = row[0]  ? row[0].toString().trim()  : '';  // A
            const admissionNo  = row[1]  ? row[1].toString().trim()  : '';  // B
            const name         = row[2]  ? row[2].toString().trim()  : '';  // C
            const fatherName   = row[3]  ? row[3].toString().trim()  : '';  // D
            const mobile1      = row[4]  ? row[4].toString().trim()  : '';  // E
            const mobile2      = row[5]  ? row[5].toString().trim()  : '';  // F
            // G: date of joining — read-only for import
            const courseName   = row[7]  ? row[7].toString().trim()  : '';  // H
            const totalFee     = row[8]  ? parseFloat(row[8])        : 0;   // I
            // J: extra charges — read-only for import (complex format)
            // K: balance — computed field
            const months       = row[11] ? parseInt(row[11])         : 0;   // L
            // M: status — computed

            if (!name && !id) {
                updatedRows.push(row);
                continue;
            }

            // Find student by admission no or name
            let student = null;
            if (id) {
                try {
                    const feeRec = await FeeRecord.findById(id).populate('student');
                    if (feeRec?.student) student = feeRec.student;
                } catch (_) {}
            }

            if (!student && admissionNo) {
                student = await User.findOne({ admissionNo, role: 'Student' });
            }

            if (!student) {
                if (name) {
                    console.log(`[Import] Student not found. Creating new Student User for name: ${name}...`);
                    const cleanName = name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '.');
                    const suffix = admissionNo ? admissionNo : Math.floor(1000 + Math.random() * 9000);
                    const email = `${cleanName}.${suffix}@lms.com`;
                    const password = 'password123';
                    
                    student = new User({
                        name,
                        email,
                        password,
                        role: 'Student',
                        admissionNo: admissionNo || '',
                        fatherName: fatherName || '',
                        mobileNumber: mobile1 || '',
                        mobile2: mobile2 || '',
                        studentProfile: {
                            batch: '',
                            section: 'A',
                            enrollmentDate: new Date()
                        }
                    });
                    await student.save();
                } else {
                    console.log(`[Import] Skipping row ${i + 1} — no name or admission No provided`);
                    updatedRows.push(row);
                    continue;
                }
            }

            // Update student fields
            if (fatherName) student.fatherName = fatherName;
            if (admissionNo) student.admissionNo = admissionNo;
            if (mobile1) student.mobileNumber = mobile1;
            if (mobile2) student.mobile2 = mobile2;
            await student.save();

            // Find or create FeeRecord
            let record = null;
            if (id) {
                try { record = await FeeRecord.findById(id); } catch (_) {}
            }
            if (!record) {
                record = await FeeRecord.findOne({ student: student._id });
            }
            if (!record) {
                record = new FeeRecord({ student: student._id });
            }

            record.course = courseName || record.course || '';
            record.totalFee = Number(totalFee);
            if (months) record.months = Number(months);

            await record.save();
            importedCount++;

            // Build updated row for write-back
            const updatedRow = formatRow({ ...record.toObject(), student });
            updatedRows.push(updatedRow);
        }

        // Overwrite Sheet with updated data
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1:${SHEET_LAST_COL}${updatedRows.length}`,
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
async function exportToSheets() {
    const client = getSheetsClient();
    if (!client) throw new Error('Google Sheets client not configured');

    const { sheets, spreadsheetId, sheetName } = client;
    const FeeRecord = require('../models/FeeRecord');

    const records = await FeeRecord.find({})
        .populate('student', 'name email mobileNumber mobile2 fatherName admissionNo studentProfile avatar')
        .lean();

    const rows = [SHEET_HEADER];
    records.forEach(record => {
        rows.push(formatRow(record));
    });

    // Clear old data
    await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!${SHEET_RANGE}`,
    });

    // Write all rows
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:${SHEET_LAST_COL}${rows.length}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: rows }
    });

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
