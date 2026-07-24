import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    BarChart3, Users, Clock, MousePointer, Activity, Search, RefreshCw,
    Download, Shield, GraduationCap, FileText, Building, Wallet, Megaphone,
    UserCheck, Eye, Sparkles, Filter, CheckCircle2, AlertCircle, Calendar
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const roleIcons = {
    'Users': Users,
    'Guest Users': Eye,
    'Limited Users': Shield,
    'Students': GraduationCap,
    'Teachers': GraduationCap,
    'Editors': FileText,
    'Institutes': Building,
    'Accountants': Wallet,
    'Marketers': Megaphone,
    'Parents': UserCheck
};

const roleColors = {
    'Users': 'from-indigo-600 to-blue-600',
    'Guest Users': 'from-slate-600 to-zinc-600',
    'Limited Users': 'from-rose-600 to-red-600',
    'Students': 'from-emerald-600 to-teal-600',
    'Teachers': 'from-violet-600 to-purple-600',
    'Editors': 'from-amber-600 to-orange-600',
    'Institutes': 'from-blue-600 to-indigo-700',
    'Accountants': 'from-cyan-600 to-blue-600',
    'Marketers': 'from-pink-600 to-rose-600',
    'Parents': 'from-teal-600 to-emerald-700'
};

const UserUsageAnalyticsPage = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabQuery = searchParams.get('tab');

    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [categoriesData, setCategoriesData] = useState({});
    const [activeTab, setActiveTab] = useState(tabQuery && roleIcons[tabQuery] ? tabQuery : 'Users');

    useEffect(() => {
        if (tabQuery && roleIcons[tabQuery]) {
            setActiveTab(tabQuery);
        }
    }, [tabQuery]);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [engagementFilter, setEngagementFilter] = useState('All');

    // Detail Modal State
    const [selectedUserDetail, setSelectedUserDetail] = useState(null);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/analytics/user-usage');
            setSummary(data.summary);
            setCategoriesData(data.categories || {});
        } catch (err) {
            console.error('[Fetch User Analytics Error]', err);
            toast.error('Failed to load user usage analytics data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    // Filtered data for current tab
    const currentList = useMemo(() => {
        const raw = categoriesData[activeTab] || [];
        return raw.filter(item => {
            const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.instituteName || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesEngagement = engagementFilter === 'All' || item.engagement === engagementFilter;

            return matchesSearch && matchesEngagement;
        });
    }, [categoriesData, activeTab, searchTerm, engagementFilter]);

    // CSV Export
    const handleExportCSV = () => {
        if (!currentList.length) {
            toast.error('No data available to export');
            return;
        }

        const headers = ['Name', 'Email', 'Role', 'Institute', 'Time Spent', 'Total Clicks', 'Engagement', 'Last Active'];
        const csvRows = [headers.join(',')];

        currentList.forEach(item => {
            const row = [
                `"${item.name.replace(/"/g, '""')}"`,
                `"${item.email.replace(/"/g, '""')}"`,
                `"${item.role}"`,
                `"${item.instituteName.replace(/"/g, '""')}"`,
                `"${item.timeSpentFormatted}"`,
                item.clickCount,
                `"${item.engagement}"`,
                `"${new Date(item.lastActive).toLocaleString()}"`
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', `LMS_User_Usage_Analytics_${activeTab.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success(`Exported ${currentList.length} records to CSV!`);
    };

    const RoleIcon = roleIcons[activeTab] || Users;

    return (
        <DashboardLayout title="User Usage & Time Analytics">
            <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
                
                {/* ── HEADER TITLE ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-650 font-bold">
                                <BarChart3 size={22} />
                            </div>
                            <div>
                                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">LMS User Usage & Activity Analytics</h1>
                                <p className="text-xs text-slate-500 font-medium">Track total time spent, clicks, session metrics & role actions across 10 categories</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchAnalytics}
                            disabled={loading}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="px-4 py-2 bg-[#0b1329] hover:bg-[#152244] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                        >
                            <Download size={14} /> Export CSV
                        </button>
                    </div>
                </div>

                {/* ── TOP KPI SUMMARY CARDS ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center flex-shrink-0">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Users & Visitors</p>
                            <h3 className="text-xl font-black text-slate-900 mt-0.5">{summary?.totalUsersTracked || 0}</h3>
                            <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Across all 10 roles</p>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-650 flex items-center justify-center flex-shrink-0">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total LMS Time Spent</p>
                            <h3 className="text-xl font-black text-slate-900 mt-0.5">{summary?.totalTimeSpentFormatted || '0m'}</h3>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Avg {summary?.avgTimePerUserFormatted || '0m'} / user</p>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-650 flex items-center justify-center flex-shrink-0">
                            <MousePointer size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Clicks & Interactions</p>
                            <h3 className="text-xl font-black text-slate-900 mt-0.5">{summary?.totalClicksAll ? summary.totalClicksAll.toLocaleString() : 0}</h3>
                            <p className="text-[10px] text-amber-600 font-bold mt-0.5">Tracked feature clicks</p>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-650 flex items-center justify-center flex-shrink-0">
                            <Activity size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Today Sessions</p>
                            <h3 className="text-xl font-black text-slate-900 mt-0.5">{summary?.activeSessionsToday || 0}</h3>
                            <p className="text-[10px] text-purple-600 font-bold mt-0.5">Sessions logged today</p>
                        </div>
                    </div>
                </div>

                {/* ── 10 ROLE CATEGORY TABS ── */}
                <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs overflow-x-auto custom-scrollbar">
                    <div className="flex gap-1.5 min-w-max">
                        {Object.keys(roleIcons).map(catKey => {
                            const Icon = roleIcons[catKey];
                            const isActive = activeTab === catKey;
                            const count = categoriesData[catKey]?.length || 0;
                            return (
                                <button
                                    key={catKey}
                                    onClick={() => setActiveTab(catKey)}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer select-none ${
                                        isActive
                                            ? 'bg-[#0b1329] text-white shadow-md shadow-indigo-950/20'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                                    }`}
                                >
                                    <Icon size={14} className={isActive ? 'text-indigo-400' : 'text-slate-400'} />
                                    <span>{catKey}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                        isActive ? 'bg-indigo-600/60 text-white' : 'bg-slate-200 text-slate-700'
                                    }`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── SEARCH & FILTERS BAR ── */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={`Search ${activeTab.toLowerCase()} by name, email or institute...`}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:border-indigo-400 focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Filter size={14} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Engagement:</span>
                        <select
                            value={engagementFilter}
                            onChange={(e) => setEngagementFilter(e.target.value)}
                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                        >
                            <option value="All">All Levels</option>
                            <option value="High">🔥 High</option>
                            <option value="Medium">⚡ Medium</option>
                            <option value="Low">💤 Low</option>
                            <option value="Inactive">🚫 Inactive</option>
                        </select>
                    </div>
                </div>

                {/* ── USAGE DATA TABLE ── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <RoleIcon size={18} className="text-indigo-650" />
                            <h3 className="font-extrabold text-slate-800 text-sm">
                                {activeTab} Activity & Time Spend Table ({currentList.length})
                            </h3>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Real-time Session Monitoring
                        </span>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center">
                            <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-3" />
                            <p className="text-xs font-bold text-slate-500">Computing analytics metrics for {activeTab}...</p>
                        </div>
                    ) : currentList.length === 0 ? (
                        <div className="p-12 text-center">
                            <AlertCircle size={28} className="text-slate-300 mx-auto mb-2" />
                            <p className="text-sm font-bold text-slate-600">No activity records found</p>
                            <p className="text-xs text-slate-400 mt-1">Try adjusting search term or engagement filter</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                        <th className="p-4">User / Account</th>
                                        <th className="p-4">Role & Institute</th>
                                        <th className="p-4 text-center">Total Time Spent</th>
                                        <th className="p-4 text-center">Click Count</th>
                                        <th className="p-4 text-center">Engagement</th>
                                        <th className="p-4">Role Specific Key Metrics</th>
                                        <th className="p-4 text-right">Last Active</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                    {currentList.map(item => (
                                        <tr
                                            key={item.id}
                                            onClick={() => setSelectedUserDetail(item)}
                                            className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                                        >
                                            {/* User Name & Email */}
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${roleColors[activeTab] || 'from-indigo-600 to-blue-600'} text-white font-extrabold flex items-center justify-center text-xs shadow-xs flex-shrink-0`}>
                                                        {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="font-extrabold text-slate-800 group-hover:text-indigo-650 transition-colors text-xs">
                                                            {item.name}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-medium">
                                                            {item.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role & Institute */}
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="space-y-0.5">
                                                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-[10px] rounded-md">
                                                        {item.role}
                                                    </span>
                                                    <div className="text-[10px] text-slate-400 font-medium truncate max-w-[140px]">
                                                        {item.instituteName}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Time Spent */}
                                            <td className="p-4 whitespace-nowrap text-center">
                                                <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-black">
                                                    <Clock size={12} className="text-emerald-600" />
                                                    <span>{item.timeSpentFormatted}</span>
                                                </div>
                                            </td>

                                            {/* Click Count */}
                                            <td className="p-4 whitespace-nowrap text-center">
                                                <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-900 border border-indigo-200 px-3 py-1 rounded-xl text-xs font-black">
                                                    <MousePointer size={12} className="text-indigo-600" />
                                                    <span>{item.clickCount.toLocaleString()}</span>
                                                </div>
                                            </td>

                                            {/* Engagement */}
                                            <td className="p-4 whitespace-nowrap text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${item.engagementColor}`}>
                                                    {item.engagement}
                                                </span>
                                            </td>

                                            {/* Role Specific Key Metrics */}
                                            <td className="p-4">
                                                <RoleSpecificMetricsDisplay role={item.role} metrics={item.roleMetrics} />
                                            </td>

                                            {/* Last Active */}
                                            <td className="p-4 whitespace-nowrap text-right text-[10px] text-slate-500 font-bold">
                                                {item.lastActive ? new Date(item.lastActive).toLocaleDateString() + ' ' + new Date(item.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ── USER DETAIL MODAL POPUP ── */}
                {selectedUserDetail && (
                    <div
                        className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
                        style={{ background: 'rgba(11,19,41,0.75)', backdropFilter: 'blur(5px)' }}
                        onClick={(e) => { if (e.target === e.currentTarget) setSelectedUserDetail(null); }}
                    >
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md">
                                        {selectedUserDetail.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-sm">{selectedUserDetail.name}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold">{selectedUserDetail.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedUserDetail(null)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-5 space-y-4 text-xs font-semibold text-slate-700 max-h-[75vh] overflow-y-auto">
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Role</span>
                                        <span className="font-black text-slate-800 text-xs mt-0.5 block">{selectedUserDetail.role}</span>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Institute</span>
                                        <span className="font-black text-slate-800 text-xs mt-0.5 block truncate">{selectedUserDetail.instituteName}</span>
                                    </div>
                                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">Time Spent</span>
                                        <span className="font-black text-emerald-950 text-sm mt-0.5 block">{selectedUserDetail.timeSpentFormatted}</span>
                                    </div>
                                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200">
                                        <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider block">Total Clicks</span>
                                        <span className="font-black text-indigo-950 text-sm mt-0.5 block">{selectedUserDetail.clickCount.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Role Specific Detailed Metrics */}
                                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 space-y-2">
                                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
                                        Role Action Breakdown
                                    </h4>
                                    <div className="space-y-1.5 pt-1 text-xs">
                                        {Object.entries(selectedUserDetail.roleMetrics || {}).map(([mKey, mVal]) => (
                                            <div key={mKey} className="flex items-center justify-between text-slate-600">
                                                <span className="capitalize">{mKey.replace(/([A-Z])/g, ' $1')}</span>
                                                <span className="font-black text-slate-900">{mVal}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                                <button
                                    onClick={() => setSelectedUserDetail(null)}
                                    className="px-4 py-2 bg-[#0b1329] text-white font-bold rounded-xl text-xs cursor-pointer active:scale-95 transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </DashboardLayout>
    );
};

/* ── Inline Component for Role-Specific Key Metrics ── */
const RoleSpecificMetricsDisplay = ({ role, metrics = {} }) => {
    const roleLower = (role || '').toLowerCase();

    if (roleLower === 'student') {
        return (
            <div className="flex flex-wrap gap-1 text-[10px]">
                <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-100">
                    {metrics.testsAttempted || 0} Tests
                </span>
                <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-100">
                    {metrics.submissionsCount || 0} Submissions
                </span>
                <span className="bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded border border-purple-100">
                    Avg {metrics.avgScore || 'N/A'}
                </span>
            </div>
        );
    }

    if (roleLower === 'teacher') {
        return (
            <div className="flex flex-wrap gap-1 text-[10px]">
                <span className="bg-violet-50 text-violet-700 font-bold px-2 py-0.5 rounded border border-violet-100">
                    {metrics.testsCreated || 0} Tests Created
                </span>
                <span className="bg-sky-50 text-sky-700 font-bold px-2 py-0.5 rounded border border-sky-100">
                    {metrics.materialsUploaded || 0} Materials
                </span>
                <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-100">
                    {metrics.evaluationsDone || 0} Evaluated
                </span>
            </div>
        );
    }

    if (roleLower === 'editor') {
        return (
            <div className="flex flex-wrap gap-1 text-[10px]">
                <span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded border border-amber-100">
                    {metrics.contentEdits || 0} Edits
                </span>
                <span className="bg-orange-50 text-orange-700 font-bold px-2 py-0.5 rounded border border-orange-100">
                    {metrics.mediaUploaded || 0} Media Files
                </span>
            </div>
        );
    }

    if (roleLower === 'accountant') {
        return (
            <div className="flex flex-wrap gap-1 text-[10px]">
                <span className="bg-cyan-50 text-cyan-700 font-bold px-2 py-0.5 rounded border border-cyan-100">
                    {metrics.feeReceiptsProcessed || 0} Receipts
                </span>
                <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-100">
                    {metrics.totalTransactionsLogged || 0} Logs
                </span>
            </div>
        );
    }

    if (roleLower === 'marketer') {
        return (
            <div className="flex flex-wrap gap-1 text-[10px]">
                <span className="bg-pink-50 text-pink-700 font-bold px-2 py-0.5 rounded border border-pink-100">
                    {metrics.leadsGenerated || 0} Leads
                </span>
                <span className="bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-100">
                    {metrics.conversionsCount || 0} Conversions
                </span>
            </div>
        );
    }

    if (roleLower === 'parent') {
        return (
            <div className="flex flex-wrap gap-1 text-[10px]">
                <span className="bg-teal-50 text-teal-700 font-bold px-2 py-0.5 rounded border border-teal-100">
                    {metrics.childrenLinked || 1} Child Linked
                </span>
                <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-100">
                    {metrics.attendanceChecked || 0} Attendance Checks
                </span>
            </div>
        );
    }

    if (roleLower === 'institute') {
        return (
            <div className="flex flex-wrap gap-1 text-[10px]">
                <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-100">
                    {metrics.managedUsersCount || 0} Managed Users
                </span>
                <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-100">
                    {metrics.activeCourses || 0} Courses
                </span>
            </div>
        );
    }

    if (roleLower === 'guest user' || roleLower === 'guest') {
        return (
            <div className="flex flex-wrap gap-1 text-[10px]">
                <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded border border-slate-200">
                    {metrics.landingPageViews || 0} Page Views
                </span>
                <span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded border border-amber-100">
                    {metrics.demoCoursesBrowsed || 0} Demo Courses
                </span>
            </div>
        );
    }

    return (
        <span className="text-[10px] text-slate-400 italic">
            Standard System Activity
        </span>
    );
};

export default UserUsageAnalyticsPage;
