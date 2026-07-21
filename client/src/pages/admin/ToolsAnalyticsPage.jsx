import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
    BarChart3, Users, HardDrive, FileSignature, Mic, MonitorPlay, Camera, Video, Phone, Upload,
    Search, Filter, RefreshCw, Layers, Calendar, UserCheck, Clock, ShieldCheck
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const toolMeta = {
    'voice-recorder': { label: 'Voice Recorder', icon: Mic, color: 'text-blue-500 bg-blue-50 border-blue-200' },
    'video-recorder': { label: 'Video Recorder', icon: MonitorPlay, color: 'text-purple-500 bg-purple-50 border-purple-200' },
    'screenshot': { label: 'Screenshot Tool', icon: Camera, color: 'text-indigo-500 bg-indigo-50 border-indigo-200' },
    'screen-recorder': { label: 'Screen Recorder', icon: Video, color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
    'web-calling': { label: 'Web Calling', icon: Phone, color: 'text-pink-500 bg-pink-50 border-pink-200' },
    'file-uploader': { label: 'File Uploader', icon: Upload, color: 'text-amber-500 bg-amber-50 border-amber-200' },
};

const ToolsAnalyticsPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState(null);

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRole, setSelectedRole] = useState('All');
    const [selectedTool, setSelectedTool] = useState('All');

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/practice-files/analytics');
            setAnalyticsData(data);
        } catch (err) {
            console.error('[Fetch Tools Analytics Error]', err);
            toast.error('Failed to load tools analytics data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const formatBytes = (bytes = 0) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Filter user tool stats
    const filteredUserToolStats = (analyticsData?.userToolStats || []).filter(item => {
        const matchesSearch = 
            item.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.toolType?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesRole = selectedRole === 'All' || item.userRole === selectedRole;
        const matchesTool = selectedTool === 'All' || item.toolType === selectedTool;

        return matchesSearch && matchesRole && matchesTool;
    });

    // Totals calculation
    const totalPracticeActions = (analyticsData?.toolStats || []).reduce((sum, t) => sum + t.count, 0);
    const totalBytesUsed = (analyticsData?.toolStats || []).reduce((sum, t) => sum + t.totalSizeBytes, 0);
    const totalActiveUsers = (analyticsData?.userSummary || []).length;

    return (
        <DashboardLayout role={user?.role || 'Admin'}>
            <div className="max-w-7xl mx-auto px-4 py-5 font-sans">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-850 tracking-tight flex items-center gap-2">
                            <BarChart3 className="text-indigo-600" size={26} />
                            <span>Tools Analytics</span>
                        </h2>
                        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                            Monitor which tools are used, by whom, and frequency / storage consumed
                        </p>
                    </div>

                    <button
                        onClick={fetchAnalytics}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all self-start sm:self-auto cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh Analytics</span>
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-16">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-xs font-bold text-slate-400">Loading tools analytics...</p>
                    </div>
                ) : (
                    <>
                        {/* Summary KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">
                                    <Layers size={22} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tool Uses</p>
                                    <h3 className="text-2xl font-black text-slate-800 mt-0.5">{totalPracticeActions}</h3>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black">
                                    <HardDrive size={22} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Storage Consumed</p>
                                    <h3 className="text-2xl font-black text-slate-800 mt-0.5">{formatBytes(totalBytesUsed)}</h3>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black">
                                    <Users size={22} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Tool Users</p>
                                    <h3 className="text-2xl font-black text-slate-800 mt-0.5">{totalActiveUsers}</h3>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-black">
                                    <FileSignature size={22} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Form Builder Items</p>
                                    <h3 className="text-2xl font-black text-slate-800 mt-0.5">{analyticsData?.otherTools?.formBuilder || 0}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Tool-wise Usage Grid */}
                        <div className="mb-8">
                            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                <span>🛠️</span> Tool Wise Usage Summary
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.keys(toolMeta).map(toolKey => {
                                    const meta = toolMeta[toolKey];
                                    const ToolIcon = meta.icon;
                                    const stat = (analyticsData?.toolStats || []).find(s => s._id === toolKey) || { count: 0, totalSizeBytes: 0 };
                                    const percentage = totalPracticeActions > 0 ? Math.round((stat.count / totalPracticeActions) * 100) : 0;

                                    return (
                                        <div key={toolKey} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2.5 rounded-xl border ${meta.color}`}>
                                                        <ToolIcon size={18} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-extrabold text-slate-800 text-sm">{meta.label}</h4>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{stat.count} Actions</p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                                    {percentage}%
                                                </span>
                                            </div>

                                            <div className="space-y-1.5 mt-4">
                                                <div className="flex justify-between text-xs font-bold text-slate-500">
                                                    <span>Storage Used</span>
                                                    <span>{formatBytes(stat.totalSizeBytes)}</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                    <div 
                                                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500" 
                                                        style={{ width: `${Math.min(100, percentage)}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Detailed Per-User Tool Usage Breakdown */}
                        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden mb-8">
                            
                            {/* Table Header & Controls */}
                            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                        <span>👤</span> User Wise Tool Usage ("Kisne Kon Sa Tool Kitna Use Kiya")
                                    </h3>
                                    <p className="text-xs font-semibold text-slate-400 mt-0.5">Detailed log of every user's usage per tool</p>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    {/* Search Bar */}
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search user or email..."
                                            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all w-52"
                                        />
                                    </div>

                                    {/* Role Filter */}
                                    <select
                                        value={selectedRole}
                                        onChange={(e) => setSelectedRole(e.target.value)}
                                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                                    >
                                        <option value="All">All Roles</option>
                                        <option value="Student">Student</option>
                                        <option value="Teacher">Teacher</option>
                                        <option value="Admin">Admin</option>
                                        <option value="Editor">Editor</option>
                                    </select>

                                    {/* Tool Filter */}
                                    <select
                                        value={selectedTool}
                                        onChange={(e) => setSelectedTool(e.target.value)}
                                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                                    >
                                        <option value="All">All Tools</option>
                                        <option value="voice-recorder">Voice Recorder</option>
                                        <option value="video-recorder">Video Recorder</option>
                                        <option value="screenshot">Screenshot Tool</option>
                                        <option value="screen-recorder">Screen Recorder</option>
                                        <option value="web-calling">Web Calling</option>
                                        <option value="file-uploader">File Uploader</option>
                                    </select>
                                </div>
                            </div>

                            {/* User Usage Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/70 text-slate-400 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-100">
                                            <th className="py-3.5 px-6">User</th>
                                            <th className="py-3.5 px-4">Role</th>
                                            <th className="py-3.5 px-4">Tool Used</th>
                                            <th className="py-3.5 px-4 text-center">Usage Count</th>
                                            <th className="py-3.5 px-4 text-right">Size Consumed</th>
                                            <th className="py-3.5 px-6 text-right">Last Used</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                                        {filteredUserToolStats.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="text-center py-10 text-slate-400 font-semibold">
                                                    No tool usage records found matching criteria.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredUserToolStats.map((row, idx) => {
                                                const meta = toolMeta[row.toolType] || { label: row.toolType, icon: Layers, color: 'text-slate-600 bg-slate-100' };
                                                const ToolIcon = meta.icon;

                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="py-3.5 px-6">
                                                            <div>
                                                                <p className="font-extrabold text-slate-800">{row.userName || 'Unknown User'}</p>
                                                                <p className="text-[10px] text-slate-400 font-semibold">{row.userEmail || '-'}</p>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                                row.userRole === 'Admin' ? 'bg-purple-100 text-purple-700' :
                                                                row.userRole === 'Teacher' ? 'bg-blue-100 text-blue-700' :
                                                                row.userRole === 'Student' ? 'bg-emerald-100 text-emerald-700' :
                                                                'bg-slate-100 text-slate-700'
                                                            }`}>
                                                                {row.userRole || 'User'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`p-1.5 rounded-lg border ${meta.color}`}>
                                                                    <ToolIcon size={14} />
                                                                </div>
                                                                <span className="font-extrabold text-slate-800">{meta.label}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-center">
                                                            <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg font-black">
                                                                {row.count} times
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-extrabold text-slate-800">
                                                            {formatBytes(row.totalSizeBytes)}
                                                        </td>
                                                        <td className="py-3.5 px-6 text-right text-slate-400 font-semibold">
                                                            {formatDate(row.lastUsedAt)}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </>
                )}

            </div>
        </DashboardLayout>
    );
};

export default ToolsAnalyticsPage;
