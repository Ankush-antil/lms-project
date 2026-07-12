import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { CreditCard, FileText, Printer, X, Receipt, Loader2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_COLORS = {
    Paid: 'bg-[#e6f7ec] text-emerald-700 border-emerald-200',
    Partial: 'bg-amber-50 text-amber-700 border-amber-200',
    Pending: 'bg-red-50 text-red-700 border-red-200',
};

const ReceiptModal = ({ tx, record, onClose }) => {
    if (!tx) return null;
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#e6f7ec] rounded-xl flex items-center justify-center">
                            <Receipt size={16} className="text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fee Receipt</p>
                            <p className="text-slate-800 font-black text-sm">{tx.receiptNo}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={18} className="text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-3">
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5 border border-slate-100">
                        {[
                            ['Student', record?.student?.name || '—'],
                            ['Course', record?.course + (record?.batch ? ' · ' + record?.batch : '')],
                            ['Date', fmtDate(tx.date)],
                            ['Payment Mode', tx.paymentMode],
                            ['Reference No.', tx.referenceNo || '—'],
                            ['Collected By', tx.collectedBy || 'Admin'],
                            ['Remark', tx.remark || '—'],
                        ].map(([label, val]) => (
                            <div key={label} className="flex justify-between gap-2">
                                <span className="text-slate-400 text-xs font-bold">{label}</span>
                                <span className="text-slate-800 text-xs font-bold text-right truncate max-w-[55%]">{val}</span>
                            </div>
                        ))}
                    </div>
                    {/* Amount */}
                    <div className="bg-[#e6f7ec] border border-emerald-250 rounded-2xl p-4 text-center">
                        <p className="text-emerald-700 text-[10px] font-bold uppercase tracking-wider mb-1">Amount Paid</p>
                        <p className="text-3xl font-black text-emerald-600">{fmt(tx.amount)}</p>
                    </div>
                </div>

                <div className="px-6 pb-5">
                    <button
                        onClick={() => window.print()}
                        className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <Printer size={14} />
                        Print Receipt
                    </button>
                </div>
            </div>
        </div>
    );
};

const ParentFee = () => {
    const { user } = useAuth();
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedTx, setSelectedTx] = useState(null);

    const studentId = user?.parentProfile?.student?._id || user?.parentProfile?.student;

    useEffect(() => {
        const load = async () => {
            if (!studentId) {
                setLoading(false);
                return;
            }
            try {
                const res = await axios.get(`/api/fees/student/my-fees`);
                setRecord(res.data);
            } catch (err) {
                if (err.response?.status !== 404) {
                    toast.error('Could not load fee details');
                }
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [studentId]);

    if (loading) return (
        <DashboardLayout role="Parent" fullWidth={true}>
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        </DashboardLayout>
    );

    if (!studentId) {
        return (
            <DashboardLayout role="Parent" fullWidth={true}>
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
                    <ShieldAlert size={48} className="text-red-500 mb-4 animate-bounce" />
                    <h2 className="text-xl font-bold text-slate-800">No Student Linked</h2>
                    <p className="text-slate-500 mt-2 max-w-md">
                        Please contact the administrator or institute to link your parent account with your child's student profile.
                    </p>
                </div>
            </DashboardLayout>
        );
    }

    if (!record) return (
        <DashboardLayout role="Parent" fullWidth={true}>
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <ShieldAlert size={36} className="text-amber-500 mb-3" />
                <h3 className="text-slate-700 font-bold text-sm">No Fee Records</h3>
                <p className="text-slate-400 text-xs mt-1">No fee setup record has been configured for your child yet.</p>
            </div>
        </DashboardLayout>
    );

    const paidPct = Math.round((record.paidAmount / (record.totalFee || 1)) * 100);

    return (
        <DashboardLayout role="Parent" fullWidth={true}>
            <div className="space-y-6 max-w-5xl mx-auto pb-8">
                {/* Header Banner */}
                <div className={`rounded-3xl p-6 border ${
                    record.status === 'Paid' ? 'bg-[#e6f7ec] border-emerald-200' : record.status === 'Partial' ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'
                }`}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Child's Fee Status</p>
                            <h1 className="text-xl font-black text-slate-900">Student: {record?.student?.name}</h1>
                            <p className="text-slate-650 text-sm mt-1 font-semibold">
                                {record.status === 'Paid'
                                    ? '🎉 All dues are fully paid. Thank you!'
                                    : record.status === 'Partial'
                                        ? '💡 There is a remaining balance. Please clear the dues soon.'
                                        : '⚠️ Fee payment is pending. Please check the balance below.'}
                            </p>
                        </div>
                        <span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase border ${STATUS_COLORS[record.status]}`}>
                            {record.status}
                        </span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="bg-white border border-slate-150 shadow-sm rounded-3xl p-6">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Course Fee</p>
                        <p className="text-2xl font-black text-slate-800">{fmt(record.totalFee)}</p>
                        <p className="text-slate-450 text-xs font-bold mt-1.5">{record.course} {record.batch && `· ${record.batch}`}</p>
                    </div>
                    <div className="bg-white border border-slate-150 shadow-sm rounded-3xl p-6">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Amount Paid</p>
                        <p className="text-2xl font-black text-emerald-600">{fmt(record.paidAmount)}</p>
                        <p className="text-slate-450 text-xs font-bold mt-1.5">{record.transactions.length} transaction(s)</p>
                    </div>
                    <div className="bg-white border border-slate-150 shadow-sm rounded-3xl p-6">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Remaining Dues</p>
                        <p className="text-2xl font-black text-rose-500">{fmt(record.pendingAmount)}</p>
                        <p className="text-slate-450 text-xs font-bold mt-1.5">
                            {record.nextDueDate ? `Next due ${fmtDate(record.nextDueDate)}` : 'No due date set'}
                        </p>
                    </div>
                </div>

                {/* Progress Card */}
                <div className="bg-white border border-slate-150 shadow-sm rounded-3xl p-6">
                    <p className="text-slate-800 font-black mb-4">Fee Completion Progress</p>
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-slate-500">{paidPct === 100 ? 'Completed' : 'Payment Progress'}</div>
                        <span className="text-sm font-black text-indigo-600">{paidPct}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-3.5">
                        <div
                            className="h-full rounded-full transition-all duration-700 bg-indigo-600"
                            style={{ width: `${paidPct}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                        <span className="text-emerald-600">Paid: {fmt(record.paidAmount)}</span>
                        <span className="text-rose-500">Remaining: {fmt(record.pendingAmount)}</span>
                    </div>
                </div>

                {/* Receipts list */}
                <div className="bg-white border border-slate-150 shadow-sm rounded-3xl p-6">
                    <div className="mb-6">
                        <h2 className="text-slate-800 font-black text-base">Child's Fee Payment History</h2>
                        <p className="text-slate-450 text-xs mt-1.5 font-bold">Receipts generated for payments received.</p>
                    </div>

                    {record.transactions.length === 0 ? (
                        <div className="py-10 text-center">
                            <FileText size={32} className="text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-450 font-bold text-xs italic">No transactions recorded yet.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {record.transactions.map((tx) => (
                                <div
                                    key={tx._id}
                                    onClick={() => setSelectedTx(tx)}
                                    className="flex justify-between items-center py-4 hover:bg-slate-50/50 px-3 -mx-3 rounded-2xl cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                                            <CreditCard size={18} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-slate-800 text-sm">{tx.receiptNo || 'Fee Payment'}</p>
                                            <p className="text-slate-400 text-xs font-bold mt-1">
                                                {fmtDate(tx.date)} · {tx.paymentMode}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-slate-900 text-sm">{fmt(tx.amount)}</p>
                                        <span className="text-[10px] font-black uppercase text-indigo-600 hover:underline">View Receipt →</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Receipt Modal */}
            {selectedTx && (
                <ReceiptModal
                    tx={selectedTx}
                    record={record}
                    onClose={() => setSelectedTx(null)}
                />
            )}
        </DashboardLayout>
    );
};

export default ParentFee;
