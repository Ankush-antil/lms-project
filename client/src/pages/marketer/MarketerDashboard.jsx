import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { 
    Megaphone, MessageSquare, FolderOpen, FileText, Sparkles, 
    TrendingUp, Calendar, ArrowRight, UserCheck, AlertCircle, 
    ChevronRight, Activity, Search, Check, X, Clock, Trash2,
    Mail, Phone, Info
} from 'lucide-react';

const MarketerDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [activeSection, setActiveSection] = useState('overview'); // 'overview' | 'workspace'
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [updatingAppId, setUpdatingAppId] = useState(null);
    const [selectedApp, setSelectedApp] = useState(null); // for viewing detailed statement

    const getControlStatus = (key) => {
        const controls = user?.marketerProfile?.controls;
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

    const fetchApplications = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get('/api/setup/institute-applications');
            setApplications(data || []);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching applications for marketer:", error);
            toast.error("Failed to load leads/applications");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    const handleUpdateAppStatus = async (id, status) => {
        try {
            setUpdatingAppId(id);
            await axios.put(`/api/setup/applications/${id}/status`, { status });
            toast.success(`Lead status updated to ${status}`);
            setApplications(prev => prev.map(app => app._id === id ? { ...app, status } : app));
            if (selectedApp && selectedApp._id === id) {
                setSelectedApp(prev => ({ ...prev, status }));
            }
        } catch (err) {
            console.error("Error updating application status:", err);
            toast.error(err.response?.data?.message || "Failed to update status");
        } finally {
            setUpdatingAppId(null);
        }
    };

    const handleDeleteApplication = async (id) => {
        if (!window.confirm("Are you sure you want to delete this lead?")) return;
        try {
            setUpdatingAppId(id);
            await axios.delete(`/api/setup/applications/${id}`);
            toast.success("Lead deleted successfully");
            setApplications(prev => prev.filter(app => app._id !== id));
            if (selectedApp && selectedApp._id === id) {
                setSelectedApp(null);
            }
        } catch (err) {
            console.error("Error deleting application:", err);
            toast.error(err.response?.data?.message || "Failed to delete lead");
        } finally {
            setUpdatingAppId(null);
        }
    };

    // Calculate Stats from applications
    const totalLeads = applications.length;
    const pendingLeads = applications.filter(app => app.status === 'Applied' || app.status === 'Under Review').length;
    const activeDemos = applications.filter(app => app.status === 'Accepted').length;
    const registeredCount = applications.filter(app => app.status === 'Registered').length;

    // Filter Leads
    const filteredLeads = applications.filter(app => {
        const matchesSearch = 
            (app.guestName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (app.guestEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (app.guestPhone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (app.course?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Registered':
                return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'Accepted': // Active Demo
                return 'bg-indigo-50 text-indigo-600 border-indigo-100';
            case 'Under Review':
                return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'Applied':
                return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'Rejected':
                return 'bg-rose-50 text-rose-600 border-rose-100';
            default:
                return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    return (
        <DashboardLayout role="Marketer">
            {/* Premium Workspace Banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-slate-900 to-slate-900 rounded-[30px] p-8 md:p-10 text-white mb-8 border border-white/5 shadow-2xl">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-slate-500/15 rounded-full blur-3xl -mb-20"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold uppercase tracking-wider mb-3 backdrop-blur-md border border-indigo-500/10">
                            <Sparkles size={12} /> Marketer Workspace
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Marketing & Leads Desk</h1>
                        <p className="text-slate-300 mt-2 max-w-xl text-sm md:text-base">
                            Track enrollment leads, coordinate demos, view marketing assets in drive, take notes, and interact with the team.
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 mb-8 gap-4 overflow-x-auto custom-scrollbar whitespace-nowrap">
                <button
                    onClick={() => setActiveSection('overview')}
                    className={`pb-4 px-2 text-sm font-extrabold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                        activeSection === 'overview'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <Activity size={18} /> Leads & Overview
                </button>
                <button
                    onClick={() => setActiveSection('workspace')}
                    className={`pb-4 px-2 text-sm font-extrabold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                        activeSection === 'workspace'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                >
                    <FolderOpen size={18} /> Workspace Tools
                </button>
            </div>

            {/* Content Switcher */}
            {loading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold">Loading marketing workspace...</p>
                </div>
            ) : activeSection === 'overview' ? (
                /* LEADS & OVERVIEW TAB */
                <div className="space-y-8 animate-fade-in text-left">
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                                <Megaphone size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Leads</p>
                                <h3 className="text-xl font-extrabold text-slate-800 mt-1">{totalLeads}</h3>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pending Review</p>
                                <h3 className="text-xl font-extrabold text-slate-800 mt-1">{pendingLeads}</h3>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                                <UserCheck size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Demos</p>
                                <h3 className="text-xl font-extrabold text-slate-800 mt-1">{activeDemos}</h3>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Registered</p>
                                <h3 className="text-xl font-extrabold text-slate-800 mt-1">{registeredCount}</h3>
                            </div>
                        </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-850">Lead & Inquiry Database</h3>
                                <p className="text-xs text-slate-450 mt-0.5">Manage and track your registration and demo applications</p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                                {/* Search input */}
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input 
                                        type="text"
                                        placeholder="Search leads..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="bg-slate-50 border border-slate-150 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all outline-none min-w-[200px]"
                                    />
                                </div>

                                {/* Status filter */}
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="bg-slate-50 border border-slate-150 rounded-2xl py-2.5 px-4 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all outline-none cursor-pointer appearance-none pr-8 relative"
                                    style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em', backgroundRepeat: 'no-repeat' }}
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Applied">Applied</option>
                                    <option value="Under Review">Under Review</option>
                                    <option value="Accepted">Accepted (Active Demo)</option>
                                    <option value="Rejected">Rejected</option>
                                    <option value="Registered">Registered</option>
                                </select>
                            </div>
                        </div>

                        {/* Leads Table */}
                        {filteredLeads.length === 0 ? (
                            <div className="text-center py-16 text-slate-400 font-semibold text-sm">
                                No leads match your filters.
                            </div>
                        ) : (
                            <div className="responsive-table-wrapper rounded-2xl border border-slate-100 overflow-hidden">
                                <table className="min-w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                            <th className="p-4 font-semibold">Applicant Details</th>
                                            <th className="p-4 font-semibold">Course Preference</th>
                                            <th className="p-4 font-semibold">Date Received</th>
                                            <th className="p-4 font-semibold">Statement</th>
                                            <th className="p-4 font-semibold text-center">Status</th>
                                            <th className="p-4 font-semibold text-right">Quick Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-semibold">
                                        {filteredLeads.map((app) => (
                                            <tr key={app._id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800 text-sm">{app.guestName}</span>
                                                        <span className="text-slate-400 text-[10px] font-semibold mt-0.5 flex items-center gap-1"><Phone size={10} /> {app.guestPhone}</span>
                                                        {app.guestEmail && (
                                                            <span className="text-slate-455 text-[10px] font-mono mt-0.5 flex items-center gap-1"><Mail size={10} /> {app.guestEmail}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <span className="font-bold text-slate-700">{app.course?.name || 'General Inquiry'}</span>
                                                </td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <span className="text-slate-500 font-medium text-xs">
                                                        {new Date(app.createdAt).toLocaleDateString(undefined, {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </span>
                                                </td>
                                                <td className="p-4 max-w-[200px] truncate" title={app.statement}>
                                                    {app.statement ? (
                                                        <button 
                                                            onClick={() => setSelectedApp(app)}
                                                            className="text-indigo-650 hover:underline text-left font-medium truncate block max-w-full"
                                                        >
                                                            {app.statement}
                                                        </button>
                                                    ) : (
                                                        <span className="italic text-slate-300">No Statement</span>
                                                    )}
                                                </td>
                                                <td className="p-4 whitespace-nowrap text-center">
                                                    <span className={`px-3 py-1 border rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusBadgeClass(app.status)}`}>
                                                        {app.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right whitespace-nowrap">
                                                    <div className="flex justify-end gap-1.5">
                                                        {app.status !== 'Registered' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleUpdateAppStatus(app._id, 'Accepted')}
                                                                    disabled={updatingAppId === app._id || app.status === 'Accepted'}
                                                                    className={`p-1.5 rounded-lg border text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100 hover:text-indigo-700 transition-all cursor-pointer ${app.status === 'Accepted' ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                                    title="Accept / Set Active Demo"
                                                                >
                                                                    <Check size={14} className="stroke-[3px]" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUpdateAppStatus(app._id, 'Under Review')}
                                                                    disabled={updatingAppId === app._id || app.status === 'Under Review'}
                                                                    className={`p-1.5 rounded-lg border text-amber-600 bg-amber-50 border-amber-100 hover:bg-amber-100 hover:text-amber-700 transition-all cursor-pointer ${app.status === 'Under Review' ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                                    title="Put Under Review"
                                                                >
                                                                    <Clock size={14} className="stroke-[3px]" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUpdateAppStatus(app._id, 'Rejected')}
                                                                    disabled={updatingAppId === app._id || app.status === 'Rejected'}
                                                                    className={`p-1.5 rounded-lg border text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-100 hover:text-rose-700 transition-all cursor-pointer ${app.status === 'Rejected' ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                                    title="Reject"
                                                                >
                                                                    <X size={14} className="stroke-[3px]" />
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteApplication(app._id)}
                                                            disabled={updatingAppId === app._id}
                                                            className="p-1.5 rounded-lg border text-slate-400 bg-slate-50 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all cursor-pointer"
                                                            title="Delete Lead"
                                                        >
                                                            <Trash2 size={14} className="stroke-[2.5px]" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* WORKSPACE TOOLS TAB */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in text-left">
                    {/* Tool 1: Drive Storage */}
                    {!(getControlStatus('drive').enabled === false && getControlStatus('drive').mode === 'hide') && (
                        <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between group hover:shadow-xl transition-all duration-300 relative overflow-hidden min-h-[220px] ${getControlStatus('drive').enabled === false ? 'opacity-60' : ''}`}>
                            <div className="absolute top-0 left-0 w-2 h-full bg-purple-500"></div>
                            <div>
                                <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                    <FolderOpen size={24} />
                                </div>
                                <h4 className="font-extrabold text-slate-800 text-lg mb-2">Marketing Drive Storage</h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                    Access digital flyers, brochures, presentation slides, curriculum sheets, and other marketing collaterals.
                                </p>
                            </div>
                            <button
                                onClick={() => handleFeatureClick('drive', '/marketer/drive')}
                                className="text-xs text-purple-600 font-extrabold flex items-center gap-1 hover:underline pt-4 mt-2 cursor-pointer w-fit"
                            >
                                Open Drive {getControlStatus('drive').enabled === false ? '(Disabled)' : ''} <ArrowRight size={14} />
                            </button>
                        </div>
                    )}

                    {/* Tool 2: Personal Notes */}
                    {!(getControlStatus('notes').enabled === false && getControlStatus('notes').mode === 'hide') && (
                        <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between group hover:shadow-xl transition-all duration-300 relative overflow-hidden min-h-[220px] ${getControlStatus('notes').enabled === false ? 'opacity-60' : ''}`}>
                            <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                            <div>
                                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                    <FileText size={24} />
                                </div>
                                <h4 className="font-extrabold text-slate-800 text-lg mb-2">Quick Reminders & Notes</h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                    Keep trace of follow-up reminders, lead contact notes, campaign details, or pitch drafts.
                                </p>
                            </div>
                            <button
                                onClick={() => handleFeatureClick('notes', '/marketer/notes')}
                                className="text-xs text-emerald-600 font-extrabold flex items-center gap-1 hover:underline pt-4 mt-2 cursor-pointer w-fit"
                            >
                                Open Notes {getControlStatus('notes').enabled === false ? '(Disabled)' : ''} <ArrowRight size={14} />
                            </button>
                        </div>
                    )}

                    {/* Tool 3: Team Chat Portal */}
                    {!(getControlStatus('chat').enabled === false && getControlStatus('chat').mode === 'hide') && (
                        <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between group hover:shadow-xl transition-all duration-300 relative overflow-hidden min-h-[220px] ${getControlStatus('chat').enabled === false ? 'opacity-60' : ''}`}>
                            <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                            <div>
                                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                    <MessageSquare size={24} />
                                </div>
                                <h4 className="font-extrabold text-slate-800 text-lg mb-2">Internal Chat Room</h4>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                    Coordinate directly with the admissions office, institute administrators, or teachers regarding demo classes.
                                </p>
                            </div>
                            <button
                                onClick={() => handleFeatureClick('chat', '/marketer/chat')}
                                className="text-xs text-blue-600 font-extrabold flex items-center gap-1 hover:underline pt-4 mt-2 cursor-pointer w-fit"
                            >
                                Open Chat {getControlStatus('chat').enabled === false ? '(Disabled)' : ''} <ArrowRight size={14} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Details Modal */}
            {selectedApp && (
                <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col animate-slide-up text-left">
                        <div className="bg-[#0b1329] text-white p-6 flex justify-between items-center">
                            <h3 className="font-extrabold text-lg flex items-center gap-2">
                                <Info size={20} className="text-indigo-400" /> Lead Inquiry Details
                            </h3>
                            <button 
                                onClick={() => setSelectedApp(null)}
                                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Applicant Name</span>
                                <p className="text-sm font-bold text-slate-800 bg-slate-50 py-2.5 px-4 rounded-2xl">{selectedApp.guestName}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Phone Number</span>
                                    <p className="text-sm font-bold text-slate-800 bg-slate-50 py-2.5 px-4 rounded-2xl">{selectedApp.guestPhone}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Email Address</span>
                                    <p className="text-sm font-bold text-slate-850 bg-slate-50 py-2.5 px-4 rounded-2xl truncate" title={selectedApp.guestEmail}>{selectedApp.guestEmail || 'N/A'}</p>
                                </div>
                            </div>

                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Course Applied</span>
                                <p className="text-sm font-bold text-slate-800 bg-slate-50 py-2.5 px-4 rounded-2xl">{selectedApp.course?.name || 'General Inquiry'}</p>
                            </div>

                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Statement of Purpose / Message</span>
                                <p className="text-xs font-semibold text-slate-700 bg-indigo-50/30 border border-indigo-50/50 p-4 rounded-2xl max-h-[160px] overflow-y-auto leading-relaxed custom-scrollbar whitespace-pre-wrap">
                                    {selectedApp.statement || 'No statement provided by the applicant.'}
                                </p>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50/50">
                            {selectedApp.status !== 'Registered' && (
                                <>
                                    <button
                                        onClick={() => handleUpdateAppStatus(selectedApp._id, 'Accepted')}
                                        disabled={updatingAppId === selectedApp._id || selectedApp.status === 'Accepted'}
                                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all disabled:opacity-50 cursor-pointer text-xs flex items-center justify-center gap-1.5"
                                    >
                                        <Check size={14} strokeWidth={3} /> Accept / Active Demo
                                    </button>
                                    <button
                                        onClick={() => handleUpdateAppStatus(selectedApp._id, 'Rejected')}
                                        disabled={updatingAppId === selectedApp._id || selectedApp.status === 'Rejected'}
                                        className="px-4 py-3 border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 text-slate-650 font-bold rounded-2xl transition-all disabled:opacity-50 cursor-pointer text-xs flex items-center justify-center gap-1.5"
                                    >
                                        <X size={14} strokeWidth={3} /> Reject
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => setSelectedApp(null)}
                                className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-2xl transition-all cursor-pointer text-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default MarketerDashboard;
