import { useAuth } from '../../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Users, BookOpen, FileText, CheckCircle, Plus, Building2, RefreshCw, UserCheck, UserMinus, UserX, GraduationCap, Edit, Briefcase, Calculator, Megaphone, Heart, FolderOpen, Settings } from 'lucide-react';
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
    };

    return (
        <DashboardLayout role="Admin">
            {/* Header section with actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Analytics Dashboard</h1>
                    <p className="text-slate-500 mt-1">Real-time overview of your educational ecosystem.</p>
                </div>
                <div className="relative w-full md:w-auto flex justify-end" ref={dropdownRef}>
                    <button 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                        className="px-5 py-2.5 bg-[#0b1329] text-white rounded-2xl hover:bg-[#152244] hover:shadow-lg transition-all font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#0b1329]/15 active:scale-95 w-full md:w-auto z-25"
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
                                        className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2.5"
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

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <StatCard title="Total User" value={stats.totalUsers || 0} icon={Users} color="bg-slate-600 text-slate-600" onClick={() => navigate('/admin/users')} />
                <StatCard title="Registered User" value={stats.registeredUsers || 0} icon={UserCheck} color="bg-indigo-600 text-indigo-600" onClick={() => navigate('/admin/users?tab=registered')} />
                <StatCard title="Guest User" value={stats.guestUsers || 0} icon={UserMinus} color="bg-amber-500 text-amber-500" onClick={() => navigate('/admin/users?tab=guest')} />
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
                <StatCard title="Services" value={stats.services || 0} icon={Settings} color="bg-lime-600 text-lime-600" onClick={() => navigate('/admin/tools')} />
            </div>



            <AddUserModal isOpen={isUserModalOpen} onClose={() => { setIsUserModalOpen(false); setQuickAddRole(null); }} role={quickAddRole || modalRole} onSuccess={fetchDashboardData} />
            <AddInstituteModal isOpen={isInstituteModalOpen} onClose={() => setIsInstituteModalOpen(false)} refreshData={fetchDashboardData} />
            <AddCourseModal isOpen={isCourseModalOpen} onClose={() => setIsCourseModalOpen(false)} refreshData={fetchDashboardData} />
        </DashboardLayout>
    );
};

export default AdminDashboard;
