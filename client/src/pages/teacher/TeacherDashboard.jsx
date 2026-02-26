import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import { Users, FileText, CheckCircle, Clock, BookOpen, ChevronRight, AlertCircle } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, onClick }) => (
    <div
        onClick={onClick}
        className={`bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 group cursor-pointer h-full relative overflow-hidden`}
    >
        <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-[0.03] -mr-8 -mt-8 rounded-full transition-transform group-hover:scale-150 duration-500`}></div>
        <div className="flex items-center justify-between mb-6 relative z-10">
            <div className={`p-4 rounded-2xl ${color} bg-opacity-10 shadow-sm transition-transform group-hover:scale-110`}>
                <Icon size={24} className={color.replace('bg-', 'text-')} />
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-full border border-slate-100">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live</span>
            </div>
        </div>
        <div className="relative z-10">
            <h3 className="text-4xl font-black text-slate-900 mb-1">{value}</h3>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wide opacity-80">{title}</p>
        </div>
    </div>
);

const TeacherDashboard = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const [stats, setStats] = useState({ totalStudents: 0, pending: 0, completed: 0, courses: 0 });
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {

                if (!userInfo) return navigate('/');

                

                // 1. Fetch Students & their personal stats
                const { data: studentsData } = await axios.get('/api/users/teacher-students');

                // 2. Aggregate counts
                const totalPending = studentsData.reduce((acc, s) => acc + (s.stats?.pending || 0), 0);
                const totalCompleted = studentsData.reduce((acc, s) => acc + (s.stats?.completed || 0), 0);

                setStudents(studentsData);
                setStats({
                    totalStudents: studentsData.length,
                    pending: totalPending,
                    completed: totalCompleted,
                    courses: userInfo.teacherProfile?.assignedCourses?.length || 0
                });
                setLoading(false);
            } catch (error) {
                console.error("Error fetching teacher dashboard data:", error);
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [navigate]);

    if (loading) return (
        <DashboardLayout role="Teacher">
            <LoadingPlaceholder type="dashboard" />
        </DashboardLayout>
    );

    return (
        <DashboardLayout role="Teacher">
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Teacher Console</h1>
                    <p className="text-slate-500 mt-1">Manage your courses, students, and evaluate tests in real-time.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate('/teacher/activities')}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                    >
                        <FileText size={18} /> Take Action
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard title="My Students" value={stats.totalStudents} icon={Users} color="bg-indigo-600" onClick={() => navigate('/teacher/activities')} />
                <StatCard title="Pending Tests" value={stats.pending} icon={Clock} color="bg-orange-500" onClick={() => navigate('/teacher/activities')} />
                <StatCard title="Evaluated" value={stats.completed} icon={CheckCircle} color="bg-emerald-500" onClick={() => navigate('/teacher/activities')} />
                <StatCard title="Courses taught" value={stats.courses} icon={BookOpen} color="bg-purple-600" onClick={() => { }} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Student Activity */}
                <div className="lg:col-span-2 bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Student Progress</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Recent submissions from your students</p>
                        </div>
                        <button onClick={() => navigate('/teacher/activities')} className="text-sm text-indigo-600 font-bold hover:underline py-2 px-4 bg-indigo-50 rounded-xl">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                                    <th className="p-4 font-semibold whitespace-nowrap">Student</th>
                                    <th className="p-4 font-semibold whitespace-nowrap">Course</th>
                                    <th className="p-4 font-semibold whitespace-nowrap">Pending</th>
                                    <th className="p-4 font-semibold text-right whitespace-nowrap sticky right-0 bg-slate-50 shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)] border-l border-slate-200 z-10">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {students.slice(0, 5).map((student) => (
                                    <tr key={student._id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform shadow-md flex-shrink-0">
                                                    {student.name[0]}
                                                </div>
                                                <span className="font-bold text-slate-800 text-sm">{student.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold">
                                                {student.studentProfile?.course?.name || 'Academic Course'}
                                            </span>
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${(student.stats?.pending || 0) > 0 ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                {student.stats?.pending || 0} pending
                                            </span>
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors shadow-[-8px_0_16px_-4px_rgba(0,0,0,0.06)] border-l border-slate-100">
                                            <button
                                                onClick={() => navigate('/teacher/activities')}
                                                className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Status Column */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <AlertCircle size={80} />
                        </div>
                        <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
                            <span className="w-2.5 h-2.5 bg-orange-500 rounded-full"></span>
                            Urgent Actions
                        </h3>
                        {stats.pending > 0 ? (
                            <div className="space-y-6">
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    You have <span className="text-white font-bold">{stats.pending} test submissions</span> that need your evaluation.
                                    Click below to start grading.
                                </p>
                                <button
                                    onClick={() => navigate('/teacher/activities')}
                                    className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                                >
                                    Grade Submissions
                                </button>
                            </div>
                        ) : (
                            <p className="text-slate-400 text-sm italic">Workspace is all caught up!</p>
                        )}
                    </div>

                    <div className="bg-indigo-50 rounded-[32px] p-8 border border-indigo-100">
                        <h4 className="font-bold text-indigo-900 mb-4 uppercase tracking-widest text-[10px]">Academic Tip</h4>
                        <p className="text-indigo-700/80 text-sm leading-relaxed italic">
                            "Timely feedback is 74% more likely to result in improved student performance in subsequent tests."
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default TeacherDashboard;
