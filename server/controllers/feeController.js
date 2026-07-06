const asyncHandler = require('express-async-handler');
const FeeRecord = require('../models/FeeRecord');
const User = require('../models/User');

// Generate receipt number
const generateReceiptNo = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `RCPT-${year}-${rand}`;
};

// @desc    Get all fee records (admin)
// @route   GET /api/fees/admin/all
const getAllFeeRecords = asyncHandler(async (req, res) => {
    const { search, status, course } = req.query;

    let feeRecords = await FeeRecord.find({})
        .populate('student', 'name email mobileNumber studentProfile avatar')
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
    const allRecords = await FeeRecord.find({}).populate('student', 'name studentProfile avatar');

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
    const records = await FeeRecord.find({ status: { $in: ['Pending', 'Partial'] } })
        .populate('student', 'name email mobileNumber studentProfile avatar')
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
    let records = await FeeRecord.find({})
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
    const { studentId, totalFee, course, batch, nextDueDate } = req.body;
    if (!studentId) return res.status(400).json({ message: 'studentId required' });

    let record = await FeeRecord.findOne({ student: studentId });
    if (!record) {
        record = new FeeRecord({ student: studentId });
    }

    if (totalFee !== undefined) record.totalFee = Number(totalFee);
    if (course) record.course = course;
    if (batch) record.batch = batch;
    if (nextDueDate) record.nextDueDate = new Date(nextDueDate);

    await record.save();
    res.json({ success: true, record });
});

// @desc    Get fee record for a student (admin)
// @route   GET /api/fees/admin/student/:id
const getStudentFeeRecord = asyncHandler(async (req, res) => {
    const record = await FeeRecord.findOne({ student: req.params.id })
        .populate('student', 'name email mobileNumber studentProfile avatar');
    if (!record) return res.status(404).json({ message: 'No fee record found' });
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
    const records = await FeeRecord.find({}).populate('student', 'name studentProfile');

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

module.exports = {
    getAllFeeRecords,
    getDashboardStats,
    getPendingDues,
    getAllReceipts,
    collectFee,
    setupFeeRecord,
    getStudentFeeRecord,
    getMyFees,
    getReports
};
