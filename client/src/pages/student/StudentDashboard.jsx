import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import { BookOpen, Clock, FileText, CheckCircle, User } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
                <Icon size={24} className={color.replace('bg-', 'text-')} />
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</span>
        </div>
        <h3 className="text-3xl font-bold text-slate-800 mb-1">{value}</h3>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
    </div>
);

const StudentDashboard = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [tests, setTests] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userInfo = JSON.parse(localStorage.getItem('userInfo'));
                if (!userInfo) return;

                const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };

                // Concurrent fetch for profile, tests and submissions
                const [profileRes, testsRes, subsRes] = await Promise.all([
                    axios.get('/api/users/profile', config),
                    axios.get('/api/tests', config),
                    axios.get('/api/submissions', config)
                ]);

                setProfile(profileRes.data);
                setTests(testsRes.data);
                setSubmissions(subsRes.data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return (
        <DashboardLayout role="Student">
            <LoadingPlaceholder type="dashboard" />
        </DashboardLayout>
    );

    const submittedTestIds = new Set(submissions.map(s => s.test?._id || s.test));
    const pendingTests = tests.filter(t => !submittedTestIds.has(t._id));
    const completedTests = tests.filter(t => submittedTestIds.has(t._id));
    const upcomingTests = pendingTests.slice(0, 3); // Just show first 3 for dashboard


    return (
        <DashboardLayout role="Student">
            <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Student Dashboard</h1>
                    <p className="text-slate-500">Welcome back, {profile?.name?.split(' ')[0]}! Track your progress here.</p>
                </div>
                <div className="flex gap-2">
                    <span className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold shadow-sm border border-indigo-100">
                        {profile?.studentProfile?.subject || 'No Subject Assigned'}
                    </span>
                    <span className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold shadow-sm">
                        {profile?.studentProfile?.course?.name || profile?.studentProfile?.course || 'No Course'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <StatCard title="Pending Tests" value={pendingTests.length} icon={Clock} color="bg-orange-500 text-orange-500" />
                <StatCard title="Completed Tests" value={completedTests.length} icon={CheckCircle} color="bg-emerald-500 text-emerald-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Stats Area / Recent */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800">Upcoming Tests</h3>
                            <button onClick={() => navigate('/student/tests')} className="text-sm text-indigo-600 font-medium hover:underline">View All</button>
                        </div>
                        <div className="space-y-4">
                            {upcomingTests.length > 0 ? upcomingTests.map((test) => (
                                <div key={test._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm">
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800">{test.title}</h4>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                <Clock size={12} />
                                                <span>Subject: {test.subject}</span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                <span>Category: {test.activity || 'General'}</span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                <span>{test.settings?.duration} mins</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/student/take-test/${test._id}`)}
                                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 shadow-sm transition-colors"
                                    >
                                        Start Test
                                    </button>
                                </div>
                            )) : (

                                <div className="text-center py-10">
                                    <p className="text-slate-400 font-medium italic">No upcoming tests found for your assigned subject.</p>
                                    <p className="text-[10px] text-slate-300 mt-2 lowercase">checked for institute: {profile?.institute?.name || 'N/A'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Profile / Secondary */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg ring-4 ring-indigo-50">
                            {profile?.name?.[0]}
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">{profile?.name}</h2>
                        <span className="text-sm text-slate-500">{profile?.email}</span>

                        <div className="w-full mt-8 space-y-4">
                            <div className="flex justify-between text-sm items-center p-3 bg-slate-50 rounded-xl">
                                <span className="text-slate-500">Enrolled Since</span>
                                <span className="font-bold text-slate-700">
                                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm items-center p-3 bg-indigo-50/50 rounded-xl">
                                <span className="text-slate-500">Subject</span>
                                <span className="font-bold text-indigo-700">
                                    {profile?.studentProfile?.subject || 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm items-center p-3 bg-slate-50 rounded-xl">
                                <span className="text-slate-500">Status</span>
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold uppercase tracking-wide">
                                    Active
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default StudentDashboard;
