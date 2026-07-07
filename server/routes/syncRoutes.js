const express = require('express');
const router = express.Router();
const FeeRecord = require('../models/FeeRecord');
const User = require('../models/User');
const Course = require('../models/Course');
const Institute = require('../models/Institute');
const { setSyncDisabled } = require('../utils/googleSheets');
const { notifyFeeRecordUpdate } = require('../socket');


router.get('/debug-courses', async (req, res) => {
    try {
        const Course = require('../models/Course');
        const User = require('../models/User');
        const courses = await Course.find({});
        const users = await User.find({ name: { $regex: /Saniya|Payal|Nitin|Khushi/i } });
        res.json({ success: true, courses, users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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

        const { id, admissionNo, name, fatherName, mobile1, mobile2, course, totalFee, months } = data;

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
        let student = null;

        if (id) {
            try {
                record = await FeeRecord.findById(id).populate('student');
                if (record && record.student) student = record.student;
            } catch (err) {
                record = null;
            }
        }

        if (!student && admissionNo) {
            student = await User.findOne({ admissionNo, role: 'Student' });
        }

        if (!student && name) {
            student = await User.findOne({ name, role: 'Student' });
        }

        let courseDoc = null;
        if (course) {
            const defaultInst = await Institute.findOne({});
            const instId = defaultInst ? defaultInst._id : null;
            const courseCode = course.toUpperCase().replace(/[^A-Z0-9]/g, '');

            // 1. Try to find by name (case-insensitive exact match)
            courseDoc = await Course.findOne({ 
                institute: instId, 
                name: { $regex: new RegExp("^" + course.trim() + "$", "i") } 
            });

            // 2. If not found, try to find by name prefix (e.g. "CDA" matches "CDA (1 year)")
            if (!courseDoc) {
                courseDoc = await Course.findOne({
                    institute: instId,
                    $or: [
                        { name: { $regex: new RegExp("^" + course.trim(), "i") } },
                        { name: { $regex: new RegExp(course.trim() + ".*", "i") } }
                    ]
                });
            }

            // 3. If still not found, try to find by course code (e.g. "CDA" matches code "CDA")
            if (!courseDoc && courseCode) {
                courseDoc = await Course.findOne({ 
                    institute: instId, 
                    code: courseCode 
                });
            }

            // 4. If still not found, create a new course
            if (!courseDoc && instId) {
                console.log(`[Webhook Sync] Course ${course} not found. Creating it...`);
                courseDoc = new Course({
                    name: course,
                    code: courseCode || 'TEMP',
                    institute: instId
                });
                await courseDoc.save().catch(err => {
                    console.log(`⚠️ Failed to create course: ${err.message}`);
                    courseDoc = null;
                });
            }
        }

        if (!student) {
            if (name) {
                console.log(`[Webhook Sync] Student not found. Creating new Student User for name: ${name}...`);
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
                        course: courseDoc ? courseDoc._id : undefined,
                        batch: '',
                        section: 'A',
                        enrollmentDate: new Date()
                    }
                });
                await student.save();
            } else {
                return res.status(404).json({ message: 'Fee record or student not found and cannot be identified (name is empty)' });
            }
        }

        // Update Student fields if they changed
        let studentChanged = false;
        if (fatherName !== undefined && student.fatherName !== fatherName) { student.fatherName = fatherName; studentChanged = true; }
        if (admissionNo !== undefined && student.admissionNo !== admissionNo) { student.admissionNo = admissionNo; studentChanged = true; }
        if (mobile1 !== undefined && student.mobileNumber !== mobile1) { student.mobileNumber = mobile1; studentChanged = true; }
        if (mobile2 !== undefined && student.mobile2 !== mobile2) { student.mobile2 = mobile2; studentChanged = true; }
        if (courseDoc && (!student.studentProfile || String(student.studentProfile.course) !== String(courseDoc._id))) {
            if (!student.studentProfile) student.studentProfile = {};
            student.studentProfile.course = courseDoc._id;
            studentChanged = true;
        }
        
        if (studentChanged) {
            console.log(`[Webhook Sync] Saving updated Student ${student._id}...`);
            await student.save();
        }

        if (!record) {
            record = await FeeRecord.findOne({ student: student._id });
            if (!record) {
                console.log(`[Webhook Sync] Creating new FeeRecord for student ${student._id}...`);
                record = new FeeRecord({
                    student: student._id,
                    totalFee: totalFee !== undefined ? Number(totalFee) : 0,
                    course: course || '',
                    months: months !== undefined ? Number(months) : 0
                });
                await record.save();
            }
        }

        // Update FeeRecord fields if changed
        let recordChanged = false;
        if (course !== undefined && record.course !== course) { record.course = course; recordChanged = true; }
        if (totalFee !== undefined && record.totalFee !== Number(totalFee)) { record.totalFee = Number(totalFee); recordChanged = true; }
        if (months !== undefined && record.months !== Number(months)) { record.months = Number(months); recordChanged = true; }

        if (recordChanged) {
            console.log(`[Webhook Sync] Saving updated FeeRecord ${record._id}...`);
            await record.save();
        }

        // Re-fetch populated info for returning back to Sheets
        await record.populate('student', 'name email mobileNumber mobile2 fatherName admissionNo');

        notifyFeeRecordUpdate({
            recordId: record._id.toString(),
            studentId: record.student?._id?.toString()
        });

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
// Trigger restart 5678
