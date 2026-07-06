import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';


import {
    CreditCard, TrendingUp, Clock, CheckCircle, AlertCircle, FileText,
    Printer, Download, ChevronDown, X, IndianRupee, Calendar, Wallet,
    Receipt, BarChart2, Phone, MessageSquare, ArrowRight, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── Utility ─── */
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_COLORS = {
    Paid: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Partial: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Pending: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const MODE_COLORS = {
    Cash: 'bg-emerald-900/40 text-emerald-400',
    UPI: 'bg-purple-900/40 text-purple-400',
    Bank: 'bg-blue-900/40 text-blue-400',
    Card: 'bg-cyan-900/40 text-cyan-400',
    Cheque: 'bg-amber-900/40 text-amber-400',
};

/* ─── Receipt Modal ─── */
const ReceiptModal = ({ tx, record, onClose }) => {
    if (!tx) return null;
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0f1621] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                            <Receipt size={16} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fee Receipt</p>
                            <p className="text-white font-black text-sm">{tx.receiptNo}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-3">
                    <div className="bg-white/5 rounded-xl p-4 space-y-2.5">
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
                                <span className="text-slate-400 text-xs">{label}</span>
                                <span className="text-white text-xs font-bold text-right truncate max-w-[55%]">{val}</span>
                            </div>
                        ))}
                    </div>
                    {/* Amount */}
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Amount Paid</p>
                        <p className="text-3xl font-black text-emerald-400">{fmt(tx.amount)}</p>
                    </div>
                    {/* Footer balances */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Total Fee</p>
                            <p className="text-sm font-black text-white">{fmt(record?.totalFee)}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Pending</p>
                            <p className={`text-sm font-black ${record?.pendingAmount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fmt(record?.pendingAmount)}</p>
                        </div>
                    </div>
                </div>

                <div className="px-6 pb-5">
                    <button
                        onClick={() => window.print()}
                        className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <Printer size={14} />
                        Print Receipt
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── Main Student Fee Portal ─── */
const StudentFeePortal = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedTx, setSelectedTx] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await axios.get(`/api/fees/student/my-fees`, { withCredentials: true });
                setRecord(res.data);
            } catch (err) {
                // If 404 (no record yet), show empty state — not an error
                if (err.response?.status !== 404) {
                    toast.error('Could not load fee details');
                }
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-indigo-400" size={32} />
        </div>
    );

    if (!record) return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center">
                <CreditCard size={28} className="text-slate-500" />
            </div>
            <div className="text-center">
                <p className="text-white font-bold text-lg">No Fee Record Found</p>
                <p className="text-slate-400 text-sm mt-1">Your fee details haven't been set up yet. Contact the accounts office.</p>
            </div>
        </div>
    );

    const paidPct = record.totalFee > 0 ? Math.min(100, Math.round((record.paidAmount / record.totalFee) * 100)) : 0;

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {/* Back Button */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    Back
                </button>
                <div>
                    <h2 className="text-white font-black text-lg">My Fee Portal</h2>
                    <p className="text-slate-400 text-xs">Your fee details and payment history</p>
                </div>
            </div>

            {/* Welcome Banner */}
            <div className={`relative rounded-2xl p-5 overflow-hidden border ${record.status === 'Paid'
                ? 'bg-gradient-to-r from-emerald-950/60 to-slate-900 border-emerald-500/20'
                : record.status === 'Partial'
                    ? 'bg-gradient-to-r from-amber-950/60 to-slate-900 border-amber-500/20'
                    : 'bg-gradient-to-r from-red-950/60 to-slate-900 border-red-500/20'
                }`}>
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Welcome back</p>
                        <h1 className="text-2xl font-black text-white mt-1">Hello, {user?.name?.split(' ')[0]} 👋</h1>
                        <p className="text-slate-300 text-sm mt-1">
                            {record.status === 'Paid'
                                ? '🎉 Your fees are fully paid. Great job!'
                                : record.status === 'Partial'
                                    ? '💡 You have a partial payment. Please clear the balance.'
                                    : '⚠️ Your fees are pending. Please contact the accounts office.'}
                        </p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-black border ${STATUS_COLORS[record.status]}`}>
                        {record.status}
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Fee', value: fmt(record.totalFee), sub: `${record.course} · ${record.batch}`, icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'Amount Paid', value: fmt(record.paidAmount), sub: `${record.transactions.length} transaction(s)`, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Pending Balance', value: fmt(record.pendingAmount), sub: record.nextDueDate ? `Next due ${fmtDate(record.nextDueDate)}` : 'No due date set', icon: AlertCircle, color: record.pendingAmount > 0 ? 'text-red-400' : 'text-emerald-400', bg: record.pendingAmount > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10' },
                ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                    <div key={label} className="bg-[#0f1621] border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all">
                        <div className="flex items-center gap-2 mb-3">
                            <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                                <Icon size={15} className={color} />
                            </div>
                            <p className="text-slate-400 text-xs font-bold">{label}</p>
                        </div>
                        <p className={`text-xl font-black ${color}`}>{value}</p>
                        <p className="text-slate-500 text-[10px] font-bold mt-1">{sub}</p>
                    </div>
                ))}
            </div>

            {/* Progress Bar */}
            <div className="bg-[#0f1621] border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-white font-bold">Fee Payment Progress</p>
                    <span className={`text-sm font-black ${paidPct === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>{paidPct}%</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-bold mb-2">
                    <span>{paidPct === 100 ? 'Completed' : 'In Progress'}</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                            width: `${paidPct}%`,
                            background: paidPct === 100
                                ? 'linear-gradient(90deg, #10b981, #059669)'
                                : 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                        }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-xs font-bold">
                    <span className="text-emerald-400">Paid: {fmt(record.paidAmount)}</span>
                    <span className="text-red-400">Remaining: {fmt(record.pendingAmount)}</span>
                </div>
            </div>

            {/* Transaction History */}
            <div className="bg-[#0f1621] border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1">
                    <Receipt size={16} className="text-indigo-400" />
                    <h2 className="text-white font-bold">Payment History & Receipts</h2>
                </div>
                <p className="text-slate-400 text-xs font-bold mb-5">All your past fee payments — click View to see receipt</p>

                {record.transactions.length === 0 ? (
                    <div className="py-10 text-center">
                        <FileText size={32} className="text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">No transactions yet</p>
                    </div>
                ) : (
                    <>
                        {/* Table header */}
                        <div className="grid grid-cols-5 gap-2 px-3 py-2 text-[10px] text-slate-500 font-black uppercase tracking-wider border-b border-white/5">
                            <span>Receipt No.</span>
                            <span>Date</span>
                            <span>Amount</span>
                            <span>Mode</span>
                            <span>Action</span>
                        </div>
                        <div className="divide-y divide-white/5">
                            {[...record.transactions].reverse().map((tx) => (
                                <div key={tx._id} className="grid grid-cols-5 gap-2 px-3 py-3.5 items-center hover:bg-white/5 transition-colors rounded-xl">
                                    <span className="text-xs text-indigo-300 font-bold">{tx.receiptNo}</span>
                                    <span className="text-xs text-slate-300 font-bold">{fmtDate(tx.date)}</span>
                                    <span className="text-xs text-emerald-400 font-black">{fmt(tx.amount)}</span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg w-fit ${MODE_COLORS[tx.paymentMode] || 'bg-slate-800 text-slate-400'}`}>{tx.paymentMode}</span>
                                    <button
                                        onClick={() => setSelectedTx(tx)}
                                        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white font-bold bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-all"
                                    >
                                        <Printer size={11} />
                                        View
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Contact Banner */}
            {record.pendingAmount > 0 && (
                <div className="bg-[#0f1621] border border-amber-500/20 rounded-2xl p-5 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-white font-bold">Need to pay your fees?</p>
                        <p className="text-slate-400 text-xs mt-1">Visit the accounts office, or contact us on WhatsApp to pay online.</p>
                    </div>
                    <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shrink-0 shadow-lg shadow-emerald-900/40">
                        <MessageSquare size={14} />
                        Contact Accounts
                    </button>
                </div>
            )}

            {selectedTx && (
                <ReceiptModal tx={selectedTx} record={record} onClose={() => setSelectedTx(null)} />
            )}
        </div>
    );
};

export default StudentFeePortal;
