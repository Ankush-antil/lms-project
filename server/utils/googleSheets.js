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

        console.log(`[Google Sheets Sync] Syncing FeeRecord ${recordId} for ${record.student?.name || 'unknown'}...`);

        // Read all values from Column A (FeeRecord ID) to find if the record exists
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A:A`,
        });

        const rows = res.data.values || [];
        let rowIndex = -1;

        // Search for the ID in Column A (skip header at index 0)
        for (let i = 1; i < rows.length; i++) {
            if (rows[i][0] === recordId) {
                rowIndex = i + 1; // 1-indexed row number
                break;
            }
        }

        const rowData = formatRow(record);

        if (rowIndex !== -1) {
            // Update existing row
            console.log(`[Google Sheets Sync] Updating row ${rowIndex} in Sheet...`);
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheetName}!A${rowIndex}:${SHEET_LAST_COL}${rowIndex}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [rowData] }
            });
        } else {
            // Append new row
            console.log(`[Google Sheets Sync] Appending new row to Sheet...`);
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `${sheetName}!${SHEET_RANGE}`,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                resource: { values: [rowData] }
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
async function deleteFromSheets(recordId) {
    if (isSyncDisabled) return;

    const client = getSheetsClient();
    if (!client) return;

    const { sheets, spreadsheetId, sheetName } = client;

    try {
        console.log(`[Google Sheets Sync] Deleting FeeRecord ${recordId} from Sheet...`);

        // Read Column A to find the row
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A:A`,
        });

        const rows = res.data.values || [];
        let rowIndex = -1;

        for (let i = 1; i < rows.length; i++) {
            if (rows[i][0] === recordId.toString()) {
                rowIndex = i + 1;
                break;
            }
        }

        if (rowIndex !== -1) {
            console.log(`[Google Sheets Sync] Clearing row ${rowIndex} in Sheet...`);
            await sheets.spreadsheets.values.clear({
                spreadsheetId,
                range: `${sheetName}!A${rowIndex}:${SHEET_LAST_COL}${rowIndex}`,
            });
            console.log('✅ [Google Sheets Sync] Successfully cleared row from Sheets.');
        } else {
            console.log(`[Google Sheets Sync] FeeRecord ${recordId} not found in Sheet. Nothing to delete.`);
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
                console.log(`[Import] Skipping row ${i + 1} — cannot identify student`);
                updatedRows.push(row);
                continue;
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
