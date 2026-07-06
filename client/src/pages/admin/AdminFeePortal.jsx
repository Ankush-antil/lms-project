import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    LayoutDashboard, Users, CreditCard, Clock, Receipt, BarChart3,
    Search, Filter, ChevronDown, X, IndianRupee, Calendar, TrendingUp,
    CheckCircle, AlertCircle, Loader2, RefreshCw, Plus, Eye, Phone,
    MessageSquare, Printer, Download, ArrowUpRight, Wallet, FileText,
    Settings as SettingsIcon, UserCheck, AlertTriangle
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, Legend
} from 'recharts';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

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

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

/* ─── Collect Fee Modal ─── */
const CollectFeeModal = ({ students, onClose, onSuccess, preselectedId }) => {
    const [selectedId, setSelectedId] = useState(preselectedId || '');
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState('Cash');
    const [refNo, setRefNo] = useState('');
    const [remark, setRemark] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingRecord, setLoadingRecord] = useState(false);

    useEffect(() => {
        if (selectedId) {
            setLoadingRecord(true);
            axios.get(`${API}/fees/admin/student/${selectedId}`, { withCredentials: true })
                .then(r => setSelectedRecord(r.data))
                .catch(() => setSelectedRecord(null))
                .finally(() => setLoadingRecord(false));
        }
    }, [selectedId]);

    const handleSubmit = async () => {
        if (!selectedId || !amount) return toast.error('Select student and enter amount');
        setLoading(true);
        try {
            const res = await axios.post(`${API}/fees/admin/collect`, {
                studentId: selectedId, amount: Number(amount), paymentMode: mode, referenceNo: refNo, remark
            }, { withCredentials: true });
            toast.success(`Receipt generated: ${res.data.receiptNo}`);
            onSuccess();
            onClose();
        } catch {
            toast.error('Failed to collect fee');
        } finally {
            setLoading(false);
        }
    };

    const newBalance = selectedRecord ? Math.max(0, selectedRecord.pendingAmount - (Number(amount) || 0)) : null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-200 sticky top-0 bg-white z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                            <CreditCard size={16} className="text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-white font-black text-base">Collect Fee</p>
                            <p className="text-xs text-slate-400">Search student and record payment</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                <div className="flex gap-6 p-6">
                    {/* Left: Form */}
                    <div className="flex-1 space-y-4">
                        {/* Student Select */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Search Student</label>
                            <select
                                value={selectedId}
                                onChange={e => setSelectedId(e.target.value)}
                                className="w-full bg-white/5 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-indigo-500"
                            >
                                <option value="">— Select Student —</option>
                                {students.map(s => (
                                    <option key={s._id} value={s._id} className="bg-white">
                                        {s.student?.name || s.name} — {s.course} — Due: {fmt(s.pendingAmount)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Fee Info */}
                        {loadingRecord && <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 size={14} className="animate-spin" /> Loading...</div>}
                        {selectedRecord && !loadingRecord && (
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-slate-100 rounded-xl p-3 text-center">
                                    <p className="text-xs text-slate-500 mb-1">Total Fee</p>
                                    <p className="text-slate-800 font-black">{fmt(selectedRecord.totalFee)}</p>
                                </div>
                                <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
                                    <p className="text-xs text-slate-500 mb-1">Already Paid</p>
                                    <p className="text-emerald-400 font-black">{fmt(selectedRecord.paidAmount)}</p>
                                </div>
                                <div className="bg-red-500/10 rounded-xl p-3 text-center">
                                    <p className="text-xs text-slate-500 mb-1">Pending</p>
                                    <p className="text-red-400 font-black">{fmt(selectedRecord.pendingAmount)}</p>
                                </div>
                            </div>
                        )}

                        {/* Amount */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Receive Amount</label>
                            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount"
                                className="w-full bg-white/5 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-indigo-500" />
                        </div>

                        {/* Payment Mode */}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Payment Mode</label>
                            <div className="flex flex-wrap gap-2">
                                {PAYMENT_MODES.map(m => (
                                    <button key={m} onClick={() => setMode(m)}
                                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${mode === m ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-slate-100'}`}>
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Ref + Remark */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Reference No. (Optional)</label>
                                <input type="text" value={refNo} onChange={e => setRefNo(e.target.value)} placeholder="e.g. UPI-12345"
                                    className="w-full bg-white/5 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-indigo-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Remark (Optional)</label>
                                <input type="text" value={remark} onChange={e => setRemark(e.target.value)} placeholder="e.g. First installment"
                                    className="w-full bg-white/5 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-indigo-500" />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={handleSubmit} disabled={loading}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl py-2.5 font-bold text-sm transition-colors flex items-center justify-center gap-2">
                                {loading ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                                Save & Generate Receipt
                            </button>
                            <button onClick={onClose} className="px-4 bg-white/5 hover:bg-slate-100 text-slate-300 rounded-xl font-bold text-sm transition-colors">
                                Cancel
                            </button>
                        </div>
                    </div>

                    {/* Right: Receipt Preview */}
                    <div className="w-56 flex-shrink-0">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Receipt Preview</p>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
                            <div><span className="text-slate-500">Receipt No: </span><span className="text-white text-xs">Auto-generated</span></div>
                            <div><span className="text-slate-500">Date: </span><span className="text-white text-xs">{new Date().toLocaleDateString('en-IN')}</span></div>
                            <div><span className="text-slate-500">Collected By: </span><span className="text-white text-xs">Admin</span></div>
                            {selectedRecord && <>
                                <div><span className="text-slate-500">Student: </span><span className="text-white text-xs">{selectedRecord.student?.name}</span></div>
                                <div><span className="text-slate-500">Course: </span><span className="text-white text-xs">{selectedRecord.course}</span></div>
                                <div><span className="text-slate-500">Amount: </span><span className="text-white text-xs">{amount ? fmt(amount) : '—'}</span></div>
                                {newBalance !== null && <div><span className="text-slate-500">New Balance: </span><span className={`text-xs font-bold ${newBalance === 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(newBalance)}</span></div>}
                            </>}
                        </div>
                    </div>
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
    const [showCollectModal, setShowCollectModal] = useState(false);
    const [collectPreselect, setCollectPreselect] = useState('');
    const [recSearch, setRecSearch] = useState(''); // receipts search — must be here (hook rule)
    // Settings state
    const [settings, setSettings] = useState({ instituteName: 'Institute Fee Portal', contact: '', address: '', monthlyTarget: '' });
    const [settingsSaved, setSettingsSaved] = useState(false);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [statsR, studentsR, pendingR, receiptsR, reportsR] = await Promise.all([
                axios.get(`${API}/fees/admin/stats`, { withCredentials: true }),
                axios.get(`${API}/fees/admin/all`, { withCredentials: true }),
                axios.get(`${API}/fees/admin/pending-dues`, { withCredentials: true }),
                axios.get(`${API}/fees/admin/receipts`, { withCredentials: true }),
                axios.get(`${API}/fees/admin/reports`, { withCredentials: true }),
            ]);
            setStats(statsR.data);
            setStudents(studentsR.data);
            setPendingDues(pendingR.data);
            setReceipts(receiptsR.data);
            setReports(reportsR.data);
        } catch (e) {
            toast.error('Failed to load fee data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

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
                                    <p className="text-white text-sm font-bold truncate">{p.student?.name}</p>
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
    const renderStudents = () => (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
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

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Student</th>
                                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Course / Batch</th>
                                <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Total</th>
                                <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Paid</th>
                                <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Due</th>
                                <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Next Due</th>
                                <th className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
                                <th className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.length === 0 && (
                                <tr><td colSpan={8} className="text-center py-10 text-slate-500">No records found</td></tr>
                            )}
                            {filteredStudents.map(r => (
                                <tr key={r._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={r.student?.name || ''} size={32} />
                                            <div>
                                                <p className="text-white text-sm font-bold">{r.student?.name || '—'}</p>
                                                <p className="text-slate-500 text-xs">{r.student?.email || ''}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-slate-700 text-sm">{r.course}</p>
                                        <p className="text-slate-500 text-xs">{r.batch}</p>
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-300 text-sm font-bold">{fmt(r.totalFee)}</td>
                                    <td className="px-4 py-3 text-right text-emerald-400 text-sm font-bold">{fmt(r.paidAmount)}</td>
                                    <td className="px-4 py-3 text-right text-red-400 text-sm font-bold">{fmt(r.pendingAmount)}</td>
                                    <td className="px-4 py-3 text-slate-400 text-xs">{fmtDate(r.nextDueDate)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-xs px-2 py-1 rounded-lg font-bold ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {r.status !== 'Paid' && (
                                                <button onClick={() => openCollect(r.student?._id)}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-colors">
                                                    Collect
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    /* ─── Pending Dues Tab ─── */
    const renderPending = () => (
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
                        {pendingDues.length === 0 && (
                            <tr><td colSpan={7} className="text-center py-10 text-slate-500">No pending dues! 🎉</td></tr>
                        )}
                        {pendingDues.map(r => (
                            <tr key={r._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar name={r.student?.name || ''} size={32} />
                                        <div>
                                            <p className="text-white text-sm font-bold">{r.student?.name || '—'}</p>
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
        </div>
    );

    /* ─── Receipts Tab ─── */
    const renderReceipts = () => {
        const filtered = receipts.filter(r =>
            !recSearch || r.receiptNo?.toLowerCase().includes(recSearch.toLowerCase()) ||
            r.studentName?.toLowerCase().includes(recSearch.toLowerCase())
        );
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
                            {filtered.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-10 text-slate-500">No receipts found</td></tr>
                            )}
                            {filtered.map(r => (
                                <tr key={r._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3 text-indigo-400 text-xs font-bold">{r.receiptNo}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Avatar name={r.studentName || ''} size={28} />
                                            <span className="text-white text-sm">{r.studentName}</span>
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

    /* ─── Settings Tab ─── */
    const renderSettings = () => (
        <div className="max-w-xl space-y-6">
            <div>
                <h2 className="text-slate-800 font-black text-lg">Settings</h2>
                <p className="text-slate-400 text-sm mt-0.5">Institute preferences</p>
            </div>
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
                        onClick={() => { setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 2000); toast.success('Settings saved!'); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-2.5 text-sm font-bold transition-colors"
                    >
                        {settingsSaved ? '✓ Saved!' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );

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
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={32} className="animate-spin text-indigo-400" />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'dashboard' && renderDashboard()}
                            {activeTab === 'students' && renderStudents()}
                            {activeTab === 'collect' && (
                                <div className="flex flex-col items-center justify-center py-16 gap-4">
                                    <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                                        <CreditCard size={32} className="text-indigo-400" />
                                    </div>
                                    <h3 className="text-slate-800 font-black text-xl">Collect Fee</h3>
                                    <p className="text-slate-500 text-sm">Search student and record a new payment</p>
                                    <button onClick={() => openCollect()} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-3 font-bold transition-colors">
                                        <Plus size={16} /> Open Collect Fee Form
                                    </button>
                                </div>
                            )}
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
            {showCollectModal && (
                <CollectFeeModal
                    students={students.filter(s => s.status !== 'Paid')}
                    preselectedId={collectPreselect}
                    onClose={() => setShowCollectModal(false)}
                    onSuccess={fetchAll}
                />
            )}
        </div>
    );
}
