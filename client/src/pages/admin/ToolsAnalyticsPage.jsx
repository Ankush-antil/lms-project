import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    BarChart3, Users, HardDrive, FileSignature, Database, Mic, MonitorPlay, Camera, Video,
    Search, RefreshCw, Layers
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import EditUserModal from '../../components/EditUserModal';

const toolMeta = {
    'form-builder': { label: 'Form Builder Tool', icon: FileSignature, color: 'text-orange-500 bg-orange-50 border-orange-200' },
    'database-creator': { label: 'Database Creator Tool', icon: Database, color: 'text-blue-500 bg-blue-50 border-blue-200', isComingSoon: true },
    'voice-recorder': { label: 'Voice Recorder', icon: Mic, color: 'text-sky-500 bg-sky-50 border-sky-200' },
    'video-recorder': { label: 'Video Recorder', icon: MonitorPlay, color: 'text-purple-500 bg-purple-50 border-purple-200' },
    'screenshot': { label: 'Screenshot Tool', icon: Camera, color: 'text-indigo-500 bg-indigo-50 border-indigo-200' },
    'screen-recorder': { label: 'Screen Recorder', icon: Video, color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
};

const ToggleSwitch = ({ checked, onChange, disabled }) => (
    <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            checked ? 'bg-emerald-500' : 'bg-slate-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                checked ? 'translate-x-5' : 'translate-x-0'
            }`}
        />
    </button>
);

const ToolsAnalyticsPage = () => {
    const { user } = useAuth();
    const { tab } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState(null);
    const [detailedData, setDetailedData] = useState([]);

    // Tabs mapping
    const tabMapping = {
        'drive': 'drive',
        'chat': 'chat',
        'notes': 'notes',
        'screenshot': 'screenshot',
        'screen-recorder': 'screenRecorder',
        'voice-recorder': 'voiceRecorder',
        'video-recorder': 'videoRecorder'
    };

    const activeTab = tabMapping[tab] || 'drive';

    const activeToolKeys = {
        'screenshot': ['screenshot'],
        'screenRecorder': ['screen-recorder'],
        'voiceRecorder': ['voice-recorder'],
        'videoRecorder': ['video-recorder']
    }[activeTab] || [];

    const setActiveTab = (tabId) => {
        const revMapping = {
            'drive': 'drive',
            'chat': 'chat',
            'notes': 'notes',
            'screenshot': 'screenshot',
            'screenRecorder': 'screen-recorder',
            'voiceRecorder': 'voice-recorder',
            'videoRecorder': 'video-recorder'
        };
        navigate(`/admin/tools-analytics/${revMapping[tabId]}`);
    };

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInstitute, setSelectedInstitute] = useState('All');

    // Edit User Modal State
    const [selectedUserToEdit, setSelectedUserToEdit] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [togglingId, setTogglingId] = useState(null);

    // Map activeTab to the service key used in studentProfile.toolsAccess
    const tabToServiceKey = {
        drive: 'drive',
        chat: 'chat',
        notes: 'notes',
        screenshot: 'screenshot',
        screenRecorder: 'screenRecorder',
        voiceRecorder: 'voiceRecorder',
        videoRecorder: 'videoRecorder'
    };


    const handleToggleService = async (row) => {
        const userId = row.user?._id;
        if (!userId || togglingId === userId) return;
        const serviceKey = tabToServiceKey[activeTab];
        const currentControls = row.user?.studentProfile?.controls || {};
        const currentVal = currentControls.toolsAccess?.[serviceKey];
        const newVal = currentVal === false ? true : false; // toggle; default is enabled (true)
        setTogglingId(userId);
        try {
            await axios.put(`/api/users/${userId}`, {
                controls: {
                    ...currentControls,
                    toolsAccess: {
                        ...(currentControls.toolsAccess || {}),
                        [serviceKey]: newVal
                    }
                }
            });
            // Update local data optimistically
            setDetailedData(prev => prev.map(s => {
                if (s.user?._id === userId) {
                    return {
                        ...s,
                        user: {
                            ...s.user,
                            studentProfile: {
                                ...s.user.studentProfile,
                                controls: {
                                    ...currentControls,
                                    toolsAccess: {
                                        ...(currentControls.toolsAccess || {}),
                                        [serviceKey]: newVal
                                    }
                                }
                            }
                        }
                    };
                }
                return s;
            }));
            toast.success(`Service ${newVal ? 'enabled' : 'disabled'} successfully`);
        } catch (err) {
            console.error('[Toggle Service Error]', err);
            toast.error('Failed to update service status');
        } finally {
            setTogglingId(null);
        }
    };

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const [summaryRes, detailedRes] = await Promise.all([
                axios.get('/api/practice-files/analytics'),
                axios.get('/api/practice-files/detailed-analytics')
            ]);
            setAnalyticsData(summaryRes.data);
            setDetailedData(detailedRes.data.students || []);
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

    const formatDuration = (seconds = 0) => {
        if (seconds === 0) return '0s';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        let res = [];
        if (hrs > 0) res.push(`${hrs}h`);
        if (mins > 0) res.push(`${mins}m`);
        if (secs > 0 || res.length === 0) res.push(`${secs}s`);
        return res.join(' ');
    };

    const handleEditAccess = (studentUser) => {
        setSelectedUserToEdit(studentUser);
        setIsEditModalOpen(true);
    };

    // Filter Students
    const filteredStudents = detailedData.filter(student => {
        const matchesSearch =
            student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.email?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesInstitute = selectedInstitute === 'All' || student.instituteName === selectedInstitute;

        if (!matchesSearch || !matchesInstitute) return false;

        // Only show students who have actually worked/created data for the current tab
        if (activeTab === 'drive') {
            return student.drive && (student.drive.totalFiles > 0 || student.drive.totalFolders > 0 || student.drive.usedStorage > 0);
        }
        if (activeTab === 'chat') {
            return student.chat && (student.chat.totalChats > 0 || student.chat.totalMessagesSent > 0 || student.chat.totalMessagesReceived > 0);
        }
        if (activeTab === 'notes') {
            return student.notes && student.notes.totalNotes > 0;
        }
        if (activeTab === 'screenshot') {
            return student.screenshot && student.screenshot.totalFiles > 0;
        }
        if (activeTab === 'screenRecorder') {
            return student.screenRecorder && student.screenRecorder.totalFiles > 0;
        }
        if (activeTab === 'voiceRecorder') {
            return student.voiceRecorder && student.voiceRecorder.totalFiles > 0;
        }
        if (activeTab === 'videoRecorder') {
            return student.videoRecorder && student.videoRecorder.totalFiles > 0;
        }

        return true;
    });

    // Dynamic Institute List
    const institutesList = ['All', ...new Set(detailedData.map(item => item.instituteName).filter(Boolean))];

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [entriesPerPage, setEntriesPerPage] = useState(10);

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedInstitute]);

    const limit = parseInt(entriesPerPage, 10) || 10;
    const indexOfLastEntry = currentPage * limit;
    const indexOfFirstEntry = indexOfLastEntry - limit;
    const currentEntries = filteredStudents.slice(indexOfFirstEntry, indexOfLastEntry);
    const totalPages = Math.ceil(filteredStudents.length / limit);

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 6) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);
            if (currentPage > 3) {
                pages.push('...');
            }
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) {
                if (i !== 1 && i !== totalPages) {
                    pages.push(i);
                }
            }
            if (currentPage < totalPages - 2) {
                pages.push('...');
            }
            pages.push(totalPages);
        }
        return pages;
    };

    // Practice tools stats without web-calling & file-uploader
    const practiceToolStats = (analyticsData?.toolStats || []).filter(
        s => s._id !== 'web-calling' && s._id !== 'file-uploader'
    );

    const totalPracticeActions = practiceToolStats.reduce((sum, t) => sum + t.count, 0);
    const totalBytesUsed = practiceToolStats.reduce((sum, t) => sum + t.totalSizeBytes, 0);
    const totalActiveUsers = (analyticsData?.userSummary || []).length;
    const formBuilderCount = analyticsData?.otherTools?.formBuilder || 0;

    const tabs = [
        { id: 'drive', label: 'Drive Usage Analytics', icon: HardDrive },
        { id: 'chat', label: 'Chat Usage Analytics', icon: Users },
        { id: 'notes', label: 'Notes Usage Analytics', icon: FileSignature },
        { id: 'screenshot', label: 'Screenshot Analytics', icon: Camera },
        { id: 'screenRecorder', label: 'Screen Recording Usage Analytics', icon: Video },
        { id: 'voiceRecorder', label: 'Audio Recording Usage Analytics', icon: Mic },
        { id: 'videoRecorder', label: 'Video Recording Usage Analytics', icon: MonitorPlay }
    ];

    return (
        <DashboardLayout role={user?.role || 'Admin'}>
            <div className="max-w-7xl mx-auto px-4 py-5 font-sans">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-850 tracking-tight flex items-center gap-2">
                            <BarChart3 className="text-indigo-650" size={26} />
                            <span>Tools Analytics</span>
                        </h2>
                        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                            Monitor tool usage, creator activities, and storage consumed
                        </p>
                    </div>

                    <button
                        onClick={fetchAnalytics}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all self-start sm:self-auto cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh Data</span>
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
                        <div className="w-10 h-10 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-xs font-bold text-slate-400">Loading tools analytics...</p>
                    </div>
                ) : (
                    <>
                        {/* Tool-wise Usage Grid */}
                        {activeToolKeys.length > 0 && (
                            <div className="mb-8 animate-fade-in">
                                <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2 text-left">
                                    <span>🛠️</span> Tool Wise Usage Summary
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {activeToolKeys.map(toolKey => {
                                        const meta = toolMeta[toolKey];
                                        const ToolIcon = meta.icon;

                                        let count = 0;
                                        let sizeBytes = 0;

                                        if (toolKey === 'form-builder') {
                                            count = formBuilderCount;
                                        } else if (toolKey === 'database-creator') {
                                            count = 0;
                                        } else {
                                            const stat = practiceToolStats.find(s => s._id === toolKey) || { count: 0, totalSizeBytes: 0 };
                                            count = stat.count;
                                            sizeBytes = stat.totalSizeBytes;
                                        }

                                        const percentage = totalPracticeActions > 0 && toolKey !== 'form-builder' && toolKey !== 'database-creator'
                                            ? Math.round((count / totalPracticeActions) * 100)
                                            : 0;

                                        return (
                                            <div key={toolKey} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2.5 rounded-xl border ${meta.color}`}>
                                                                <ToolIcon size={20} />
                                                            </div>
                                                            <div className="text-left">
                                                                <h4 className="font-extrabold text-slate-800 text-sm">{meta.label}</h4>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{count} {toolKey === 'form-builder' ? 'Forms' : 'Actions'}</p>
                                                            </div>
                                                        </div>
                                                        {meta.isComingSoon ? (
                                                            <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                                                Soon
                                                            </span>
                                                        ) : (
                                                            percentage > 0 && (
                                                                <span className="text-xs font-black text-indigo-650 bg-indigo-50 px-2.5 py-1 rounded-lg">
                                                                    {percentage}%
                                                                </span>
                                                            )
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5 mt-4 pt-3 border-t border-slate-50">
                                                    <div className="flex justify-between text-xs font-bold text-slate-500">
                                                        <span>Storage Consumed</span>
                                                        <span>{meta.isComingSoon ? 'N/A' : formatBytes(sizeBytes)}</span>
                                                    </div>
                                                    {!meta.isComingSoon && (
                                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className="bg-indigo-650 h-2 rounded-full transition-all duration-500"
                                                                style={{ width: `${Math.min(100, percentage)}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Detailed Table Section */}
                        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden mb-8">

                            {/* Table Header & Controls */}
                            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="text-left">
                                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                        <span>📊</span> {tabs.find(t => t.id === activeTab)?.label}
                                    </h3>
                                    <p className="text-xs font-semibold text-slate-400 mt-0.5">Detailed usage breakdown for all registered student users</p>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    {/* Entries Selector */}
                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 tracking-wider uppercase">
                                        <span>Show</span>
                                        <input
                                            type="number"
                                            min="1"
                                            value={entriesPerPage}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setEntriesPerPage(val === '' ? '' : Math.max(1, parseInt(val, 10)));
                                                setCurrentPage(1);
                                            }}
                                            className="w-14 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-black text-slate-700 text-center outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650/20 transition-all"
                                        />
                                        <span>Entries</span>
                                    </div>

                                    {/* Search Bar */}
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search student or email..."
                                            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all w-52"
                                        />
                                    </div>

                                    {/* Institute Filter */}
                                    <select
                                        value={selectedInstitute}
                                        onChange={(e) => setSelectedInstitute(e.target.value)}
                                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                                    >
                                        {institutesList.map(inst => (
                                            <option key={inst} value={inst}>
                                                {inst === 'All' ? 'All Institutes' : inst}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Dynamic Tables depending on Active Tab */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    {/* Tab 1: Drive Usage Analytics */}
                                    {activeTab === 'drive' && (
                                        <>
                                            <thead>
                                                <tr className="bg-slate-50/70 text-slate-400 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-100">
                                                    <th className="py-3.5 px-6">Student Name</th>
                                                    <th className="py-3.5 px-4">Institute Name</th>
                                                    <th className="py-3.5 px-4 text-center">Total Files</th>
                                                    <th className="py-3.5 px-4 text-center">Total Folders</th>
                                                    <th className="py-3.5 px-4 text-right">Total Storage</th>
                                                    <th className="py-3.5 px-4 text-right">Used Storage</th>
                                                    <th className="py-3.5 px-4 text-right">Remaining Storage</th>
                                                    <th className="py-3.5 px-4 text-center">Total Uploads</th>
                                                    <th className="py-3.5 px-4 text-center">Total Downloads</th>
                                                    <th className="py-3.5 px-4 text-center">Total Shared Files</th>
                                                    <th className="py-3.5 px-4 text-right">Last Activity</th>
                                                    <th className="py-3.5 px-4 text-center">Trash Files</th>
                                                    <th className="py-3.5 px-4 text-center">Total Devices</th>
                                                    <th className="py-3.5 px-4 text-center">Status</th>
                                                    <th className="py-3.5 px-6 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                                                {currentEntries.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="15" className="text-center py-10 text-slate-400">No student records found.</td>
                                                    </tr>
                                                ) : (
                                                    currentEntries.map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="py-3.5 px-6 font-extrabold text-slate-850">{row.name}</td>
                                                            <td className="py-3.5 px-4 font-semibold text-slate-500">{row.instituteName}</td>
                                                            <td className="py-3.5 px-4 text-center">{row.drive.totalFiles}</td>
                                                            <td className="py-3.5 px-4 text-center">{row.drive.totalFolders}</td>
                                                            <td className="py-3.5 px-4 text-right font-medium text-slate-400">{formatBytes(row.drive.totalStorage)}</td>
                                                            <td className="py-3.5 px-4 text-right font-black text-indigo-650">{formatBytes(row.drive.usedStorage)}</td>
                                                            <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600">{formatBytes(row.drive.remainingStorage)}</td>
                                                            <td className="py-3.5 px-4 text-center text-slate-600">{row.drive.totalUploads}</td>
                                                            <td className="py-3.5 px-4 text-center text-slate-400 font-medium">{row.drive.totalDownloads}</td>
                                                            <td className="py-3.5 px-4 text-center text-slate-400 font-medium">{row.drive.totalSharedFiles}</td>
                                                            <td className="py-3.5 px-4 text-right text-slate-400 font-semibold">{formatDate(row.drive.lastActivity)}</td>
                                                            <td className="py-3.5 px-4 text-center text-amber-600">{row.drive.trashFiles}</td>
                                                            <td className="py-3.5 px-4 text-center text-slate-600">{row.drive.totalDevices}</td>
                                                            <td className="py-3.5 px-4 text-center">
                                                                {(() => {
                                                                    const enabled = row.user?.studentProfile?.controls?.toolsAccess?.drive !== false;
                                                                    return (
                                                                        <ToggleSwitch
                                                                            checked={enabled}
                                                                            onChange={() => handleToggleService(row)}
                                                                            disabled={togglingId === row.user?._id}
                                                                        />
                                                                    );
                                                                })()}
                                                            </td>
                                                            <td className="py-3.5 px-6 text-right">
                                                                <button
                                                                    onClick={() => handleEditAccess(row.user)}
                                                                    className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 text-[10px] font-black rounded-xl border border-indigo-100 transition-all cursor-pointer"
                                                                >
                                                                    Edit access & features
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </>
                                    )}

                                    {/* Tab 2: Chat Usage Analytics */}
                                    {activeTab === 'chat' && (
                                        <>
                                            <thead>
                                                <tr className="bg-slate-50/70 text-slate-400 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-100">
                                                    <th className="py-3.5 px-6">Student Name</th>
                                                    <th className="py-3.5 px-4">Institute Name</th>
                                                    <th className="py-3.5 px-4 text-center">Total Chats</th>
                                                    <th className="py-3.5 px-4 text-center">Sent</th>
                                                    <th className="py-3.5 px-4 text-center">Received</th>
                                                    <th className="py-3.5 px-4 text-center">Groups</th>
                                                    <th className="py-3.5 px-4 text-center">Files</th>
                                                    <th className="py-3.5 px-4 text-center">Images</th>
                                                    <th className="py-3.5 px-4 text-center">Videos</th>
                                                    <th className="py-3.5 px-4 text-center">Audio</th>
                                                    <th className="py-3.5 px-4 text-center">Docs</th>
                                                    <th className="py-3.5 px-4 text-center">Voice Calls</th>
                                                    <th className="py-3.5 px-4 text-center">Video Calls</th>
                                                    <th className="py-3.5 px-4 text-right">Duration</th>
                                                    <th className="py-3.5 px-4 text-right">Storage</th>
                                                    <th className="py-3.5 px-4 text-center">Contacts</th>
                                                    <th className="py-3.5 px-4 text-right">Last Msg</th>
                                                    <th className="py-3.5 px-4 text-right">Last Activity</th>
                                                    <th className="py-3.5 px-4 text-center">Devices</th>
                                                    <th className="py-3.5 px-4 text-center">User Status</th>
                                                    <th className="py-3.5 px-4 text-center">Status</th>
                                                    <th className="py-3.5 px-6 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                                                {currentEntries.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="22" className="text-center py-10 text-slate-400">No student records found.</td>
                                                    </tr>
                                                ) : (
                                                    currentEntries.map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="py-3.5 px-6 font-extrabold text-slate-850">{row.name}</td>
                                                            <td className="py-3.5 px-4 font-semibold text-slate-500">{row.instituteName}</td>
                                                            <td className="py-3.5 px-4 text-center">{row.chat.totalChats}</td>
                                                            <td className="py-3.5 px-4 text-center text-slate-650">{row.chat.totalMessagesSent}</td>
                                                            <td className="py-3.5 px-4 text-center text-slate-650">{row.chat.totalMessagesReceived}</td>
                                                            <td className="py-3.5 px-4 text-center text-slate-400 font-medium">{row.chat.totalGroupsJoined}</td>
                                                            <td className="py-3.5 px-4 text-center text-indigo-600">{row.chat.totalFilesShared}</td>
                                                            <td className="py-3.5 px-4 text-center text-slate-600">{row.chat.totalImagesShared}</td>
                                                            <td className="py-3.5 px-4 text-center text-slate-600">{row.chat.totalVideosShared}</td>
                                                            <td className="py-3.5 px-4 text-center text-slate-600">{row.chat.totalAudioShared}</td>
                                                            <td className="py-3.5 px-4 text-center text-slate-600">{row.chat.totalDocumentsShared}</td>
                                                            <td className="py-3.5 px-4 text-center text-emerald-600">{row.chat.totalVoiceCalls}</td>
                                                            <td className="py-3.5 px-4 text-center text-purple-650">{row.chat.totalVideoCalls}</td>
                                                            <td className="py-3.5 px-4 text-right font-black text-slate-800">{formatDuration(row.chat.totalCallDuration)}</td>
                                                            <td className="py-3.5 px-4 text-right text-slate-500 font-medium">{formatBytes(row.chat.totalChatStorageUsed)}</td>
                                                            <td className="py-3.5 px-4 text-center">{row.chat.totalContacts}</td>
                                                            <td className="py-3.5 px-4 text-right text-slate-400 font-semibold">{formatDate(row.chat.lastMessageTime)}</td>
                                                            <td className="py-3.5 px-4 text-right text-slate-400 font-semibold">{formatDate(row.chat.lastActivity)}</td>
                                                            <td className="py-3.5 px-4 text-center text-slate-600">{row.chat.totalDevices}</td>
                                                            <td className="py-3.5 px-4 text-center">
                                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${row.isActive
                                                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                                                        : 'bg-slate-100 text-slate-450'
                                                                    }`}>
                                                                    {row.chat.status}
                                                                </span>
                                                            </td>
                                                            <td className="py-3.5 px-4 text-center">
                                                                {(() => {
                                                                    const enabled = row.user?.studentProfile?.controls?.toolsAccess?.chat !== false;
                                                                    return (
                                                                        <ToggleSwitch
                                                                            checked={enabled}
                                                                            onChange={() => handleToggleService(row)}
                                                                            disabled={togglingId === row.user?._id}
                                                                        />
                                                                    );
                                                                })()}
                                                            </td>
                                                            <td className="py-3.5 px-6 text-right">
                                                                <button
                                                                    onClick={() => handleEditAccess(row.user)}
                                                                    className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 text-[10px] font-black rounded-xl border border-indigo-100 transition-all cursor-pointer"
                                                                >
                                                                    Edit Access & Features
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </>
                                    )}

                                    {/* Tab 3: Notes Usage Analytics */}
                                    {activeTab === 'notes' && (
                                        <>
                                            <thead>
                                                <tr className="bg-slate-50/70 text-slate-400 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-100">
                                                    <th className="py-3.5 px-6">Student Name</th>
                                                    <th className="py-3.5 px-4">Institute Name</th>
                                                    <th className="py-3.5 px-4 text-center">Total Notebooks</th>
                                                    <th className="py-3.5 px-4 text-center">Total Sections</th>
                                                    <th className="py-3.5 px-4 text-center">Total Notes</th>
                                                    <th className="py-3.5 px-4 text-center">Total Categories</th>
                                                    <th className="py-3.5 px-4 text-center">Reminders</th>
                                                    <th className="py-3.5 px-4 text-center">Upload Files</th>
                                                    <th className="py-3.5 px-4 text-center">Upload Images</th>
                                                    <th className="py-3.5 px-4 text-center">Pinned Content</th>
                                                    <th className="py-3.5 px-4 text-right">Total Storage</th>
                                                    <th className="py-3.5 px-4 text-right">Used Storage</th>
                                                    <th className="py-3.5 px-4 text-right">Remaining Storage</th>
                                                    <th className="py-3.5 px-4 text-right">Last Activity</th>
                                                    <th className="py-3.5 px-4 text-center">Trash Files</th>
                                                    <th className="py-3.5 px-4 text-center">Total Devices</th>
                                                    <th className="py-3.5 px-4 text-center">Status</th>
                                                    <th className="py-3.5 px-6 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                                                {currentEntries.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="18" className="text-center py-10 text-slate-400">No student records found.</td>
                                                    </tr>
                                                ) : (
                                                    currentEntries.map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="py-3.5 px-6 font-extrabold text-slate-850">{row.name}</td>
                                                            <td className="py-3.5 px-4 font-semibold text-slate-500">{row.instituteName}</td>
                                                            <td className="py-3.5 px-4 text-center text-slate-800">{row.notes.totalNotebooks || 0}</td>
                                                            <td className="py-3.5 px-4 text-center text-slate-800">{row.notes.totalSections || 0}</td>
                                                            <td className="py-3.5 px-4 text-center text-indigo-650 font-black">{row.notes.totalNotes || 0}</td>
                                                            <td className="py-3.5 px-4 text-center text-slate-800">{row.notes.totalCategories || 0}</td>
                                                            <td className="py-3.5 px-4 text-center text-amber-600 font-extrabold">{row.notes.remindersCount || 0}</td>
                                                            <td className="py-3.5 px-4 text-center text-blue-600 font-bold">{row.notes.attachedFilesCount || 0}</td>
                                                            <td className="py-3.5 px-4 text-center text-purple-600 font-bold">{row.notes.imagesCount || 0}</td>
                                                            <td className="py-3.5 px-4 text-center text-emerald-600 font-extrabold">{row.notes.pinnedCount || 0}</td>
                                                            <td className="py-3.5 px-4 text-right font-medium text-slate-400">{formatBytes(row.notes.totalStorage)}</td>
                                                            <td className="py-3.5 px-4 text-right font-black text-indigo-650">{formatBytes(row.notes.usedStorage)}</td>
                                                            <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600">{formatBytes(row.notes.remainingStorage)}</td>
                                                            <td className="py-3.5 px-4 text-right text-slate-400 font-semibold">{formatDate(row.notes.lastActivity)}</td>
                                                            <td className="py-3.5 px-4 text-center text-slate-400 font-medium">{row.notes.trashFiles}</td>
                                                            <td className="py-3.5 px-4 text-center text-slate-600">{row.notes.totalDevices}</td>
                                                            <td className="py-3.5 px-4 text-center">
                                                                {(() => {
                                                                    const enabled = row.user?.studentProfile?.controls?.toolsAccess?.notes !== false;
                                                                    return (
                                                                        <ToggleSwitch
                                                                            checked={enabled}
                                                                            onChange={() => handleToggleService(row)}
                                                                            disabled={togglingId === row.user?._id}
                                                                        />
                                                                    );
                                                                })()}
                                                            </td>
                                                            <td className="py-3.5 px-6 text-right">
                                                                <button
                                                                    onClick={() => handleEditAccess(row.user)}
                                                                    className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 text-[10px] font-black rounded-xl border border-indigo-100 transition-all cursor-pointer"
                                                                >
                                                                    Edit access & features
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </>
                                    )}

                                    {/* Tabs 4-7: Screenshot, ScreenRecording, AudioRecording, VideoRecording */}
                                    {['screenshot', 'screenRecorder', 'voiceRecorder', 'videoRecorder'].includes(activeTab) && (
                                        <>
                                            <thead>
                                                <tr className="bg-slate-50/70 text-slate-400 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-100">
                                                    <th className="py-3.5 px-6">Student Name</th>
                                                    <th className="py-3.5 px-4">Institute Name</th>
                                                    <th className="py-3.5 px-4 text-center">Total Files</th>
                                                    <th className="py-3.5 px-4 text-center">Total Folders</th>
                                                    <th className="py-3.5 px-4 text-right">Total Storage</th>
                                                    <th className="py-3.5 px-4 text-right">Used Storage</th>
                                                    <th className="py-3.5 px-4 text-right">Remaining Storage</th>
                                                    <th className="py-3.5 px-4 text-center">Total Uploads</th>
                                                    <th className="py-3.5 px-4 text-center">Total Downloads</th>
                                                    <th className="py-3.5 px-4 text-center">Total Shared Files</th>
                                                    <th className="py-3.5 px-4 text-right">Last Activity</th>
                                                    <th className="py-3.5 px-4 text-center">Trash Files</th>
                                                    <th className="py-3.5 px-4 text-center">Status</th>
                                                    <th className="py-3.5 px-6 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                                                {currentEntries.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="14" className="text-center py-10 text-slate-400">No student records found.</td>
                                                    </tr>
                                                ) : (
                                                    currentEntries.map((row, idx) => {
                                                        const tool = row[activeTab] || {
                                                            totalFiles: 0, totalFolders: 0, totalStorage: 5 * 1024 * 1024 * 1024,
                                                            usedStorage: 0, remainingStorage: 5 * 1024 * 1024 * 1024,
                                                            totalUploads: 0, totalDownloads: 0, totalSharedFiles: 0,
                                                            lastActivity: null, trashFiles: 0
                                                        };
                                                        return (
                                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="py-3.5 px-6 font-extrabold text-slate-850">{row.name}</td>
                                                                <td className="py-3.5 px-4 font-semibold text-slate-500">{row.instituteName}</td>
                                                                <td className="py-3.5 px-4 text-center">{tool.totalFiles}</td>
                                                                <td className="py-3.5 px-4 text-center text-slate-400 font-medium">{tool.totalFolders}</td>
                                                                <td className="py-3.5 px-4 text-right font-medium text-slate-400">{formatBytes(tool.totalStorage)}</td>
                                                                <td className="py-3.5 px-4 text-right font-black text-indigo-650">{formatBytes(tool.usedStorage)}</td>
                                                                <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600">{formatBytes(tool.remainingStorage)}</td>
                                                                <td className="py-3.5 px-4 text-center text-slate-600">{tool.totalUploads}</td>
                                                                <td className="py-3.5 px-4 text-center text-slate-400 font-medium">{tool.totalDownloads}</td>
                                                                <td className="py-3.5 px-4 text-center text-slate-400 font-medium">{tool.totalSharedFiles}</td>
                                                                <td className="py-3.5 px-4 text-right text-slate-400 font-semibold">{formatDate(tool.lastActivity)}</td>
                                                                <td className="py-3.5 px-4 text-center text-slate-400 font-medium">{tool.trashFiles}</td>
                                                                <td className="py-3.5 px-4 text-center">
                                                                    {(() => {
                                                                        const enabled = row.user?.studentProfile?.controls?.toolsAccess?.[activeTab] !== false;
                                                                        return (
                                                                            <ToggleSwitch
                                                                                checked={enabled}
                                                                                onChange={() => handleToggleService(row)}
                                                                                disabled={togglingId === row.user?._id}
                                                                            />
                                                                        );
                                                                    })()}
                                                                </td>
                                                                <td className="py-3.5 px-6 text-right">
                                                                    <button
                                                                        onClick={() => handleEditAccess(row.user)}
                                                                        className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 text-[10px] font-black rounded-xl border border-indigo-100 transition-all cursor-pointer"
                                                                    >
                                                                        Edit access & features
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </>
                                    )}

                                </table>
                            </div>

                            {/* Table Footer with Pagination */}
                            <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="text-xs font-semibold text-slate-400">
                                    Showing {filteredStudents.length > 0 ? indexOfFirstEntry + 1 : 0} to {Math.min(indexOfLastEntry, filteredStudents.length)} of {filteredStudents.length} entries
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Navigation Buttons exactly like mock */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center gap-2 select-none">
                                            {/* Previous button */}
                                            <button
                                                disabled={currentPage === 1}
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                className={`px-4 py-2 rounded-full border text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${currentPage === 1
                                                        ? 'bg-slate-50 border-slate-200 text-slate-400'
                                                        : 'bg-white hover:bg-slate-50 border-slate-250 text-slate-700'
                                                    }`}
                                            >
                                                Previous
                                            </button>

                                            {/* Page numbers and Ellipses */}
                                            <div className="flex items-center gap-1">
                                                {getPageNumbers().map((pageNum, idx) => {
                                                    if (pageNum === '...') {
                                                        return (
                                                            <span key={idx} className="w-8 h-8 text-slate-400 font-bold text-xs flex items-center justify-center">
                                                                ...
                                                            </span>
                                                        );
                                                    }

                                                    const isPageActive = currentPage === pageNum;
                                                    return (
                                                        <button
                                                            key={idx}
                                                            onClick={() => setCurrentPage(pageNum)}
                                                            className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${isPageActive
                                                                    ? 'bg-[#0b1329] text-white shadow-md shadow-black/10'
                                                                    : 'hover:bg-slate-100 text-slate-700'
                                                                }`}
                                                        >
                                                            {pageNum}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Next button */}
                                            <button
                                                disabled={currentPage === totalPages || totalPages === 0}
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                className={`px-4 py-2 rounded-full border text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${(currentPage === totalPages || totalPages === 0)
                                                        ? 'bg-slate-50 border-slate-200 text-slate-400'
                                                        : 'bg-white hover:bg-slate-50 border-slate-250 text-slate-700'
                                                    }`}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </>
                )}

            </div>

            {/* Reusable Edit Access & Controls Modal */}
            {isEditModalOpen && selectedUserToEdit && (
                <EditUserModal
                    user={selectedUserToEdit}
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedUserToEdit(null);
                    }}
                    onSuccess={() => {
                        setIsEditModalOpen(false);
                        setSelectedUserToEdit(null);
                        fetchAnalytics();
                    }}
                />
            )}
        </DashboardLayout>
    );
};

export default ToolsAnalyticsPage;
