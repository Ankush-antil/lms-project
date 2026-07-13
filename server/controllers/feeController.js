const asyncHandler = require('express-async-handler');
const FeeRecord = require('../models/FeeRecord');
const User = require('../models/User');

// Generate receipt number
const generateReceiptNo = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `RCPT-${year}-${rand}`;
};

const getSortedMonthlyTrend = (transactions) => {
    const monthlyTrendList = [];
    const startYear = 2026;
    const endYear = 2027;
    const trendMap = {};

    for (let year = startYear; year <= endYear; year++) {
        for (let month = 0; month < 12; month++) {
            const date = new Date(year, month, 1);
            const label = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            trendMap[label] = 0;
            monthlyTrendList.push(label);
        }
    }

    transactions.forEach(t => {
        const tDate = new Date(t.date);
        const label = tDate.toLocaleString('default', { month: 'short', year: 'numeric' });
        if (trendMap[label] !== undefined) {
            trendMap[label] += t.amount;
        }
    });

    return monthlyTrendList.map(label => ({
        month: label,
        amount: trendMap[label]
    }));
};

const ensureFeeRecordsExist = async (instituteId) => {
    try {
        const studentsList = await User.find({ institute: instituteId, role: 'Student', isDeleted: { $ne: true } })
            .populate('studentProfile.course');
        const studentIds = studentsList.map(s => s._id);

        const existingRecords = await FeeRecord.find({ student: { $in: studentIds } });
        const existingStudentIds = new Set(existingRecords.map(r => r.student ? r.student.toString() : null).filter(Boolean));

        const missingStudents = studentsList.filter(s => !existingStudentIds.has(s._id.toString()));
        if (missingStudents.length > 0) {
            console.log(`[Fee Record Auto-Init] Creating missing FeeRecords for ${missingStudents.length} students...`);
            const recordsToInsert = missingStudents.map(student => {
                const defaultFee = student.studentProfile?.course?.fee || 0;
                return {
                    student: student._id,
                    totalFee: defaultFee,
                    course: student.studentProfile?.course?.name || '',
                    batch: student.studentProfile?.batch || 'Batch-A',
                    paidAmount: 0,
                    pendingAmount: defaultFee,
                    status: 'Pending'
                };
            });
            await FeeRecord.insertMany(recordsToInsert);
        }

        // Self-healing: If student has totalFee === 0, no transactions, but course fee is set > 0, update it.
        for (const record of existingRecords) {
            if (!record.student) continue;
            const student = studentsList.find(s => s._id.toString() === record.student.toString());
            if (student && student.studentProfile?.course) {
                const courseFee = student.studentProfile.course.fee || 0;
                if (record.totalFee === 0 && courseFee > 0 && (!record.transactions || record.transactions.length === 0)) {
                    console.log(`[Fee Record Auto-Fix] Setting totalFee to course fee (${courseFee}) for student ${student.name}`);
                    record.totalFee = courseFee;
                    record.pendingAmount = courseFee;
                    record.course = student.studentProfile.course.name || record.course;
                    await record.save();
                }
            }
        }
    } catch (err) {
        console.error('❌ [Fee Record Auto-Init] Error initializing missing records:', err.message);
    }
};

const getAllFeeRecords = asyncHandler(async (req, res) => {
    await ensureFeeRecordsExist(req.user.institute);
    const { search, status, course } = req.query;

    const studentIds = await User.find({ institute: req.user.institute, role: 'Student' }).distinct('_id');
    let feeRecords = await FeeRecord.find({ student: { $in: studentIds } })
        .populate('student', 'name email mobileNumber mobile2 fatherName admissionNo studentProfile avatar')
        .sort({ updatedAt: -1 });

    if (search) {
        const s = search.toLowerCase();
        feeRecords = feeRecords.filter(r =>
            r.student?.name?.toLowerCase().includes(s) ||
            r.student?.email?.toLowerCase().includes(s) ||
            r.course?.toLowerCase().includes(s)
        );
    }
    if (status && status !== 'All') {
        feeRecords = feeRecords.filter(r => r.status === status);
    }
    if (course && course !== 'All') {
        feeRecords = feeRecords.filter(r => r.course === course);
    }

    res.json(feeRecords);
});

// @desc    Get dashboard stats (admin)
// @route   GET /api/fees/admin/stats
const getDashboardStats = asyncHandler(async (req, res) => {
    await ensureFeeRecordsExist(req.user.institute);
    const studentIds = await User.find({ institute: req.user.institute, role: 'Student' }).distinct('_id');
    const allRecords = await FeeRecord.find({ student: { $in: studentIds } }).populate('student', 'name studentProfile avatar');

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
    const monthEnd = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 1);

    let todayCollection = 0;
    let monthlyCollection = 0;
    let totalPending = 0;

    allRecords.forEach(r => {
        r.transactions.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate >= todayStart && tDate < todayEnd) todayCollection += t.amount;
            if (tDate >= monthStart && tDate < monthEnd) monthlyCollection += t.amount;
        });
        totalPending += r.pendingAmount;
    });

    // Top pending students
    const topPending = allRecords
        .filter(r => r.pendingAmount > 0)
        .sort((a, b) => b.pendingAmount - a.pendingAmount)
        .slice(0, 5)
        .map(r => ({
            _id: r._id,
            student: r.student,
            course: r.course,
            batch: r.batch,
            pendingAmount: r.pendingAmount,
            nextDueDate: r.nextDueDate
        }));

    res.json({
        todayCollection,
        monthlyCollection,
        totalPending,
        totalStudents: allRecords.length,
        paidCount: allRecords.filter(r => r.status === 'Paid').length,
        pendingCount: allRecords.filter(r => r.status === 'Pending').length,
        partialCount: allRecords.filter(r => r.status === 'Partial').length,
        topPending
    });
});

// @desc    Get pending dues list (admin)
// @route   GET /api/fees/admin/pending-dues
const getPendingDues = asyncHandler(async (req, res) => {
    const studentIds = await User.find({ institute: req.user.institute, role: 'Student' }).distinct('_id');
    const records = await FeeRecord.find({ student: { $in: studentIds }, status: { $in: ['Pending', 'Partial'] } })
        .populate('student', 'name email mobileNumber mobile2 fatherName admissionNo studentProfile avatar')
        .sort({ nextDueDate: 1 });

    const now = new Date();
    const enriched = records.map(r => {
        const dueDays = r.nextDueDate ? Math.floor((now - new Date(r.nextDueDate)) / (1000 * 60 * 60 * 24)) : null;
        let aging = 'Current';
        if (dueDays !== null) {
            if (dueDays >= 60) aging = '60+ days';
            else if (dueDays >= 31) aging = '31-60 days';
            else if (dueDays >= 1) aging = '1-30 days';
        }
        return { ...r.toObject(), dueDays, aging };
    });

    res.json(enriched);
});

// @desc    Get all receipts (admin)
// @route   GET /api/fees/admin/receipts
const getAllReceipts = asyncHandler(async (req, res) => {
    const { search } = req.query;
    const studentIds = await User.find({ institute: req.user.institute, role: 'Student' }).distinct('_id');
    let records = await FeeRecord.find({ student: { $in: studentIds } })
        .populate('student', 'name email studentProfile avatar')
        .sort({ updatedAt: -1 });

    const receipts = [];
    records.forEach(r => {
        r.transactions.forEach(t => {
            receipts.push({
                _id: t._id,
                feeRecordId: r._id,
                receiptNo: t.receiptNo,
                studentName: r.student?.name,
                studentId: r.student?._id,
                avatar: r.student?.avatar,
                course: r.course,
                batch: r.batch,
                amount: t.amount,
                paymentMode: t.paymentMode,
                referenceNo: t.referenceNo,
                remark: t.remark,
                collectedBy: t.collectedBy,
                date: t.date
            });
        });
    });

    receipts.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (search) {
        const s = search.toLowerCase();
        return res.json(receipts.filter(r => r.receiptNo?.toLowerCase().includes(s) || r.studentName?.toLowerCase().includes(s)));
    }

    res.json(receipts);
});

// @desc    Collect fee for a student (admin)
// @route   POST /api/fees/admin/collect
const collectFee = asyncHandler(async (req, res) => {
    const { studentId, amount, paymentMode, referenceNo, remark, extraCharge } = req.body;
    let collectAmount = Number(amount) || 0;
    const hasExtra = extraCharge && extraCharge.amount && Number(extraCharge.amount) > 0;

    // If amount is 0/empty but they added an extra charge, default the collected amount to the extra charge amount
    if (collectAmount === 0 && hasExtra) {
        collectAmount = Number(extraCharge.amount);
    }

    if (!studentId) return res.status(400).json({ message: 'Student ID required' });
    if (collectAmount <= 0 && !hasExtra) {
        return res.status(400).json({ message: 'Amount or Extra Charge is required' });
    }

    const studentDoc = await User.findById(studentId);
    if (!studentDoc || String(studentDoc.institute) !== String(req.user.institute)) {
        return res.status(403).json({ message: 'Access denied: Student does not belong to your institute' });
    }

    let record = await FeeRecord.findOne({ student: studentId });
    if (!record) {
        // Create a default record
        const student = await User.findById(studentId).populate('studentProfile.course');
        record = new FeeRecord({
            student: studentId,
            totalFee: 0,
            course: student?.studentProfile?.course?.name || '',
            batch: student?.studentProfile?.batch || ''
        });
    }

    let newExtraChargeId = null;
    // Add extra charge (fine, party, etc.) if provided during fee collection
    if (extraCharge && extraCharge.amount && Number(extraCharge.amount) > 0) {
        record.extraCharges.push({
            label: extraCharge.label || 'Extra',
            amount: Number(extraCharge.amount),
            remark: extraCharge.remark || ''
        });
        // Add extra charge to total fee as well
        record.totalFee += Number(extraCharge.amount);
        
        // Find the pushed extra charge to get its _id
        const addedEc = record.extraCharges[record.extraCharges.length - 1];
        if (addedEc) {
            newExtraChargeId = addedEc._id;
        }
    }

    let receiptNo = 'N/A';
    if (collectAmount > 0) {
        receiptNo = generateReceiptNo();
        const txDoc = {
            receiptNo,
            amount: collectAmount,
            paymentMode: paymentMode || 'Cash',
            referenceNo: referenceNo || '',
            remark: remark || '',
            collectedBy: req.user?.name || 'Admin'
        };
        if (newExtraChargeId) {
            txDoc.extraChargeId = newExtraChargeId;
        }
        record.transactions.push(txDoc);
    }

    await record.save();
    res.json({ success: true, receiptNo, record });
});

// @desc    Create or update a fee record (admin)
// @route   POST /api/fees/admin/setup
const setupFeeRecord = asyncHandler(async (req, res) => {
    const { studentId, totalFee, course, batch, nextDueDate, months, extraCharge } = req.body;
    if (!studentId) return res.status(400).json({ message: 'studentId required' });

    const studentDoc = await User.findById(studentId);
    if (!studentDoc || String(studentDoc.institute) !== String(req.user.institute)) {
        return res.status(403).json({ message: 'Access denied: Student does not belong to your institute' });
    }

    let record = await FeeRecord.findOne({ student: studentId });
    if (!record) {
        record = new FeeRecord({ student: studentId });
    }

    if (totalFee !== undefined) record.totalFee = Number(totalFee);
    if (course) record.course = course;
    if (batch) record.batch = batch;
    if (nextDueDate) record.nextDueDate = new Date(nextDueDate);
    if (months !== undefined) record.months = Number(months);

    // Add extra charge (fine, party, etc.) if provided
    if (extraCharge && extraCharge.amount && Number(extraCharge.amount) > 0) {
        record.extraCharges.push({
            label: extraCharge.label || 'Extra',
            amount: Number(extraCharge.amount),
            remark: extraCharge.remark || ''
        });
        // Add extra charge to total fee as well
        record.totalFee += Number(extraCharge.amount);
    }

    await record.save();
    res.json({ success: true, record });
});

// @desc    Get fee record for a student (admin)
// @route   GET /api/fees/admin/student/:id
const getStudentFeeRecord = asyncHandler(async (req, res) => {
    const record = await FeeRecord.findOne({ student: req.params.id })
        .populate('student', 'name email mobileNumber studentProfile avatar institute');
    if (!record) return res.status(404).json({ message: 'No fee record found' });
    if (record.student && String(record.student.institute) !== String(req.user.institute)) {
        return res.status(403).json({ message: 'Access denied: student belongs to another institute' });
    }
    res.json(record);
});

// @desc    Get fee record for the logged-in student
// @route   GET /api/fees/student/my-fees
const getMyFees = asyncHandler(async (req, res) => {
    let targetUserId = req.user._id;
    if (req.user.role === 'Parent' && req.user.parentProfile?.student) {
        targetUserId = req.user.parentProfile.student;
    } else if (req.query.studentId && (req.user.role === 'Admin' || req.user.role === 'Institute')) {
        targetUserId = req.query.studentId;
    }

    const record = await FeeRecord.findOne({ student: targetUserId })
        .populate('student', 'name email studentProfile');
    if (!record) return res.status(404).json({ message: 'No fee record found' });
    res.json(record);
});

// @desc    Get reports data
// @route   GET /api/fees/admin/reports
const getReports = asyncHandler(async (req, res) => {
    const studentIds = await User.find({ institute: req.user.institute, role: 'Student' }).distinct('_id');
    const records = await FeeRecord.find({ student: { $in: studentIds } }).populate('student', 'name studentProfile');

    // Payment mode distribution
    const modeMap = {};
    // Monthly collection trend
    const monthMap = {};
    // Course-wise
    const courseMap = {};

    records.forEach(r => {
        if (!courseMap[r.course]) courseMap[r.course] = { totalFee: 0, paid: 0, pending: 0 };
        courseMap[r.course].totalFee += r.totalFee;
        courseMap[r.course].paid += r.paidAmount;
        courseMap[r.course].pending += r.pendingAmount;

        r.transactions.forEach(t => {
            // Mode
            modeMap[t.paymentMode] = (modeMap[t.paymentMode] || 0) + t.amount;
        });
    });

    const allTx = [];
    records.forEach(r => {
        r.transactions.forEach(t => {
            allTx.push(t);
        });
    });

    res.json({
        courseWise: Object.entries(courseMap).map(([course, v]) => ({ course, ...v })),
        paymentModes: Object.entries(modeMap).map(([mode, amount]) => ({ mode, amount })),
        monthlyTrend: getSortedMonthlyTrend(allTx)
    });
});

// @desc    Delete a transaction from a fee record
// @route   DELETE /api/fees/admin/transaction/:id
const deleteTransaction = asyncHandler(async (req, res) => {
    const transactionId = req.params.id;
    const record = await FeeRecord.findOne({ 'transactions._id': transactionId }).populate('student');
    if (!record) return res.status(404).json({ message: 'Transaction not found' });
    
    if (record.student && String(record.student.institute) !== String(req.user.institute)) {
        return res.status(403).json({ message: 'Access denied: Transaction belongs to another institute' });
    }

    const tx = record.transactions.id(transactionId);
    if (tx) {
        // 1. If it has a linked extraChargeId, delete it and deduct from totalFee
        if (tx.extraChargeId) {
            const chargeIndex = record.extraCharges.findIndex(ec => String(ec._id) === String(tx.extraChargeId));
            if (chargeIndex !== -1) {
                const charge = record.extraCharges[chargeIndex];
                record.totalFee = Math.max(0, record.totalFee - (charge.amount || 0));
                record.extraCharges.splice(chargeIndex, 1);
                console.log(`[Delete Transaction] Auto-deleted linked extra charge ${charge.label} of ${charge.amount}`);
            }
        } else {
            // 2. Fallback: Match by label in remark or amount similarity for older entries
            const remarkLower = (tx.remark || '').toLowerCase();
            const txAmount = tx.amount;
            const chargeIndex = record.extraCharges.findIndex(ec => {
                const labelLower = (ec.label || '').toLowerCase();
                return (labelLower && remarkLower.includes(labelLower)) || (ec.amount === txAmount);
            });
            if (chargeIndex !== -1) {
                const charge = record.extraCharges[chargeIndex];
                record.totalFee = Math.max(0, record.totalFee - (charge.amount || 0));
                record.extraCharges.splice(chargeIndex, 1);
                console.log(`[Delete Transaction] Fallback auto-deleted extra charge ${charge.label} of ${charge.amount}`);
            }
        }
    }
    
    record.transactions.pull({ _id: transactionId });
    await record.save();
    
    res.json({ success: true, record });
});

// @desc    Delete an extra charge from a fee record
// @route   DELETE /api/fees/admin/student/:studentId/extra-charge/:chargeId
const deleteExtraCharge = asyncHandler(async (req, res) => {
    const { studentId, chargeId } = req.params;
    
    const record = await FeeRecord.findOne({ student: studentId }).populate('student');
    if (!record) return res.status(404).json({ message: 'Fee record not found' });
    
    if (record.student && String(record.student.institute) !== String(req.user.institute)) {
        return res.status(403).json({ message: 'Access denied: Record belongs to another institute' });
    }

    const chargeIndex = record.extraCharges.findIndex(ec => String(ec._id) === String(chargeId));
    if (chargeIndex === -1) {
        return res.status(404).json({ message: 'Extra charge not found' });
    }

    const charge = record.extraCharges[chargeIndex];
    // Deduct charge amount from total fee
    record.totalFee = Math.max(0, record.totalFee - (charge.amount || 0));
    
    // Remove the extra charge from array
    record.extraCharges.splice(chargeIndex, 1);
    
    await record.save();
    
    res.json({ success: true, record });
});

// @desc    Delete a fee record by its ID
// @route   DELETE /api/fees/admin/record/:id
const deleteFeeRecord = asyncHandler(async (req, res) => {
    const { deleteFromSheets } = require('../utils/googleSheets');
    const record = await FeeRecord.findById(req.params.id).populate('student');
    if (!record) return res.status(404).json({ message: 'Fee record not found' });
    
    if (record.student && String(record.student.institute) !== String(req.user.institute)) {
        return res.status(403).json({ message: 'Access denied: Record belongs to another institute' });
    }
    await deleteFromSheets(record._id, record.student?.admissionNo, record.student?.name);
    await record.deleteOne();
    
    res.json({ success: true, message: 'Fee record removed' });
});

// @desc    Get all dashboard data in a single query (combines stats, all records, pending, receipts, reports)
// @route   GET /api/fees/admin/dashboard-data
const getMergedDashboardData = asyncHandler(async (req, res) => {
    let instituteId = req.user.institute;
    if (req.user.role === 'Admin' && req.query.instituteId) {
        instituteId = req.query.instituteId;
    }

    if (req.user.role === 'Admin' && (!instituteId || instituteId === 'All')) {
        const activeInstitutes = await User.find({ role: 'Student', isDeleted: { $ne: true } }).distinct('institute');
        for (const instId of activeInstitutes) {
            if (instId) {
                await ensureFeeRecordsExist(instId);
            }
        }
    } else {
        if (instituteId) {
            await ensureFeeRecordsExist(instituteId);
        }
    }

    // 1. Fetch all records and populate student details in a single query
    let studentQuery = { role: 'Student' };
    if (instituteId && instituteId !== 'All') {
        studentQuery.institute = instituteId;
    }
    const studentIds = await User.find(studentQuery).distinct('_id');
    const allRecords = await FeeRecord.find({ student: { $in: studentIds } })
        .populate('student', 'name email mobileNumber mobile2 fatherName admissionNo studentProfile avatar institute')
        .sort({ updatedAt: -1 });

    // 2. Compute Stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
    const monthEnd = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 1);

    let todayCollection = 0;
    let monthlyCollection = 0;
    let totalPending = 0;

    // Reports maps
    const modeMap = {};
    const monthMap = {};
    const courseMap = {};
    const receiptsList = [];
    const pendingList = [];

    const now = new Date();

    allRecords.forEach(r => {
        // Stats & Reports
        if (!courseMap[r.course]) courseMap[r.course] = { totalFee: 0, paid: 0, pending: 0 };
        courseMap[r.course].totalFee += r.totalFee;
        courseMap[r.course].paid += r.paidAmount;
        courseMap[r.course].pending += r.pendingAmount;

        r.transactions.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate >= todayStart && tDate < todayEnd) todayCollection += t.amount;
            if (tDate >= monthStart && tDate < monthEnd) monthlyCollection += t.amount;

            // Mode split
            modeMap[t.paymentMode] = (modeMap[t.paymentMode] || 0) + t.amount;

            // Receipts list
            receiptsList.push({
                _id: t._id,
                feeRecordId: r._id,
                receiptNo: t.receiptNo,
                studentName: r.student?.name,
                studentId: r.student?._id,
                avatar: r.student?.avatar,
                course: r.course,
                batch: r.batch,
                amount: t.amount,
                paymentMode: t.paymentMode,
                referenceNo: t.referenceNo,
                remark: t.remark,
                collectedBy: t.collectedBy,
                date: t.date
            });
        });

        totalPending += r.pendingAmount;

        // Pending dues list
        if (r.status === 'Pending' || r.status === 'Partial') {
            const dueDays = r.nextDueDate ? Math.floor((now - new Date(r.nextDueDate)) / (1000 * 60 * 60 * 24)) : null;
            let aging = 'Current';
            if (dueDays !== null) {
                if (dueDays >= 60) aging = '60+ days';
                else if (dueDays >= 31) aging = '31-60 days';
                else if (dueDays >= 1) aging = '1-30 days';
            }
            pendingList.push({ ...r.toObject(), dueDays, aging });
        }
    });

    // Sort receipts and pending
    receiptsList.sort((a, b) => new Date(b.date) - new Date(a.date));
    pendingList.sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));

    // Top pending (limit 5)
    const topPending = allRecords
        .filter(r => r.pendingAmount > 0)
        .sort((a, b) => b.pendingAmount - a.pendingAmount)
        .slice(0, 5)
        .map(r => ({
            _id: r._id,
            student: r.student,
            course: r.course,
            batch: r.batch,
            pendingAmount: r.pendingAmount,
            nextDueDate: r.nextDueDate
        }));

    res.json({
        stats: {
            todayCollection,
            monthlyCollection,
            totalPending,
            totalStudents: allRecords.length,
            paidCount: allRecords.filter(r => r.status === 'Paid').length,
            pendingCount: allRecords.filter(r => r.status === 'Pending').length,
            partialCount: allRecords.filter(r => r.status === 'Partial').length,
            topPending
        },
        students: allRecords,
        pendingDues: pendingList,
        receipts: receiptsList,
        reports: {
            courseWise: Object.entries(courseMap).map(([course, v]) => ({ course, ...v })),
            paymentModes: Object.entries(modeMap).map(([mode, amount]) => ({ mode, amount })),
            monthlyTrend: getSortedMonthlyTrend(allRecords.flatMap(r => r.transactions))
        }
    });
});

module.exports = {
    getAllFeeRecords,
    getDashboardStats,
    getPendingDues,
    getAllReceipts,
    collectFee,
    setupFeeRecord,
    getStudentFeeRecord,
    getMyFees,
    getReports,
    deleteTransaction,
    deleteFeeRecord,
    getMergedDashboardData,
    deleteExtraCharge
};
