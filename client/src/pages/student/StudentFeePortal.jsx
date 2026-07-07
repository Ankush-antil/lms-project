import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import {
    CreditCard, FileText, Printer, X, Receipt, MessageSquare, Loader2, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── Utility ─── */
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_COLORS = {
    Paid: 'bg-[#e6f7ec] text-emerald-700 border-emerald-200',
    Partial: 'bg-amber-50 text-amber-700 border-amber-200',
    Pending: 'bg-red-50 text-red-700 border-red-200',
};

/* ─── Receipt Modal ─── */
const ReceiptModal = ({ tx, record, onClose }) => {
    if (!tx) return null;
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#e6f7ec] rounded-xl flex items-center justify-center">
                            <Receipt size={16} className="text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fee Receipt</p>
                            <p className="text-slate-900 font-black text-sm">{tx.receiptNo}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={18} className="text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-3">
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2.5 border border-slate-100">
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
                                <span className="text-slate-500 text-xs">{label}</span>
                                <span className="text-slate-900 text-xs font-bold text-right truncate max-w-[55%]">{val}</span>
                            </div>
                        ))}
                    </div>
                    {/* Amount */}
                    <div className="bg-[#e6f7ec] border border-emerald-200 rounded-xl p-4 text-center">
                        <p className="text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">Amount Paid</p>
                        <p className="text-3xl font-black text-emerald-600">{fmt(tx.amount)}</p>
                    </div>
                    {/* Footer balances */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Total Fee</p>
                            <p className="text-sm font-black text-slate-900">{fmt(record?.totalFee)}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Pending</p>
                            <p className={`text-sm font-black ${record?.pendingAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(record?.pendingAmount)}</p>
                        </div>
                    </div>
                </div>

                <div className="px-6 pb-5">
                    <button
                        onClick={() => window.print()}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
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
    const navigate = useNavigate(); // Kept just in case, though unused in the JSX
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedTx, setSelectedTx] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await axios.get(`/api/fees/student/my-fees`, { withCredentials: true });
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
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-64 bg-slate-50">
            <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
    );

    const feePortalCtrl = user?.studentProfile?.controls?.feePortal;
    const isFeePortalDisabled = feePortalCtrl?.enabled === false;
    const feePortalMode = feePortalCtrl?.mode || 'hide';

    if (isFeePortalDisabled && feePortalMode === 'hide') {
        return (
            <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-400 mb-4 border border-slate-200 shadow-sm">
                    <Lock size={28} />
                </div>
                <h2 className="text-lg font-black text-slate-900">Feature Restricted</h2>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                    The fee portal has been disabled by your administrator.
                </p>
                {feePortalCtrl?.note && (
                    <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-2 font-bold max-w-sm">
                        Reason: {feePortalCtrl.note}
                    </div>
                )}
            </div>
        );
    }

    if (!record) return (
        <div className="relative min-h-[calc(100vh-4rem)] bg-slate-50 p-6">
            {isFeePortalDisabled && (
                <div 
                    title={feePortalCtrl?.note || 'Fee Portal is Disabled'}
                    className="absolute inset-0 bg-white/50 backdrop-blur-[0.5px] z-[9999] flex items-center justify-center pointer-events-auto cursor-not-allowed"
                >
                    <div className="bg-white text-slate-900 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border border-slate-200 animate-slide-up">
                        <Lock size={16} className="text-amber-500" />
                        <span className="text-xs font-bold">Fee Portal is Disabled{feePortalCtrl?.note ? ` - ${feePortalCtrl.note}` : ''}</span>
                    </div>
                </div>
            )}
            <div className={`flex flex-col items-center justify-center h-64 gap-4 ${isFeePortalDisabled ? 'opacity-40 select-none pointer-events-none' : ''}`}>
                <div className="w-16 h-16 bg-white shadow-sm border border-slate-200 rounded-2xl flex items-center justify-center">
                    <CreditCard size={28} className="text-slate-400" />
                </div>
                <div className="text-center">
                    <p className="text-slate-900 font-bold text-lg">No Fee Record Found</p>
                    <p className="text-slate-500 text-sm mt-1">Your fee details haven't been set up yet. Contact the accounts office.</p>
                </div>
            </div>
        </div>
    );

    const paidPct = record.totalFee > 0 ? Math.min(100, Math.round((record.paidAmount / record.totalFee) * 100)) : 0;

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-6">
            <div className="relative">
                {isFeePortalDisabled && (
                    <div 
                        title={feePortalCtrl?.note || 'Fee Portal is Disabled'}
                        className="absolute inset-0 bg-white/50 backdrop-blur-[0.5px] z-[9999] flex items-center justify-center pointer-events-auto cursor-not-allowed"
                    >
                        <div className="bg-white text-slate-900 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border border-slate-200 animate-slide-up">
                            <Lock size={16} className="text-amber-500" />
                            <span className="text-xs font-bold">Fee Portal is Disabled{feePortalCtrl?.note ? ` - ${feePortalCtrl.note}` : ''}</span>
                        </div>
                    </div>
                )}
                <div className={`space-y-6 max-w-5xl mx-auto ${isFeePortalDisabled ? 'opacity-40 select-none pointer-events-none' : ''}`}>
                    
                    {/* Back Button */}
                    <div className="flex items-center mb-2">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium transition-colors shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                            Back
                        </button>
                    </div>

                    {/* Welcome Banner */}
                    <div className={`relative rounded-xl p-5 border ${record.status === 'Paid'
                        ? 'bg-[#e6f7ec] border-emerald-200'
                        : record.status === 'Partial'
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-red-50 border-red-200'
                        }`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Welcome Back</p>
                                <h1 className="text-xl font-bold text-slate-900">Hello, {user?.name?.split(' ')[0]} 👋</h1>
                                <p className="text-slate-600 text-sm mt-1">
                                    {record.status === 'Paid'
                                        ? '🎉 Your fees are fully paid. Great job!'
                                        : record.status === 'Partial'
                                            ? '💡 You have a partial payment. Please clear the balance.'
                                            : '⚠️ Your fees are pending. Please contact the accounts office.'}
                                </p>
                            </div>
                            <span className={`px-4 py-1.5 rounded-lg text-xs font-semibold border ${STATUS_COLORS[record.status]}`}>
                                {record.status}
                            </span>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
                            <p className="text-slate-400 text-xs font-medium mb-2">Total Fee</p>
                            <p className="text-2xl font-bold text-slate-900">{fmt(record.totalFee)}</p>
                            <p className="text-slate-500 text-xs mt-1">{record.course} {record.batch && `· ${record.batch}`}</p>
                        </div>
                        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
                            <p className="text-slate-400 text-xs font-medium mb-2">Amount Paid</p>
                            <p className="text-2xl font-bold text-emerald-600">{fmt(record.paidAmount)}</p>
                            <p className="text-slate-500 text-xs mt-1">{record.transactions.length} transaction(s)</p>
                        </div>
                        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
                            <p className="text-slate-400 text-xs font-medium mb-2">Pending Balance</p>
                            <p className="text-2xl font-bold text-red-500">{fmt(record.pendingAmount)}</p>
                            <p className="text-slate-500 text-xs mt-1">
                                {record.nextDueDate ? `Next due ${fmtDate(record.nextDueDate)}` : 'No due date set'}
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
                        <p className="text-slate-900 font-bold mb-4">Fee Payment Progress</p>
                        
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm text-slate-600">
                                {paidPct === 100 ? 'Completed' : 'In Progress'}
                            </div>
                            <span className="text-sm font-bold text-blue-600">{paidPct}%</span>
                        </div>
                        
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                            <div
                                className="h-full rounded-full transition-all duration-700 bg-blue-500"
                                style={{ width: `${paidPct}%` }}
                            />
                        </div>
                        
                        <div className="flex justify-between text-xs">
                            <span className="text-emerald-600 font-medium">Paid: {fmt(record.paidAmount)}</span>
                            <span className="text-red-500 font-medium">Remaining: {fmt(record.pendingAmount)}</span>
                        </div>
                    </div>

                    {/* Transaction History */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
                        <div className="mb-6">
                            <h2 className="text-slate-900 font-bold text-base">Payment History & Receipts</h2>
                            <p className="text-slate-500 text-sm mt-1">All your past fee payments — click to view / print receipt</p>
                        </div>

                        {record.transactions.length === 0 ? (
                            <div className="py-10 text-center">
                                <FileText size={32} className="text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 text-sm">No transactions yet</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-xs text-slate-500">
                                            <th className="pb-3 font-medium">Receipt No.</th>
                                            <th className="pb-3 font-medium">Date</th>
                                            <th className="pb-3 font-medium">Amount</th>
                                            <th className="pb-3 font-medium">Mode</th>
                                            <th className="pb-3 font-medium">Remark</th>
                                            <th className="pb-3 font-medium"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {[...record.transactions].reverse().map((tx) => (
                                            <tr key={tx._id} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-4 text-sm text-slate-500">{tx.receiptNo}</td>
                                                <td className="py-4 text-sm text-slate-900">{fmtDate(tx.date)}</td>
                                                <td className="py-4 text-sm text-emerald-600 font-medium">{fmt(tx.amount)}</td>
                                                <td className="py-4">
                                                    <span className="text-sm font-medium text-slate-900">{tx.paymentMode}</span>
                                                </td>
                                                <td className="py-4 text-sm text-slate-500">{tx.remark || 'Installment payment'}</td>
                                                <td className="py-4 text-right">
                                                    <button
                                                        onClick={() => setSelectedTx(tx)}
                                                        className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 font-medium bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition-all shadow-sm"
                                                    >
                                                        <Printer size={14} />
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Contact Banner */}
                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <p className="text-slate-900 font-bold text-base">Need to pay your fees?</p>
                            <p className="text-slate-500 text-sm mt-1">Visit the accounts office, or contact us on WhatsApp to pay online.</p>
                        </div>
                        <button className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-medium px-5 py-2.5 rounded-xl transition-all shrink-0 shadow-sm">
                            <MessageSquare size={16} />
                            Contact Accounts
                        </button>
                    </div>

                </div>

                {selectedTx && (
                    <ReceiptModal tx={selectedTx} record={record} onClose={() => setSelectedTx(null)} />
                )}
            </div>
        </div>
    );
};

export default StudentFeePortal;
