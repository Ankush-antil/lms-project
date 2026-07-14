import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { 
    Coins, MessageSquare, FolderOpen, FileText, Sparkles, 
    TrendingUp, Calendar, ArrowRight, UserCheck, AlertCircle, 
    DollarSign, CreditCard, ChevronRight, Activity, Package
} from 'lucide-react';

const AccountantDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [activeSection, setActiveSection] = useState('overview'); // 'overview' | 'workspace'
    const [stats, setStats] = useState(null);
    const [recentReceipts, setRecentReceipts] = useState([]);
    const [topPending, setTopPending] = useState([]);
    const [loading, setLoading] = useState(true);

    const getControlStatus = (key) => {
        const controls = user?.accountantProfile?.controls;
        if (!controls) return { enabled: true };
        return controls[key] || { enabled: true };
    };

    const handleFeatureClick = (key, path) => {
        const ctrl = getControlStatus(key);
        if (ctrl.enabled === false) {
            if (ctrl.mode === 'disable') {
                toast.error(ctrl.note || "This feature has been disabled by the administrator.");
            }
            return;
        }
        navigate(path);
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/fees/admin/dashboard-data');
            setStats(res.data.stats || {});
            setRecentReceipts(res.data.receipts?.slice(0, 5) || []);
            setTopPending(res.data.stats?.topPending || []);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching accountant dashboard data:", error);
            toast.error("Failed to fetch dashboard data");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    return (
        <DashboardLayout role="Accountant">
            {/* Premium Workspace Banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-amber-600 via-slate-900 to-slate-900 rounded-[30px] p-8 md:p-10 text-white mb-8 border border-white/5 shadow-2xl">
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-slate-500/15 rounded-full blur-3xl -mb-20"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-bold uppercase tracking-wider mb-3 backdrop-blur-md border border-amber-500/10">
                            <Sparkles size={12} /> Accountant Workspace
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Accounts & Finance Desk</h1>
                        <p className="text-slate-300 mt-2 max-w-xl text-sm md:text-base">
                            Track collections, manage dues, view system files, write notes, and stay connected with the institute staff.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {!(getControlStatus('feePortal').enabled === false && getControlStatus('feePortal').mode === 'hide') && (
                            <button
                                onClick={() => handleFeatureClick('feePortal', '/accountant/fee-portal')}
                                className={`px-5 py-3 bg-white text-slate-900 rounded-2xl hover:bg-slate-50 transition-all font-bold text-sm flex items-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${getControlStatus('feePortal').enabled === false ? 'opacity-65 cursor-not-allowed' : ''}`}
                            >
                                <Coins size={16} className="text-amber-600" /> Collect Fee
                            </button>
                        )}
                        {!(getControlStatus('assets').enabled === false && getControlStatus('assets').mode === 'hide') && (
                            <button
                                onClick={() => handleFeatureClick('assets', '/accountant/assets')}
                                className={`px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all font-bold text-sm flex items-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${getControlStatus('assets').enabled === false ? 'opacity-65 cursor-not-allowed' : ''}`}
                            >
                                <Package size={16} /> Asset Desk
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 mb-8 gap-4">
                <button
                    onClick={() => setActiveSection('overview')}
                    className={`pb-4 px-2 text-sm font-extrabold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                        activeSection === 'overview'
                            ? 'border-amber-600 text-amber-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <Activity size={18} /> Overview & Statistics
                </button>
                <button
                    onClick={() => setActiveSection('workspace')}
                    className={`pb-4 px-2 text-sm font-extrabold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                        activeSection === 'workspace'
                            ? 'border-amber-600 text-amber-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <FolderOpen size={18} /> Workspace Tools
                </button>
            </div>

            {/* Content Switcher */}
            {loading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold">Loading accounts workspace...</p>
                </div>
            ) : activeSection === 'overview' ? (
                /* OVERVIEW & STATISTICS TAB */
                <div className="space-y-8 animate-fade-in">
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                                <DollarSign size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Today's Collection</p>
                                <h3 className="text-xl font-extrabold text-slate-800 mt-1">
                                    {formatCurrency(stats?.todayCollection)}
                                </h3>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Monthly Collection</p>
                                <h3 className="text-xl font-extrabold text-slate-800 mt-1">
                                    {formatCurrency(stats?.monthlyCollection)}
                                </h3>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl">
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Pending Dues</p>
                                <h3 className="text-xl font-extrabold text-rose-600 mt-1">
                                    {formatCurrency(stats?.totalPending)}
                                </h3>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                                <UserCheck size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Ledgers</p>
                                <h3 className="text-xl font-extrabold text-slate-800 mt-1">
                                    {stats?.totalStudents || 0}
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Recent Transactions List */}
                        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                                        <CreditCard size={20} className="text-amber-500" /> Recent Fee Receipts
                                    </h3>
                                    <button 
                                        onClick={() => navigate('/accountant/fee-portal')}
                                        className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        View All Receipts <ArrowRight size={14} />
                                    </button>
                                </div>

                                {recentReceipts.length > 0 ? (
                                    <div className="divide-y divide-slate-100">
                                        {recentReceipts.map((receipt) => (
                                            <div key={receipt._id} className="py-4 flex justify-between items-center hover:bg-slate-50/50 px-2 rounded-2xl transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                                                        {receipt.studentName ? receipt.studentName[0] : 'S'}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm">{receipt.studentName}</h4>
                                                        <p className="text-xs text-slate-400 font-medium">
                                                            {receipt.course} • Batch: {receipt.batch || 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-extrabold text-emerald-600 text-sm">
                                                        +{formatCurrency(receipt.amount)}
                                                    </span>
                                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                        {new Date(receipt.date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-slate-400 font-medium text-sm">
                                        No recent transactions recorded.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Top Pending Dues */}
                        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
                            <div>
                                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2 mb-6">
                                    <AlertCircle size={20} className="text-rose-500" /> Highest Unpaid Dues
                                </h3>

                                {topPending.length > 0 ? (
                                    <div className="space-y-4">
                                        {topPending.map((record) => (
                                            <div key={record._id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between gap-2 hover:shadow-sm transition-all">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm">
                                                            {record.student?.name || 'Student'}
                                                        </h4>
                                                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                                            Course: {record.course}
                                                        </p>
                                                    </div>
                                                    <span className="text-xs font-extrabold text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                                                        {formatCurrency(record.pendingAmount)} Due
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-slate-200/50 mt-1">
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                                                        <Calendar size={12} /> Due: {record.nextDueDate ? new Date(record.nextDueDate).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                    <button 
                                                        onClick={() => navigate('/accountant/fee-portal')}
                                                        className="text-[10px] text-indigo-650 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                                                    >
                                                        Collect <ChevronRight size={10} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-slate-400 font-medium text-sm">
                                        No outstanding dues found!
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* WORKSPACE TOOLS TAB */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
                    {/* Tool 1: Fee Portal */}
                    {!(getControlStatus('feePortal').enabled === false && getControlStatus('feePortal').mode === 'hide') && (
                        <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between group hover:shadow-xl transition-all duration-300 relative overflow-hidden min-h-[220px] ${getControlStatus('feePortal').enabled === false ? 'opacity-60' : ''}`}>
                            <div className="absolute top-0 left-0 w-2 h-full bg-amber-500"></div>
                            <div>
                                <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                    <Coins size={24} />
                                </div>
                                <h4 className="font-extrabold text-slate-800 text-lg mb-2">Fee Collection Portal</h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                    Track student fee statuses, record cash/online payments, print receipts, and set up invoice structures.
                                </p>
                            </div>
                            <button
                                onClick={() => handleFeatureClick('feePortal', '/accountant/fee-portal')}
                                className="text-xs text-amber-600 font-extrabold flex items-center gap-1 hover:underline pt-4 mt-2 cursor-pointer w-fit"
                            >
                                Open Portal {getControlStatus('feePortal').enabled === false ? '(Disabled)' : ''} <ArrowRight size={14} />
                            </button>
                        </div>
                    )}

                    {/* Tool 2: Drive Storage */}
                    {!(getControlStatus('drive').enabled === false && getControlStatus('drive').mode === 'hide') && (
                        <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between group hover:shadow-xl transition-all duration-300 relative overflow-hidden min-h-[220px] ${getControlStatus('drive').enabled === false ? 'opacity-60' : ''}`}>
                            <div className="absolute top-0 left-0 w-2 h-full bg-purple-500"></div>
                            <div>
                                <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                    <FolderOpen size={24} />
                                </div>
                                <h4 className="font-extrabold text-slate-800 text-lg mb-2">Shared Drive Storage</h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                    Access the institute's shared files, upload transaction proofs, bank receipts, spreadsheets, and audit documents.
                                </p>
                            </div>
                            <button
                                onClick={() => handleFeatureClick('drive', '/accountant/drive')}
                                className="text-xs text-purple-600 font-extrabold flex items-center gap-1 hover:underline pt-4 mt-2 cursor-pointer w-fit"
                            >
                                Open Drive {getControlStatus('drive').enabled === false ? '(Disabled)' : ''} <ArrowRight size={14} />
                            </button>
                        </div>
                    )}

                    {/* Tool 3: Personal Notes */}
                    {!(getControlStatus('notes').enabled === false && getControlStatus('notes').mode === 'hide') && (
                        <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between group hover:shadow-xl transition-all duration-300 relative overflow-hidden min-h-[220px] ${getControlStatus('notes').enabled === false ? 'opacity-60' : ''}`}>
                            <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                            <div>
                                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                    <FileText size={24} />
                                </div>
                                <h4 className="font-extrabold text-slate-800 text-lg mb-2">Quick Reminders & Notes</h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                    Take private quick notes, draft audit checklists, log pending queries, or save daily budget drafts.
                                </p>
                            </div>
                            <button
                                onClick={() => handleFeatureClick('notes', '/accountant/notes')}
                                className="text-xs text-emerald-600 font-extrabold flex items-center gap-1 hover:underline pt-4 mt-2 cursor-pointer w-fit"
                            >
                                Open Notes {getControlStatus('notes').enabled === false ? '(Disabled)' : ''} <ArrowRight size={14} />
                            </button>
                        </div>
                    )}

                    {/* Tool 4: Team Chat Portal */}
                    {!(getControlStatus('chat').enabled === false && getControlStatus('chat').mode === 'hide') && (
                        <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between group hover:shadow-xl transition-all duration-300 relative overflow-hidden min-h-[220px] ${getControlStatus('chat').enabled === false ? 'opacity-60' : ''}`}>
                            <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                            <div>
                                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                    <MessageSquare size={24} />
                                </div>
                                <h4 className="font-extrabold text-slate-800 text-lg mb-2">Internal Chat Room</h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                    Direct message institute administration, coordinate with teachers, or communicate with students directly.
                                </p>
                            </div>
                            <button
                                onClick={() => handleFeatureClick('chat', '/accountant/chat')}
                                className="text-xs text-blue-600 font-extrabold flex items-center gap-1 hover:underline pt-4 mt-2 cursor-pointer w-fit"
                            >
                                Open Chat {getControlStatus('chat').enabled === false ? '(Disabled)' : ''} <ArrowRight size={14} />
                            </button>
                        </div>
                    )}

                    {/* Tool 5: Asset & Inventory Desk */}
                    {!(getControlStatus('assets').enabled === false && getControlStatus('assets').mode === 'hide') && (
                        <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between group hover:shadow-xl transition-all duration-300 relative overflow-hidden min-h-[220px] ${getControlStatus('assets').enabled === false ? 'opacity-60' : ''}`}>
                            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
                            <div>
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                    <Package size={24} />
                                </div>
                                <h4 className="font-extrabold text-slate-800 text-lg mb-2">Asset & Inventory Desk</h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                    Catalog institute property, track active assignments, manage maintenance services, and view warranty statuses.
                                </p>
                            </div>
                            <button
                                onClick={() => handleFeatureClick('assets', '/accountant/assets')}
                                className="text-xs text-indigo-600 font-extrabold flex items-center gap-1 hover:underline pt-4 mt-2 cursor-pointer w-fit"
                            >
                                Open Asset Desk {getControlStatus('assets').enabled === false ? '(Disabled)' : ''} <ArrowRight size={14} />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </DashboardLayout>
    );
};

export default AccountantDashboard;
