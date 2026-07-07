const asyncHandler = require('express-async-handler');
const FeeRecord = require('../models/FeeRecord');
const User = require('../models/User');

// Generate receipt number
const generateReceiptNo = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `RCPT-${year}-${rand}`;
};

const getAllFeeRecords = asyncHandler(async (req, res) => {
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
    const studentIds = await User.find({ institute: req.user.institute, role: 'Student' }).distinct('_id');
    const allRecords = await FeeRecord.find({ student: { $in: studentIds } }).populate('student', 'name studentProfile avatar');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todayCollection = 0;
    let monthlyCollection = 0;
    let totalPending = 0;

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    allRecords.forEach(r => {
        r.transactions.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate >= today) todayCollection += t.amount;
            if (tDate >= monthStart) monthlyCollection += t.amount;
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
    const { studentId, amount, paymentMode, referenceNo, remark } = req.body;
    if (!studentId || !amount) return res.status(400).json({ message: 'Student and amount required' });

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

    const receiptNo = generateReceiptNo();
    record.transactions.push({
        receiptNo,
        amount: Number(amount),
        paymentMode: paymentMode || 'Cash',
        referenceNo: referenceNo || '',
        remark: remark || '',
        collectedBy: req.user?.name || 'Admin'
    });

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
    const record = await FeeRecord.findOne({ student: req.user._id })
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
            // Monthly
            const m = new Date(t.date).toLocaleString('default', { month: 'short', year: 'numeric' });
            monthMap[m] = (monthMap[m] || 0) + t.amount;
        });
    });

    res.json({
        courseWise: Object.entries(courseMap).map(([course, v]) => ({ course, ...v })),
        paymentModes: Object.entries(modeMap).map(([mode, amount]) => ({ mode, amount })),
        monthlyTrend: Object.entries(monthMap).map(([month, amount]) => ({ month, amount })).slice(-12)
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
    
    record.transactions.pull({ _id: transactionId });
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
    // 1. Fetch all records and populate student details in a single query
    const studentIds = await User.find({ institute: req.user.institute, role: 'Student' }).distinct('_id');
    const allRecords = await FeeRecord.find({ student: { $in: studentIds } })
        .populate('student', 'name email mobileNumber mobile2 fatherName admissionNo studentProfile avatar institute')
        .sort({ updatedAt: -1 });

    // 2. Compute Stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

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
            if (tDate >= today) todayCollection += t.amount;
            if (tDate >= monthStart) monthlyCollection += t.amount;

            // Mode split
            modeMap[t.paymentMode] = (modeMap[t.paymentMode] || 0) + t.amount;
            // Monthly trend
            const m = new Date(t.date).toLocaleString('default', { month: 'short', year: 'numeric' });
            monthMap[m] = (monthMap[m] || 0) + t.amount;

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
            monthlyTrend: Object.entries(monthMap).map(([month, amount]) => ({ month, amount })).slice(-12)
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
    getMergedDashboardData
};
