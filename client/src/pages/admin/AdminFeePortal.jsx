import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    LayoutDashboard, Users, CreditCard, Clock, Receipt, BarChart3,
    Search, Filter, ChevronDown, X, IndianRupee, Calendar, TrendingUp,
    CheckCircle, AlertCircle, Loader2, RefreshCw, Plus, Eye, Phone,
    MessageSquare, Printer, Download, Upload, ArrowUpRight, Wallet, FileText,
    Settings as SettingsIcon, UserCheck, AlertTriangle, Trash2, Edit
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, Legend
} from 'recharts';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import EditUserModal from '../../components/EditUserModal';

/* ─── Helpers ─── */
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_COLORS = {
    Paid: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    Partial: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    Pending: 'bg-red-500/20 text-red-400 border border-red-500/30',
};

const AGING_COLORS = {
    '60+ days': 'bg-red-500/20 text-red-400',
    '31-60 days': 'bg-orange-500/20 text-orange-400',
    '1-30 days': 'bg-amber-500/20 text-amber-400',
    'Current': 'bg-blue-500/20 text-blue-400',
};

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const PAYMENT_MODES = ['Cash', 'UPI', 'Bank', 'Card', 'Cheque'];



/* ─── Skeleton Loader Component ─── */
const SkeletonLoader = () => {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Top Stats Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3 shadow-sm">
                        <div className="h-4 w-1/2 bg-slate-200 rounded-md" />
                        <div className="h-8 w-2/3 bg-slate-200 rounded-md" />
                        <div className="h-3 w-3/4 bg-slate-200 rounded-md" />
                    </div>
                ))}
            </div>

            {/* Middle Section (2 columns for pending and charts) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* List Skeleton */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="h-5 w-1/3 bg-slate-200 rounded-md" />
                        <div className="h-5 w-1/4 bg-slate-200 rounded-md" />
                    </div>
                    <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                <div className="h-9 w-9 bg-slate-200 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-1/3 bg-slate-200 rounded-md" />
                                    <div className="h-3 w-1/2 bg-slate-200 rounded-md" />
                                </div>
                                <div className="h-5 w-16 bg-slate-200 rounded-md" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chart Skeleton */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="h-5 w-1/3 bg-slate-200 rounded-md" />
                    <div className="h-48 w-full bg-slate-50 rounded-xl flex items-end p-4 gap-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex-1 bg-slate-200 rounded-t-lg" style={{ height: `${20 + Math.random() * 60}%` }} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Table Skeleton */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="h-5 w-1/4 bg-slate-200 rounded-md" />
                    <div className="h-8 w-1/3 bg-slate-200 rounded-md" />
                </div>
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-100">
                            <div className="h-4 w-16 bg-slate-200 rounded-md" />
                            <div className="h-4 w-32 bg-slate-200 rounded-md" />
                            <div className="h-4 w-24 bg-slate-200 rounded-md" />
                            <div className="h-4 w-20 bg-slate-200 rounded-md" />
                            <div className="h-4 w-16 bg-slate-200 rounded-md" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

/* ─── Table Pagination Helper ─── */
const TablePagination = ({ currentPage, totalPages, totalItems, startIndex, itemsPerPage, onPageChange }) => {
    if (totalItems <= 0) return null;
    return (
        <div className="p-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
            <div className="text-sm font-semibold text-slate-500">
                Showing <span className="text-slate-700">{totalItems > 0 ? startIndex + 1 : 0}</span> to{' '}
                <span className="text-slate-700">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of{' '}
                <span className="text-slate-700">{totalItems}</span> entries
            </div>
            <div className="flex items-center gap-1">
                <button
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                    className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    Previous
                </button>
                <div className="flex gap-1">
                    {(() => {
                        const pages = [];
                        const maxVisible = 5;
                        if (totalPages <= maxVisible) {
                            for (let i = 1; i <= totalPages; i++) pages.push(i);
                        } else {
                            pages.push(1);
                            let start = Math.max(2, currentPage - 1);
                            let end = Math.min(totalPages - 1, currentPage + 1);
                            if (currentPage <= 2) {
                                end = 4;
                            } else if (currentPage >= totalPages - 1) {
                                start = totalPages - 3;
                            }
                            if (start > 2) pages.push('...');
                            for (let i = start; i <= end; i++) pages.push(i);
                            if (end < totalPages - 1) pages.push('...');
                            pages.push(totalPages);
                        }
                        return pages.map((p, idx) => (
                            <button
                                key={idx}
                                disabled={p === '...'}
                                onClick={() => p !== '...' && onPageChange(p)}
                                className={`w-8 h-8 text-xs font-bold rounded-xl transition-all ${p === '...'
                                    ? 'text-slate-400 cursor-default bg-transparent'
                                    : currentPage === p
                                        ? 'bg-[#0b1329] text-white shadow-md'
                                        : 'text-slate-600 hover:bg-slate-100 bg-transparent'
                                    }`}
                            >
                                {p}
                            </button>
                        ));
                    })()}
                </div>
                <button
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                    className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

/* ─── Avatar ─── */
const Avatar = ({ name = '', size = 36, className = '' }) => {
    const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
    const color = colors[name.charCodeAt(0) % colors.length];
    return (
        <div className={`${color} ${className} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
            style={{ width: size, height: size, fontSize: size * 0.36 }}>
            {initials || '?'}
        </div>
    );
};

/* ─── QR Code SVG (simple placeholder) ─── */
const QRPlaceholder = () => (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="56" height="56" fill="#f8f8f8" rx="2"/>
        {/* TL block */}
        <rect x="4" y="4" width="20" height="20" rx="2" fill="#1e293b"/>
        <rect x="8" y="8" width="12" height="12" rx="1" fill="#f8f8f8"/>
        <rect x="10" y="10" width="8" height="8" rx="1" fill="#1e293b"/>
        {/* TR block */}
        <rect x="32" y="4" width="20" height="20" rx="2" fill="#1e293b"/>
        <rect x="36" y="8" width="12" height="12" rx="1" fill="#f8f8f8"/>
        <rect x="38" y="10" width="8" height="8" rx="1" fill="#1e293b"/>
        {/* BL block */}
        <rect x="4" y="32" width="20" height="20" rx="2" fill="#1e293b"/>
        <rect x="8" y="36" width="12" height="12" rx="1" fill="#f8f8f8"/>
        <rect x="10" y="38" width="8" height="8" rx="1" fill="#1e293b"/>
        {/* Data dots */}
        <rect x="32" y="32" width="4" height="4" fill="#1e293b"/>
        <rect x="38" y="32" width="4" height="4" fill="#1e293b"/>
        <rect x="44" y="32" width="8" height="4" fill="#1e293b"/>
        <rect x="32" y="38" width="8" height="4" fill="#1e293b"/>
        <rect x="44" y="38" width="4" height="4" fill="#1e293b"/>
        <rect x="32" y="44" width="4" height="8" fill="#1e293b"/>
        <rect x="38" y="46" width="8" height="4" fill="#1e293b"/>
        <rect x="48" y="44" width="4" height="8" fill="#1e293b"/>
    </svg>
);

/* ─── Receipt Modal (Off-white, reference style) ─── */
const ReceiptModal = ({ receipt, onClose }) => {
    if (!receipt) return null;

    const handlePrint = () => {
        const w = window.open('', '_blank');
        w.document.write(`<html><head><title>Fee Receipt</title>
        <style>
            body { font-family: Arial, sans-serif; background:#fff; padding:32px; max-width:460px; margin:auto; }
            .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #e2e8f0; padding-bottom:12px; margin-bottom:12px; }
            .institute { font-weight:800; font-size:16px; color:#1e293b; }
            .sub { font-size:11px; color:#64748b; }
            .rcpt-label { text-align:center; font-size:10px; color:#64748b; letter-spacing:2px; text-transform:uppercase; margin-bottom:4px; }
            .rcpt-no { text-align:center; font-size:18px; font-weight:900; color:#2563eb; margin-bottom:16px; }
            .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; }
            .field label { font-size:10px; color:#94a3b8; display:block; }
            .field span { font-size:13px; font-weight:700; color:#1e293b; }
            .amount-box { background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:16px; text-align:center; margin-bottom:12px; }
            .amount-label { font-size:11px; color:#64748b; margin-bottom:4px; }
            .amount-val { font-size:28px; font-weight:900; color:#2563eb; }
            .remark { font-size:12px; color:#64748b; margin-bottom:16px; }
            .footer { display:flex; justify-content:space-between; font-size:12px; color:#64748b; border-top:1px solid #e2e8f0; padding-top:12px; margin-top:8px; }
            .dashed { border:1.5px dashed #cbd5e1; border-radius:8px; padding:16px; }
        </style></head><body>
        <div class="header">
            <div>
                <div class="institute">🎓 Institute Fee Portal</div>
                <div class="sub">Fee Management System</div>
            </div>
        </div>
        <div class="rcpt-label">FEE RECEIPT</div>
        <div class="rcpt-no">${receipt.receiptNo}</div>
        <div class="dashed">
            <div class="grid">
                <div class="field"><label>Student</label><span>${receipt.studentName || '—'}</span></div>
                <div class="field"><label>Course</label><span>${receipt.course || '—'}</span></div>
                <div class="field"><label>Date</label><span>${fmtDate(receipt.date)}</span></div>
                <div class="field"><label>Mode</label><span>${receipt.paymentMode}</span></div>
                <div class="field"><label>Collected By</label><span>${receipt.collectedBy || 'Admin'}</span></div>
                ${receipt.remark ? `<div class="field"><label>Remark</label><span>${receipt.remark}</span></div>` : ''}
            </div>
            <div class="amount-box">
                <div class="amount-label">Amount Received</div>
                <div class="amount-val">${fmt(receipt.amount)}</div>
            </div>
            <div class="footer">
                <span>Thank you for your payment!</span>
                <span>Authorized Signature</span>
            </div>
        </div>
        </body></html>`);
        w.print();
    };

    const studentName = receipt.studentName || receipt.student?.name || '—';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            {/* Off-white receipt card */}
            <div className="bg-white rounded-2xl w-full max-w-[440px] shadow-2xl overflow-hidden">
                {/* Modal top bar — dark header with close */}
                <div className="flex items-center justify-between px-5 py-3 bg-slate-100 border-b border-slate-200">
                    <span className="text-sm font-black text-slate-700">Payment Receipt</span>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
                        <X size={16} className="text-slate-500" />
                    </button>
                </div>

                {/* Receipt inner paper */}
                <div className="px-6 py-5">
                    {/* Institute header */}
                    <div className="flex items-start justify-between mb-4 pb-4 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-lg">
                                🎓
                            </div>
                            <div>
                                <p className="font-black text-slate-800 text-sm leading-tight">Institute Fee Portal</p>
                                <p className="text-[10px] text-slate-500">Fee Management System</p>
                            </div>
                        </div>
                        <QRPlaceholder />
                    </div>

                    {/* Receipt number */}
                    <div className="text-center mb-4">
                        <p className="text-[10px] text-slate-400 uppercase tracking-[3px] font-bold mb-1">FEE RECEIPT</p>
                        <p className="text-blue-600 font-black text-lg tracking-wide">{receipt.receiptNo}</p>
                    </div>

                    {/* Dashed border paper area */}
                    <div className="border-[1.5px] border-dashed border-slate-300 rounded-xl p-4 space-y-4">
                        {/* Fields grid */}
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold mb-0.5">Student</p>
                                <p className="text-slate-800 font-black text-sm">{studentName}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold mb-0.5">Course</p>
                                <p className="text-slate-800 font-black text-sm">{receipt.course || '—'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold mb-0.5">Date</p>
                                <p className="text-slate-800 font-black text-sm">{fmtDate(receipt.date)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold mb-0.5">Mode</p>
                                <p className="text-slate-800 font-black text-sm">{receipt.paymentMode}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold mb-0.5">Collected By</p>
                                <p className="text-slate-800 font-black text-sm">{receipt.collectedBy || 'Admin'}</p>
                            </div>
                            {receipt.remark && (
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold mb-0.5">Remark</p>
                                    <p className="text-slate-800 font-black text-sm">{receipt.remark}</p>
                                </div>
                            )}
                        </div>

                        {/* Amount received box — blue bg */}
                        <div className="bg-blue-50 border border-blue-100 rounded-xl py-4 text-center">
                            <p className="text-xs text-slate-500 font-medium mb-1">Amount Received</p>
                            <p className="text-3xl font-black text-blue-600">{fmt(receipt.amount)}</p>
                        </div>

                        {/* Remark line if any */}
                        {receipt.remark && (
                            <p className="text-xs text-slate-500">Remark: {receipt.remark}</p>
                        )}

                        {/* Footer */}
                        <div className="pt-3 border-t border-slate-200 flex items-end justify-between">
                            <p className="text-xs text-slate-500">Thank you for your payment!</p>
                            <div className="text-right">
                                <div className="w-24 border-t border-slate-400 mb-1" />
                                <p className="text-[10px] text-slate-400">Authorized Signature</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="px-6 pb-5 flex gap-3">
                    <button onClick={handlePrint}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-bold transition-colors">
                        <Printer size={14} /> Print
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── Student Details Modal ─── */
const StudentDetailsModal = ({ record, receipts, onClose, onCollect, onOpenReceipt, onDelete, onDeleteTransaction, onDeleteExtraCharge }) => {
    if (!record) return null;

    const student = record.student || {};
    const paidAmount = record.paidAmount || 0;
    const totalFee = record.totalFee || 0;
    const pendingAmount = record.pendingAmount || 0;
    const percentage = totalFee > 0 ? Math.round((paidAmount / totalFee) * 100) : 0;
    
    // Filter receipts matching this student's ID
    const studentReceipts = receipts.filter(r => 
        r.studentId?.toString() === student._id?.toString()
    );

    const handleSendReminder = () => {
        toast.success(`Fee reminder sent to ${student.name || 'Student'}!`);
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-[720px] shadow-2xl overflow-hidden relative border border-slate-100 flex flex-col max-h-[90vh]">
                
                {/* Close Button */}
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 transition-colors p-1 bg-slate-50 hover:bg-slate-100 rounded-full"
                >
                    <X size={20} />
                </button>

                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
                    <div>
                        <h2 className="text-slate-850 font-black text-xl">Student Details</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Left Info Panel */}
                        <div className="md:col-span-1 border border-slate-150 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/50">
                            <Avatar name={student.name || ''} size={80} className="shadow-inner" />
                            <div>
                                <h3 className="text-slate-800 font-black text-lg leading-tight">{student.name}</h3>
                                {student.admissionNo && (
                                    <p className="text-indigo-600 text-xs font-bold mt-0.5">Adm: {student.admissionNo}</p>
                                )}
                                <p className="text-slate-400 text-xs mt-0.5">{student.mobileNumber || 'No mobile'}</p>
                                {student.mobile2 && (
                                    <p className="text-slate-400 text-xs">{student.mobile2}</p>
                                )}
                                {student.fatherName && (
                                    <p className="text-slate-500 text-xs mt-1">Father: <span className="font-semibold text-slate-600">{student.fatherName}</span></p>
                                )}
                            </div>
                            <span className={`text-xs px-3 py-1 rounded-full font-bold ${STATUS_COLORS[record.status] || 'bg-slate-100 text-slate-600'}`}>
                                {record.status}
                            </span>
                        </div>

                        {/* Right Academic & Fee Progress Panel */}
                        <div className="md:col-span-2 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Course</span>
                                    <span className="text-slate-700 text-sm font-bold block mt-1">{record.course || '—'}</span>
                                </div>
                                <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Batch</span>
                                    <span className="text-slate-700 text-sm font-bold block mt-1">{record.batch || '—'}</span>
                                </div>
                                <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Course Fee</span>
                                    <span className="text-slate-700 text-sm font-bold block mt-1">{fmt(totalFee)}</span>
                                </div>
                                <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Balance Due</span>
                                    <span className={`text-sm font-bold block mt-1 ${pendingAmount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{fmt(pendingAmount)}</span>
                                </div>
                                {record.months > 0 && (
                                    <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-3">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Months</span>
                                        <span className="text-slate-700 text-sm font-bold block mt-1">{record.months} months</span>
                                    </div>
                                )}
                                {(record.extraCharges || []).length > 0 && (
                                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider block">Extra Charges</span>
                                        <span className="text-amber-600 text-sm font-bold block mt-1">
                                            {fmt((record.extraCharges || []).reduce((s,ec) => s+(ec.amount||0), 0))}
                                        </span>
                                        <div className="text-[10px] text-slate-500 mt-2 space-y-1">
                                            {record.extraCharges.map((ec, i) => (
                                                <div key={ec._id || i} className="flex justify-between items-center py-0.5 border-b border-amber-100/50 last:border-0">
                                                    <span>{ec.label || 'Extra'}: {fmt(ec.amount)}</span>
                                                    <button
                                                        onClick={() => {
                                                            if (onDeleteExtraCharge) onDeleteExtraCharge(student._id, ec._id);
                                                        }}
                                                        className="p-1 hover:bg-rose-100/80 rounded text-slate-400 hover:text-rose-600 transition-colors"
                                                        title="Delete Extra Charge"
                                                    >
                                                        <Trash2 size={11} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Joining Date</span>
                                    <span className="text-slate-700 text-sm font-bold block mt-1">
                                        {student.studentProfile?.enrollmentDate 
                                            ? new Date(student.studentProfile.enrollmentDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
                                            : '—'}
                                    </span>
                                </div>
                            </div>

                            {/* Fee Progress Bar */}
                            <div className="border border-slate-150 rounded-2xl p-4 space-y-3 bg-slate-50/50">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600 font-bold">Fee Progress</span>
                                    <span className="text-slate-600 font-bold">
                                        {percentage}% Paid {fmt(paidAmount)} / Due {fmt(pendingAmount)}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                                    <div className="bg-indigo-600 h-3 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        onCollect(student._id);
                                        onClose();
                                    }}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100"
                                >
                                    <CreditCard size={14} /> Collect Fee
                                </button>
                                <button
                                    onClick={handleSendReminder}
                                    className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                >
                                    <MessageSquare size={14} /> Send Reminder
                                </button>
                                <button
                                    onClick={() => {
                                        if (onDelete) onDelete(student._id);
                                    }}
                                    className="px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl py-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                    title="Delete Student"
                                >
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Payment History Panel */}
                    <div className="space-y-3 pt-2">
                        <h3 className="text-slate-800 font-black text-sm flex items-center gap-2">
                            Payment History ({studentReceipts.length})
                        </h3>
                        <div className="border border-slate-150 rounded-2xl overflow-hidden bg-white max-h-[180px] overflow-y-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-150 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                                        <th className="px-4 py-2">Receipt No.</th>
                                        <th className="px-4 py-2">Date</th>
                                        <th className="px-4 py-2">Amount</th>
                                        <th className="px-4 py-2">Mode</th>
                                        <th className="px-4 py-2 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentReceipts.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-8 text-slate-400 italic">No payment history found</td>
                                        </tr>
                                    ) : (
                                        studentReceipts.map(rec => (
                                            <tr key={rec._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2.5 font-bold text-slate-700">{rec.receiptNo}</td>
                                                <td className="px-4 py-2.5 text-slate-500">{fmtDate(rec.date)}</td>
                                                <td className="px-4 py-2.5 text-emerald-600 font-bold">{fmt(rec.amount)}</td>
                                                <td className="px-4 py-2.5 text-slate-500">
                                                    <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">{rec.paymentMode}</span>
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button 
                                                            onClick={() => onOpenReceipt(rec)} 
                                                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                                                            title="View Receipt"
                                                        >
                                                            <Eye size={13} />
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                if (onDeleteTransaction) onDeleteTransaction(rec._id, student._id);
                                                            }} 
                                                            className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                                                            title="Delete Payment"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

/* ─── Collect Fee Form (Reusable) ─── */
const CollectFeeForm = ({ students, preselectedId, onCancel, onSuccess }) => {
    const [selectedId, setSelectedId] = useState(preselectedId || '');
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState('Cash');
    const [refNo, setRefNo] = useState('');
    const [remark, setRemark] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingRecord, setLoadingRecord] = useState(false);

    // Extra charges state
    const [hasExtraCharge, setHasExtraCharge] = useState(false);
    const [extraLabel, setExtraLabel] = useState('');
    const [extraAmount, setExtraAmount] = useState('');
    const [extraRemark, setExtraRemark] = useState('');

    const [filterCourse, setFilterCourse] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    // Extract unique courses and sections from students prop
    const uniqueCourses = Array.from(new Set(students.map(s => s.course).filter(Boolean))).sort();
    const uniqueSections = Array.from(new Set(students.map(s => s.student?.studentProfile?.section).filter(Boolean))).sort();

    useEffect(() => {
        if (selectedId) {
            const found = students.find(s => (s.student?._id || s._id) === selectedId);
            if (found) {
                setSearchQuery(found.student?.name || found.name || '');
            }
        } else {
            setSearchQuery('');
        }
    }, [selectedId, students]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            const container = document.getElementById('student-search-container');
            if (container && !container.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const filteredStudents = students.filter(s => {
        const matchesCourse = !filterCourse || s.course === filterCourse;
        const matchesSection = !filterSection || s.student?.studentProfile?.section === filterSection;
        
        const name = (s.student?.name || s.name || '').toLowerCase();
        const email = (s.student?.email || s.email || '').toLowerCase();
        const admissionNo = (s.student?.admissionNo || s.admissionNo || '').toLowerCase();
        
        const q = searchQuery.toLowerCase();
        const matchesQuery = !searchQuery || 
            name.includes(q) || 
            email.includes(q) || 
            admissionNo.includes(q);
            
        return matchesCourse && matchesSection && matchesQuery;
    });

    useEffect(() => {
        if (selectedId) {
            setLoadingRecord(true);
            axios.get(`/api/fees/admin/student/${selectedId}`, { withCredentials: true })
                .then(r => setSelectedRecord(r.data))
                .catch(() => setSelectedRecord(null))
                .finally(() => setLoadingRecord(false));
        } else {
            setSelectedRecord(null);
        }
    }, [selectedId]);

    useEffect(() => {
        if (preselectedId) {
            setSelectedId(preselectedId);
        }
    }, [preselectedId]);

    const handleSubmit = async () => {
        if (!selectedId) return toast.error('Select student');
        
        const collectAmount = Number(amount) || 0;
        const hasExtra = hasExtraCharge && extraLabel && extraAmount && Number(extraAmount) > 0;
        
        if (collectAmount <= 0 && !hasExtra) {
            return toast.error('Please enter receive amount or add an extra charge');
        }

        setLoading(true);

        let extraChargeData = null;
        if (hasExtraCharge && extraLabel && extraAmount) {
            extraChargeData = {
                label: extraLabel,
                amount: Number(extraAmount),
                remark: extraRemark
            };
        }

        try {
            const res = await axios.post(`/api/fees/admin/collect`, {
                studentId: selectedId, 
                amount: Number(amount), 
                paymentMode: mode, 
                referenceNo: refNo, 
                remark,
                extraCharge: extraChargeData
            }, { withCredentials: true });
            toast.success(`Receipt generated: ${res.data.receiptNo}`);
            onSuccess();
            if (onCancel) onCancel();
        } catch {
            toast.error('Failed to collect fee');
        } finally {
            setLoading(false);
        }
    };

    const extraAmtNum = (hasExtraCharge && Number(extraAmount)) ? Number(extraAmount) : 0;
    const newBalance = selectedRecord ? Math.max(0, selectedRecord.pendingAmount + extraAmtNum - (Number(amount) || 0)) : null;

    return (
        <div className="flex flex-col md:flex-row gap-6 text-slate-800">
            {/* Left: Form */}
            <div className="flex-1 space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Filter Course</label>
                        <select
                            value={filterCourse}
                            onChange={e => {
                                setFilterCourse(e.target.value);
                                setSelectedId('');
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">All Courses</option>
                            {uniqueCourses.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Filter Section</label>
                        <select
                            value={filterSection}
                            onChange={e => {
                                setFilterSection(e.target.value);
                                setSelectedId('');
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">All Sections</option>
                            {uniqueSections.map(sec => (
                                <option key={sec} value={sec}>Section {sec}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Student Select with Search */}
                <div className="relative" id="student-search-container">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Search Student</label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Type student name or admission no..."
                            value={searchQuery}
                            onChange={e => {
                                setSearchQuery(e.target.value);
                                setSelectedId('');
                                setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <Search size={16} />
                        </div>
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedId('');
                                    setShowDropdown(true);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {showDropdown && (
                        <div className="absolute z-50 w-full mt-1 rounded-xl shadow-xl max-h-60 overflow-y-auto" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
                            {filteredStudents.length === 0 ? (
                                <div className="p-3 text-xs italic text-center" style={{ color: '#94a3b8' }}>No students found</div>
                            ) : (
                                filteredStudents.map(s => {
                                    const studentName = s.student?.name || s.name;
                                    const studentCourse = s.course;
                                    const sectionName = s.student?.studentProfile?.section;
                                    const dueText = fmt(s.pendingAmount);
                                    const isSelected = (s.student?._id || s._id) === selectedId;
                                    return (
                                        <button
                                            key={s._id}
                                            type="button"
                                            onClick={() => {
                                                const id = s.student?._id || s._id;
                                                setSelectedId(id);
                                                setSearchQuery(studentName);
                                                setShowDropdown(false);
                                            }}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                width: '100%',
                                                textAlign: 'left',
                                                padding: '10px 16px',
                                                borderBottom: '1px solid #f1f5f9',
                                                fontSize: '12px',
                                                background: isSelected ? '#eef2ff' : '#ffffff',
                                                cursor: 'pointer',
                                                transition: 'background 0.15s'
                                            }}
                                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#ffffff'; }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>{studentName}</span>
                                                <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                                                    Course: {studentCourse} {sectionName ? `| Section: ${sectionName}` : ''}
                                                </span>
                                            </div>
                                            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '12px' }}>{dueText} due</span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                {/* Fee Info */}
                {loadingRecord && <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 size={14} className="animate-spin" /> Loading...</div>}
                {selectedRecord && !loadingRecord ? (
                    <div className="grid grid-cols-3 gap-3 animate-fade-in">
                        <div className="bg-slate-100 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-500 mb-1">Total Fee</p>
                            <p className="text-slate-805 font-black">{fmt(selectedRecord.totalFee)}</p>
                        </div>
                        <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-500 mb-1">Already Paid</p>
                            <p className="text-emerald-600 font-black">{fmt(selectedRecord.paidAmount)}</p>
                        </div>
                        <div className="bg-red-500/10 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-500 mb-1">Pending</p>
                            <p className="text-red-500 font-black">{fmt(selectedRecord.pendingAmount)}</p>
                        </div>
                    </div>
                ) : !loadingRecord && (
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-100 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-500 mb-1">Total Fee</p>
                            <p className="text-slate-805 font-black">₹0</p>
                        </div>
                        <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-500 mb-1">Already Paid</p>
                            <p className="text-emerald-600 font-black">₹0</p>
                        </div>
                        <div className="bg-red-500/10 rounded-xl p-3 text-center">
                            <p className="text-xs text-slate-500 mb-1">Pending</p>
                            <p className="text-red-500 font-black">₹0</p>
                        </div>
                    </div>
                )}

                {/* Amount */}
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Receive Amount</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-indigo-500" />
                </div>

                {/* Payment Mode */}
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Payment Mode</label>
                    <div className="flex flex-wrap gap-2">
                        {PAYMENT_MODES.map(m => (
                            <button key={m} onClick={() => setMode(m)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${mode === m ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                {m}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Extra Charge Section */}
                <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={hasExtraCharge}
                            onChange={e => setHasExtraCharge(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded border-slate-350 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-700">Add Extra Charge (Optional)</span>
                    </label>
                    
                    {hasExtraCharge && (
                        <div className="grid grid-cols-3 gap-3 animate-fade-in pt-1">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Charge Name</label>
                                <input
                                    type="text"
                                    value={extraLabel}
                                    onChange={e => setExtraLabel(e.target.value)}
                                    placeholder="e.g. Fine, Books"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Amount (₹)</label>
                                <input
                                    type="number"
                                    value={extraAmount}
                                    onChange={e => setExtraAmount(e.target.value)}
                                    placeholder="Amount"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Remark</label>
                                <input
                                    type="text"
                                    value={extraRemark}
                                    onChange={e => setExtraRemark(e.target.value)}
                                    placeholder="Remark"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Ref + Remark */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Reference No. (Optional)</label>
                        <input type="text" value={refNo} onChange={e => setRefNo(e.target.value)} placeholder="e.g. UPI ref / cheque no."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Remark (Optional)</label>
                        <input type="text" value={remark} onChange={e => setRemark(e.target.value)} placeholder="e.g. First installment"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-indigo-500" />
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={handleSubmit} disabled={loading}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl py-2.5 font-bold text-sm transition-colors flex items-center justify-center gap-2">
                        {loading ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                        Save & Generate Receipt
                    </button>
                    {onCancel && (
                        <button onClick={onCancel} className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors">
                            Cancel
                        </button>
                    )}
                </div>
            </div>

            {/* Right: Receipt Preview */}
            <div className="w-full md:w-64 flex-shrink-0 bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Receipt Preview</p>
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3 text-xs leading-relaxed">
                    <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-400">Receipt No: </span><span className="text-slate-650 font-bold">Auto-generated</span></div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-400">Date: </span><span className="text-slate-650 font-bold">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-400">Collected By: </span><span className="text-slate-650 font-bold">Admin</span></div>
                    {selectedRecord ? (
                        <>
                            <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-400">Student: </span><span className="text-slate-700 font-bold">{selectedRecord.student?.name}</span></div>
                            <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-400">Course: </span><span className="text-slate-700 font-bold">{selectedRecord.course}</span></div>
                            {hasExtraCharge && extraLabel && extraAmtNum > 0 && (
                                <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-400">Extra Charge: </span><span className="text-amber-600 font-bold">+{fmt(extraAmtNum)} ({extraLabel})</span></div>
                            )}
                            <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                <span className="text-slate-400">Amount: </span>
                                <span className="text-slate-800 font-black">
                                    {amount ? fmt(amount) : (extraAmtNum > 0 ? fmt(extraAmtNum) : '₹0')}
                                </span>
                            </div>
                            <div className="flex justify-between"><span className="text-slate-400">New Balance: </span><span className={`font-bold ${newBalance === 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(newBalance)}</span></div>
                        </>
                    ) : (
                        <>
                            <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-400">Student: </span><span className="text-slate-300 italic">None</span></div>
                            <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-400">Course: </span><span className="text-slate-300 italic">None</span></div>
                            <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-400">Amount: </span><span className="text-slate-500">₹0</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">New Balance: </span><span className="text-slate-500">₹0</span></div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ─── Collect Fee Modal Wrapper ─── */
const CollectFeeModal = ({ students, onClose, onSuccess, preselectedId }) => {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden relative border border-slate-100 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-200 sticky top-0 bg-white z-10 text-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                            <CreditCard size={16} className="text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-slate-850 font-black text-base">Collect Fee</p>
                            <p className="text-xs text-slate-400">Search student and record payment</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                    <CollectFeeForm 
                        students={students} 
                        preselectedId={preselectedId} 
                        onCancel={onClose} 
                        onSuccess={onSuccess} 
                    />
                </div>
            </div>
        </div>
    );
};

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'All Students', icon: Users },
    { id: 'collect', label: 'Collect Fee', icon: CreditCard },
    { id: 'pending', label: 'Pending Dues', icon: Clock },
    { id: 'receipts', label: 'Receipts', icon: Receipt },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function AdminFeePortal() {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(false);

    // Data state
    const [stats, setStats] = useState(null);
    const [students, setStudents] = useState([]);
    const [pendingDues, setPendingDues] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [reports, setReports] = useState(null);

    // UI state
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [courseFilter, setCourseFilter] = useState('All');
    const [reportTab, setReportTab] = useState('course');
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedStudentForEdit, setSelectedStudentForEdit] = useState(null);
    const [showCollectModal, setShowCollectModal] = useState(false);
    const [collectPreselect, setCollectPreselect] = useState('');
    const [recSearch, setRecSearch] = useState(''); // receipts search — must be here (hook rule)

    // Pagination states
    const [studentsPage, setStudentsPage] = useState(1);
    const [pendingPage, setPendingPage] = useState(1);
    const [receiptsPage, setReceiptsPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setStudentsPage(1);
    }, [search, statusFilter, courseFilter]);

    useEffect(() => {
        setReceiptsPage(1);
    }, [recSearch]);
    // Settings state
    const [settings, setSettings] = useState({ instituteName: 'Institute Fee Portal', contact: '', address: '', monthlyTarget: '' });
    const [settingsSaved, setSettingsSaved] = useState(false);
    const [syncConfig, setSyncConfig] = useState(null);
    const [syncLoading, setSyncLoading] = useState(false);
    const [spreadsheetIdInput, setSpreadsheetIdInput] = useState('');

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [mergedR, configR] = await Promise.all([
                axios.get(`/api/fees/admin/dashboard-data`, { withCredentials: true }),
                axios.get(`/api/sync/config`, { withCredentials: true }).catch(() => ({ data: null }))
            ]);
            const { stats, students, pendingDues, receipts, reports } = mergedR.data;
            setStats(stats);
            setStudents(students);
            setPendingDues(pendingDues);
            setReceipts(receipts);
            setReports(reports);
            if (configR && configR.data) {
                setSyncConfig(configR.data);
                setSpreadsheetIdInput(configR.data.spreadsheetId || '');
            }
            return students;
        } catch (e) {
            toast.error('Failed to load fee data');
        } finally {
            setLoading(false);
        }
    };

    const saveAllSettings = async () => {
        try {
            if (spreadsheetIdInput) {
                await axios.post(`/api/sync/config`, { spreadsheetId: spreadsheetIdInput }, { withCredentials: true });
                const configR = await axios.get(`/api/sync/config`, { withCredentials: true });
                setSyncConfig(configR.data);
            }
            setSettingsSaved(true);
            toast.success('Settings saved successfully!');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to save settings');
        } finally {
            setTimeout(() => setSettingsSaved(false), 2000);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    useEffect(() => {
        if (!socket) return;
        const handleFeeRecordUpdated = () => {
            console.log('Fee record updated via socket, refreshing...');
            fetchAll();
        };
        socket.on('fee-record-updated', handleFeeRecordUpdated);
        return () => socket.off('fee-record-updated', handleFeeRecordUpdated);
    }, [socket]);

    const handleDeleteFeeRecord = async (recordId, studentId) => {
        if (!window.confirm("Are you sure you want to delete this fee record?")) return;
        try {
            if (studentId) {
                // If student exists, delete the User (which also deletes the FeeRecord in the backend)
                await axios.delete(`/api/users/${studentId}`, { withCredentials: true });
            } else {
                // If student is null (orphaned), delete the FeeRecord directly
                await axios.delete(`/api/fees/admin/record/${recordId}`, { withCredentials: true });
            }
            toast.success("Record deleted successfully");
            fetchAll();
            setSelectedStudentForDetails(null);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete record");
        }
    };

    const handleDeleteTransaction = async (transactionId, studentId) => {
        if (!window.confirm("Are you sure you want to delete this payment transaction?")) return;
        try {
            await axios.delete(`/api/fees/admin/transaction/${transactionId}`, { withCredentials: true });
            toast.success("Transaction deleted successfully");
            
            const updatedStudents = await fetchAll();
            
            // Update the modal details
            if (studentId && updatedStudents) {
                const updatedStudent = updatedStudents.find(s => s.student?._id === studentId);
                if (updatedStudent) {
                    setSelectedStudentForDetails(updatedStudent);
                } else {
                    setSelectedStudentForDetails(null);
                }
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete transaction");
        }
    };

    const handleDeleteExtraCharge = async (studentId, chargeId) => {
        if (!window.confirm("Are you sure you want to delete this extra charge? This will deduct its amount from total fee.")) return;
        try {
            await axios.delete(`/api/fees/admin/student/${studentId}/extra-charge/${chargeId}`, { withCredentials: true });
            toast.success("Extra charge deleted successfully");
            
            const updatedStudents = await fetchAll();
            
            // Update the modal details
            if (studentId && updatedStudents) {
                const updatedStudent = updatedStudents.find(s => s.student?._id === studentId);
                if (updatedStudent) {
                    setSelectedStudentForDetails(updatedStudent);
                } else {
                    setSelectedStudentForDetails(null);
                }
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete extra charge");
        }
    };

    const openCollect = (studentId = '') => {
        setCollectPreselect(studentId);
        setShowCollectModal(true);
    };

    // Filtered students
    const filteredStudents = students.filter(s => {
        const name = s.student?.name || '';
        const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || s.course?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'All' || s.status === statusFilter;
        const matchCourse = courseFilter === 'All' || s.course === courseFilter;
        return matchSearch && matchStatus && matchCourse;
    });

    const courses = [...new Set(students.map(s => s.course).filter(Boolean))];

    /* ─── Dashboard Tab ─── */
    const renderDashboard = () => (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Today's Collection", value: fmt(stats?.todayCollection), icon: IndianRupee, color: 'indigo', sub: 'Collected today' },
                    { label: 'Monthly Collection', value: fmt(stats?.monthlyCollection), icon: TrendingUp, color: 'emerald', sub: 'This month' },
                    { label: 'Pending Fees', value: fmt(stats?.totalPending), icon: AlertTriangle, color: 'amber', sub: `${stats?.pendingCount + stats?.partialCount || 0} students` },
                    { label: 'Total Students', value: stats?.totalStudents || 0, icon: Users, color: 'purple', sub: `${stats?.paidCount || 0} fully paid` },
                ].map(card => {
                    const Icon = card.icon;
                    const colorMap = {
                        indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                        emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                        amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                        purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                    };
                    return (
                        <div key={card.label} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-200 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs text-slate-400 font-medium">{card.label}</p>
                                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${colorMap[card.color]}`}>
                                    <Icon size={16} />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-slate-800">{card.value}</p>
                            <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
                        </div>
                    );
                })}
            </div>

            {/* Top Pending + Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Pending Students */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-800 font-black">Top Pending Students</h3>
                        <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                            Needs Follow-up
                        </span>
                    </div>
                    <div className="space-y-3">
                        {(stats?.topPending || []).length === 0 && (
                            <p className="text-slate-500 text-sm text-center py-4">No pending dues 🎉</p>
                        )}
                        {(stats?.topPending || []).map((p, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-slate-50 transition-colors">
                                <Avatar name={p.student?.name || ''} size={36} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-slate-800 text-sm font-bold truncate">{p.student?.name}</p>
                                    <p className="text-slate-500 text-xs">{p.course} · Due {fmtDate(p.nextDueDate)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-red-400 font-black text-sm">{fmt(p.pendingAmount)}</p>
                                    <button onClick={() => openCollect(p.student?._id)}
                                        className="text-[10px] text-indigo-400 hover:text-indigo-300">
                                        Collect →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Monthly Trend Chart */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <h3 className="text-slate-800 font-black mb-4">Monthly Revenue Trend</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={reports?.monthlyTrend || []}>
                            <defs>
                                <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip contentStyle={{ background: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                labelStyle={{ color: '#1e293b' }} formatter={v => [fmt(v), 'Collection']} />
                            <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} fill="url(#colorAmt)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Payment Mode Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <h3 className="text-slate-800 font-black mb-4">Payment Mode Split</h3>
                    {(reports?.paymentModes || []).length === 0 ? (
                        <p className="text-slate-500 text-sm text-center py-8">No payment data yet</p>
                    ) : (
                        <div className="flex items-center gap-6">
                            <ResponsiveContainer width={160} height={160}>
                                <PieChart>
                                    <Pie data={reports?.paymentModes || []} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                                        dataKey="amount" nameKey="mode">
                                        {(reports?.paymentModes || []).map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                        formatter={v => [fmt(v), 'Amount']} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2">
                                {(reports?.paymentModes || []).map((m, i) => (
                                    <div key={m.mode} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                        <span className="text-slate-300 text-xs">{m.mode}</span>
                                        <span className="text-white text-xs font-bold ml-1">{fmt(m.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Status Summary */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <h3 className="text-slate-800 font-black mb-4">Fee Status Overview</h3>
                    <div className="space-y-4">
                        {[
                            { label: 'Fully Paid', count: stats?.paidCount || 0, color: '#10b981', total: stats?.totalStudents || 1 },
                            { label: 'Partially Paid', count: stats?.partialCount || 0, color: '#f59e0b', total: stats?.totalStudents || 1 },
                            { label: 'Pending', count: stats?.pendingCount || 0, color: '#ef4444', total: stats?.totalStudents || 1 },
                        ].map(s => (
                            <div key={s.label}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-400">{s.label}</span>
                                    <span className="text-white font-bold">{s.count} students</span>
                                </div>
                                <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div className="h-2 rounded-full transition-all" style={{
                                        width: `${s.total ? (s.count / s.total) * 100 : 0}%`,
                                        background: s.color
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    /* ─── All Students Tab ─── */
    const renderStudents = () => {
        const sheetUrl = syncConfig?.spreadsheetId 
            ? `https://docs.google.com/spreadsheets/d/${syncConfig.spreadsheetId}/edit`
            : null;

        const totalStudentsPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
        const studentsStartIndex = (studentsPage - 1) * itemsPerPage;
        const paginatedStudents = filteredStudents.slice(studentsStartIndex, studentsStartIndex + itemsPerPage);

        return (
            <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex flex-wrap gap-3 items-center flex-1">
                        <div className="relative flex-1 min-w-48 max-w-xs">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, course..."
                                className="w-full bg-white/5 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-500" />
                        </div>
                        <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-500">
                            <option value="All" className="bg-white">All Courses</option>
                            {courses.map(c => <option key={c} value={c} className="bg-white">{c}</option>)}
                        </select>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-500">
                            {['All', 'Paid', 'Partial', 'Pending'].map(s => (
                                <option key={s} value={s} className="bg-white">{s}</option>
                            ))}
                        </select>
                        <span className="text-xs text-slate-500 self-center">Showing {filteredStudents.length} of {students.length}</span>
                    </div>

                    {syncConfig?.spreadsheetId ? (
                        <a 
                            href={sheetUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-xl px-3 py-2 text-xs font-bold transition-colors shadow-sm"
                        >
                            <FileText size={12} /> Open Sheet ↗
                        </a>
                    ) : (
                        <button
                            onClick={() => setActiveTab('settings')}
                            className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-xl px-3 py-2 text-xs font-bold transition-colors shadow-sm"
                        >
                            <FileText size={12} /> Link to Google Sheet
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{minWidth: '1200px'}}>
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Adm. No.</th>
                                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Student</th>
                                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Father Name</th>
                                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Mobile 1</th>
                                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Mobile 2</th>
                                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Joining Date</th>
                                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Course / Batch</th>
                                <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Course Fee</th>
                                <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Extra Charges</th>
                                <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Balance</th>
                                <th className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Months</th>
                                <th className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">Status</th>
                                <th className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap sticky right-0 bg-slate-50 shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)] border-l border-slate-200 z-10">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedStudents.length === 0 && (
                                <tr><td colSpan={13} className="text-center py-10 text-slate-500">No records found</td></tr>
                            )}
                            {paginatedStudents.map(r => {
                                const totalExtra = (r.extraCharges || []).reduce((s, ec) => s + (ec.amount || 0), 0);
                                const joiningDate = r.student?.studentProfile?.enrollmentDate
                                    ? new Date(r.student.studentProfile.enrollmentDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
                                    : '—';
                                return (
                                    <tr key={r._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        {/* Admission No */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="text-slate-500 text-xs font-mono">{r.student?.admissionNo || '—'}</span>
                                        </td>
                                        {/* Student Name + Email */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Avatar name={r.student?.name || ''} size={30} />
                                                <div>
                                                    <p className="text-slate-800 text-sm font-bold">{r.student?.name || '—'}</p>
                                                    <p className="text-slate-400 text-xs">{r.student?.email || ''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Father Name */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="text-slate-600 text-sm">{r.student?.fatherName || '—'}</span>
                                        </td>
                                        {/* Mobile 1 */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="text-slate-600 text-sm font-mono">{r.student?.mobileNumber || '—'}</span>
                                        </td>
                                        {/* Mobile 2 */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="text-slate-500 text-sm font-mono">{r.student?.mobile2 || '—'}</span>
                                        </td>
                                        {/* Date of Joining */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="text-slate-500 text-xs">{joiningDate}</span>
                                        </td>
                                        {/* Course / Batch */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <p className="text-slate-700 text-sm font-semibold">{r.course || '—'}</p>
                                            <p className="text-slate-400 text-xs">{r.batch || ''}</p>
                                        </td>
                                        {/* Course Fee */}
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            <span className="text-slate-700 text-sm font-bold">{fmt(r.totalFee)}</span>
                                        </td>
                                        {/* Extra Charges */}
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            {totalExtra > 0 ? (
                                                <span className="text-amber-600 text-sm font-bold">{fmt(totalExtra)}</span>
                                            ) : (
                                                <span className="text-slate-300 text-sm">—</span>
                                            )}
                                        </td>
                                        {/* Balance */}
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            <span className={`text-sm font-bold ${r.pendingAmount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                {fmt(r.pendingAmount)}
                                            </span>
                                        </td>
                                        {/* Months */}
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                            <span className="text-slate-500 text-sm">{r.months > 0 ? `${r.months} mo` : '—'}</span>
                                        </td>
                                        {/* Status */}
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                            <span className={`text-xs px-2 py-1 rounded-lg font-bold ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                                        </td>
                                        {/* Action */}
                                        <td className="px-4 py-3 text-center whitespace-nowrap sticky right-0 bg-white hover:bg-slate-50 transition-colors shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)] border-l border-slate-100">
                                            <div className="flex items-center justify-center gap-1.5">
                                                {r.student?._id && (
                                                    <button 
                                                        onClick={() => setSelectedStudentForDetails(r)}
                                                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                                                        title="View Student Details"
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                )}
                                                {r.student?._id && (
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedStudentForEdit(r.student);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                                                        title="Edit Student"
                                                    >
                                                        <Edit size={15} />
                                                    </button>
                                                )}
                                                {r.status !== 'Paid' && r.student?._id && (
                                                    <button onClick={() => openCollect(r.student?._id)}
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-colors">
                                                        Collect
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleDeleteFeeRecord(r._id, r.student?._id)}
                                                    className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <TablePagination 
                    currentPage={studentsPage}
                    totalPages={totalStudentsPages}
                    totalItems={filteredStudents.length}
                    startIndex={studentsStartIndex}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setStudentsPage}
                />
            </div>
        </div>
        );
    };

    /* ─── Collect Fee Tab (Inline Page) ─── */
    const renderCollect = () => {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-slate-800 font-black text-lg">Collect Fee</h2>
                    <p className="text-slate-400 text-sm mt-0.5">Manage fees, collections and reports</p>
                </div>
                <CollectFeeForm 
                    students={students.filter(s => s.status !== 'Paid')} 
                    preselectedId={collectPreselect} 
                    onSuccess={fetchAll} 
                />
            </div>
        );
    };

    /* ─── Pending Dues Tab ─── */
    const renderPending = () => {
        const totalPendingPages = Math.ceil(pendingDues.length / itemsPerPage) || 1;
        const pendingStartIndex = (pendingPage - 1) * itemsPerPage;
        const paginatedPending = pendingDues.slice(pendingStartIndex, pendingStartIndex + itemsPerPage);

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-slate-800 font-black">Pending Dues ({pendingDues.length})</h3>
                    <p className="text-xs text-slate-500">Sorted by most overdue first</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Student</th>
                                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Course</th>
                                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Mobile</th>
                                <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Due Amount</th>
                                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Due Date</th>
                                <th className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Aging</th>
                                <th className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedPending.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-10 text-slate-500">No pending dues! 🎉</td></tr>
                            )}
                            {paginatedPending.map(r => (
                                <tr key={r._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={r.student?.name || ''} size={32} />
                                            <div>
                                                <p className="text-slate-800 text-sm font-bold">{r.student?.name || '—'}</p>
                                                <p className="text-slate-500 text-xs">{r.student?.mobileNumber || ''}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-700 text-sm">{r.course}</td>
                                    <td className="px-4 py-3 text-slate-500 text-sm">{r.student?.mobileNumber || '—'}</td>
                                    <td className="px-4 py-3 text-right text-red-400 font-black text-sm">{fmt(r.pendingAmount)}</td>
                                    <td className="px-4 py-3 text-slate-400 text-xs">{fmtDate(r.nextDueDate)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-xs px-2 py-1 rounded-lg font-bold ${AGING_COLORS[r.aging] || 'bg-slate-500/20 text-slate-400'}`}>
                                            {r.aging}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button onClick={() => openCollect(r.student?._id)}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-colors">
                                            Collect
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <TablePagination 
                    currentPage={pendingPage}
                    totalPages={totalPendingPages}
                    totalItems={pendingDues.length}
                    startIndex={pendingStartIndex}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setPendingPage}
                />
            </div>
        );
    };

    /* ─── Receipts Tab ─── */
    const renderReceipts = () => {
        const filtered = receipts.filter(r =>
            !recSearch || r.receiptNo?.toLowerCase().includes(recSearch.toLowerCase()) ||
            r.studentName?.toLowerCase().includes(recSearch.toLowerCase())
        );

        const totalReceiptsPages = Math.ceil(filtered.length / itemsPerPage) || 1;
        const receiptsStartIndex = (receiptsPage - 1) * itemsPerPage;
        const paginatedReceipts = filtered.slice(receiptsStartIndex, receiptsStartIndex + itemsPerPage);

        return (
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-xs">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input value={recSearch} onChange={e => setRecSearch(e.target.value)} placeholder="Search receipt / student..."
                            className="w-full bg-white/5 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-indigo-500" />
                    </div>
                    <span className="text-xs text-slate-500">All collected receipts — {filtered.length}</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Receipt No.</th>
                                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Student</th>
                                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Course</th>
                                <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Amount</th>
                                <th className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Mode</th>
                                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Date</th>
                                <th className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">View</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedReceipts.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-10 text-slate-500">No receipts found</td></tr>
                            )}
                            {paginatedReceipts.map(r => (
                                <tr key={r._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3 text-indigo-400 text-xs font-bold">{r.receiptNo}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Avatar name={r.studentName || ''} size={28} />
                                            <span className="text-slate-800 text-sm font-bold">{r.studentName}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 text-sm">{r.course}</td>
                                    <td className="px-4 py-3 text-right text-emerald-400 font-bold text-sm">{fmt(r.amount)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="text-xs bg-white/5 border border-slate-200 px-2 py-1 rounded-lg text-slate-300">{r.paymentMode}</span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-400 text-xs">{fmtDate(r.date)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <button onClick={() => setSelectedReceipt(r)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                                            <Eye size={15} className="text-slate-400" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <TablePagination 
                    currentPage={receiptsPage}
                    totalPages={totalReceiptsPages}
                    totalItems={filtered.length}
                    startIndex={receiptsStartIndex}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setReceiptsPage}
                />
            </div>
        );
    };

    /* ─── Reports Tab ─── */
    const renderReports = () => {
        const REPORT_TABS = [
            { id: 'course', label: 'Course-wise Revenue' },
            { id: 'aging', label: 'Outstanding Aging' },
            { id: 'modes', label: 'Cash vs UPI vs Bank' },
            { id: 'trend', label: 'Monthly Trend' },
        ];

        const agingData = [
            { label: '0-30 days', amount: pendingDues.filter(p => p.dueDays !== null && p.dueDays <= 30).reduce((s, p) => s + p.pendingAmount, 0) },
            { label: '31-60 days', amount: pendingDues.filter(p => p.dueDays !== null && p.dueDays > 30 && p.dueDays <= 60).reduce((s, p) => s + p.pendingAmount, 0) },
            { label: '61-90 days', amount: pendingDues.filter(p => p.dueDays !== null && p.dueDays > 60 && p.dueDays <= 90).reduce((s, p) => s + p.pendingAmount, 0) },
            { label: '90+ days', amount: pendingDues.filter(p => p.dueDays !== null && p.dueDays > 90).reduce((s, p) => s + p.pendingAmount, 0) },
        ];

        return (
            <div className="space-y-4">
                {/* Sub-tabs */}
                <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit">
                    {REPORT_TABS.map(t => (
                        <button key={t.id} onClick={() => setReportTab(t.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${reportTab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    {reportTab === 'course' && (
                        <>
                            <h3 className="text-white font-black mb-5">Course-wise Revenue</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={reports?.courseWise || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="course" tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                        formatter={v => [fmt(v)]} />
                                    <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                                    <Bar dataKey="paid" name="Paid" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="pending" name="Pending" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </>
                    )}
                    {reportTab === 'aging' && (
                        <>
                            <h3 className="text-white font-black mb-5">Outstanding Aging Report</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={agingData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                        formatter={v => [fmt(v), 'Outstanding']} />
                                    <Bar dataKey="amount" fill="#f97316" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </>
                    )}
                    {reportTab === 'modes' && (
                        <>
                            <h3 className="text-white font-black mb-5">Payment Mode Distribution</h3>
                            <div className="flex items-center justify-center gap-10">
                                <ResponsiveContainer width={260} height={260}>
                                    <PieChart>
                                        <Pie data={reports?.paymentModes || []} cx="50%" cy="50%" outerRadius={100}
                                            dataKey="amount" nameKey="mode" label={({ mode, percent }) => `${mode}: ${(percent * 100).toFixed(0)}%`}
                                            labelLine={{ stroke: '#475569' }}>
                                            {(reports?.paymentModes || []).map((_, i) => (
                                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ background: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                            formatter={v => [fmt(v), 'Amount']} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="space-y-3">
                                    {(reports?.paymentModes || []).map((m, i) => (
                                        <div key={m.mode} className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                            <span className="text-slate-300 text-sm w-20">{m.mode}</span>
                                            <span className="text-white font-bold">{fmt(m.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                    {reportTab === 'trend' && (
                        <>
                            <h3 className="text-white font-black mb-5">Monthly Collection Trend</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={reports?.monthlyTrend || []}>
                                    <defs>
                                        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                        formatter={v => [fmt(v), 'Collection']} />
                                    <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fill="url(#trendGrad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </>
                    )}
                </div>
            </div>
        );
    };

    const handleImport = async () => {
        setSyncLoading(true);
        try {
            const res = await axios.post(`/api/sync/import`, {}, { withCredentials: true });
            if (res.data.success) {
                toast.success(`Successfully imported ${res.data.importedCount} records!`);
                fetchAll();
            }
        } catch (e) {
            toast.error(e.response?.data?.message || 'Import failed');
        } finally {
            setSyncLoading(false);
        }
    };

    const handleExport = async () => {
        setSyncLoading(true);
        try {
            const res = await axios.post(`/api/sync/export`, {}, { withCredentials: true });
            if (res.data.success) {
                toast.success(`Successfully exported ${res.data.exportedCount} records!`);
            }
        } catch (e) {
            toast.error(e.response?.data?.message || 'Export failed');
        } finally {
            setSyncLoading(false);
        }
    };

    const downloadCSV = () => {
        if (!students || students.length === 0) {
            toast.error('No records to download');
            return;
        }

        const headers = [
            'Adm. no.', 'Ledger No.', 'Name', 'Father Name', 'Mobile no.', 'Mobile1',
            'Date of Joining', 'Course', 'Total Fee', 'Paid Amount', 'Balance', 'Months', 'Status'
        ];

        const rows = students.map(r => {
            const student = r.student || {};
            const joiningDate = student.studentProfile?.enrollmentDate 
                ? new Date(student.studentProfile.enrollmentDate).toLocaleDateString('en-GB')
                : '';
            return [
                student.admissionNo || '',
                student.studentProfile?.ledgerNo || '',
                student.name || '',
                student.fatherName || '',
                student.mobileNumber || '',
                student.mobile2 || '',
                joiningDate,
                r.course || '',
                r.totalFee || 0,
                r.paidAmount || 0,
                r.pendingAmount || 0,
                r.months || 0,
                r.status || 'Pending'
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
            + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Fee_Records_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV downloaded successfully!');
    };

    const downloadExcel = () => {
        if (!students || students.length === 0) {
            toast.error('No records to download');
            return;
        }

        const headers = [
            'Adm. no.', 'Ledger No.', 'Name', 'Father Name', 'Mobile no.', 'Mobile1',
            'Date of Joining', 'Course', 'Total Fee', 'Paid Amount', 'Balance', 'Months', 'Status'
        ];

        let xml = '<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40"><Worksheet ss:Name="Fee Records"><Table>';
        
        xml += '<Row>';
        headers.forEach(h => {
            xml += `<Cell><Data ss:Type="String">${h}</Data></Cell>`;
        });
        xml += '</Row>';

        students.forEach(r => {
            const student = r.student || {};
            const joiningDate = student.studentProfile?.enrollmentDate 
                ? new Date(student.studentProfile.enrollmentDate).toLocaleDateString('en-GB')
                : '';
            const rowData = [
                student.admissionNo || '',
                student.studentProfile?.ledgerNo || '',
                student.name || '',
                student.fatherName || '',
                student.mobileNumber || '',
                student.mobile2 || '',
                joiningDate,
                r.course || '',
                r.totalFee || 0,
                r.paidAmount || 0,
                r.pendingAmount || 0,
                r.months || 0,
                r.status || 'Pending'
            ];
            xml += '<Row>';
            rowData.forEach(val => {
                const type = typeof val === 'number' ? 'Number' : 'String';
                xml += `<Cell><Data ss:Type="${type}">${val}</Data></Cell>`;
            });
            xml += '</Row>';
        });

        xml += '</Table></Worksheet></Workbook>';

        const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Fee_Records_${new Date().toISOString().slice(0,10)}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Excel downloaded successfully!');
    };

    /* ─── Settings Tab ─── */
    const renderSettings = () => {
        return (
            <div className="max-w-xl space-y-6">
                <div>
                    <h2 className="text-slate-800 font-black text-lg">Settings</h2>
                    <p className="text-slate-400 text-sm mt-0.5">Institute preferences</p>
                </div>
                
                {/* General Settings */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Institute Name</label>
                            <input
                                value={settings.instituteName}
                                onChange={e => setSettings(s => ({ ...s, instituteName: e.target.value }))}
                                className="w-full bg-white/5 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                                placeholder="e.g. ABC Computer Institute"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Contact</label>
                            <input
                                value={settings.contact}
                                onChange={e => setSettings(s => ({ ...s, contact: e.target.value }))}
                                className="w-full bg-white/5 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                                placeholder="+91 98765 43210"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Address</label>
                            <input
                                value={settings.address}
                                onChange={e => setSettings(s => ({ ...s, address: e.target.value }))}
                                className="w-full bg-white/5 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                                placeholder="123 Main Street, City"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Monthly Target (₹)</label>
                            <input
                                type="number"
                                value={settings.monthlyTarget}
                                onChange={e => setSettings(s => ({ ...s, monthlyTarget: e.target.value }))}
                                className="w-full bg-white/5 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                                placeholder="e.g. 500000"
                            />
                        </div>
                    </div>
                    <div className="pt-2">
                        <button
                            onClick={saveAllSettings}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-2.5 text-sm font-bold transition-colors"
                        >
                            {settingsSaved ? '✓ Saved!' : 'Save Settings'}
                        </button>
                    </div>
                </div>

                {/* Google Sheets Integration Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-slate-800 font-black text-base flex items-center gap-2">
                                📊 Google Sheets Integration
                            </h3>
                            <p className="text-slate-400 text-xs mt-0.5">Synchronize fee records two-way with Google Sheets</p>
                        </div>
                        {syncConfig?.spreadsheetId && (
                            <a 
                                href={`https://docs.google.com/spreadsheets/d/${syncConfig.spreadsheetId}/edit`}
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors"
                            >
                                <FileText size={12} /> Open Sheet ↗
                            </a>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Google Spreadsheet ID</label>
                            <div className="flex gap-2">
                                <input
                                    value={spreadsheetIdInput}
                                    onChange={e => setSpreadsheetIdInput(e.target.value)}
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                                    placeholder="Paste Google Spreadsheet ID here"
                                />
                                <button
                                    onClick={saveAllSettings}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-xs font-bold transition-colors flex-shrink-0"
                                >
                                    {settingsSaved ? '✓ Saved!' : 'Save Sheet ID'}
                                </button>
                            </div>
                        </div>

                        {/* Import & Export Action Buttons */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={handleImport}
                                disabled={syncLoading}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                            >
                                <RefreshCw size={12} className={syncLoading ? 'animate-spin' : ''} />
                                Sync & Import from Sheet
                            </button>
                            <button
                                onClick={downloadExcel}
                                className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                                <Download size={12} />
                                Download Excel (.xls)
                            </button>
                            <button
                                onClick={downloadCSV}
                                className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                                <Download size={12} />
                                Download CSV
                            </button>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-500 leading-relaxed space-y-1.5">
                            <p className="font-bold text-slate-700">How to link your own Google Sheet:</p>
                            <ol className="list-decimal pl-4 space-y-1">
                                <li>Create a new Google Sheet in your account.</li>
                                <li>
                                    Share it with editor permissions to email: 
                                    <code className="bg-slate-100 text-indigo-600 font-bold px-1 rounded ml-1 select-all">lms-sheets@lms-500307.iam.gserviceaccount.com</code>
                                </li>
                                <li>Paste the Spreadsheet ID from the URL and click Save.</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#f1f5f9] text-slate-800 flex flex-col">
            {/* Top Header */}
            <div className="border-b border-slate-200 bg-[#0a0f1a] px-5 py-3.5 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-sm transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                        Back
                    </button>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-base">
                            🎓
                        </div>
                        <div>
                            <p className="text-white font-black text-sm leading-tight">{settings.instituteName || 'Fee Portal'}</p>
                            <p className="text-slate-500 text-[10px]">Institute ERP</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {syncConfig?.spreadsheetId && (
                        <a
                            href={`https://docs.google.com/spreadsheets/d/${syncConfig.spreadsheetId}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold transition-colors"
                        >
                            <FileText size={12} /> Google Sheets Integration
                        </a>
                    )}
                    <button onClick={fetchAll} disabled={loading} className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-slate-300 transition-colors">
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button onClick={() => openCollect()} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl px-4 py-1.5 text-xs text-white font-bold transition-colors">
                        <Plus size={13} /> Collect Fee
                    </button>
                </div>
            </div>

            {/* Body: Sidebar + Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar */}
                <div className="w-52 flex-shrink-0 bg-[#0a0f1a] border-r border-white/10 flex flex-col py-4">
                    <nav className="space-y-0.5 px-3 flex-1">
                        {NAV_ITEMS.map(item => {
                            const Icon = item.icon;
                            const active = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                                        active
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-400 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <Icon size={16} />
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>
                    {/* User info at bottom */}
                    <div className="px-3 pt-4 border-t border-white/10 mt-4">
                        <div className="flex items-center gap-2">
                            <Avatar name={user?.name || 'Admin'} size={30} />
                            <div className="min-w-0">
                                <p className="text-white text-xs font-bold truncate">{user?.name || 'Admin'}</p>
                                <p className="text-slate-500 text-[10px]">{user?.role || 'Admin'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading && !stats ? (
                        <SkeletonLoader />
                    ) : (
                        <>
                            {activeTab === 'dashboard' && renderDashboard()}
                            {activeTab === 'students' && renderStudents()}
                            {activeTab === 'collect' && renderCollect()}
                            {activeTab === 'pending' && renderPending()}
                            {activeTab === 'receipts' && renderReceipts()}
                            {activeTab === 'reports' && renderReports()}
                            {activeTab === 'settings' && renderSettings()}
                        </>
                    )}
                </div>
            </div>

            {/* Modals */}
            {selectedReceipt && <ReceiptModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />}
            {selectedStudentForDetails && (
                <StudentDetailsModal
                    record={selectedStudentForDetails}
                    receipts={receipts}
                    onClose={() => setSelectedStudentForDetails(null)}
                    onCollect={openCollect}
                    onOpenReceipt={(rec) => setSelectedReceipt(rec)}
                    onDelete={(studentId) => handleDeleteFeeRecord(selectedStudentForDetails._id, studentId)}
                    onDeleteTransaction={handleDeleteTransaction}
                    onDeleteExtraCharge={handleDeleteExtraCharge}
                />
            )}
            {showCollectModal && (
                <CollectFeeModal
                    students={students.filter(s => s.status !== 'Paid')}
                    preselectedId={collectPreselect}
                    onClose={() => setShowCollectModal(false)}
                    onSuccess={fetchAll}
                />
            )}
            {isEditModalOpen && (
                <EditUserModal
                    isOpen={isEditModalOpen}
                    user={selectedStudentForEdit}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedStudentForEdit(null);
                    }}
                    onSuccess={() => {
                        setIsEditModalOpen(false);
                        setSelectedStudentForEdit(null);
                        fetchAll();
                    }}
                />
            )}
        </div>
    );
}
