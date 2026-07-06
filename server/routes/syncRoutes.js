const express = require('express');
const router = express.Router();
const FeeRecord = require('../models/FeeRecord');
const User = require('../models/User');
const { setSyncDisabled } = require('../utils/googleSheets');

// POST /api/sync/sheets
// Receives updates from Google Sheets Apps Script trigger
router.post('/sheets', async (req, res) => {
    const token = req.headers['x-sync-token'];
    const expectedToken = process.env.GOOGLE_SYNC_SECRET || 'supersecrettoken';
    
    if (token !== expectedToken) {
        return res.status(401).json({ message: 'Unauthorized sync token' });
    }

    const { action, data } = req.body;
    if (!data) return res.status(400).json({ message: 'No data provided' });

    try {
        // Disable backend-to-sheets sync hooks to prevent loops
        setSyncDisabled(true);

        const { id, email, name, course, batch, totalFee, nextDueDate } = data;

        if (action === 'delete') {
            if (id) {
                console.log(`[Webhook Sync] Deleting FeeRecord ${id} based on Google Sheets request...`);
                await FeeRecord.findByIdAndDelete(id);
                return res.json({ success: true, message: 'Deleted' });
            }
            return res.status(400).json({ message: 'ID required for deletion' });
        }

        // Find or create FeeRecord
        let record = null;
        if (id) {
            try {
                record = await FeeRecord.findById(id);
            } catch (err) {
                // If invalid ID passed, treat as not found
                record = null;
            }
        }

        if (!record && email) {
            // Find student by email
            let student = await User.findOne({ email, role: 'Student' });
            if (!student) {
                console.log(`[Webhook Sync] Student user not found. Creating new user for ${email}...`);
                student = new User({
                    name: name || email.split('@')[0],
                    email,
                    password: '123456', // Hashed by pre-save hook in User model
                    role: 'Student'
                });
                await student.save();
            }

            // Check if student already has a FeeRecord
            record = await FeeRecord.findOne({ student: student._id });
            if (!record) {
                console.log(`[Webhook Sync] Creating new FeeRecord for student ${student._id}...`);
                record = new FeeRecord({
                    student: student._id,
                    totalFee: totalFee !== undefined ? Number(totalFee) : 0,
                    course: course || '',
                    batch: batch || '',
                    nextDueDate: nextDueDate ? new Date(nextDueDate) : null
                });
                await record.save();
            }
        }

        if (!record) {
            return res.status(404).json({ message: 'Fee record or student not found' });
        }

        // Update fields if changed
        let hasChanges = false;

        if (course !== undefined && record.course !== course) {
            record.course = course;
            hasChanges = true;
        }
        if (batch !== undefined && record.batch !== batch) {
            record.batch = batch;
            hasChanges = true;
        }
        if (totalFee !== undefined && record.totalFee !== Number(totalFee)) {
            record.totalFee = Number(totalFee);
            hasChanges = true;
        }
        if (nextDueDate !== undefined) {
            const incomingDate = nextDueDate ? new Date(nextDueDate).toISOString().split('T')[0] : null;
            const dbDate = record.nextDueDate ? new Date(record.nextDueDate).toISOString().split('T')[0] : null;
            if (incomingDate !== dbDate) {
                record.nextDueDate = nextDueDate ? new Date(nextDueDate) : null;
                hasChanges = true;
            }
        }

        if (hasChanges) {
            console.log(`[Webhook Sync] Saving updated FeeRecord ${record._id}...`);
            await record.save();
        }

        // Re-fetch populated info for returning back to Sheets
        await record.populate('student', 'name email');

        res.json({
            success: true,
            recordId: record._id.toString(),
            paidAmount: record.paidAmount,
            pendingAmount: record.pendingAmount,
            status: record.status,
            name: record.student?.name || name || '',
            email: record.student?.email || email || ''
        });
    } catch (err) {
        console.error('❌ Error processing Sheets webhook sync:', err.message);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    } finally {
        // Re-enable backend-to-sheets sync hooks
        setSyncDisabled(false);
    }
});

// GET /api/sync/config
// Returns the configured spreadsheet ID
const { protect, adminOrEditor } = require('../middleware/authMiddleware');
const { importFromSheets, exportToSheets } = require('../utils/googleSheets');

router.get('/config', protect, adminOrEditor, (req, res) => {
    res.json({
        spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '',
        sheetName: process.env.GOOGLE_SHEET_NAME || 'Sheet1'
    });
});

const fs = require('fs');
const path = require('path');

// POST /api/sync/config
// Allows updating spreadsheet ID from UI settings page
router.post('/config', protect, adminOrEditor, (req, res) => {
    const { spreadsheetId, sheetName } = req.body;
    if (!spreadsheetId) {
        return res.status(400).json({ message: 'spreadsheetId is required' });
    }

    try {
        const envPath = path.join(__dirname, '../.env');
        if (fs.existsSync(envPath)) {
            let content = fs.readFileSync(envPath, 'utf8');
            
            const spIdRegex = /^GOOGLE_SPREADSHEET_ID=.*$/m;
            if (spIdRegex.test(content)) {
                content = content.replace(spIdRegex, `GOOGLE_SPREADSHEET_ID=${spreadsheetId}`);
            } else {
                content += `\nGOOGLE_SPREADSHEET_ID=${spreadsheetId}`;
            }

            if (sheetName) {
                const sheetNameRegex = /^GOOGLE_SHEET_NAME=.*$/m;
                if (sheetNameRegex.test(content)) {
                    content = content.replace(sheetNameRegex, `GOOGLE_SHEET_NAME=${sheetName}`);
                } else {
                    content += `\nGOOGLE_SHEET_NAME=${sheetName}`;
                }
            }

            fs.writeFileSync(envPath, content, 'utf8');
        }

        process.env.GOOGLE_SPREADSHEET_ID = spreadsheetId;
        if (sheetName) process.env.GOOGLE_SHEET_NAME = sheetName;

        console.log(`[Config Sync] Updated GOOGLE_SPREADSHEET_ID to ${spreadsheetId}`);

        res.json({ success: true, spreadsheetId, sheetName: sheetName || 'Sheet1' });
    } catch (err) {
        console.error('❌ Failed to update spreadsheet configuration:', err.message);
        res.status(500).json({ message: 'Failed to update configuration', error: err.message });
    }
});

// POST /api/sync/import
// Trigger full manual import from Google Sheets to MongoDB
router.post('/import', protect, adminOrEditor, async (req, res) => {
    try {
        const result = await importFromSheets();
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/sync/export
// Trigger full manual export from MongoDB to Google Sheets
router.post('/export', protect, adminOrEditor, async (req, res) => {
    try {
        const result = await exportToSheets();
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
