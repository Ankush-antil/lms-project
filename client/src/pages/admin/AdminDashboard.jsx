import { useAuth } from '../../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Users, BookOpen, FileText, CheckCircle, Plus, Building2, RefreshCw, UserCheck, UserMinus, UserX, GraduationCap, Edit, Briefcase, Calculator, Megaphone, Heart, FolderOpen, Settings, Check, Clock, X, Trash2, Search, Printer } from 'lucide-react';
import AddUserModal from '../../components/AddUserModal';
import EditUserModal from '../../components/EditUserModal';
import { useUserProfile } from '../../components/common/UserProfileContext';
import AddInstituteModal from '../../components/AddInstituteModal';
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

const AdminDashboard = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [modalRole, setModalRole] = useState('Student');
    const [isInstituteModalOpen, setIsInstituteModalOpen] = useState(false);
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [stats, setStats] = useState({ students: 0, teachers: 0, courses: 0, tests: 0, institutes: 0 });
    const [activities, setActivities] = useState([]);
    const { openProfile } = useUserProfile();
    const [loading, setLoading] = useState(true);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [quickAddRole, setQuickAddRole] = useState(null);

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
    const [applications, setApplications] = useState([]);
    const [loadingApps, setLoadingApps] = useState(false);
    const [roleRequests, setRoleRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [updatingAppId, setUpdatingAppId] = useState(null);
    const [resolvingRequestId, setResolvingRequestId] = useState(null);

    const [studyMaterials, setStudyMaterials] = useState([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);
    const [searchMaterialQuery, setSearchMaterialQuery] = useState('');
    const [deletingMaterialId, setDeletingMaterialId] = useState(null);

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

    const [selectedCourseFilter, setSelectedCourseFilter] = useState('All');
    const [selectedInstituteFilter, setSelectedInstituteFilter] = useState('All');
    const [isRiModalOpen, setIsRiModalOpen] = useState(false);
    const [riData, setRiData] = useState(null);
    const [loadingRi, setLoadingRi] = useState(false);

    const handleOpenRiReport = async (mat) => {
        if (!mat.student || !mat.student._id) {
            toast.error("No student linked to this study material");
            return;
        }

        try {
            setLoadingRi(true);
            setIsRiModalOpen(true);
            setRiData({
                student: mat.student,
                subject: mat.subject || 'General',
                inboxId: mat.inboxId || 'N/A',
                dayNum: mat.dayNum,
                course: mat.course || 'N/A',
                tests: [],
                submissionMap: new Map(),
                stats: { total: 0, completed: 0, avg: 0 }
            });

            // 1. Fetch student profile to get the course ID
            const { data: studentUser } = await axios.get(`/api/users/${mat.student._id}`);
            const coursesList = studentUser.studentProfile?.coursesList || [];

            // Match course by name
            let courseId = null;
            if (mat.course) {
                const matchedCourse = coursesList.find(c => (c.course?.name || '').trim().toLowerCase() === mat.course.trim().toLowerCase());
                courseId = matchedCourse?.course?._id || matchedCourse?.course || studentUser.studentProfile?.course?._id || studentUser.studentProfile?.course;
            } else {
                courseId = studentUser.studentProfile?.course?._id || studentUser.studentProfile?.course;
            }

            if (!courseId) {
                throw new Error("Could not determine student course ID");
            }

            // 2. Fetch all assigned tests for the student's course
            const { data: assignedTests } = await axios.get(`/api/tests/student/${mat.student._id}/assigned?courseId=${courseId}`);

            // 3. Fetch submissions
            const { data: submissions } = await axios.get(`/api/test-submissions/student/${mat.student._id}`);

            // 4. Load the course object to get the durations/inbox mapping
            const { data: courseObj } = await axios.get(`/api/courses/${courseId}`);

            // Build the subjectDaysMapping for the course to resolve which tests belong to this inboxId!
            const subjects = courseObj.subjects || [];
            const durations = courseObj.subjectDurations || [];
            const totalDuration = courseObj.duration || 5;

            let currentDayIndex = 1;
            const mapping = [];

            if (durations && durations.length > 0) {
                durations.forEach(d => {
                    const subName = d.subjectName;
                    const subDur = Number(d.duration) || 0;
                    const daysList = [];
                    for (let i = 1; i <= subDur; i++) {
                        if (currentDayIndex <= totalDuration) {
                            daysList.push({
                                dayNum: i,
                                indexNum: currentDayIndex,
                                id: `Inbox ${currentDayIndex}`
                            });
                            currentDayIndex++;
                        }
                    }
                    if (daysList.length > 0) {
                        mapping.push({ subjectName: subName, days: daysList });
                    }
                });
            }

            // Group tests by matched global inbox IDs
            const getMatchingInboxIdsForTest = (test, subjectDays) => {
                if (!test.index) return [];
                const matches = [];
                const parts = test.index.split(',').map(p => p.trim());
                parts.forEach(part => {
                    const match = part.match(/day_(\d+)/i) || part.match(/inbox_(\d+)/i) || part.match(/day\s*(\d+)/i) || part.match(/inbox\s*(\d+)/i);
                    if (match) {
                        const dayNum = parseInt(match[1]);
                        const found = subjectDays.flatMap(g => g.days).find(d => d.indexNum === dayNum);
                        if (found) matches.push(found.id);
                    }
                });
                return matches;
            };

            const inboxTests = assignedTests.filter(test => {
                const matchedInboxIds = getMatchingInboxIdsForTest(test, mapping);
                return matchedInboxIds.some(id => id.trim().toLowerCase() === mat.inboxId.trim().toLowerCase());
            });

            // Submission map for this inbox
            const submissionMap = new Map();
            submissions.forEach(sub => {
                const testId = sub.test?._id || sub.test;
                submissionMap.set(String(testId), sub);
            });

            // Calculate stats
            let completedCount = 0;
            let totalScoreSum = 0;
            let evaluatedCount = 0;

            inboxTests.forEach(test => {
                const sub = submissionMap.get(String(test._id));
                if (sub && sub.status === 'evaluated') {
                    completedCount++;
                    evaluatedCount++;
                    const maxMarks = sub.test?.questions?.reduce((sum, q) => sum + (q.marks || 0), 0) || 100;
                    const pct = Math.round((sub.totalMarks / maxMarks) * 100);
                    totalScoreSum += pct;
                } else if (sub && (sub.status === 'submitted' || sub.status === 'returned')) {
                    completedCount++;
                }
            });

            const avgPercentage = evaluatedCount > 0 ? Math.round(totalScoreSum / evaluatedCount) : 0;

            setRiData({
                student: mat.student,
                subject: mat.subject || 'General',
                inboxId: mat.inboxId,
                dayNum: mat.dayNum,
                course: mat.course || 'N/A',
                tests: inboxTests,
                submissionMap,
                stats: {
                    total: inboxTests.length,
                    completed: completedCount,
                    avg: avgPercentage
                }
            });

        } catch (err) {
            console.error("Error generating RI report:", err);
            toast.error("Failed to generate RI performance metrics");
            setIsRiModalOpen(false);
        } finally {
            setLoadingRi(false);
        }
    };

    const fetchApplications = async () => {
        try {
            setLoadingApps(true);
            const { data } = await axios.get('/api/setup/institute-applications');
            setApplications(data);
        } catch (err) {
            console.error("Error fetching applications:", err);
            toast.error("Failed to load applications");
        } finally {
            setLoadingApps(false);
        }
    };

    const fetchRoleRequests = async () => {
        try {
            setLoadingRequests(true);
            const { data } = await axios.get('/api/registration-requests/institute');
            setRoleRequests(data);
        } catch (err) {
            console.error("Error fetching staff requests:", err);
            toast.error("Failed to load staff requests");
        } finally {
            setLoadingRequests(false);
        }
    };

    const handleUpdateAppStatus = async (id, status) => {
        try {
            setUpdatingAppId(id);
            await axios.put(`/api/setup/applications/${id}/status`, { status });
            toast.success(`Application status updated to ${status}`);
            setApplications(prev => prev.map(app => app._id === id ? { ...app, status } : app));
        } catch (err) {
            console.error("Error updating application status:", err);
            toast.error(err.response?.data?.message || "Failed to update status");
        } finally {
            setUpdatingAppId(null);
        }
    };

    const handleDeleteApplication = async (id) => {
        if (!window.confirm("Are you sure you want to delete this application request?")) return;
        try {
            setUpdatingAppId(id);
            await axios.delete(`/api/setup/applications/${id}`);
            toast.success("Application deleted successfully");
            setApplications(prev => prev.filter(app => app._id !== id));
        } catch (err) {
            console.error("Error deleting application:", err);
            toast.error(err.response?.data?.message || "Failed to delete application");
        } finally {
            setUpdatingAppId(null);
        }
    };

    const handleResolveRoleRequest = async (id, status) => {
        if (!window.confirm(`Are you sure you want to ${status.toLowerCase()} this staff request?`)) return;
        try {
            setResolvingRequestId(id);
            await axios.put(`/api/registration-requests/${id}/institute-resolve`, { status });
            toast.success(`Request ${status.toLowerCase()} successfully`);
            setRoleRequests(prev => prev.filter(r => r._id !== id));
        } catch (err) {
            console.error("Error resolving request:", err);
            toast.error(err.response?.data?.message || "Failed to resolve request");
        } finally {
            setResolvingRequestId(null);
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Registered':
            case 'Accepted':
            case 'Approved':
                return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'Under Review':
            case 'Pending':
                return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'Rejected':
                return 'bg-rose-50 text-rose-600 border-rose-100';
            default:
                return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    useEffect(() => {
        if (activeTab === 'applications') {
            fetchApplications();
        } else if (activeTab === 'role-requests') {
            fetchRoleRequests();
        } else if (activeTab === 'study-material') {
            fetchStudyMaterials();
        }
    }, [activeTab]);

    const rolesList = [
        { label: 'Institute', modal: 'institute', icon: Building2 },
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
        if (item.modal === 'institute') {
            setIsInstituteModalOpen(true);
        } else if (item.role === 'Limited User') {
            toast('Limited Users are created automatically when candidates submit a public test. Share a public test link to register them.', {
                icon: 'ℹ️',
                duration: 6000
            });
            navigate('/admin/activities');
        } else {
            setModalRole(item.role);
            setIsUserModalOpen(true);
        }
    };

    const fetchDashboardData = async () => {
        try {


            const { data } = await axios.get('/api/dashboard/stats');
            setStats(data.stats);
            setActivities(data.activities);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const openUserModal = (role) => {
        setModalRole(role);
        setIsUserModalOpen(true);
    };

    const getInitials = (name) => {
        return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '??';
    };

    const getTimeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return new Date(date).toLocaleDateString();
    }; return (
        <DashboardLayout role="Admin">
            {/* Header section with actions */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Analytics Dashboard</h1>
                        <p className="text-slate-500 mt-1 text-sm">Real-time overview of your educational ecosystem.</p>
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
                            onClick={() => handleTabChange('overview')}
                            className={`flex-1 sm:flex-none px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${activeTab === 'overview' ? 'bg-[#0b1329] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => handleTabChange('applications')}
                            className={`flex-1 sm:flex-none px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'applications' ? 'bg-[#0b1329] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Applications
                        </button>
                        <button
                            onClick={() => handleTabChange('role-requests')}
                            className={`flex-1 sm:flex-none px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${activeTab === 'role-requests' ? 'bg-[#0b1329] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Staff Requests
                        </button>
                    </div>
                </div>
            </div>

            {/* Conditional Views */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
                    <StatCard title="Total User" value={stats.totalUsers || 0} icon={Users} color="bg-slate-600 text-slate-600" onClick={() => navigate('/admin/users')} />
                    <StatCard title="Registered User" value={stats.registeredUsers || 0} icon={UserCheck} color="bg-indigo-600 text-indigo-600" onClick={() => navigate('/admin/users?tab=registered')} />
                    <StatCard title="Guest User" value={stats.guestUsers || 0} icon={UserMinus} color="bg-amber-50 text-amber-500" onClick={() => navigate('/admin/users?tab=guest')} />
                    <StatCard title="Limited User" value={stats.limitedUsers || 0} icon={UserX} color="bg-rose-500 text-rose-500" onClick={() => navigate('/admin/users?tab=limited')} />

                    <StatCard
                        title="Student" value={stats.students || 0} icon={GraduationCap} color="bg-blue-500 text-blue-500"
                        onClick={() => navigate('/admin/students')}
                        onAdd={() => { setQuickAddRole('Student'); setIsUserModalOpen(true); }}
                        onEdit={() => navigate('/admin/students')}
                    />
                    <StatCard
                        title="Teacher" value={stats.teachers || 0} icon={CheckCircle} color="bg-emerald-500 text-emerald-500"
                        onClick={() => navigate('/admin/teachers')}
                        onAdd={() => { setQuickAddRole('Teacher'); setIsUserModalOpen(true); }}
                        onEdit={() => navigate('/admin/teachers')}
                    />
                    <StatCard
                        title="Editor" value={stats.editors || 0} icon={Edit} color="bg-pink-500 text-pink-500"
                        onClick={() => navigate('/admin/editors')}
                        onAdd={() => { setQuickAddRole('Editor'); setIsUserModalOpen(true); }}
                        onEdit={() => navigate('/admin/editors')}
                    />
                    <StatCard title="Institute" value={stats.institutes || 0} icon={Building2} color="bg-orange-500 text-orange-500"
                        onClick={() => navigate('/admin/institutes')}
                        onAdd={() => setIsInstituteModalOpen(true)}
                        onEdit={() => navigate('/admin/institutes')}
                    />

                    <StatCard
                        title="Staff" value={stats.staff || 0} icon={Briefcase} color="bg-cyan-600 text-cyan-600"
                        onClick={() => navigate('/admin/staff')}
                        onAdd={() => { setQuickAddRole('Staff'); setIsUserModalOpen(true); }}
                        onEdit={() => navigate('/admin/staff')}
                    />
                    <StatCard
                        title="Accountants" value={stats.accountants || 0} icon={Calculator} color="bg-teal-600 text-teal-600"
                        onClick={() => navigate('/admin/accountants')}
                        onAdd={() => { setQuickAddRole('Accountant'); setIsUserModalOpen(true); }}
                        onEdit={() => navigate('/admin/accountants')}
                    />
                    <StatCard
                        title="Marketers" value={stats.marketers || 0} icon={Megaphone} color="bg-yellow-500 text-yellow-500"
                        onClick={() => navigate('/admin/marketers')}
                        onAdd={() => { setQuickAddRole('Marketer'); setIsUserModalOpen(true); }}
                        onEdit={() => navigate('/admin/marketers')}
                    />
                    <StatCard
                        title="Parents" value={stats.parents || 0} icon={Heart} color="bg-rose-400 text-rose-400"
                        onClick={() => navigate('/admin/parents')}
                        onAdd={() => { setQuickAddRole('Parent'); setIsUserModalOpen(true); }}
                        onEdit={() => navigate('/admin/parents')}
                    />

                    <StatCard title="Courses" value={stats.courses || 0} icon={BookOpen} color="bg-sky-500 text-sky-500"
                        onClick={() => navigate('/admin/courses')}
                        onAdd={() => setIsCourseModalOpen(true)}
                        onEdit={() => navigate('/admin/courses')}
                    />
                    <StatCard title="Subjects" value={stats.subjects || 0} icon={FolderOpen} color="bg-violet-500 text-violet-500" onClick={() => navigate('/admin/subjects')} />
                    <StatCard title="Activities" value={stats.tests || 0} icon={FileText} color="bg-purple-500 text-purple-500" onClick={() => navigate('/admin/activities')} />
                    <StatCard title="Services" value={stats.services || 0} icon={Settings} color="bg-lime-600 text-lime-600" onClick={() => navigate('/admin/drive')} />
                    <StatCard title="Study Material" value={studyMaterials.length} icon={BookOpen} color="bg-emerald-500 text-emerald-500" onClick={() => handleTabChange('study-material')} />
                </div>
            )}

            {activeTab === 'applications' && (
                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm animate-fade-in text-left">
                    <div className="border-b border-slate-100 pb-4 mb-6 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-900">Student Registration Applications</h2>
                            <p className="text-slate-500 text-xs mt-1">Review pending admission requests across all institutes</p>
                        </div>
                        <span className="bg-indigo-50 text-indigo-700 px-3.5 py-1.5 rounded-full text-xs font-black font-mono">
                            Total: {applications.length}
                        </span>
                    </div>

                    {loadingApps ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b1329]"></div>
                        </div>
                    ) : applications.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 font-medium font-semibold">
                            No applications found
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-slate-100">
                            <table className="min-w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                        <th className="p-4 font-semibold">Applicant</th>
                                        <th className="p-4 font-semibold">Institute</th>
                                        <th className="p-4 font-semibold">Course</th>
                                        <th className="p-4 font-semibold">Date</th>
                                        <th className="p-4 font-semibold">Statement</th>
                                        <th className="p-4 font-semibold text-center">Status</th>
                                        <th className="p-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-semibold">
                                    {applications.map((app) => (
                                        <tr key={app._id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800">{app.name}</span>
                                                    <span className="text-slate-400 text-[10px] font-semibold">{app.email}</span>
                                                    <span className="text-slate-400 text-[10px] font-semibold">{app.phone || 'No Phone'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800">{app.institute?.name || 'N/A'}</span>
                                                    <span className="text-slate-400 text-[10px] font-mono">{app.institute?.code || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className="font-bold text-slate-700">{app.course?.name || 'Unknown Course'}</span>
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
                                                {app.statement || <span className="italic text-slate-300">No statement</span>}
                                            </td>
                                            <td className="p-4 whitespace-nowrap text-center">
                                                <span className={`px-3 py-1 border rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusBadgeClass(app.status)}`}>
                                                    {app.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right whitespace-nowrap">
                                                <div className="flex justify-end gap-1.5">
                                                    <button
                                                        onClick={() => handleUpdateAppStatus(app._id, 'Accepted')}
                                                        disabled={updatingAppId === app._id || app.status === 'Accepted'}
                                                        className={`p-1.5 rounded-lg border text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100 hover:text-emerald-700 transition-all cursor-pointer ${app.status === 'Accepted' ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                        title="Accept Application"
                                                    >
                                                        <Check size={14} className="stroke-[3px]" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateAppStatus(app._id, 'Under Review')}
                                                        disabled={updatingAppId === app._id || app.status === 'Under Review' || app.status === 'Accepted'}
                                                        className={`p-1.5 rounded-lg border text-amber-600 bg-amber-50 border-amber-100 hover:bg-amber-100 hover:text-amber-700 transition-all cursor-pointer ${(app.status === 'Under Review' || app.status === 'Accepted') ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                        title="Put Under Review"
                                                    >
                                                        <Clock size={14} className="stroke-[3px]" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateAppStatus(app._id, 'Rejected')}
                                                        disabled={updatingAppId === app._id || app.status === 'Rejected' || app.status === 'Accepted'}
                                                        className={`p-1.5 rounded-lg border text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-100 hover:text-rose-700 transition-all cursor-pointer ${(app.status === 'Rejected' || app.status === 'Accepted') ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                        title="Reject Application"
                                                    >
                                                        <X size={14} className="stroke-[3px]" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteApplication(app._id)}
                                                        disabled={updatingAppId === app._id}
                                                        className="p-1.5 rounded-lg border text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
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
            )}

            {activeTab === 'role-requests' && (
                <div className="space-y-8 animate-fade-in text-left">
                    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-4">
                        <div className="border-b border-slate-100 pb-4 mb-6 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-extrabold text-slate-900">Staff & Teacher Joining Requests</h2>
                                <p className="text-slate-500 text-xs mt-1">Approve or reject teacher/editor recruitment requests across all institutes</p>
                            </div>
                            <span className="bg-indigo-50 text-indigo-705 px-3.5 py-1.5 rounded-full text-xs font-black font-mono">
                                Total: {roleRequests.length}
                            </span>
                        </div>

                        {loadingRequests ? (
                            <div className="flex justify-center items-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b1329]"></div>
                            </div>
                        ) : roleRequests.length === 0 ? (
                            <div className="text-center py-16 text-slate-400 font-medium font-semibold">
                                No staff joining requests found
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-100">
                                <table className="min-w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                            <th className="p-4 font-semibold">Applicant</th>
                                            <th className="p-4 font-semibold">Target Institute</th>
                                            <th className="p-4 font-semibold">Role</th>
                                            <th className="p-4 font-semibold">Specialization / Details</th>
                                            <th className="p-4 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-semibold">
                                        {roleRequests.map((req) => (
                                            <tr key={req._id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800">{req.name}</span>
                                                        <span className="text-slate-400 text-[10px] font-semibold">{req.email}</span>
                                                        <span className="text-slate-400 text-[10px] font-semibold">{req.phone || 'No Phone'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800">{req.targetInstitute?.name || 'N/A'}</span>
                                                        <span className="text-slate-400 text-[10px] font-mono">{req.targetInstitute?.code || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${req.role === 'Teacher'
                                                            ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                                                        }`}>
                                                        {req.role}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        {req.role === 'Teacher' ? (
                                                            <>
                                                                <span className="text-slate-500 font-medium">Specs: {req.subjectSpecialization || 'None'}</span>
                                                                <span className="text-[10px] text-slate-400">Eligibility: {req.eligibility || 'N/A'}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-slate-500 italic">No extra details</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right whitespace-nowrap">
                                                    <div className="flex justify-end gap-1.5">
                                                        <button
                                                            onClick={() => handleResolveRoleRequest(req._id, 'Approved')}
                                                            disabled={resolvingRequestId === req._id}
                                                            className="p-1.5 rounded-lg border text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100 hover:text-emerald-700 transition-all cursor-pointer font-extrabold flex items-center gap-1 text-[10px]"
                                                            title="Approve & Create Account"
                                                        >
                                                            <Check size={14} className="stroke-[3px]" /> Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleResolveRoleRequest(req._id, 'Rejected')}
                                                            disabled={resolvingRequestId === req._id}
                                                            className="p-1.5 rounded-lg border text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-100 hover:text-rose-700 transition-all cursor-pointer font-extrabold flex items-center gap-1 text-[10px]"
                                                            title="Reject Request"
                                                        >
                                                            <X size={14} className="stroke-[3px]" /> Reject
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
            )}

            {activeTab === 'study-material' && (() => {
                const filteredMaterials = studyMaterials.filter(mat => {
                    const query = searchMaterialQuery.toLowerCase();
                    const titleMatch = (mat.title || '').toLowerCase().includes(query);
                    const studentMatch = mat.student?.name ? mat.student.name.toLowerCase().includes(query) : false;
                    const subjectMatch = (mat.subject || '').toLowerCase().includes(query);
                    const courseMatch = (mat.course || '').toLowerCase().includes(query);
                    const inboxMatch = (mat.inboxId || '').toLowerCase().includes(query);
                    const teacherMatch = mat.uploadedBy?.name ? mat.uploadedBy.name.toLowerCase().includes(query) : false;
                    const instituteMatch = (mat.institute || '').toLowerCase().includes(query);
                    const searchMatches = titleMatch || studentMatch || subjectMatch || courseMatch || inboxMatch || teacherMatch || instituteMatch;

                    const courseMatches = selectedCourseFilter === 'All' || mat.course === selectedCourseFilter;
                    const instituteMatches = selectedInstituteFilter === 'All' || mat.institute === selectedInstituteFilter;

                    return searchMatches && courseMatches && instituteMatches;
                });

                return (
                    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm animate-fade-in text-left">
                        <div className="border-b border-slate-100 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-extrabold text-slate-900">Study Materials Repository</h2>
                                <p className="text-slate-500 text-xs mt-1">Monitor all PDF/Docs and Web Links uploaded by teachers for students</p>
                            </div>
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto">
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

                                {/* Institutes Filter */}
                                <select
                                    value={selectedInstituteFilter}
                                    onChange={(e) => setSelectedInstituteFilter(e.target.value)}
                                    className="h-9 px-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3E3ADD] focus:ring-2 focus:ring-indigo-100 transition-all text-slate-700 font-extrabold cursor-pointer min-w-[115px] w-full sm:w-auto shadow-sm"
                                >
                                    <option value="All">All Institutes</option>
                                    {Array.from(new Set(studyMaterials.map(m => m.institute).filter(Boolean))).map(i => (
                                        <option key={i} value={i}>{i}</option>
                                    ))}
                                </select>

                                <div className="relative flex-1 sm:flex-none w-full sm:w-auto">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Search by student, subject, teacher..."
                                        value={searchMaterialQuery}
                                        onChange={(e) => setSearchMaterialQuery(e.target.value)}
                                        className="w-full sm:w-56 h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3E3ADD] focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400 text-slate-800 font-semibold"
                                    />
                                </div>
                                <span className="bg-[#0b1329] text-white px-3.5 py-1.5 rounded-full text-xs font-black font-mono shrink-0">
                                    Total: {filteredMaterials.length}
                                </span>
                            </div>
                        </div>

                        {loadingMaterials ? (
                            <div className="flex justify-center items-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b1329]"></div>
                            </div>
                        ) : filteredMaterials.length === 0 ? (
                            <div className="text-center py-16 text-slate-400 font-medium font-semibold">
                                No study materials found
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-100">
                                <table className="min-w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                            <th className="p-4 font-semibold">Student & Course</th>
                                            <th className="p-4 font-semibold">Subject & Inbox</th>
                                            <th className="p-4 font-semibold">Material Detail</th>
                                            <th className="p-4 font-semibold">Uploaded By</th>
                                            <th className="p-4 font-semibold text-center">Status</th>
                                            <th className="p-4 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-semibold">
                                        {filteredMaterials.map((mat) => {
                                            const uploadDate = new Date(mat.createdAt).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            });
                                            const statusLabel = mat.status === 'upcoming' ? 'Upcoming' : mat.status === 'assign' ? 'Assigned' : 'General';
                                            const statusBadgeColor = mat.status === 'upcoming'
                                                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                                : mat.status === 'assign'
                                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-100';

                                            return (
                                                <tr key={mat._id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="p-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-800">{mat.student?.name || <span className="italic text-slate-400">All Students</span>}</span>
                                                            <span className="text-slate-400 text-[10px] font-semibold">{mat.student?.email || ''}</span>
                                                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                                                {mat.course && <span className="text-[10px] text-indigo-600 font-extrabold uppercase">{mat.course}</span>}
                                                                {mat.course && mat.institute && <span className="text-slate-300 text-[9px]">•</span>}
                                                                {mat.institute && <span className="text-[10px] text-emerald-600 font-black uppercase">{mat.institute}</span>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-800">{mat.subject || <span className="italic text-slate-400">General</span>}</span>
                                                            <span className="text-slate-400 text-[10px] font-semibold uppercase">{mat.dayNum ? `Inbox ${mat.dayNum}` : (mat.inboxId || 'N/A')}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-800">{mat.title}</span>
                                                            <span className="text-slate-400 text-[10px] font-mono truncate max-w-[180px]" title={mat.filename}>
                                                                {mat.filename}
                                                            </span>
                                                            <span className="text-slate-400 text-[9px] mt-0.5">{uploadDate}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-800">{mat.uploadedBy?.name || 'Unknown'}</span>
                                                            <span className="text-slate-400 text-[10px] font-semibold">{mat.uploadedBy?.role || 'Instructor'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 whitespace-nowrap text-center">
                                                        <span className={`px-2.5 py-1 border rounded-full text-[9px] font-black uppercase tracking-wider ${statusBadgeColor}`}>
                                                            {statusLabel}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right whitespace-nowrap">
                                                        <div className="flex justify-end gap-1.5">
                                                            {mat.student && (
                                                                <button
                                                                    onClick={() => handleOpenRiReport(mat)}
                                                                    className="px-2.5 py-1 rounded-lg border border-indigo-200 text-[#3E3ADD] bg-indigo-50 hover:bg-[#3E3ADD] hover:text-white transition-all flex items-center justify-center shadow-xs cursor-pointer font-black text-[9px] uppercase tracking-wider active:scale-95"
                                                                    title="View Student RI Performance Report"
                                                                >
                                                                    RI
                                                                </button>
                                                            )}
                                                            <a
                                                                href={mat.fileUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="p-1.5 rounded-lg border border-slate-200 text-slate-650 bg-slate-50 hover:bg-slate-100 transition-all flex items-center justify-center shadow-xs"
                                                                title="View file/link"
                                                            >
                                                                <FolderOpen size={13} />
                                                            </a>
                                                            <button
                                                                onClick={() => handleDeleteMaterial(mat._id)}
                                                                disabled={deletingMaterialId === mat._id}
                                                                className="p-1.5 rounded-lg border text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-100 transition-all flex items-center justify-center shadow-xs cursor-pointer"
                                                                title="Delete Study Material"
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
            })()}

            {/* Student RI Report Modal */}
            {isRiModalOpen && riData && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
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
                                <p className="text-xs text-slate-450 font-semibold">Generating report data...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Metadata Grid */}
                                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/50 text-xs font-semibold text-slate-700">
                                    <div><span className="text-[9px] uppercase tracking-wider text-slate-400 block font-black mb-0.5">Subject Name</span>{riData.subject}</div>
                                    <div><span className="text-[9px] uppercase tracking-wider text-slate-400 block font-black mb-0.5">Inbox / Day</span>{riData.dayNum ? `Inbox ${riData.dayNum}` : riData.inboxId}</div>
                                    <div><span className="text-[9px] uppercase tracking-wider text-slate-400 block font-black mb-0.5">Course</span>{riData.course}</div>
                                    <div><span className="text-[9px] uppercase tracking-wider text-slate-400 block font-black mb-0.5">Email</span>{riData.student?.email}</div>
                                </div>

                                {/* Stats Row */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-indigo-50/50 border border-indigo-100/80 p-3.5 rounded-2xl text-center">
                                        <div className="text-xl font-extrabold text-[#3E3ADD]">{riData.stats.total}</div>
                                        <div className="text-[9px] font-black text-indigo-400 uppercase tracking-wider mt-0.5">Total Activities</div>
                                    </div>
                                    <div className="bg-emerald-50/50 border border-emerald-100/80 p-3.5 rounded-2xl text-center">
                                        <div className="text-xl font-extrabold text-emerald-600">{riData.stats.completed} / {riData.stats.total}</div>
                                        <div className="text-[9px] font-black text-emerald-400 uppercase tracking-wider mt-0.5">Completed</div>
                                    </div>
                                    <div className="bg-purple-50/50 border border-purple-100/80 p-3.5 rounded-2xl text-center">
                                        <div className="text-xl font-extrabold text-purple-600">{riData.stats.avg}%</div>
                                        <div className="text-[9px] font-black text-purple-400 uppercase tracking-wider mt-0.5">Average Score</div>
                                    </div>
                                </div>

                                {/* Details List */}
                                <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-2xl">
                                    <table className="min-w-full text-left text-xs font-semibold">
                                        <thead className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-450 uppercase">
                                            <tr>
                                                <th className="p-3">Activity</th>
                                                <th className="p-3 text-center">Status</th>
                                                <th className="p-3 text-right">Marks</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-700">
                                            {riData.tests.map((test, idx) => {
                                                const sub = riData.submissionMap?.get(String(test._id));
                                                const isEvaluated = sub && sub.status === 'evaluated';
                                                const isSubmitted = sub && sub.status === 'submitted';
                                                const isReturned = sub && sub.status === 'returned';

                                                let statusLabel = 'Pending';
                                                let badgeColor = 'bg-slate-50 text-slate-500 border-slate-100';
                                                if (isEvaluated) {
                                                    statusLabel = 'Evaluated';
                                                    badgeColor = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                                                } else if (isSubmitted) {
                                                    statusLabel = 'Submitted';
                                                    badgeColor = 'bg-blue-50 text-blue-600 border-blue-100';
                                                } else if (isReturned) {
                                                    statusLabel = 'Returned';
                                                    badgeColor = 'bg-amber-50 text-amber-600 border-amber-100';
                                                }

                                                const maxMarks = sub?.test?.questions?.reduce((sum, q) => sum + (q.marks || 0), 0) || 100;
                                                const marksObtained = isEvaluated ? `${sub.totalMarks} / ${maxMarks}` : '-';

                                                return (
                                                    <tr key={test._id} className="hover:bg-slate-50/50">
                                                        <td className="p-3 font-bold">{idx + 1}. {test.title}</td>
                                                        <td className="p-3 text-center">
                                                            <span className={`px-2 py-0.5 border rounded-full text-[9px] font-black uppercase tracking-wider ${badgeColor}`}>
                                                                {statusLabel}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-right font-mono font-bold text-slate-800">{marksObtained}</td>
                                                    </tr>
                                                );
                                            })}
                                            {riData.tests.length === 0 && (
                                                <tr>
                                                    <td colSpan="3" className="p-4 text-center text-slate-400">No activities found for this inbox.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Footer Actions */}
                                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsRiModalOpen(false)}
                                        className="px-4.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const studentName = riData.student?.name || 'Student';
                                            const courseName = riData.course;
                                            const studentEmail = riData.student?.email || 'N/A';
                                            const inboxName = riData.dayNum ? `Inbox ${riData.dayNum}` : riData.inboxId;
                                            const subjectName = riData.subject;
                                            const reportDate = new Date().toLocaleDateString('en-GB');

                                            const printWindow = window.open('', '_blank');
                                            if (!printWindow) {
                                                toast.error("Popup blocker prevented opening the print page.");
                                                return;
                                            }

                                            const tableRowsHtml = riData.tests.map((test, idx) => {
                                                const sub = riData.submissionMap?.get(String(test._id));
                                                const isEvaluated = sub && sub.status === 'evaluated';
                                                const isSubmitted = sub && sub.status === 'submitted';
                                                const isReturned = sub && sub.status === 'returned';

                                                let statusLabel = 'Pending';
                                                let badgeClass = 'badge-pend';
                                                if (isEvaluated) { statusLabel = 'Evaluated'; badgeClass = 'badge-eval'; }
                                                else if (isSubmitted) { statusLabel = 'Submitted'; badgeClass = 'badge-sub'; }
                                                else if (isReturned) { statusLabel = 'Returned'; badgeClass = 'badge-ret'; }

                                                const maxMarks = sub?.test?.questions?.reduce((sum, q) => sum + (q.marks || 0), 0) || 100;
                                                const marksObtained = isEvaluated ? sub.totalMarks : '-';
                                                const displayPercentage = isEvaluated ? `${Math.round((sub.totalMarks / maxMarks) * 105)}%` : '-';
                                                const displayMaxMarks = isEvaluated ? maxMarks : '-';

                                                return `
                                                    <tr>
                                                        <td>${idx + 1}. ${test.title}</td>
                                                        <td>${test.activity ? test.activity.toUpperCase() : 'TEST'}</td>
                                                        <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
                                                        <td style="text-align: center; font-weight: bold;">${marksObtained}</td>
                                                        <td style="text-align: center; font-weight: bold;">${displayMaxMarks}</td>
                                                        <td style="text-align: center; font-weight: bold; color: ${isEvaluated ? '#4f46e5' : '#475569'};">${displayPercentage}</td>
                                                    </tr>
                                                `;
                                            }).join('') || '<tr><td colspan="6" style="text-align: center; color: #64748b;">No activities found in this inbox.</td></tr>';

                                            printWindow.document.write(`
                                                <html>
                                                <head>
                                                    <title>RI Report - ${studentName}</title>
                                                    <style>
                                                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.5; }
                                                        .header-title { font-size: 24px; font-weight: 800; color: #0b1329; margin-bottom: 2px; }
                                                        .header-subtitle { font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0; }
                                                        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; border: 1px solid #e2e8f0; padding: 20px; border-radius: 16px; background: #f8fafc; }
                                                        .meta-item { display: flex; flex-direction: column; }
                                                        .meta-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
                                                        .meta-value { font-size: 13px; font-weight: 700; color: #1e293b; }
                                                        .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 30px; }
                                                        .stat-card { border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; text-align: center; background: #ffffff; }
                                                        .stat-num { font-size: 20px; font-weight: 800; color: #3e3add; }
                                                        .stat-label { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-top: 4px; }
                                                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                                        th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
                                                        td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155; }
                                                        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
                                                        .badge-eval { background: #dcfce7; color: #15803d; }
                                                        .badge-sub { background: #dbeafe; color: #1d4ed8; }
                                                        .badge-ret { background: #ffedd5; color: #c2410c; }
                                                        .badge-pend { background: #f1f5f9; color: #475569; }
                                                        h3 { font-size: 15px; font-weight: bold; color: #0b1329; margin-top: 25px; margin-bottom: 10px; }
                                                    </style>
                                                </head>
                                                <body>
                                                    <div style="border-bottom: 3px solid #3e3add; padding-bottom: 15px; margin-bottom: 20px;">
                                                        <div class="header-title">INBOX PERFORMANCE REPORT (RI)</div>
                                                        <div class="header-subtitle">${inboxName} — ${subjectName}</div>
                                                    </div>
                                                    <div class="meta-grid">
                                                        <div class="meta-item"><span class="meta-label">Student Name</span><span class="meta-value">${studentName}</span></div>
                                                        <div class="meta-item"><span class="meta-label">Course</span><span class="meta-value">${courseName}</span></div>
                                                        <div class="meta-item"><span class="meta-label">Report Date</span><span class="meta-value">${reportDate}</span></div>
                                                        <div class="meta-item"><span class="meta-label">Email</span><span class="meta-value">${studentEmail}</span></div>
                                                    </div>
                                                    <div class="stats-row">
                                                        <div class="stat-card"><div class="stat-num">${riData.tests.length}</div><div class="stat-label">Total Activities</div></div>
                                                        <div class="stat-card"><div class="stat-num">${riData.stats.completed} / ${riData.tests.length}</div><div class="stat-label">Completed</div></div>
                                                        <div class="stat-card"><div class="stat-num">${riData.stats.avg}%</div><div class="stat-label">Average Score</div></div>
                                                    </div>
                                                    <h3>Activity details</h3>
                                                    <table>
                                                        <thead>
                                                            <tr>
                                                                <th>Activity Title</th>
                                                                <th>Category</th>
                                                                <th>Status</th>
                                                                <th style="text-align: center;">Obtained</th>
                                                                <th style="text-align: center;">Max Marks</th>
                                                                <th style="text-align: center;">Percentage</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            ${tableRowsHtml}
                                                        </tbody>
                                                    </table>
                                                </body>
                                                </html>
                                            `);
                                            printWindow.document.close();
                                            printWindow.print();
                                        }}
                                        className="px-4.5 py-2.5 bg-[#3E3ADD] hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-indigo-150 flex items-center gap-1.5 active:scale-95"
                                    >
                                        <Printer size={12} strokeWidth={3} /> Print Report
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <AddUserModal isOpen={isUserModalOpen} onClose={() => { setIsUserModalOpen(false); setQuickAddRole(null); }} role={quickAddRole || modalRole} onSuccess={fetchDashboardData} />
            <AddInstituteModal isOpen={isInstituteModalOpen} onClose={() => setIsInstituteModalOpen(false)} refreshData={fetchDashboardData} />
            <AddCourseModal isOpen={isCourseModalOpen} onClose={() => setIsCourseModalOpen(false)} refreshData={fetchDashboardData} />
        </DashboardLayout>
    );
};

export default AdminDashboard;
