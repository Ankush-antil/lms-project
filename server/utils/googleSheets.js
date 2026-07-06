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
        const auth = new google.auth.JWT(
            email,
            null,
            key.replace(/\\n/g, '\n'),
            ['https://www.googleapis.com/auth/spreadsheets']
        );
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
 * Format a fee record document into a row array matching the target columns:
 * A: FeeRecord ID, B: Student Email, C: Student Name, D: Course, E: Batch, F: Total Fee, G: Paid Amount, H: Pending Amount, I: Status, J: Next Due Date
 */
function formatRow(record) {
    const student = record.student || {};
    return [
        record._id.toString(),
        student.email || '',
        student.name || '',
        record.course || '',
        record.batch || '',
        record.totalFee || 0,
        record.paidAmount || 0,
        record.pendingAmount || 0,
        record.status || 'Pending',
        record.nextDueDate ? new Date(record.nextDueDate).toISOString().split('T')[0] : ''
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
        // Ensure student relation is populated
        if (!record.populated('student') && record.student && typeof record.student === 'object' && !record.student.email) {
            await record.populate('student', 'name email');
        }

        console.log(`[Google Sheets Sync] Syncing FeeRecord ${recordId} for ${record.student?.email || 'unknown'}...`);

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
            // Update existing row (update columns A to J)
            console.log(`[Google Sheets Sync] Updating row ${rowIndex} in Sheet...`);
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheetName}!A${rowIndex}:J${rowIndex}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [rowData] }
            });
        } else {
            // Check if there is an empty row or simply append to the end
            console.log(`[Google Sheets Sync] Appending new row to Sheet...`);
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `${sheetName}!A:J`,
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
            // Instead of deleting the row structure, we clear the data values
            // This is clean and matches edits/blanking rows
            console.log(`[Google Sheets Sync] Clearing row ${rowIndex} in Sheet...`);
            await sheets.spreadsheets.values.clear({
                spreadsheetId,
                range: `${sheetName}!A${rowIndex}:J${rowIndex}`,
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
 */
async function importFromSheets() {
    const client = getSheetsClient();
    if (!client) throw new Error('Google Sheets client not configured');

    const { sheets, spreadsheetId, sheetName } = client;
    const User = require('../models/User');
    const FeeRecord = require('../models/FeeRecord');

    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:J`,
    });

    const rows = res.data.values || [];
    if (rows.length <= 1) {
        return { importedCount: 0, message: 'No rows to import' };
    }

    let importedCount = 0;
    const updatedRows = [];
    updatedRows.push(rows[0]); // Header

    isSyncDisabled = true;

    try {
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) {
                updatedRows.push([]);
                continue;
            }

            const id = row[0] ? row[0].toString().trim() : '';
            const email = row[1] ? row[1].toString().trim() : '';
            const name = row[2] ? row[2].toString().trim() : '';
            const course = row[3] ? row[3].toString().trim() : '';
            const batch = row[4] ? row[4].toString().trim() : '';
            const totalFee = row[5] ? parseFloat(row[5]) : 0;
            const nextDueDate = row[9] ? row[9].toString().trim() : '';

            if (!email) {
                updatedRows.push(row);
                continue;
            }

            // Find or create student
            let student = await User.findOne({ email, role: 'Student' });
            if (!student) {
                console.log(`[Import] Creating student user for ${email}...`);
                student = new User({
                    name: name || email.split('@')[0],
                    email,
                    password: '123456',
                    role: 'Student'
                });
                await student.save();
            }

            // Find or create FeeRecord
            let record = null;
            if (id) {
                try {
                    record = await FeeRecord.findById(id);
                } catch (err) {
                    record = null;
                }
            }

            if (!record) {
                record = await FeeRecord.findOne({ student: student._id });
            }

            if (!record) {
                console.log(`[Import] Creating FeeRecord for student ${student._id}...`);
                record = new FeeRecord({ student: student._id });
            }

            // Update fields
            record.course = course || record.course || '';
            record.batch = batch || record.batch || '';
            record.totalFee = Number(totalFee);
            if (nextDueDate) record.nextDueDate = new Date(nextDueDate);

            await record.save();
            importedCount++;

            // Prepare row data back to sheet
            const updatedRow = [
                record._id.toString(),
                email,
                student.name,
                record.course,
                record.batch,
                record.totalFee,
                record.paidAmount,
                record.pendingAmount,
                record.status,
                record.nextDueDate ? new Date(record.nextDueDate).toISOString().split('T')[0] : ''
            ];
            updatedRows.push(updatedRow);
        }

        // Overwrite Sheet
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1:J${updatedRows.length}`,
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

    const records = await FeeRecord.find({}).populate('student', 'name email').lean();

    const header = [
        'FeeRecord ID',
        'Student Email',
        'Student Name',
        'Course',
        'Batch',
        'Total Fee',
        'Paid Amount',
        'Pending Amount',
        'Status',
        'Next Due Date'
    ];

    const rows = [header];
    records.forEach(record => {
        const student = record.student || {};
        rows.push([
            record._id.toString(),
            student.email || '',
            student.name || '',
            record.course || '',
            record.batch || '',
            record.totalFee || 0,
            record.paidAmount || 0,
            record.pendingAmount || 0,
            record.status || 'Pending',
            record.nextDueDate ? new Date(record.nextDueDate).toISOString().split('T')[0] : ''
        ]);
    });

    // Clear
    await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A:J`,
    });

    // Write all
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:J${rows.length}`,
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
