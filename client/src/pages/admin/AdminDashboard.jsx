import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Users, BookOpen, FileText, CheckCircle, Plus, Building2, RefreshCw } from 'lucide-react';
import AddUserModal from '../../components/AddUserModal';
import { useUserProfile } from '../../components/common/UserProfileContext';
import AddInstituteModal from '../../components/AddInstituteModal';
import AddCourseModal from '../../components/AddCourseModal';

const StatCard = ({ title, value, icon: Icon, color, onClick }) => (
    <div
        onClick={onClick}
        className={`bg-white p-5 md:p-7 rounded-3xl shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 group relative overflow-hidden h-full ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
    >
        <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-[0.03] -mr-16 -mt-16 rounded-full transition-transform group-hover:scale-150 duration-700`}></div>
        <div className="flex items-center justify-between mb-4 md:mb-6 relative z-10">
            <div className={`p-3 md:p-4 rounded-2xl ${color} bg-opacity-10 text-white shadow-sm transition-transform group-hover:scale-110 duration-500`}>
                <Icon size={24} className={color.replace('bg-', 'text-')} />
            </div>
            <div className="flex flex-col items-end">
                <span className="text-[9px] md:text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em]">Status</span>
                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 mt-1 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Live
                </span>
            </div>
        </div>
        <div className="relative z-10">
            <h3 className="text-3xl md:text-4xl font-black text-slate-900 mb-1 lg:text-5xl">{value}</h3>
            <p className="text-xs md:text-sm text-slate-500 font-bold uppercase tracking-wide opacity-80">{title}</p>
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
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button onClick={() => setIsInstituteModalOpen(true)} className="px-5 py-2.5 bg-[#0b1329] text-white rounded-2xl hover:bg-[#152244] hover:shadow-lg transition-all font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#0b1329]/15 active:scale-95">
                        <Building2 size={16} /> Add Institute
                    </button>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <StatCard title="Total Institutes" value={stats.institutes} icon={Building2} color="bg-amber-500 text-amber-500" onClick={() => navigate('/admin/institutes')} />
                <StatCard title="Total Students" value={stats.students} icon={Users} color="bg-indigo-600 text-indigo-600" onClick={() => navigate('/admin/students')} />
                <StatCard title="Total Teachers" value={stats.teachers} icon={CheckCircle} color="bg-emerald-500 text-emerald-500" onClick={() => navigate('/admin/teachers')} />
                <StatCard title="Active Courses" value={stats.courses} icon={BookOpen} color="bg-blue-500 text-blue-500" onClick={() => navigate('/admin/courses')} />
                <StatCard title="Tests Published" value={stats.tests} icon={FileText} color="bg-purple-500 text-purple-500" onClick={() => navigate('/admin/activities')} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity Section */}
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800">Recent Activity</h3>
                        <button className="text-sm text-indigo-600 font-semibold hover:underline">View All</button>
                    </div>
                    <div className="p-2">
                        {activities.length > 0 ? (
                            <div className="divide-y divide-slate-50">
                                {activities.map((activity, idx) => (
                                    <div key={activity._id || idx} className="flex items-center justify-between p-4 hover:bg-slate-50/80 rounded-2xl transition-all group">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-2xl flex items-center justify-center text-indigo-600 transition-transform group-hover:scale-110">
                                                {activity.type === 'USER_CREATED' && <Users size={20} />}
                                                {activity.type === 'COURSE_CREATED' && <BookOpen size={20} />}
                                                {activity.type === 'INSTITUTE_CREATED' && <Building2 size={20} />}
                                                {activity.type === 'TEST_CREATED' && <FileText size={20} />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{activity.message}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{activity.detail}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{getTimeAgo(activity.createdAt)}</span>
                                            {activity.user && (
                                                <span
                                                    className="text-[10px] text-indigo-500 font-bold cursor-pointer hover:underline"
                                                    onClick={() => openProfile(activity.user._id || activity.user)}
                                                >
                                                    by {activity.user.name || 'User'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                    <RefreshCw className="animate-spin-slow" size={24} />
                                </div>
                                <p className="text-slate-400 font-medium">No recent activities found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Performance & Quick Stats */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-200">
                        <h3 className="font-bold mb-6 flex items-center justify-between">
                            Platform Engagement
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs mb-2 text-slate-400 font-bold uppercase tracking-wider">
                                    <span>Content Utilization</span>
                                    <span>{stats.courses > 0 ? 'Active' : 'Empty'}</span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000" style={{ width: stats.courses > 0 ? '100%' : '0%' }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs mb-2 text-slate-400 font-bold uppercase tracking-wider">
                                    <span>User Activity</span>
                                    <span>{stats.students + stats.teachers > 0 ? 'Monitoring' : 'Idle'}</span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000" style={{ width: stats.students + stats.teachers > 0 ? '100%' : '0%' }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold">{stats.courses > 0 ? 'Ready' : 'Setup'}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Status</p>
                            </div>
                            <div className="w-12 h-8 flex items-end gap-1">
                                {[stats.institutes, stats.students, stats.teachers, stats.courses, stats.tests].map((val, i) => (
                                    <div key={i} className="bg-white/20 w-1.5 rounded-full transition-all duration-500" style={{ height: `${Math.min((val + 1) * 20, 100)}%` }}></div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm transition-all hover:border-indigo-100">
                        <h3 className="font-bold text-slate-800 mb-6 underline decoration-indigo-500/30 decoration-4 underline-offset-4">Distribution</h3>
                        <div className="flex items-center justify-center p-4">
                            {(() => {
                                const total = stats.students + stats.teachers;
                                const studentPerc = total > 0 ? (stats.students / total) * 100 : 0;
                                const teacherPerc = total > 0 ? (stats.teachers / total) * 100 : 0;
                                const circumference = 314; // 2 * PI * R (50)
                                return (
                                    <div className="relative">
                                        <svg className="w-32 h-32 transform -rotate-90">
                                            <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                                            <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={circumference} strokeDashoffset={circumference - (circumference * studentPerc / 100)} className="text-indigo-600 transition-all duration-1000" />
                                            <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-emerald-500 transition-all duration-1000" strokeDasharray={`${circumference * teacherPerc / 100} ${circumference}`} style={{ strokeDashoffset: -circumference * studentPerc / 100 }} />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-xl font-black text-slate-900">{total}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Users</span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                        <div className="space-y-3 mt-6">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 bg-indigo-600 rounded-sm"></div>
                                    <span className="text-slate-500 font-medium">Students</span>
                                </div>
                                <span className="font-bold text-slate-800">{stats.students + stats.teachers > 0 ? Math.round((stats.students / (stats.students + stats.teachers)) * 100) : 0}%</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></div>
                                    <span className="text-slate-500 font-medium">Teachers</span>
                                </div>
                                <span className="font-bold text-slate-800">{stats.students + stats.teachers > 0 ? Math.round((stats.teachers / (stats.students + stats.teachers)) * 100) : 0}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AddUserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} role={modalRole} onSuccess={fetchDashboardData} />
            <AddInstituteModal isOpen={isInstituteModalOpen} onClose={() => setIsInstituteModalOpen(false)} refreshData={fetchDashboardData} />
            <AddCourseModal isOpen={isCourseModalOpen} onClose={() => setIsCourseModalOpen(false)} refreshData={fetchDashboardData} />
        </DashboardLayout>
    );
};

export default AdminDashboard;
