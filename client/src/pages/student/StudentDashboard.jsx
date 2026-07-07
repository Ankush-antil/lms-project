import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import { BookOpen, Clock, FileText, CheckCircle, User, Phone, X, Lock } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

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
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const { callUser, callState } = useSocket();

    const [profile, setProfile] = useState(null);
    const [tests, setTests] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [missedCalls, setMissedCalls] = useState([]);

    const handleClearMissedCalls = async () => {
        try {
            await axios.post('/api/calls/missed/clear');
            setMissedCalls([]);
            toast.success("All missed calls cleared");
        } catch (err) {
            console.error("Failed to clear missed calls:", err);
        }
    };

    const handleClearSingleMissed = async (callId) => {
        try {
            await axios.post(`/api/calls/missed/${callId}/read`);
            setMissedCalls(prev => prev.filter(c => c._id !== callId));
        } catch (err) {
            console.error("Failed to clear missed call:", err);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (!userInfo) return;

                // Concurrent fetch for profile, tests, submissions, and missed calls
                const [profileRes, testsRes, subsRes, missedRes] = await Promise.all([
                    axios.get('/api/users/profile'),
                    axios.get('/api/tests'),
                    axios.get('/api/submissions'),
                    axios.get('/api/calls/missed')
                ]);

                setProfile(profileRes.data);
                setTests(testsRes.data);
                setSubmissions(subsRes.data);
                setMissedCalls(missedRes.data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return (
        <DashboardLayout role="Student" fullWidth={true}>
            <LoadingPlaceholder type="dashboard" />
        </DashboardLayout>
    );

    const submittedTestIds = new Set(submissions.map(s => s.test?._id || s.test));
    const pendingTests = tests.filter(t => !submittedTestIds.has(t._id));
    const completedTests = tests.filter(t => submittedTestIds.has(t._id));
    const upcomingTests = pendingTests.slice(0, 3); // Just show first 3 for dashboard

    const isDashboardDisabled = profile?.studentProfile?.controls?.dashboard?.enabled === false;
    const dashboardMode = profile?.studentProfile?.controls?.dashboard?.mode || 'hide';

    if (isDashboardDisabled && dashboardMode === 'hide') {
        return (
            <DashboardLayout role="Student" fullWidth={true}>
                <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-8 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
                        <Lock size={28} />
                    </div>
                    <h2 className="text-lg font-black text-slate-800">Feature Restricted</h2>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                        Your dashboard has been disabled by your administrator.
                    </p>
                    {profile?.studentProfile?.controls?.dashboard?.note && (
                        <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-2 font-bold max-w-sm">
                            Reason: {profile.studentProfile.controls.dashboard.note}
                        </div>
                    )}
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="Student" fullWidth={true}>
            <div className={`relative ${isDashboardDisabled ? 'opacity-60 pointer-events-none select-none' : ''}`}>
                {isDashboardDisabled && (
                    <div 
                        title={profile?.studentProfile?.controls?.dashboard?.note || 'Dashboard is Disabled'}
                        className="absolute inset-0 bg-slate-50/10 backdrop-blur-[0.5px] z-50 flex items-start justify-center pt-12 pointer-events-auto cursor-not-allowed"
                    >
                        <div className="bg-[#0b1329] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border border-slate-800 animate-slide-up">
                            <Lock size={16} className="text-amber-500" />
                            <span className="text-xs font-bold">
                                Dashboard is Disabled (View-Only Mode){profile?.studentProfile?.controls?.dashboard?.note ? ` - ${profile.studentProfile.controls.dashboard.note}` : ''}
                            </span>
                        </div>
                    </div>
                )}
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
                    {missedCalls.length > 0 && (
                        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-red-800 font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
                                    Missed Calls from Teachers ({missedCalls.length})
                                </h3>
                                <button 
                                    onClick={handleClearMissedCalls} 
                                    className="text-[10px] bg-red-100 text-red-700 hover:bg-red-200 font-black px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all"
                                >
                                    Clear All
                                </button>
                            </div>
                            <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                                {missedCalls.map((call) => (
                                    <div key={call._id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-red-100 hover:border-red-200 shadow-sm transition-all text-xs">
                                        <div className="flex flex-col text-left">
                                            <span className="font-bold text-slate-800">Teacher: {call.caller?.name || 'Instructor'}</span>
                                            <span className="text-[10px] text-slate-400 font-medium">{new Date(call.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => callUser(call.caller?._id, call.caller?.name, 'Teacher')}
                                                className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors"
                                                title="Call Back"
                                            >
                                                <Phone size={12} />
                                            </button>
                                            <button
                                                onClick={() => handleClearSingleMissed(call._id)}
                                                className="p-1.5 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-slate-100"
                                                title="Dismiss"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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
                <div className="space-y-6">
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

                    {/* Course Subjects list */}
                    {profile?.studentProfile?.course?.subjects && profile.studentProfile.course.subjects.length > 0 && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-2 mb-4 text-slate-800">
                                <BookOpen size={18} className="text-indigo-600" />
                                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-700">Course Syllabus</h3>
                            </div>
                            <p className="text-xs text-slate-400 mb-3.5 leading-relaxed">
                                Below are the subjects in <span className="font-extrabold text-slate-600">{profile.studentProfile.course.name}</span>:
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {profile.studentProfile.course.subjects.map((sub, i) => {
                                    const isAssigned = profile?.studentProfile?.subject
                                        ? profile.studentProfile.subject.split(',').map(s => s.trim().toLowerCase()).includes(sub.trim().toLowerCase())
                                        : false;
                                    return (
                                        <div 
                                            key={i} 
                                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                                isAssigned 
                                                    ? 'bg-indigo-50 border-indigo-250 text-indigo-700 shadow-sm' 
                                                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                                            }`}
                                        >
                                            {isAssigned && <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping"></span>}
                                            {sub}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </DashboardLayout>
);
};

export default StudentDashboard;
