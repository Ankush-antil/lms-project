import { useAuth } from '../../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
    Users, GraduationCap, BookOpen, FileText, Inbox, RefreshCw, CheckCircle,
    XCircle, Clock, ExternalLink, ShieldAlert, Award, ArrowRight, Check, X, Trash2,
    Plus, Edit, Building2, Briefcase, Calculator, Megaphone, Heart, FolderOpen, Settings, UserX
} from 'lucide-react';
import toast from 'react-hot-toast';
import AddUserModal from '../../components/AddUserModal';
import AddCourseModal from '../../components/AddCourseModal';

const StatCard = ({ title, value, icon: Icon, color, onClick, onAdd, onEdit }) => (
    <div
        onClick={onClick}
        className={`bg-white p-3.5 md:p-4.5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 group relative overflow-hidden h-full ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
    >
        <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-[0.03] -mr-12 -mt-12 rounded-full transition-transform group-hover:scale-150 duration-700`}></div>
        <div className="flex items-center justify-between mb-3 relative z-10">
            <div className={`p-2.5 rounded-xl ${color} bg-opacity-10 text-white shadow-sm transition-transform group-hover:scale-110 duration-500`}>
                <Icon size={18} className={color.replace('bg-', 'text-')} />
            </div>
            {(onAdd || onEdit) && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    {onAdd && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAdd(); }}
                            className="p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white transition-all duration-200 cursor-pointer shadow-sm"
                            title={`Add ${title}`}
                        >
                            <Plus size={13} />
                        </button>
                    )}
                    {onEdit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                            className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-700 text-slate-500 hover:text-white transition-all duration-200 cursor-pointer shadow-sm"
                            title={`Manage ${title}`}
                        >
                            <Edit size={13} />
                        </button>
                    )}
                </div>
            )}
            {(!onAdd && !onEdit) && (
                <span className="text-[9px] font-extrabold text-emerald-500 bg-emerald-50/70 px-2 py-0.5 rounded-full tracking-wide">
                    Live
                </span>
            )}
        </div>
        <div className="relative z-10">
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-0.5">{value}</h3>
            <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wider opacity-85 leading-tight">{title}</p>
        </div>
    </div>
);

const InstituteDashboard = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        students: 0, teachers: 0, editors: 0, staff: 0, accountants: 0,
        marketers: 0, parents: 0, registeredUsers: 0, guestUsers: 0,
        limitedUsers: 0, totalUsers: 0, courses: 0, subjects: 0, tests: 0, services: 3,
        pendingApps: 0, totalApps: 0
    });
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'applications'
    const [instituteDetails, setInstituteDetails] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);
    const [roleRequests, setRoleRequests] = useState([]);
    const [loadingRoleRequests, setLoadingRoleRequests] = useState(false);
    const [resolvingRoleId, setResolvingRoleId] = useState(null);

    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [modalRole, setModalRole] = useState('Student');
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [quickAddRole, setQuickAddRole] = useState(null);

    const rolesList = [
        { label: 'Student', modal: 'user', role: 'Student', icon: GraduationCap },
        { label: 'Teacher', modal: 'user', role: 'Teacher', icon: CheckCircle },
        { label: 'Editor', modal: 'user', role: 'Editor', icon: Edit },
        { label: 'Staff', modal: 'user', role: 'Staff', icon: Briefcase },
        { label: 'Accountant', modal: 'user', role: 'Accountant', icon: Calculator },
        { label: 'Marketer', modal: 'user', role: 'Marketer', icon: Megaphone },
        { label: 'Parent', modal: 'user', role: 'Parent', icon: Heart },
        { label: 'Limited User', modal: 'limited', role: 'Limited User', icon: UserX }
    ];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleRoleClick = (item) => {
        setIsDropdownOpen(false);
        if (item.role === 'Limited User') {
            toast('Limited Users are created automatically when candidates submit a public test. Share a public test link to register them.', {
                icon: 'ℹ️',
                duration: 6000
            });
            navigate('/institute/activities');
        } else {
            setModalRole(item.role);
            setQuickAddRole(item.role);
            setIsUserModalOpen(true);
        }
    };

    const fetchRoleRequests = async () => {
        try {
            setLoadingRoleRequests(true);
            const { data } = await axios.get('/api/registration-requests/institute');
            setRoleRequests(data);
            setLoadingRoleRequests(false);
        } catch (err) {
            console.error("Error fetching staff requests:", err);
            toast.error("Failed to load staff requests");
            setLoadingRoleRequests(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'role-requests') {
            fetchRoleRequests();
        }
    }, [activeTab]);

    const handleResolveRoleRequest = async (id, status) => {
        if (!window.confirm(`Are you sure you want to ${status.toLowerCase()} this staff request?`)) return;
        try {
            setResolvingRoleId(id);
            await axios.put(`/api/registration-requests/${id}/institute-resolve`, { status });
            toast.success(`Request ${status.toLowerCase()} successfully`);
            setRoleRequests(prev => prev.filter(r => r._id !== id));
            fetchDashboardData();
        } catch (err) {
            console.error("Error resolving request:", err);
            toast.error(err.response?.data?.message || "Failed to resolve request");
        } finally {
            setResolvingRoleId(null);
        }
    };

    const handleToggleFlag = async (flagName) => {
        try {
            const instId = instituteDetails?._id || userInfo?.institute?._id || userInfo?.institute;
            if (!instId) return;
            const { data } = await axios.patch(`/api/setup/institutes/${instId}/toggle`, { flag: flagName });
            setInstituteDetails(prev => ({
                ...prev,
                [flagName]: data.value
            }));
            const label = flagName === 'admissionOpen' ? 'Student Admissions' : flagName === 'teacherHiring' ? 'Teacher Hiring' : 'Editor Hiring';
            toast.success(`${label} status updated successfully`);
        } catch (error) {
            console.error("Error toggling institute flag:", error);
            toast.error(error.response?.data?.message || "Failed to update toggle status");
        }
    };

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            const instId = userInfo?.institute?._id || userInfo?.institute;

            // Parallel fetches for efficiency
            const [
                studentsRes, teachersRes, editorsRes, staffRes, accountantsRes,
                marketersRes, parentsRes, coursesRes, subjectsRes, testsRes,
                appsRes, submissionsRes, instRes
            ] = await Promise.all([
                axios.get('/api/users?role=Student'),
                axios.get('/api/users?role=Teacher'),
                axios.get('/api/users?role=Editor'),
                axios.get('/api/users?role=Staff'),
                axios.get('/api/users?role=Accountant'),
                axios.get('/api/users?role=Marketer'),
                axios.get('/api/users?role=Parent'),
                axios.get('/api/setup/courses?status=active'),
                axios.get('/api/setup/subjects'),
                axios.get('/api/tests'),
                axios.get('/api/setup/institute-applications'),
                axios.get('/api/submissions').catch(() => ({ data: [] })),
                instId ? axios.get(`/api/setup/institutes/${instId}`) : Promise.resolve(null)
            ]);

            const apps = appsRes.data || [];
            const pendingAppsCount = apps.filter(app => app.status === 'Applied' || app.status === 'Under Review').length;

            const studentsCount = studentsRes.data?.length || 0;
            const teachersCount = teachersRes.data?.length || 0;
            const editorsCount = editorsRes.data?.length || 0;
            const staffCount = staffRes.data?.length || 0;
            const accountantsCount = accountantsRes.data?.length || 0;
            const marketersCount = marketersRes.data?.length || 0;
            const parentsCount = parentsRes.data?.length || 0;

            const registeredCount = studentsCount + teachersCount + editorsCount + staffCount + accountantsCount + marketersCount + parentsCount;
            const guestCount = apps.length;

            // Extract unique candidate emails from submissions
            const uniqueLimitedEmails = new Set(
                (submissionsRes.data || [])
                    .filter(sub => sub.candidateEmail || sub.email)
                    .map(sub => sub.candidateEmail || sub.email)
            );
            const limitedCount = uniqueLimitedEmails.size;

            const totalUsersCount = registeredCount + guestCount + limitedCount;

            // Unique subjects count
            const courseList = coursesRes.data || [];
            const uniqueSubjects = new Set();
            courseList.forEach(c => {
                if (c.subjects && Array.isArray(c.subjects)) {
                    c.subjects.forEach(s => {
                        if (s) uniqueSubjects.add(s.trim());
                    });
                }
            });

            setStats({
                students: studentsCount,
                teachers: teachersCount,
                editors: editorsCount,
                staff: staffCount,
                accountants: accountantsCount,
                marketers: marketersCount,
                parents: parentsCount,
                registeredUsers: registeredCount,
                guestUsers: guestCount,
                limitedUsers: limitedCount,
                totalUsers: totalUsersCount,
                courses: courseList.length,
                subjects: uniqueSubjects.size || (subjectsRes.data?.length || 0),
                tests: testsRes.data?.length || 0,
                services: 3,
                pendingApps: pendingAppsCount,
                totalApps: apps.length
            });
            setApplications(apps);
            if (instRes && instRes.data) {
                setInstituteDetails(instRes.data);
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            toast.error("Failed to load dashboard statistics");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleUpdateStatus = async (appId, newStatus) => {
        try {
            setUpdatingId(appId);
            const { data } = await axios.put(`/api/setup/applications/${appId}/status`, { status: newStatus });

            toast.success(`Application status updated to ${newStatus}`);

            // Update local state
            setApplications(prev => prev.map(app => app._id === appId ? { ...app, status: newStatus } : app));

            // Recompute stats
            setStats(prev => {
                const updatedApps = applications.map(app => app._id === appId ? { ...app, status: newStatus } : app);
                const pendingCount = updatedApps.filter(app => app.status === 'Applied' || app.status === 'Under Review').length;
                return {
                    ...prev,
                    pendingApps: pendingCount
                };
            });
        } catch (error) {
            console.error("Error updating application status:", error);
            toast.error(error.response?.data?.message || "Failed to update application status");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleToggleUserStatus = async (appId, userId, currentIsActive) => {
        try {
            const nextActive = currentIsActive === false ? true : false;
            await axios.put(`/api/users/${userId}`, { isActive: nextActive });

            // Update local state
            setApplications(prev => prev.map(app => {
                if (app._id === appId && app.user) {
                    return { ...app, user: { ...app.user, isActive: nextActive } };
                }
                return app;
            }));

            toast.success(`Account ${nextActive ? 'activated' : 'deactivated'} successfully`);
        } catch (error) {
            console.error("Error toggling user status:", error);
            toast.error(error.response?.data?.message || 'Error updating status');
        }
    };

    const handleDeleteApplication = async (appId) => {
        if (window.confirm("Are you sure you want to delete this application and its associated user account?")) {
            try {
                setUpdatingId(appId);
                await axios.delete(`/api/setup/applications/${appId}`);
                toast.success("Application and account deleted successfully");

                // Update state
                setApplications(prev => prev.filter(app => app._id !== appId));
                setStats(prev => ({
                    ...prev,
                    totalApps: Math.max(0, prev.totalApps - 1)
                }));
            } catch (error) {
                console.error("Error deleting application:", error);
                toast.error(error.response?.data?.message || "Failed to delete application");
            } finally {
                setUpdatingId(null);
            }
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Accepted':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'Rejected':
                return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'Under Review':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            default:
                return 'bg-blue-50 text-blue-700 border-blue-200';
        }
    };

    return (
        <DashboardLayout role="Institute">
            {/* Header section with actions */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                            <span>{userInfo?.institute?.name || 'Institute Portal'}</span>
                            <span className="text-xs bg-[#0b1329] text-white px-2.5 py-0.5 rounded-full font-bold uppercase">Institute Admin</span>
                        </h1>
                        <p className="text-slate-500 mt-1 text-sm">Manage users, courses, tests, and guest enrollment requests.</p>
                    </div>
                    <div className="relative w-full sm:w-auto flex justify-end" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="px-5 py-2.5 bg-[#0b1329] text-white rounded-2xl hover:bg-[#152244] hover:shadow-lg transition-all font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#0b1329]/15 active:scale-95 w-full sm:w-auto z-25 cursor-pointer"
                        >
                            <Plus size={16} /> Add User
                        </button>
                        {isDropdownOpen && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden py-1.5 transition-all duration-300">
                                {rolesList.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.label}
                                            onClick={() => handleRoleClick(item)}
                                            className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2.5 cursor-pointer"
                                        >
                                            <Icon size={15} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Tab Switcher — scrollable on mobile */}
                <div className="overflow-x-auto -mx-1 px-1">
                    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 w-full sm:w-auto sm:inline-flex min-w-max">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`flex-1 sm:flex-none px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${activeTab === 'overview' ? 'bg-[#0b1329] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Overview
                        </button>
                        {user?.institute?.controls?.dashboard?.application !== false && (
                            <button
                                onClick={() => setActiveTab('applications')}
                                className={`flex-1 sm:flex-none px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'applications' ? 'bg-[#0b1329] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Applications
                                {stats.pendingApps > 0 && (
                                    <span className="bg-rose-500 text-white text-[9px] font-extrabold h-4 px-1.5 rounded-full flex items-center justify-center animate-pulse">
                                        {stats.pendingApps}
                                    </span>
                                )}
                            </button>
                        )}
                        {user?.institute?.controls?.dashboard?.staffRequest !== false && (
                            <button
                                onClick={() => setActiveTab('role-requests')}
                                className={`flex-1 sm:flex-none px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'role-requests' ? 'bg-[#0b1329] text-white shadow-md' : 'text-slate-650 hover:text-slate-900'}`}
                            >
                                Staff Requests
                                {roleRequests.length > 0 && (
                                    <span className="bg-rose-500 text-white text-[9px] font-extrabold h-4 px-1.5 rounded-full flex items-center justify-center animate-pulse">
                                        {roleRequests.length}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-40">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b1329]"></div>
                </div>
            ) : (
                <>
                    {activeTab === 'overview' ? (
                        /* OVERVIEW TAB */
                        <div className="space-y-8 animate-fade-in">
                            {/* Stats Cards Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 select-none">
                                <StatCard
                                    title="Total User" value={stats.totalUsers || 0} icon={Users} color="bg-indigo-600 text-indigo-600"
                                />
                                <StatCard
                                    title="Registered User" value={stats.registeredUsers || 0} icon={Users} color="bg-indigo-600 text-indigo-600"
                                />
                                <StatCard title="Guest User" value={stats.guestUsers || 0} icon={Users} color="bg-indigo-600 text-indigo-600" />
                                <StatCard title="Limited User" value={stats.limitedUsers || 0} icon={Users} color="bg-indigo-600 text-indigo-600" />
                                <StatCard
                                    title="Student" value={stats.students || 0} icon={GraduationCap} color="bg-blue-500 text-blue-500"
                                    onClick={() => navigate('/institute/students')}
                                    onAdd={() => { setQuickAddRole('Student'); setIsUserModalOpen(true); }}
                                    onEdit={() => navigate('/institute/students')}
                                />
                                <StatCard
                                    title="Teacher" value={stats.teachers || 0} icon={CheckCircle} color="bg-emerald-500 text-emerald-500"
                                    onClick={() => navigate('/institute/teachers')}
                                    onAdd={() => { setQuickAddRole('Teacher'); setIsUserModalOpen(true); }}
                                    onEdit={() => navigate('/institute/teachers')}
                                />
                                <StatCard
                                    title="Editor" value={stats.editors || 0} icon={Edit} color="bg-pink-500 text-pink-500"
                                    onClick={() => navigate('/institute/editors')}
                                    onAdd={() => { setQuickAddRole('Editor'); setIsUserModalOpen(true); }}
                                    onEdit={() => navigate('/institute/editors')}
                                />
                                <StatCard
                                    title="Staff" value={stats.staff || 0} icon={Briefcase} color="bg-cyan-600 text-cyan-600"
                                    onClick={() => navigate('/institute/staff')}
                                    onAdd={() => { setQuickAddRole('Staff'); setIsUserModalOpen(true); }}
                                    onEdit={() => navigate('/institute/staff')}
                                />
                                <StatCard
                                    title="Accountants" value={stats.accountants || 0} icon={Calculator} color="bg-teal-600 text-teal-600"
                                    onClick={() => navigate('/institute/accountants')}
                                    onAdd={() => { setQuickAddRole('Accountant'); setIsUserModalOpen(true); }}
                                    onEdit={() => navigate('/institute/accountants')}
                                />
                                <StatCard
                                    title="Marketers" value={stats.marketers || 0} icon={Megaphone} color="bg-yellow-500 text-yellow-500"
                                    onClick={() => navigate('/institute/marketers')}
                                    onAdd={() => { setQuickAddRole('Marketer'); setIsUserModalOpen(true); }}
                                    onEdit={() => navigate('/institute/marketers')}
                                />
                                <StatCard
                                    title="Parents" value={stats.parents || 0} icon={Heart} color="bg-rose-400 text-rose-400"
                                    onClick={() => navigate('/institute/parents')}
                                    onAdd={() => { setQuickAddRole('Parent'); setIsUserModalOpen(true); }}
                                    onEdit={() => navigate('/institute/parents')}
                                />

                                <StatCard title="Courses" value={stats.courses || 0} icon={BookOpen} color="bg-sky-500 text-sky-500"
                                    onClick={() => navigate('/institute/courses')}
                                    onAdd={() => setIsCourseModalOpen(true)}
                                    onEdit={() => navigate('/institute/courses')}
                                />
                                <StatCard title="Subjects" value={stats.subjects || 0} icon={FolderOpen} color="bg-violet-500 text-violet-500" onClick={() => navigate('/institute/subjects')} />
                                <StatCard title="Activities" value={stats.tests || 0} icon={FileText} color="bg-purple-500 text-purple-500" onClick={() => navigate('/institute/activities')} />
                                <StatCard title="Services" value={stats.services || 0} icon={Settings} color="bg-lime-600 text-lime-600" onClick={() => navigate('/institute/tools')} />
                            </div>

                        </div>
                    ) : activeTab === 'applications' ? (
                        /* APPLICATIONS TAB */
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Inbox size={20} className="text-[#0b1329]" />
                                    <span>Course Applications</span>
                                </h3>
                                <button
                                    onClick={fetchDashboardData}
                                    className="p-2 text-slate-500 hover:text-[#0b1329] hover:bg-slate-100 rounded-full transition-all"
                                    title="Refresh Data"
                                >
                                    <RefreshCw size={16} />
                                </button>
                            </div>

                            {applications.length === 0 ? (
                                <div className="text-center py-24 select-none">
                                    <Inbox size={48} className="mx-auto text-slate-300 mb-4" />
                                    <h4 className="text-slate-700 font-bold text-lg">No Applications Found</h4>
                                    <p className="text-slate-400 text-xs mt-1">Guest users applying for your courses on the landing page will appear here.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left border-collapse text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-extrabold">
                                                <th className="p-5">Applicant Details</th>
                                                <th className="p-5">Applied Course</th>
                                                <th className="p-5">Role</th>
                                                <th className="p-5">Date</th>
                                                <th className="p-5">Statement</th>
                                                <th className="p-5 text-center">ID Status</th>
                                                <th className="p-5 text-center">Status</th>
                                                <th className="p-5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {applications.map((app) => (
                                                <tr key={app._id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="p-5 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="font-extrabold text-slate-800 text-sm">{app.guestName}</span>
                                                            <span className="text-slate-400 text-xs mt-0.5">{app.guestPhone}</span>
                                                            {app.guestEmail && (
                                                                <span className="text-slate-400 text-[10px] font-mono mt-0.5">{app.guestEmail}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-5 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-slate-700">{app.course?.name || 'Unknown Course'}</span>
                                                            <span className="text-slate-400 text-xs mt-0.5">{app.course?.code || 'N/A'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-5 whitespace-nowrap">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${app.role === 'Teacher'
                                                            ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                                                            }`}>
                                                            {app.role || 'Student'}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 whitespace-nowrap">
                                                        <span className="text-slate-500 font-medium text-xs">
                                                            {new Date(app.createdAt).toLocaleDateString(undefined, {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric'
                                                            })}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 max-w-[200px]">
                                                        <p className="text-slate-500 text-xs truncate group-hover:whitespace-normal group-hover:text-slate-700 transition-all duration-300" title={app.statement}>
                                                            {app.statement || <span className="italic text-slate-350">No statement provided</span>}
                                                        </p>
                                                    </td>
                                                    <td className="p-5 whitespace-nowrap text-center">
                                                        {app.user ? (
                                                            <button
                                                                onClick={() => handleToggleUserStatus(app._id, app.user._id, app.user.isActive)}
                                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${app.user.isActive !== false ? 'bg-emerald-500' : 'bg-slate-200'
                                                                    }`}
                                                                title={app.user.isActive !== false ? 'Click to Deactivate Account' : 'Click to Activate Account'}
                                                            >
                                                                <span
                                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${app.user.isActive !== false ? 'translate-x-6' : 'translate-x-1'
                                                                        }`}
                                                                />
                                                            </button>
                                                        ) : (
                                                            <span className="text-slate-300 text-xs select-none font-bold">—</span>
                                                        )}
                                                    </td>
                                                    <td className="p-5 whitespace-nowrap text-center">
                                                        <span className={`px-3 py-1 border rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusBadgeClass(app.status)}`}>
                                                            {app.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-right whitespace-nowrap">
                                                        <div className="flex justify-end gap-1.5">
                                                            <button
                                                                onClick={() => handleUpdateStatus(app._id, 'Accepted')}
                                                                disabled={updatingId === app._id || app.status === 'Accepted'}
                                                                className={`p-1.5 rounded-lg border text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100 hover:text-emerald-700 transition-all ${app.status === 'Accepted' ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                                title="Accept Application"
                                                            >
                                                                <Check size={14} className="stroke-[3px]" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateStatus(app._id, 'Under Review')}
                                                                disabled={updatingId === app._id || app.status === 'Under Review' || app.status === 'Accepted'}
                                                                className={`p-1.5 rounded-lg border text-amber-600 bg-amber-50 border-amber-100 hover:bg-amber-100 hover:text-amber-700 transition-all ${(app.status === 'Under Review' || app.status === 'Accepted') ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                                title="Put Under Review"
                                                            >
                                                                <Clock size={14} className="stroke-[3px]" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateStatus(app._id, 'Rejected')}
                                                                disabled={updatingId === app._id || app.status === 'Rejected' || app.status === 'Accepted'}
                                                                className={`p-1.5 rounded-lg border text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-100 hover:text-rose-700 transition-all ${(app.status === 'Rejected' || app.status === 'Accepted') ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                                title="Reject Application"
                                                            >
                                                                <X size={14} className="stroke-[3px]" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteApplication(app._id)}
                                                                disabled={updatingId === app._id}
                                                                className="p-1.5 rounded-lg border text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100 hover:text-slate-700 transition-all"
                                                                title="Delete Application"
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
                    ) : (
                        /* STAFF REQUESTS TAB */
                        <div className="space-y-8 animate-fade-in text-left">
                            {/* Teacher Requests */}
                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-lg font-extrabold text-slate-850">Teacher Joining Requests</h2>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Approve requests for subject teachers</p>
                                    </div>
                                    <span className="bg-indigo-50 text-indigo-705 px-3 py-1 rounded-full text-xs font-bold font-mono">
                                        Total: {roleRequests.filter(r => r.role === 'Teacher').length}
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border border-slate-200 text-slate-550 text-[10px] font-bold uppercase tracking-wider">
                                                <th className="p-4 font-semibold whitespace-nowrap">Name</th>
                                                <th className="p-4 font-semibold whitespace-nowrap">Email</th>
                                                <th className="p-4 font-semibold whitespace-nowrap">Phone</th>
                                                <th className="p-4 font-semibold whitespace-nowrap">Subject Specializations</th>
                                                <th className="p-4 font-semibold text-right whitespace-nowrap">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                                            {loadingRoleRequests ? (
                                                <tr>
                                                    <td colSpan="5" className="p-8 text-center text-slate-400">Loading teacher requests...</td>
                                                </tr>
                                            ) : roleRequests.filter(r => r.role === 'Teacher').length > 0 ? (
                                                roleRequests.filter(r => r.role === 'Teacher').map((req) => (
                                                    <tr key={req._id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-4 whitespace-nowrap font-extrabold text-slate-850">{req.name}</td>
                                                        <td className="p-4 whitespace-nowrap font-semibold">{req.email}</td>
                                                        <td className="p-4 whitespace-nowrap font-semibold">{req.phone || 'N/A'}</td>
                                                        <td className="p-4 whitespace-nowrap">
                                                            <div className="flex flex-wrap gap-1">
                                                                {req.subjectSpecialization ? req.subjectSpecialization.split(',').map((subj, sIdx) => (
                                                                    <span key={sIdx} className="bg-emerald-50 text-emerald-705 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider animate-fade-in">
                                                                        {subj.trim()}
                                                                    </span>
                                                                )) : <span className="italic text-slate-400">None specified</span>}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 whitespace-nowrap text-right space-x-2">
                                                            <button
                                                                onClick={() => handleResolveRoleRequest(req._id, 'Approved')}
                                                                disabled={resolvingRoleId !== null}
                                                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all disabled:opacity-50"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleResolveRoleRequest(req._id, 'Rejected')}
                                                                disabled={resolvingRoleId !== null}
                                                                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all disabled:opacity-50"
                                                            >
                                                                Reject
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="p-8 text-center text-slate-400 font-bold">
                                                        No pending teacher joining requests.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Editor Requests */}
                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-lg font-extrabold text-slate-850">Editor Joining Requests</h2>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Approve requests for curriculum editors</p>
                                    </div>
                                    <span className="bg-indigo-50 text-indigo-705 px-3 py-1 rounded-full text-xs font-bold font-mono">
                                        Total: {roleRequests.filter(r => r.role === 'Editor').length}
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border border-slate-200 text-slate-550 text-[10px] font-bold uppercase tracking-wider">
                                                <th className="p-4 font-semibold whitespace-nowrap">Name</th>
                                                <th className="p-4 font-semibold whitespace-nowrap">Email</th>
                                                <th className="p-4 font-semibold whitespace-nowrap">Phone</th>
                                                <th className="p-4 font-semibold whitespace-nowrap">Eligibility / Qualifications Summary</th>
                                                <th className="p-4 font-semibold text-right whitespace-nowrap">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                                            {loadingRoleRequests ? (
                                                <tr>
                                                    <td colSpan="5" className="p-8 text-center text-slate-400">Loading editor requests...</td>
                                                </tr>
                                            ) : roleRequests.filter(r => r.role === 'Editor').length > 0 ? (
                                                roleRequests.filter(r => r.role === 'Editor').map((req) => (
                                                    <tr key={req._id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-4 whitespace-nowrap font-extrabold text-slate-850">{req.name}</td>
                                                        <td className="p-4 whitespace-nowrap font-semibold">{req.email}</td>
                                                        <td className="p-4 whitespace-nowrap font-semibold">{req.phone || 'N/A'}</td>
                                                        <td className="p-4 max-w-[300px]">
                                                            <p className="text-slate-500 font-medium text-xs break-words" title={req.eligibility}>
                                                                {req.eligibility || <span className="italic text-slate-350">No details provided</span>}
                                                            </p>
                                                        </td>
                                                        <td className="p-4 whitespace-nowrap text-right space-x-2">
                                                            <button
                                                                onClick={() => handleResolveRoleRequest(req._id, 'Approved')}
                                                                disabled={resolvingRoleId !== null}
                                                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all disabled:opacity-50"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleResolveRoleRequest(req._id, 'Rejected')}
                                                                disabled={resolvingRoleId !== null}
                                                                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all disabled:opacity-50"
                                                            >
                                                                Reject
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="p-8 text-center text-slate-400 font-bold">
                                                        No pending editor joining requests.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
            <AddUserModal isOpen={isUserModalOpen} onClose={() => { setIsUserModalOpen(false); setQuickAddRole(null); }} role={quickAddRole || modalRole} onSuccess={fetchDashboardData} />
            <AddCourseModal isOpen={isCourseModalOpen} onClose={() => setIsCourseModalOpen(false)} refreshData={fetchDashboardData} />
        </DashboardLayout>
    );
};

export default InstituteDashboard;
