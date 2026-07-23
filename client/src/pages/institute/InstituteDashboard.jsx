import { useAuth } from '../../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
    Users, GraduationCap, BookOpen, FileText, Inbox, RefreshCw, CheckCircle,
    XCircle, Clock, ExternalLink, ShieldAlert, Award, ArrowRight, Check, X, Trash2,
    Plus, Edit, Building2, Briefcase, Calculator, Megaphone, Heart, FolderOpen, Settings, UserX,
    ArrowLeft, CheckCircle2, Hourglass, Upload, BarChart3, Search,
    Video, Mic, Link2, Loader2
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
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(tabParam || 'overview');

    useEffect(() => {
        if (tabParam) {
            setActiveTab(tabParam);
        } else {
            setActiveTab('overview');
        }
    }, [tabParam]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    const [studyMaterials, setStudyMaterials] = useState([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);
    const [searchMaterialQuery, setSearchMaterialQuery] = useState('');
    const [deletingMaterialId, setDeletingMaterialId] = useState(null);
    const [selectedMaterialForAnalytics, setSelectedMaterialForAnalytics] = useState(null);
    const [videoAnalyticsData, setVideoAnalyticsData] = useState(null);
    const [loadingVideoAnalytics, setLoadingVideoAnalytics] = useState(false);
    const [selectedCourseFilter, setSelectedCourseFilter] = useState('All');
    const [selectedInstituteFilter, setSelectedInstituteFilter] = useState('All');

    // Upload / Edit Material Modal states
    const [adminUploadModalOpen, setAdminUploadModalOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState(null);
    const [allCourses, setAllCourses] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [allInstitutes, setAllInstitutes] = useState([]);
    const [allSubjects, setAllSubjects] = useState([]);
    const [uploadInst, setUploadInst] = useState('');
    const [uploadCourse, setUploadCourse] = useState('');
    const [uploadTarget, setUploadTarget] = useState('all'); // 'all', 'particular'
    const [uploadStudentIds, setUploadStudentIds] = useState([]);
    const [uploadSubject, setUploadSubject] = useState('');
    const [uploadDayNum, setUploadDayNum] = useState(1);
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [matTitle, setMatTitle] = useState('');
    const [selectedUploadType, setSelectedUploadType] = useState('video');
    const [videoAudioMode, setVideoAudioMode] = useState('upload');
    const [webMode, setWebMode] = useState('embedded');
    const [pdfMode, setPdfMode] = useState('upload');
    const [htmlCode, setHtmlCode] = useState('');
    const [matFile, setMatFile] = useState(null);
    const [matUrl, setMatUrl] = useState('');
    const [uploadingMaterial, setUploadingMaterial] = useState(false);
    const [riDropdownMatId, setRiDropdownMatId] = useState(null);
    const [isRiModalOpen, setIsRiModalOpen] = useState(false);
    const [riData, setRiData] = useState(null);
    const [loadingRi, setLoadingRi] = useState(false);
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
        { label: 'Guest User', modal: 'limited', role: 'Limited User', icon: UserX }
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
            toast('Guest Users are created automatically when candidates submit a public test. Share a public test link to register them.', {
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
        } else if (activeTab === 'study-material') {
            fetchStudyMaterials();
        }
    }, [activeTab]);

    const fetchStudyMaterials = async () => {
        try {
            setLoadingMaterials(true);
            const { data } = await axios.get('/api/study-materials');
            setStudyMaterials(data);
        } catch (err) {
            console.error("Error fetching study materials:", err);
            toast.error("Failed to load study materials");
        } finally {
            setLoadingMaterials(false);
        }
    };

    const handleDeleteMaterial = async (id) => {
        if (!window.confirm("Are you sure you want to delete this study material?")) return;
        try {
            setDeletingMaterialId(id);
            await axios.delete(`/api/study-materials/${id}`);
            toast.success("Study material deleted successfully");
            setStudyMaterials(prev => prev.filter(m => m._id !== id));
        } catch (err) {
            console.error("Error deleting study material:", err);
            toast.error(err.response?.data?.message || "Failed to delete study material");
        } finally {
            setDeletingMaterialId(null);
        }
    };

    const handleOpenRiReport = async (mat) => {
        if (!mat.student || !mat.student._id) {
            toast.error("No student linked to this study material");
            return;
        }

        try {
            setLoadingRi(true);
            setIsRiModalOpen(true);

            const targetCourse = (mat.course || '').trim().toLowerCase();
            const targetSubject = (mat.subject || '').trim().toLowerCase();
            const targetDayNum = mat.dayNum;
            const targetInboxId = (mat.inboxId || '').trim().toLowerCase();

            const inboxMaterials = studyMaterials.filter(m => {
                const mCourse = (m.course || '').toLowerCase();
                const mSubject = (m.subject || '').toLowerCase();
                const mInboxId = (m.inboxId || '').toLowerCase();

                const courseMatch = !targetCourse || mCourse.includes(targetCourse) || targetCourse.includes(mCourse);
                const subjectMatch = !targetSubject || mSubject.includes(targetSubject) || targetSubject.includes(mSubject);
                const inboxMatch = mInboxId === targetInboxId || (targetDayNum && mInboxId.includes(String(targetDayNum)));

                return courseMatch && subjectMatch && inboxMatch;
            });

            setRiData({
                student: mat.student,
                materialTitle: mat.title || 'Study Material',
                subject: mat.subject || 'General',
                inboxId: mat.inboxId || `Inbox ${mat.dayNum}` || 'N/A',
                dayNum: mat.dayNum,
                course: mat.course || 'N/A',
                materials: inboxMaterials,
                stats: {
                    total: inboxMaterials.length
                }
            });

        } catch (err) {
            console.error("Error generating RI report:", err);
            toast.error("Failed to load RI study materials");
            setIsRiModalOpen(false);
        } finally {
            setLoadingRi(false);
        }
    };

    useEffect(() => {
        if (selectedMaterialForAnalytics && selectedMaterialForAnalytics.materialType === 'video') {
            const fetchVideoAnalytics = async () => {
                try {
                    setLoadingVideoAnalytics(true);
                    const { data } = await axios.get(`/api/video-analytics/details/${selectedMaterialForAnalytics._id}`);
                    setVideoAnalyticsData(data);
                } catch (err) {
                    console.error("Error fetching video analytics:", err);
                    toast.error("Failed to load video analytics");
                } finally {
                    setLoadingVideoAnalytics(false);
                }
            };
            fetchVideoAnalytics();
        } else {
            setVideoAnalyticsData(null);
        }
    }, [selectedMaterialForAnalytics]);

    const formatDuration = (seconds) => {
        if (!seconds) return '0s';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return [
            hrs > 0 ? `${hrs}h` : '',
            mins > 0 ? `${mins}m` : '',
            secs > 0 || (hrs === 0 && mins === 0) ? `${secs}s` : ''
        ].filter(Boolean).join(' ');
    };

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
                setAllInstitutes([{ _id: instId, name: instRes.data.name }]);
            } else if (userInfo?.institute) {
                const instName = userInfo.institute.name || '';
                setAllInstitutes(instName ? [{ _id: instId, name: instName }] : []);
            }
            setAllCourses(coursesRes.data || []);
            setAllSubjects(subjectsRes.data || []);
            setAllStudents(studentsRes.data || []);
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
            {activeTab !== 'study-material' && (
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


                </div>
            )}

            {loading ? (
                <div className="flex justify-center items-center py-40">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b1329]"></div>
                </div>
            ) : (
                <>
                    {activeTab !== 'study-material' ? (
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
                                <StatCard title="Limited User" value={stats.guestUsers || 0} icon={Users} color="bg-indigo-600 text-indigo-600" />
                                <StatCard title="Guest User" value={stats.limitedUsers || 0} icon={Users} color="bg-indigo-600 text-indigo-600" />
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
                    ) : (
                        /* STUDY MATERIAL TAB */
                        (() => {
                            const uniqueMaterials = [];
                            studyMaterials
                                .filter(m => {
                                    const mCourse = (m.course || '').toLowerCase();
                                    const courseMatch = selectedCourseFilter === 'All' || mCourse.includes(selectedCourseFilter.toLowerCase()) || selectedCourseFilter.toLowerCase().includes(mCourse);

                                    const query = searchMaterialQuery.trim().toLowerCase();
                                    const searchMatch = !query ||
                                        (m.title || '').toLowerCase().includes(query) ||
                                        (m.subject || '').toLowerCase().includes(query) ||
                                        (m.uploadedBy?.name || '').toLowerCase().includes(query) ||
                                        (m.student?.name || '').toLowerCase().includes(query);

                                    return courseMatch && searchMatch;
                                })
                                .forEach(mat => {
                                    const key = mat.fileUrl ? mat.fileUrl.trim() : mat._id;
                                    const existing = uniqueMaterials.find(m => m.fileUrl && m.fileUrl.trim() === key);
                                    if (existing) {
                                        if (mat.views && mat.views.length > 0) {
                                            mat.views.forEach(v => {
                                                const ev = existing.views.find(view => (view.student?._id || view.student) === (v.student?._id || v.student));
                                                if (ev) {
                                                    ev.count = (ev.count || 0) + (v.count || 1);
                                                    if (new Date(v.lastViewed) > new Date(ev.lastViewed)) {
                                                        ev.lastViewed = v.lastViewed;
                                                    }
                                                } else {
                                                    existing.views.push({ ...v });
                                                }
                                            });
                                        }
                                        if (mat.student) {
                                            if (!existing.allStudents) {
                                                existing.allStudents = [existing.student].filter(Boolean);
                                            }
                                            const exists = existing.allStudents.some(s => (s._id || s) === (mat.student._id || mat.student));
                                            if (!exists) {
                                                existing.allStudents.push(mat.student);
                                            }
                                        }
                                    } else {
                                        const clone = {
                                            ...mat,
                                            views: mat.views ? mat.views.map(v => ({ ...v })) : [],
                                            allStudents: mat.student ? [mat.student] : []
                                        };
                                        uniqueMaterials.push(clone);
                                    }
                                });

                            return (
                                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm animate-fade-in text-left">
                                    <div className="border-b border-slate-100 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleTabChange('overview')}
                                                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-all cursor-pointer mr-1 flex items-center justify-center border border-slate-150 shadow-sm bg-slate-50/50"
                                                    title="Back to Dashboard"
                                                >
                                                    <ArrowLeft size={14} />
                                                </button>
                                                <h2 className="text-xl font-extrabold text-slate-900">Study Materials Repository</h2>
                                            </div>
                                            <p className="text-slate-500 text-xs mt-1">Monitor all PDF/Docs and Web Links uploaded by teachers for students</p>
                                        </div>
                                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto">
                                            <button
                                                onClick={() => {
                                                    setEditingMaterial(null);
                                                    setMatTitle('');
                                                    setMatFile(null);
                                                    setMatUrl('');
                                                    setHtmlCode('');
                                                    setUploadInst(instituteDetails?.name || userInfo?.institute?.name || '');
                                                    setUploadCourse('');
                                                    setUploadTarget('all');
                                                    setUploadStudentIds([]);
                                                    setUploadSubject('');
                                                    setUploadDayNum(1);
                                                    setSelectedUploadType('video');
                                                    setVideoAudioMode('upload');
                                                    setWebMode('embedded');
                                                    setPdfMode('upload');
                                                    setAdminUploadModalOpen(true);
                                                }}
                                                className="h-9 px-4 bg-[#0b1329] hover:bg-[#1b2a53] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-[#0b1329]/10 shrink-0"
                                            >
                                                <Plus size={14} /> Upload Material
                                            </button>
                                            {/* Courses Filter */}
                                            <select
                                                value={selectedCourseFilter}
                                                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                                                className="h-9 px-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3E3ADD] focus:ring-2 focus:ring-indigo-100 transition-all text-slate-700 font-extrabold cursor-pointer min-w-[115px] w-full sm:w-auto shadow-sm"
                                            >
                                                <option value="All">All Courses</option>
                                                {Array.from(new Set(studyMaterials.map(m => m.course).filter(Boolean))).map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>

                                            <div className="relative flex-1 sm:flex-none w-full sm:w-auto">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                <input
                                                    type="text"
                                                    placeholder="Search by student, subject, teacher..."
                                                    value={searchMaterialQuery}
                                                    onChange={(e) => setSearchMaterialQuery(e.target.value)}
                                                    className="w-full sm:w-56 h-9 pl-9 pr-3 bg-slate-50 border border-slate-205 rounded-xl text-xs focus:outline-none focus:border-[#3E3ADD] focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400 text-slate-800 font-semibold"
                                                />
                                            </div>
                                            <span className="bg-[#0b1329] text-white px-3.5 py-1.5 rounded-full text-xs font-black font-mono shrink-0">
                                                Total: {uniqueMaterials.length}
                                            </span>
                                        </div>
                                    </div>

                                    {loadingMaterials ? (
                                        <div className="flex justify-center items-center py-20">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b1329]"></div>
                                        </div>
                                    ) : uniqueMaterials.length === 0 ? (
                                        <div className="text-center py-16 text-slate-400 font-medium font-semibold">
                                            No study materials found
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto rounded-2xl border border-slate-100">
                                            <table className="min-w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                                        <th className="p-4 font-semibold">Title of SM</th>
                                                        <th className="p-4 font-semibold">Type</th>
                                                        <th className="p-4 font-semibold">Course</th>
                                                        <th className="p-4 font-semibold">Subject</th>
                                                        <th className="p-4 font-semibold">Uploaded By</th>
                                                        <th className="p-4 font-semibold text-center">Status</th>
                                                        <th className="p-4 font-semibold text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-semibold">
                                                    {uniqueMaterials.map((item, idx) => {
                                                        const uploadDate = new Date(item.createdAt).toLocaleDateString(undefined, {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        });
                                                        const statusLabel = item.status === 'upcoming' ? 'Upcoming' : item.status === 'assign' ? 'Assigned' : 'General';
                                                        const statusBadgeColor = item.status === 'upcoming'
                                                            ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                                            : item.status === 'assign'
                                                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                                                : 'bg-emerald-50 text-emerald-600 border border-emerald-100';

                                                        const associatedStudents = [];
                                                        if (item.allStudents) {
                                                            item.allStudents.forEach(s => {
                                                                if (s && !associatedStudents.some(as => (as._id || as) === (s._id || s))) {
                                                                    associatedStudents.push(s);
                                                                }
                                                            });
                                                        }
                                                        if (item.views) {
                                                            item.views.forEach(v => {
                                                                const s = v.student;
                                                                if (s && !associatedStudents.some(as => (as._id || as) === (s._id || s))) {
                                                                    associatedStudents.push(s);
                                                                }
                                                            });
                                                        }
                                                        if (associatedStudents.length === 0 && item.course) {
                                                            const courseLower = item.course.trim().toLowerCase();
                                                            allStudents.forEach(s => {
                                                                const rawCourse = s.studentProfile?.course;
                                                                let studentCourse = '';
                                                                if (rawCourse) {
                                                                    if (typeof rawCourse === 'string') {
                                                                        studentCourse = rawCourse;
                                                                    } else if (typeof rawCourse === 'object') {
                                                                        studentCourse = rawCourse.name || rawCourse.title || rawCourse._id || '';
                                                                    }
                                                                }
                                                                if (studentCourse && studentCourse.toString().trim().toLowerCase() === courseLower) {
                                                                    associatedStudents.push(s);
                                                                }
                                                            });
                                                        }
                                                        if (associatedStudents.length === 0) {
                                                            associatedStudents.push(...allStudents);
                                                        }

                                                        return (
                                                            <tr key={item._id} className="hover:bg-slate-50 transition-colors group">
                                                                <td className="p-4">
                                                                    <span className="text-xs font-bold text-slate-800 truncate max-w-[220px]" title={item.title}>
                                                                        {item.title}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4">
                                                                    {item.materialType ? (
                                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                                            {item.materialType}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[10px] text-slate-400 font-semibold italic">N/A</span>
                                                                    )}
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-slate-800 text-xs">{item.course || <span className="italic text-slate-400">All Courses</span>}</span>
                                                                        {item.institute && <span className="text-[10px] text-emerald-600 font-black uppercase mt-0.5">{item.institute}</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-slate-800 text-xs">{item.subject || <span className="italic text-slate-455">General</span>}</span>
                                                                        <span className="text-slate-400 text-[10px] font-semibold uppercase mt-0.5">{item.dayNum ? `Inbox ${item.dayNum}` : (item.inboxId || 'N/A')}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 whitespace-nowrap">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-slate-800 text-xs">{item.uploadedBy?.name || 'Unknown'}</span>
                                                                        <span className="text-slate-400 text-[9px] font-semibold mt-0.5">{uploadDate}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 whitespace-nowrap text-center">
                                                                    <span className={`px-2.5 py-1 border rounded-full text-[9px] font-black uppercase tracking-wider ${statusBadgeColor}`}>
                                                                        {statusLabel}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4 whitespace-nowrap text-right">
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        {associatedStudents.length > 0 && (
                                                                            <div className="relative inline-block text-left">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        if (associatedStudents.length === 1) {
                                                                                            handleOpenRiReport({
                                                                                                ...item,
                                                                                                student: associatedStudents[0]
                                                                                            });
                                                                                        } else {
                                                                                            setRiDropdownMatId(riDropdownMatId === item._id ? null : item._id);
                                                                                        }
                                                                                    }}
                                                                                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-[#3E3ADD] text-[#3E3ADD] hover:text-white border border-indigo-150 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1"
                                                                                    title="View RI Report"
                                                                                >
                                                                                    <span>RI</span>
                                                                                    {associatedStudents.length > 1 && <span className="text-[6px]">▼</span>}
                                                                                </button>
                                                                                {associatedStudents.length > 1 && riDropdownMatId === item._id && (
                                                                                    <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-[9999] py-1 text-left">
                                                                                        <div className="px-2 py-1 text-[8px] font-black text-slate-400 uppercase border-b border-slate-100">
                                                                                            Select Student
                                                                                        </div>
                                                                                        <div className="max-h-48 overflow-y-auto">
                                                                                            {associatedStudents.map(stud => (
                                                                                                <button
                                                                                                    key={stud._id}
                                                                                                    type="button"
                                                                                                    onClick={() => {
                                                                                                        setRiDropdownMatId(null);
                                                                                                        handleOpenRiReport({
                                                                                                            ...item,
                                                                                                            student: stud
                                                                                                        });
                                                                                                    }}
                                                                                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-[10px] font-bold text-slate-750 truncate cursor-pointer block"
                                                                                                >
                                                                                                    {stud.name}
                                                                                                </button>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        <a
                                                                            href={item.fileUrl}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-655 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center"
                                                                            title="View file/link"
                                                                        >
                                                                            <FolderOpen size={13} />
                                                                        </a>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setSelectedMaterialForAnalytics(item)}
                                                                            className="p-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-105 text-[#3E3ADD] rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center"
                                                                            title="View Material Analytics"
                                                                        >
                                                                            <BarChart3 size={13} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingMaterial(item);
                                                                                setMatTitle(item.title || '');
                                                                                setMatUrl(item.fileUrl || '');
                                                                                setUploadInst(item.institute || instituteDetails?.name || userInfo?.institute?.name || '');
                                                                                setUploadCourse(item.course || '');
                                                                                setUploadSubject(item.subject || '');
                                                                                setUploadDayNum(item.dayNum || 1);
                                                                                if (item.student) {
                                                                                    setUploadTarget('particular');
                                                                                    setUploadStudentIds([item.student._id || item.student]);
                                                                                } else {
                                                                                    setUploadTarget('all');
                                                                                    setUploadStudentIds([]);
                                                                                }
                                                                                setSelectedUploadType(item.materialType || 'pdf');
                                                                                setMatFile(null);
                                                                                setHtmlCode(item.htmlContent || '');
                                                                                setAdminUploadModalOpen(true);
                                                                            }}
                                                                            className="p-2 bg-indigo-50/50 hover:bg-indigo-100 border border-indigo-105 text-[#3E3ADD] rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center"
                                                                            title="Edit info"
                                                                        >
                                                                            <Edit size={13} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteMaterial(item._id)}
                                                                            disabled={deletingMaterialId === item._id}
                                                                            className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-105 text-rose-600 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-xs active:scale-95 flex items-center justify-center"
                                                                            title="Delete study material"
                                                                        >
                                                                            <Trash2 size={13} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })()
                    )}
                </>
            )}
            <AddUserModal isOpen={isUserModalOpen} onClose={() => { setIsUserModalOpen(false); setQuickAddRole(null); }} role={quickAddRole || modalRole} onSuccess={fetchDashboardData} />
            <AddCourseModal isOpen={isCourseModalOpen} onClose={() => setIsCourseModalOpen(false)} refreshData={fetchDashboardData} />

            {/* Student RI Report Modal */}
            {isRiModalOpen && riData && createPortal(
                <div
                    className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
                    onClick={() => setIsRiModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl p-6 animate-fade-in relative text-left"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                                    <GraduationCap className="text-[#3E3ADD]" size={18} />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-slate-800 text-sm">Inbox Performance Report (RI)</h3>
                                    <p className="text-[10px] text-slate-400 font-medium">Performance details for {riData.student?.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsRiModalOpen(false)}
                                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all cursor-pointer text-sm font-bold"
                            >
                                ×
                            </button>
                        </div>

                        {loadingRi ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-900/20 border-t-[#3E3ADD] mb-3"></div>
                                <p className="text-xs text-slate-455 font-semibold">Generating report data...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Metadata Grid */}
                                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/50 text-xs font-semibold text-slate-700">
                                    <div className="col-span-2"><span className="text-[9px] uppercase tracking-wider text-slate-400 block font-black mb-0.5">Study Material Title</span>{riData.materialTitle}</div>
                                    <div><span className="text-[9px] uppercase tracking-wider text-slate-400 block font-black mb-0.5">Course</span>{riData.course}</div>
                                    <div><span className="text-[9px] uppercase tracking-wider text-slate-400 block font-black mb-0.5">Subject Name</span>{riData.subject}</div>
                                    <div><span className="text-[9px] uppercase tracking-wider text-slate-400 block font-black mb-0.5">Inbox / Day</span>{riData.dayNum ? `Inbox ${riData.dayNum}` : riData.inboxId}</div>
                                </div>
                             
                                {/* Footer Actions */}
                                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsRiModalOpen(false)}
                                        className="px-6 py-2.5 bg-[#3E3ADD] hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 whitespace-nowrap"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Centered Study Materials Popup Modal (White Smoke Bg) */}
            {selectedMaterialForAnalytics && createPortal(
                <div
                    className="fixed inset-0 z-[99999] bg-[#F5F5F5] flex flex-col p-6 md:p-10 animate-fade-in text-left overflow-hidden"
                >
                    <div
                        className="w-full max-w-7xl mx-auto flex-1 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-5 border-b border-slate-200 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                                    <FolderOpen className="text-[#3E3ADD]" size={18} />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-slate-800 text-sm">Material Performance</h3>
                                    <p className="text-[10px] text-slate-450 font-semibold uppercase">
                                        {selectedMaterialForAnalytics.title}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedMaterialForAnalytics(null)}
                                className="w-7 h-7 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-all cursor-pointer text-sm font-bold shadow-xs"
                            >
                                ×
                            </button>
                        </div>

                        {selectedMaterialForAnalytics.materialType === 'video' ? (
                            /* Video Analytics Content */
                            loadingVideoAnalytics ? (
                                <div className="flex-1 flex flex-col justify-center items-center py-20 gap-3">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-650"></div>
                                    <p className="text-xs text-slate-500 font-bold">Loading video analytics...</p>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto space-y-6">
                                    {/* Video info card */}
                                    <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-wrap gap-2.5 items-center justify-between shadow-xs">
                                        <div className="min-w-0">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Video filename</h4>
                                            <p className="text-xs font-mono text-slate-500 truncate mt-0.5">{selectedMaterialForAnalytics.filename}</p>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <span className="bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                                                Course: {selectedMaterialForAnalytics.course || 'All'}
                                            </span>
                                            <span className="bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                                                Subject: {selectedMaterialForAnalytics.subject || 'All'}
                                            </span>
                                            <span className="bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                                                Institute: {selectedMaterialForAnalytics.institute}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 5 Aggregate Cards Grid */}
                                    {(() => {
                                        const materialViews = videoAnalyticsData?.material?.views || selectedMaterialForAnalytics.views || [];
                                        const uniquePlayers = videoAnalyticsData?.records?.length || 0;
                                        
                                        const viewerIds = new Set();
                                        materialViews.forEach(v => {
                                            const id = v.student?._id || v.student;
                                            if (id) viewerIds.add(id.toString());
                                        });
                                        videoAnalyticsData?.records?.forEach(r => {
                                            const id = r.student?._id || r.student;
                                            if (id) viewerIds.add(id.toString());
                                        });

                                        const uniqueViewers = viewerIds.size;
                                        const totalViews = Math.max(
                                            materialViews.reduce((sum, v) => sum + (v.count || 0), 0),
                                            uniqueViewers
                                        );
                                        const totalPlays = videoAnalyticsData?.records?.reduce((sum, r) => sum + (r.sessions?.length || 0), 0) || 0;
                                        const totalWatchSecs = videoAnalyticsData?.records?.reduce((sum, r) => {
                                            return sum + (r.totalWatchTime || r.sessions?.reduce((sSum, s) => sSum + (s.sessionDuration || 0), 0) || 0);
                                        }, 0) || 0;
                                        
                                        const startRate = uniqueViewers > 0 
                                            ? Math.min(Math.round((uniquePlayers / uniqueViewers) * 100), 100) 
                                            : 0;

                                        const completedPlayers = videoAnalyticsData?.records?.filter(r => {
                                            const pct = r.progress?.completionPercentage || 0;
                                            return (r.completionAttempts > 0) || (pct >= 95);
                                        }).length || 0;

                                        const completionRate = uniquePlayers > 0 
                                            ? Math.min(Math.round((completedPlayers / uniquePlayers) * 100), 100) 
                                            : 0;

                                        return (
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-fade-in">
                                                {/* 1. Total Views */}
                                                <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Total Views</span>
                                                    <span className="text-2xl font-black text-[#3E3ADD] mt-1 block">
                                                        {totalViews}
                                                    </span>
                                                    <span className="text-[9px] text-slate-455 font-semibold mt-1 block">
                                                        {uniqueViewers} Unique Viewers
                                                    </span>
                                                </div>

                                                {/* 2. Total Watch Time */}
                                                <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Total Watch Time</span>
                                                    <span className="text-2xl font-black text-emerald-600 mt-1 block">
                                                        {formatDuration(totalWatchSecs)}
                                                    </span>
                                                    <span className="text-[9px] text-slate-455 font-semibold mt-1 block">
                                                        Accumulated watch
                                                    </span>
                                                </div>

                                                {/* 3. Total Play Count */}
                                                <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Total Play Count</span>
                                                    <span className="text-2xl font-black text-purple-650 mt-1 block">
                                                        {totalPlays}
                                                    </span>
                                                    <span className="text-[9px] text-slate-455 font-semibold mt-1 block">
                                                        Total sessions
                                                    </span>
                                                </div>

                                                {/* 4. Video Start Rate (%) */}
                                                <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Video Start Rate (%)</span>
                                                    <span className="text-2xl font-black text-blue-600 mt-1 block">
                                                        {startRate}%
                                                    </span>
                                                    <span className="text-[9px] text-slate-455 font-semibold mt-1 block">
                                                        Played vs Viewed
                                                    </span>
                                                </div>

                                                {/* 5. Video Completion Rate (%) */}
                                                <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Completion Rate (%)</span>
                                                    <span className="text-2xl font-black text-amber-600 mt-1 block">
                                                        {completionRate}%
                                                    </span>
                                                    <span className="text-[9px] text-slate-455 font-semibold mt-1 block">
                                                        Finished (95-100%)
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Student Breakdown Table */}
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black text-slate-455 uppercase tracking-widest">Student Watch Details</h4>
                                        {!videoAnalyticsData?.records || videoAnalyticsData.records.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic py-6 text-center bg-white rounded-2xl border border-slate-200/60 shadow-xs animate-fade-in">
                                                No video sessions recorded yet.
                                            </p>
                                        ) : (
                                            <div className="overflow-x-auto rounded-2xl border border-slate-200/60 bg-white shadow-xs animate-fade-in">
                                                <table className="w-full text-left border-collapse text-xs">
                                                    <thead>
                                                        <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                            <th className="p-3">Student Name</th>
                                                            <th className="p-3 text-center">Sessions</th>
                                                            <th className="p-3 text-center">Total Watch Time</th>
                                                            <th className="p-3 text-center">Max Watched %</th>
                                                            <th className="p-3 text-right">Completion Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                                                        {videoAnalyticsData.records.map((r, index) => {
                                                            const isCompleted = (r.completionAttempts > 0) || (r.progress?.completionPercentage >= 95);
                                                            return (
                                                                <tr key={r._id || index} className="hover:bg-slate-50/50 transition-colors">
                                                                    <td className="p-3">
                                                                        <p className="font-bold text-slate-800">{r.student?.name || 'Unknown Student'}</p>
                                                                        <p className="text-[9px] text-slate-400">{r.student?.email || ''}</p>
                                                                    </td>
                                                                    <td className="p-3 text-center font-mono text-slate-650">{r.sessions?.length || 0}</td>
                                                                    <td className="p-3 text-center text-slate-650">
                                                                        {formatDuration(r.totalWatchTime || r.sessions?.reduce((sum, s) => sum + (s.sessionDuration || 0), 0) || 0)}
                                                                    </td>
                                                                    <td className="p-3 text-center font-mono font-bold text-indigo-650">
                                                                        {Math.round(r.progress?.completionPercentage || 0)}%
                                                                    </td>
                                                                    <td className="p-3 text-right">
                                                                        {isCompleted ? (
                                                                            <span className="inline-block bg-emerald-50 border border-emerald-100 text-emerald-650 px-2 py-0.5 rounded-full text-[9px] font-black">
                                                                                Completed ({r.completionAttempts || 1})
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-block bg-amber-50 border border-amber-100 text-amber-600 px-2 py-0.5 rounded-full text-[9px] font-black">
                                                                                In Progress
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        ) : (
                            /* Standard PDF/Doc Analytics Content */
                            <div className="flex-1 overflow-y-auto space-y-4 animate-fade-in">
                                <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Views</span>
                                        <p className="text-2xl font-black text-[#3E3ADD]">
                                            {selectedMaterialForAnalytics.views?.reduce((sum, v) => sum + (v.count || 0), 0) || 0}
                                        </p>
                                    </div>
                                    <div className="space-y-0.5 text-right">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unique Viewers</span>
                                        <p className="text-2xl font-black text-slate-700">
                                            {selectedMaterialForAnalytics.views?.length || 0}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-slate-455 uppercase tracking-widest">Viewer Details</h4>
                                    {!selectedMaterialForAnalytics.views || selectedMaterialForAnalytics.views.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic py-4 text-center bg-white rounded-2xl border border-slate-200/60">
                                            No views recorded yet.
                                        </p>
                                    ) : (
                                        <div className="border border-slate-200/60 bg-white rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-xs">
                                            {selectedMaterialForAnalytics.views.map((v, index) => (
                                                <div key={index} className="p-3 hover:bg-slate-50/50 flex items-center justify-between gap-3 text-xs">
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-800 truncate">{v.student?.name || 'Unknown Student'}</p>
                                                        <p className="text-[10px] text-slate-400 truncate">{v.student?.email || ''}</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <span className="bg-indigo-50 border border-indigo-105 text-indigo-655 px-2 py-0.5 rounded-full text-[10px] font-black">
                                                            {v.count} {v.count === 1 ? 'view' : 'views'}
                                                        </span>
                                                        <p className="text-[9px] text-slate-455 mt-1 font-semibold">
                                                            {new Date(v.lastViewed).toLocaleDateString()} {new Date(v.lastViewed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Upload / Edit Material Modal */}
            {adminUploadModalOpen && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center overflow-y-auto z-[100000] p-4 animate-fade-in text-left">
                    <form
                        onSubmit={async (e) => {
                            e.preventDefault();
                            if (!matTitle.trim()) { toast.error('Title is required'); return; }
                            try {
                                setUploadingMaterial(true);
                                const fd = new FormData();
                                fd.append('title', matTitle.trim());
                                fd.append('subject', uploadSubject.trim());
                                fd.append('course', uploadCourse.trim());
                                fd.append('institute', uploadInst.trim());
                                fd.append('dayNum', uploadDayNum ? parseInt(uploadDayNum, 10) : 1);
                                fd.append('inboxId', uploadDayNum ? `Inbox ${uploadDayNum}` : 'Inbox 1');
                                fd.append('materialType', selectedUploadType);

                                if (uploadTarget === 'particular') {
                                    if (uploadStudentIds.length === 0) {
                                        toast.error('Please select at least one student');
                                        setUploadingMaterial(false);
                                        return;
                                    }
                                    fd.append('studentIds', JSON.stringify(uploadStudentIds));
                                }

                                if (selectedUploadType === 'web' && webMode === 'code') {
                                    if (!htmlCode.trim()) {
                                        toast.error('Please write or paste HTML code first');
                                        setUploadingMaterial(false);
                                        return;
                                    }
                                    const blob = new Blob([htmlCode], { type: 'text/html' });
                                    const file = new File([blob], `page-${Date.now()}.html`, { type: 'text/html' });
                                    fd.append('file', file);
                                } else if (matFile) {
                                    fd.append('file', matFile);
                                } else if (matUrl.trim()) {
                                    fd.append('fileUrl', matUrl.trim());
                                }

                                const headers = { 'Content-Type': 'multipart/form-data' };

                                if (editingMaterial) {
                                    await axios.put(`/api/study-materials/${editingMaterial._id}`, fd, { headers });
                                    toast.success('Material updated!');
                                } else {
                                    await axios.post('/api/study-materials', fd, { headers });
                                    toast.success('Material uploaded!');
                                }
                                setAdminUploadModalOpen(false);
                                fetchStudyMaterials();
                            } catch (err) {
                                toast.error(err.response?.data?.message || 'Upload failed');
                            } finally {
                                setUploadingMaterial(false);
                            }
                        }}
                        className="bg-white rounded-3xl w-full max-w-2xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[85vh]"
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-[#0b1329] flex items-center justify-center">
                                    <Upload size={14} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-slate-800 text-sm">{editingMaterial ? 'Edit Study Material' : 'Upload Study Material'}</h3>
                                    <p className="text-[10px] text-slate-400 font-medium">Configure resource access and file uploads</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setAdminUploadModalOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"><X size={16} /></button>
                        </div>

                        {/* Modal Body - scrollable */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5">Material Title <span className="text-rose-500">*</span></label>
                                <input type="text" value={matTitle} onChange={e => setMatTitle(e.target.value)} placeholder="e.g. Chapter 3 - Cell Biology Notes" className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#3E3ADD] focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800 font-semibold" required />
                            </div>

                            {/* Target: Institute + Course */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5">Institute</label>
                                    <select
                                        value={uploadInst}
                                        disabled={true}
                                        className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#3E3ADD] focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800 font-semibold cursor-pointer opacity-75"
                                    >
                                        <option value="">Select Institute</option>
                                        {allInstitutes.map(inst => (
                                            <option key={inst._id} value={inst.name}>{inst.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5">Course</label>
                                    <select
                                        value={uploadCourse}
                                        onChange={e => {
                                            setUploadCourse(e.target.value);
                                            setUploadSubject('');
                                        }}
                                        className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#3E3ADD] focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800 font-semibold cursor-pointer"
                                    >
                                        <option value="">Leave blank for all</option>
                                        {allCourses
                                            .filter(c => !uploadInst || (c.institute && (c.institute.name === uploadInst || c.institute === uploadInst || (typeof c.institute === 'object' && c.institute._id === uploadInst))))
                                            .map(c => (
                                                <option key={c._id} value={c.name}>{c.name}</option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            {/* Subject + Inbox */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5">Subject</label>
                                    {(() => {
                                        const selectedCourseObj = allCourses.find(c => c.name === uploadCourse);
                                        const subjectsList = selectedCourseObj ? (selectedCourseObj.subjects || []) : Array.from(new Set(allSubjects.map(s => s.name)));
                                        return (
                                            <select
                                                value={uploadSubject}
                                                onChange={e => setUploadSubject(e.target.value)}
                                                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#3E3ADD] focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800 font-semibold cursor-pointer"
                                            >
                                                <option value="">Select a subject</option>
                                                {subjectsList.map((sub, index) => (
                                                    <option key={index} value={sub}>{sub}</option>
                                                ))}
                                            </select>
                                        );
                                    })()}
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5">Inbox (Day No.)</label>
                                    <input type="number" min={1} value={uploadDayNum} onChange={e => setUploadDayNum(Number(e.target.value))} className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#3E3ADD] focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800 font-semibold" />
                                </div>
                            </div>

                            {/* Visible To (Upload Target Selection) */}
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider">Visible To</label>
                                <div className="grid grid-cols-2 bg-slate-50 border border-slate-200/60 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setUploadTarget('all');
                                            setUploadStudentIds([]);
                                            setStudentSearchQuery('');
                                        }}
                                        className={`py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer truncate ${uploadTarget === 'all' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        All Students
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setUploadTarget('particular')}
                                        className={`py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer truncate ${uploadTarget === 'particular' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Select Student(s)
                                    </button>
                                </div>

                                {/* Particular Student Selection Checkboxes */}
                                {uploadTarget === 'particular' && (() => {
                                    const filteredStudents = allStudents.filter(std => {
                                        const instMatch = !uploadInst || (std.institute && (std.institute.name === uploadInst || std.institute === uploadInst || (typeof std.institute === 'object' && std.institute._id === uploadInst)));
                                        const courseMatch = !uploadCourse || (
                                            (std.studentProfile?.course && std.studentProfile.course.name === uploadCourse) ||
                                            (std.studentProfile?.coursesList && std.studentProfile.coursesList.some(cItem => cItem.course && cItem.course.name === uploadCourse))
                                        );
                                        const nameMatch = !studentSearchQuery || std.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) || (std.email && std.email.toLowerCase().includes(studentSearchQuery.toLowerCase()));
                                        return instMatch && courseMatch && nameMatch;
                                    });

                                    return (
                                        <div className="pt-1.5 space-y-2">
                                            {/* Search input for students */}
                                            <input
                                                type="text"
                                                placeholder="Search student by name or email..."
                                                value={studentSearchQuery}
                                                onChange={e => setStudentSearchQuery(e.target.value)}
                                                className="w-full h-8 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#3E3ADD]"
                                            />
                                            <div className="border border-slate-205 rounded-2xl p-3.5 bg-slate-50/50 max-h-40 overflow-y-auto space-y-2.5 custom-scrollbar text-left">
                                                <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5 mb-2 select-none">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Select Students ({uploadStudentIds.length} selected)</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (uploadStudentIds.length === filteredStudents.length) {
                                                                setUploadStudentIds([]);
                                                            } else {
                                                                setUploadStudentIds(filteredStudents.map(s => s._id));
                                                            }
                                                        }}
                                                        className="text-[9px] font-black text-[#3E3ADD] hover:text-indigo-850 uppercase tracking-wider"
                                                    >
                                                        {uploadStudentIds.length === filteredStudents.length ? 'Clear All' : 'Select All'}
                                                    </button>
                                                </div>
                                                {filteredStudents.length === 0 ? (
                                                    <p className="text-xs text-slate-400 text-center py-4">No matching students found</p>
                                                ) : (
                                                    filteredStudents.map(std => {
                                                        const isChecked = uploadStudentIds.includes(std._id);
                                                        return (
                                                            <label key={std._id} className="flex items-center gap-2.5 cursor-pointer select-none">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => {
                                                                        if (isChecked) {
                                                                            setUploadStudentIds(prev => prev.filter(id => id !== std._id));
                                                                        } else {
                                                                            setUploadStudentIds(prev => [...prev, std._id]);
                                                                        }
                                                                    }}
                                                                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                />
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-xs font-bold text-slate-750 truncate leading-snug">{std.name}</p>
                                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                                                        {std.email && <span className="text-[10px] text-slate-400 truncate">{std.email}</span>}
                                                                        {std.studentProfile?.course?.name && (
                                                                            <span className="text-[9px] bg-slate-100 text-slate-550 px-1.5 py-0.2 rounded-md font-extrabold uppercase border border-slate-205">
                                                                                {std.studentProfile.course.name}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </label>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Content Type Tabs */}
                            <div>
                                <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5">Content Type</label>
                                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                                    {[{ id: 'video', label: 'Video', icon: Video }, { id: 'audio', label: 'Audio', icon: Mic }, { id: 'pdf', label: 'PDF/Doc', icon: FileText }, { id: 'web', label: 'Web/HTML', icon: Link2 }].map(t => (
                                        <button key={t.id} type="button" onClick={() => setSelectedUploadType(t.id)}
                                            className={`flex-1 py-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${selectedUploadType === t.id ? 'bg-[#0b1329] text-white shadow' : 'text-slate-600 hover:text-slate-900'
                                                }`}>
                                            <t.icon size={11} /> {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Video / Audio */}
                            {(selectedUploadType === 'video' || selectedUploadType === 'audio') && (
                                <div className="space-y-3">
                                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                                        {['upload', 'embedded'].map(m => (
                                            <button key={m} type="button" onClick={() => setVideoAudioMode(m)}
                                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black capitalize transition-all cursor-pointer ${videoAudioMode === m ? 'bg-white text-[#0b1329] shadow' : 'text-slate-500'
                                                    }`}>{m === 'upload' ? 'Upload File' : 'Embed URL'}
                                            </button>
                                        ))}
                                    </div>
                                    {videoAudioMode === 'upload' ? (
                                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-indigo-300 transition-all">
                                            <input type="file" id="instMatFile" accept={selectedUploadType === 'video' ? 'video/*' : 'audio/*'} onChange={e => setMatFile(e.target.files[0])} className="hidden" />
                                            <label htmlFor="instMatFile" className="cursor-pointer flex flex-col items-center gap-2">
                                                <Upload size={20} className="text-slate-400" />
                                                <span className="text-xs font-bold text-slate-500">{matFile ? matFile.name : `Click to upload ${selectedUploadType} file`}</span>
                                            </label>
                                        </div>
                                    ) : (
                                        <input type="url" value={matUrl} onChange={e => setMatUrl(e.target.value)} placeholder="https://youtube.com/embed/..." className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#3E3ADD] focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800 font-semibold" />
                                    )}
                                </div>
                            )}

                            {/* PDF */}
                            {selectedUploadType === 'pdf' && (
                                <div className="space-y-3">
                                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                                        {['upload', 'embedded'].map(m => (
                                            <button key={m} type="button" onClick={() => setPdfMode(m)}
                                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black capitalize transition-all cursor-pointer ${pdfMode === m ? 'bg-white text-[#0b1329] shadow' : 'text-slate-505'
                                                    }`}>{m === 'upload' ? 'Upload File' : 'Embed URL'}
                                            </button>
                                        ))}
                                    </div>
                                    {pdfMode === 'upload' ? (
                                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-indigo-300 transition-all">
                                            <input type="file" id="instPdfFile" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={e => setMatFile(e.target.files[0])} className="hidden" />
                                            <label htmlFor="instPdfFile" className="cursor-pointer flex flex-col items-center gap-2">
                                                <Upload size={20} className="text-slate-400" />
                                                <span className="text-xs font-bold text-slate-500">{matFile ? matFile.name : 'Click to upload PDF/Doc file'}</span>
                                            </label>
                                        </div>
                                    ) : (
                                        <input type="url" value={matUrl} onChange={e => setMatUrl(e.target.value)} placeholder="https://drive.google.com/..." className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#3E3ADD] focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800 font-semibold" />
                                    )}
                                </div>
                            )}

                            {/* Web / HTML */}
                            {selectedUploadType === 'web' && (
                                <div className="space-y-3">
                                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                                        {['embedded', 'code'].map(m => (
                                            <button key={m} type="button" onClick={() => setWebMode(m)}
                                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black capitalize transition-all cursor-pointer ${webMode === m ? 'bg-white text-[#0b1329] shadow' : 'text-slate-505'
                                                    }`}>{m === 'embedded' ? 'Embed URL' : 'HTML Code'}
                                            </button>
                                        ))}
                                    </div>
                                    {webMode === 'embedded' ? (
                                        <input type="url" value={matUrl} onChange={e => setMatUrl(e.target.value)} placeholder="https://example.com/page" className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#3E3ADD] focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800 font-semibold" />
                                    ) : (
                                        <textarea value={htmlCode} onChange={e => setHtmlCode(e.target.value)} rows={6} placeholder="<!DOCTYPE html>..." className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-[#3E3ADD] focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800 resize-none" />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50 shrink-0">
                            <button type="button" onClick={() => setAdminUploadModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-slate-205 text-slate-600 text-xs font-black hover:bg-slate-100 transition-all cursor-pointer">Cancel</button>
                            <button type="submit" disabled={uploadingMaterial} className="px-6 py-2.5 rounded-xl bg-[#0b1329] hover:bg-[#1b2a53] text-white text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-60">
                                {uploadingMaterial ? <><Loader2 size={12} className="animate-spin" /> Uploading...</> : (editingMaterial ? 'Save Changes' : 'Upload Material')}
                            </button>
                        </div>
                    </form>
                </div>,
                document.body
            )}
        </DashboardLayout>
    );
};

export default InstituteDashboard;
