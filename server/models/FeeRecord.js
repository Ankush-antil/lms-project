const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    receiptNo: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMode: { type: String, enum: ['Cash', 'UPI', 'Bank', 'Card', 'Cheque'], default: 'Cash' },
    referenceNo: { type: String, default: '' },
    remark: { type: String, default: '' },
    collectedBy: { type: String, default: 'Admin' },
    date: { type: Date, default: Date.now }
});

const feeRecordSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    totalFee: { type: Number, required: true, default: 0 },
    paidAmount: { type: Number, default: 0 },
    pendingAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['Paid', 'Partial', 'Pending'], default: 'Pending' },
    nextDueDate: { type: Date },
    course: { type: String, default: '' },
    batch: { type: String, default: '' },
    months: { type: Number, default: 0 },  // installment months / duration
    extraCharges: [{
        label: { type: String, default: '' },   // e.g. 'Fine', 'Party', 'Books'
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        remark: { type: String, default: '' }
    }],
    transactions: [transactionSchema]
}, { timestamps: true });

// Auto-compute status & pending on save
feeRecordSchema.pre('save', function (next) {
    this.paidAmount = this.transactions.reduce((sum, t) => sum + t.amount, 0);
    this.pendingAmount = Math.max(0, this.totalFee - this.paidAmount);
    if (this.pendingAmount === 0) this.status = 'Paid';
    else if (this.paidAmount > 0) this.status = 'Partial';
    else this.status = 'Pending';
    next();
});

// Trigger Google Sheets sync after save/delete
feeRecordSchema.post('save', function (doc) {
    const { syncToSheets } = require('../utils/googleSheets');
    syncToSheets(doc).catch(err => console.error('Error in FeeRecord post-save hook:', err.message));
});

feeRecordSchema.post('findOneAndDelete', function (doc) {
    if (doc) {
        const { deleteFromSheets } = require('../utils/googleSheets');
        deleteFromSheets(doc._id).catch(err => console.error('Error in FeeRecord post-delete hook:', err.message));
    }
});

module.exports = mongoose.model('FeeRecord', feeRecordSchema);
