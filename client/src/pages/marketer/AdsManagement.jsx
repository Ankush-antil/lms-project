import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { 
    Megaphone, Plus, Search, Filter, Play, Pause, Edit, Trash2, 
    TrendingUp, DollarSign, Eye, MousePointerClick, BarChart2,
    Calendar, ArrowRight, Sparkles, Check, X, ShieldAlert
} from 'lucide-react';

const AdsManagement = () => {
    const { user } = useAuth();
    // Convincing Demo Data for Ad Campaigns
    const [campaigns, setCampaigns] = useState([
        {
            _id: 'camp_1',
            name: 'Google Search - Web Dev Academy',
            platform: 'Google Ads',
            status: 'Active',
            budget: 15000, // Monthly in INR
            spent: 8400,
            impressions: 48500,
            clicks: 3120,
            leads: 185,
            startDate: '2026-06-01',
            endDate: '2026-08-31'
        },
        {
            _id: 'camp_2',
            name: 'Facebook Retargeting - Career Transitioners',
            platform: 'Facebook Ads',
            status: 'Active',
            budget: 10000,
            spent: 4200,
            impressions: 72000,
            clicks: 2840,
            leads: 142,
            startDate: '2026-06-15',
            endDate: '2026-07-31'
        },
        {
            _id: 'camp_3',
            name: 'Instagram Reels - Code in Python',
            platform: 'Instagram Ads',
            status: 'Paused',
            budget: 12000,
            spent: 9800,
            impressions: 110000,
            clicks: 6540,
            leads: 298,
            startDate: '2026-05-10',
            endDate: '2026-06-10'
        },
        {
            _id: 'camp_4',
            name: 'YouTube Video Ad - Cyber Security Boot Camp',
            platform: 'YouTube Ads',
            status: 'Active',
            budget: 25000,
            spent: 12500,
            impressions: 145000,
            clicks: 4120,
            leads: 89,
            startDate: '2026-06-10',
            endDate: '2026-09-10'
        },
        {
            _id: 'camp_5',
            name: 'Google Display - UI/UX Design Masterclass',
            platform: 'Google Ads',
            status: 'Paused',
            budget: 8000,
            spent: 7800,
            impressions: 340000,
            clicks: 1980,
            leads: 52,
            startDate: '2026-04-01',
            endDate: '2026-05-01'
        }
    ]);

    const [searchTerm, setSearchTerm] = useState('');
    const [platformFilter, setPlatformFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState(null);
    const [editBudget, setEditBudget] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, platformFilter, statusFilter]);

    // Form state for new campaign
    const [newCampaignForm, setNewCampaignForm] = useState({
        name: '',
        platform: 'Google Ads',
        status: 'Active',
        budget: '',
        startDate: '',
        endDate: ''
    });

    const platforms = ['Google Ads', 'Facebook Ads', 'Instagram Ads', 'YouTube Ads', 'LinkedIn Ads'];

    const handleCreateCampaign = (e) => {
        e.preventDefault();
        if (!newCampaignForm.name || !newCampaignForm.budget) {
            toast.error("Please fill in all required fields");
            return;
        }

        const newCamp = {
            _id: 'manual_' + Math.random().toString(36).substr(2, 9),
            ...newCampaignForm,
            budget: parseFloat(newCampaignForm.budget),
            spent: 0,
            impressions: 0,
            clicks: 0,
            leads: 0,
            startDate: newCampaignForm.startDate || new Date().toISOString().split('T')[0],
            endDate: newCampaignForm.endDate || 'Ongoing'
        };

        setCampaigns([...campaigns, newCamp]);
        toast.success("Campaign created successfully!");
        setIsAddModalOpen(false);
        setNewCampaignForm({
            name: '',
            platform: 'Google Ads',
            status: 'Active',
            budget: '',
            startDate: '',
            endDate: ''
        });
    };

    const handleToggleStatus = (id, currentStatus) => {
        const nextStatus = currentStatus === 'Active' ? 'Paused' : 'Active';
        setCampaigns(prev => prev.map(c => c._id === id ? { ...c, status: nextStatus } : c));
        toast.success(`Campaign state set to ${nextStatus}`);
    };

    const handleDeleteCampaign = (id) => {
        if (!window.confirm("Are you sure you want to delete this campaign?")) return;
        setCampaigns(prev => prev.filter(c => c._id !== id));
        toast.success("Campaign deleted");
    };

    const handleSaveBudget = (id) => {
        if (!editBudget || isNaN(editBudget)) {
            toast.error("Invalid budget amount");
            return;
        }
        setCampaigns(prev => prev.map(c => c._id === id ? { ...c, budget: parseFloat(editBudget) } : c));
        toast.success("Budget updated");
        setEditingCampaign(null);
        setEditBudget('');
    };

    // Calculations
    const filteredCampaigns = campaigns.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPlatform = platformFilter === 'All' || c.platform === platformFilter;
        const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
        return matchesSearch && matchesPlatform && matchesStatus;
    });

    const totalSpend = filteredCampaigns.reduce((acc, c) => acc + c.spent, 0);
    const totalBudget = filteredCampaigns.reduce((acc, c) => acc + c.budget, 0);
    const totalImpressions = filteredCampaigns.reduce((acc, c) => acc + c.impressions, 0);
    const totalClicks = filteredCampaigns.reduce((acc, c) => acc + c.clicks, 0);
    const totalLeads = filteredCampaigns.reduce((acc, c) => acc + c.leads, 0);

    const overallCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0';
    const averageCPA = totalLeads > 0 ? (totalSpend / totalLeads).toFixed(0) : '0';

    // Pagination calculations
    const totalPages = Math.ceil(filteredCampaigns.length / rowsPerPage) || 1;
    const indexOfLastCamp = currentPage * rowsPerPage;
    const indexOfFirstCamp = indexOfLastCamp - rowsPerPage;
    const currentCampaigns = filteredCampaigns.slice(indexOfFirstCamp, indexOfLastCamp);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    return (
        <DashboardLayout role={user?.role || 'Institute'}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 text-left">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <Megaphone className="text-indigo-600" /> Advertising Campaigns Desk
                    </h1>
                    <p className="text-slate-500 text-xs mt-1">Track ad spends, return on ad spend (ROAS), click-through-rates, and cost per lead</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/10 self-start"
                >
                    <Plus size={14} /> New Campaign
                </button>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 text-left">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Ad Spend</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">
                            {formatCurrency(totalSpend)} <span className="text-[10px] text-slate-450 font-normal">/ {formatCurrency(totalBudget)}</span>
                        </h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <Eye size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Impressions</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">{totalImpressions.toLocaleString()}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                        <MousePointerClick size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Avg Click Rate (CTR)</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">{overallCTR}%</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Avg Cost per Lead (CPA)</p>
                        <h3 className="text-xl font-extrabold text-slate-800 mt-1">{formatCurrency(parseFloat(averageCPA))}</h3>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-6 text-left">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 max-w-md relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search campaigns..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                        />
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-1.5 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-150">
                            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Platform:</span>
                            <select
                                value={platformFilter}
                                onChange={(e) => setPlatformFilter(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="All">All Platforms</option>
                                {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-1.5 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-150">
                            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Status:</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Active">Active</option>
                                <option value="Paused">Paused</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-1.5 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-150">
                            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Rows / Page:</span>
                            <input
                                type="number"
                                min="1"
                                max="500"
                                value={rowsPerPage}
                                onChange={(e) => {
                                    const val = Math.max(1, parseInt(e.target.value) || 1);
                                    setRowsPerPage(val);
                                    setCurrentPage(1);
                                }}
                                className="w-14 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-700 outline-none text-center"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Campaign Table */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden text-left mb-8">
                <div className="responsive-table-wrapper">
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                <th className="p-4 font-semibold">Campaign Info</th>
                                <th className="p-4 font-semibold">Budget spent</th>
                                <th className="p-4 font-semibold">Traffic stats</th>
                                <th className="p-4 font-semibold">Leads & CPA</th>
                                <th className="p-4 font-semibold">Dates</th>
                                <th className="p-4 font-semibold text-center">Status</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-semibold">
                            {currentCampaigns.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-400 font-semibold text-sm">
                                        No campaigns found matching your criteria.
                                    </td>
                                </tr>
                            ) : currentCampaigns.map(c => {
                                const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0.00';
                                const cpa = c.leads > 0 ? (c.spent / c.leads).toFixed(0) : '0';
                                const percentSpent = c.budget > 0 ? ((c.spent / c.budget) * 100).toFixed(0) : '0';

                                return (
                                    <tr key={c._id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                                                <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full w-fit mt-1">{c.platform}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 min-w-[150px]">
                                            <div className="flex flex-col justify-center">
                                                <div className="flex justify-between items-center text-[10px] text-slate-550 mb-1">
                                                    <span>{formatCurrency(c.spent)}</span>
                                                    <span>{percentSpent}% of {formatCurrency(c.budget)}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${parseFloat(percentSpent) > 90 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                                                        style={{ width: `${Math.min(parseFloat(percentSpent), 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800">{c.clicks.toLocaleString()} clicks</span>
                                                <span className="text-[10px] text-slate-450 font-semibold mt-0.5">{c.impressions.toLocaleString()} views · {ctr}% CTR</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-emerald-600">{c.leads} leads</span>
                                                <span className="text-[10px] text-slate-450 font-semibold mt-0.5">{formatCurrency(parseFloat(cpa))} / lead</span>
                                            </div>
                                        </td>
                                        <td className="p-4 whitespace-nowrap text-slate-550 font-medium">
                                            <div className="flex flex-col">
                                                <span>Start: {c.startDate}</span>
                                                <span className="text-[10px] text-slate-400 font-semibold">End: {c.endDate}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center whitespace-nowrap">
                                            <span className={`px-2.5 py-1 border rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                c.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-150'
                                            }`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-1.5">
                                                <button
                                                    onClick={() => handleToggleStatus(c._id, c.status)}
                                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                                        c.status === 'Active' 
                                                            ? 'text-amber-600 bg-amber-50 border-amber-100 hover:bg-amber-100' 
                                                            : 'text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100'
                                                    }`}
                                                    title={c.status === 'Active' ? 'Pause Campaign' : 'Resume Campaign'}
                                                >
                                                    {c.status === 'Active' ? <Pause size={14} /> : <Play size={14} />}
                                                </button>
                                                <button
                                                    onClick={() => { setEditingCampaign(c); setEditBudget(c.budget.toString()); }}
                                                    className="p-1.5 bg-indigo-50 border border-indigo-100 text-indigo-650 hover:bg-indigo-100 rounded-lg cursor-pointer"
                                                    title="Modify Budget"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCampaign(c._id)}
                                                    className="p-1.5 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer"
                                                    title="Delete Campaign"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Bar */}
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs font-semibold text-slate-500">
                        Showing <span className="font-bold text-slate-800">{filteredCampaigns.length > 0 ? indexOfFirstCamp + 1 : 0}</span> to{' '}
                        <span className="font-bold text-slate-800">{Math.min(indexOfLastCamp, filteredCampaigns.length)}</span> of{' '}
                        <span className="font-bold text-slate-800">{filteredCampaigns.length}</span> campaigns
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-5 py-2 rounded-full border border-slate-200/80 text-xs font-extrabold text-slate-400 bg-white hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer shadow-sm"
                        >
                            Previous
                        </button>

                        {(() => {
                            const pages = [];
                            if (totalPages <= 7) {
                                for (let i = 1; i <= totalPages; i++) pages.push(i);
                            } else {
                                if (currentPage <= 4) {
                                    pages.push(1, 2, 3, 4, 5, '...', totalPages);
                                } else if (currentPage >= totalPages - 3) {
                                    pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                                } else {
                                    pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                                }
                            }

                            return pages.map((page, index) => {
                                if (page === '...') {
                                    return (
                                        <span key={`dots-${index}`} className="px-1 text-slate-400 font-black text-xs">
                                            ...
                                        </span>
                                    );
                                }
                                return (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-9 h-9 rounded-full text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                                            currentPage === page
                                                ? 'bg-[#0B132B] text-white shadow-md'
                                                : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                );
                            });
                        })()}

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="px-5 py-2 rounded-full border border-slate-200/80 text-xs font-extrabold text-slate-800 bg-white hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer shadow-sm"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Edit Budget Modal */}
            {editingCampaign && createPortal(
                <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col animate-slide-up text-left">
                        <div className="bg-[#0b1329] text-white p-5">
                            <h3 className="font-extrabold text-sm flex items-center gap-1.5">Modify Monthly Budget</h3>
                            <p className="text-[10px] text-slate-350 font-bold mt-0.5 truncate">{editingCampaign.name}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">New Budget (INR)</label>
                                <input
                                    type="number"
                                    value={editBudget}
                                    onChange={(e) => setEditBudget(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                    placeholder="Enter budget limit"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50/50 justify-end">
                            <button
                                onClick={() => setEditingCampaign(null)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all cursor-pointer text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleSaveBudget(editingCampaign._id)}
                                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all cursor-pointer text-xs"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Add Campaign Modal */}
            {isAddModalOpen && createPortal(
                <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleCreateCampaign} className="bg-white w-full max-w-md rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col animate-slide-up text-left">
                        <div className="bg-[#0b1329] text-white p-5 flex justify-between items-center">
                            <h3 className="font-extrabold text-sm flex items-center gap-2">Create New Campaign</h3>
                            <button 
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-1 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Campaign Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newCampaignForm.name}
                                    onChange={(e) => setNewCampaignForm({ ...newCampaignForm, name: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                    placeholder="e.g. Google Search - Cyber Security"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ad Network</label>
                                    <select
                                        value={newCampaignForm.platform}
                                        onChange={(e) => setNewCampaignForm({ ...newCampaignForm, platform: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all cursor-pointer"
                                    >
                                        {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Monthly Budget (INR)</label>
                                    <input
                                        type="number"
                                        required
                                        value={newCampaignForm.budget}
                                        onChange={(e) => setNewCampaignForm({ ...newCampaignForm, budget: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                        placeholder="e.g. 15000"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={newCampaignForm.startDate}
                                        onChange={(e) => setNewCampaignForm({ ...newCampaignForm, startDate: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-750 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={newCampaignForm.endDate}
                                        onChange={(e) => setNewCampaignForm({ ...newCampaignForm, endDate: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-xs font-bold text-slate-750 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-100 flex gap-3 bg-slate-50/50 justify-end">
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all cursor-pointer text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all cursor-pointer text-xs"
                            >
                                Launch Campaign
                            </button>
                        </div>
                    </form>
                </div>,
                document.body
            )}
        </DashboardLayout>
    );
};

export default AdsManagement;
