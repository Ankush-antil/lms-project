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
    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
            <div className={`p-2.5 rounded-xl ${color} bg-opacity-10`}>
                <Icon size={20} className={color.replace('bg-', 'text-')} />
            </div>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-1">{value}</h3>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">{title}</p>
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
    const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'activities'
    const [subTab, setSubTab] = useState('submitted'); // 'submitted' | 'evaluated'

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
            <div className="mb-6 text-left flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Student Dashboard</h1>
                    <p className="text-slate-500 text-sm">Welcome back, {profile?.name?.split(' ')[0]}! Track your progress here.</p>
                </div>
                <div>
                    <button
                        onClick={() => {
                            setActiveView(activeView === 'activities' ? 'dashboard' : 'activities');
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer border ${
                            activeView === 'activities'
                                ? 'bg-slate-800 text-white border-slate-850 hover:bg-slate-700'
                                : 'bg-[#3E3ADD] text-white border-indigo-700 hover:bg-indigo-700'
                        }`}
                    >
                        {activeView === 'activities' ? (
                            <>
                                ⬅ Dashboard
                            </>
                        ) : (
                            <>
                                <CheckCircle size={14} />
                                Complete Activities
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-6 sm:mb-8">
                <StatCard title="Pending Tests" value={pendingTests.length} icon={Clock} color="bg-orange-500 text-orange-500" />
                <div onClick={() => { setActiveView('activities'); setSubTab('evaluated'); }} className="cursor-pointer">
                    <StatCard title="Completed Tests" value={completedTests.length} icon={CheckCircle} color="bg-emerald-500 text-emerald-500" />
                </div>
            </div>

            {activeView === 'activities' ? (
                <div className="animate-fade-in space-y-6 text-left">
                    {/* Header */}
                    <div className="bg-white border-b border-slate-200 pb-4 flex flex-col gap-2.5 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#3E3ADD] text-white flex items-center justify-center shadow-md shadow-indigo-500/10 shrink-0 font-sans font-bold">
                                    ✓
                                </div>
                                <div>
                                    <h1 className="text-lg font-extrabold text-indigo-950 tracking-tight leading-none">
                                        Student Activity History
                                    </h1>
                                    <p className="text-slate-500 text-xs mt-1">
                                        View submitted and evaluated assignments/activities.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sub Tabs */}
                    <div className="flex border-b border-slate-100 gap-6">
                        {[
                            { id: 'submitted', label: `Submitted (${submissions.filter(s => s.status === 'submitted' || s.status === 'reported').length})` },
                            { id: 'evaluated', label: `Evaluated (${submissions.filter(s => s.status === 'evaluated' || s.status === 'returned').length})` }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setSubTab(tab.id)}
                                className={`pb-2.5 text-xs font-black uppercase tracking-wider relative transition-all cursor-pointer ${
                                    subTab === tab.id
                                        ? 'text-[#3E3ADD]'
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {tab.label}
                                {subTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3E3ADD] rounded-full animate-fade-in" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Content Table */}
                    {(() => {
                        const filtered = submissions.filter(sub => {
                            if (subTab === 'submitted') {
                                return sub.status === 'submitted' || sub.status === 'reported';
                            } else {
                                return sub.status === 'evaluated' || sub.status === 'returned';
                            }
                        });

                        if (filtered.length === 0) {
                            return (
                                <div className="py-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm max-w-md mx-auto">
                                    <div className="text-4xl mb-2">📝</div>
                                    <p className="font-bold text-slate-700 text-sm">No Activities Found</p>
                                    <p className="text-slate-455 text-xs mt-1 font-medium">No tests in this category yet.</p>
                                </div>
                            );
                        }

                        return (
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200/60 text-[10px] font-black uppercase tracking-wider text-slate-450">
                                                <th className="py-3 px-4">Activity / Test</th>
                                                <th className="py-3 px-4">Subject / Category</th>
                                                <th className="py-3 px-4">Submitted Date</th>
                                                <th className="py-3 px-4">Score / Marks</th>
                                                <th className="py-3 px-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {filtered.map((sub) => {
                                                const testTitle = sub.test?.title || 'Untitled Test';
                                                const subject = sub.test?.subject || 'N/A';
                                                const category = sub.test?.activity || 'General';
                                                const submittedDate = new Date(sub.submittedAt || sub.createdAt).toLocaleString(undefined, {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'short'
                                                });
                                                const marks = sub.status === 'evaluated' || sub.status === 'returned'
                                                    ? `${sub.totalMarks} / ${sub.test?.settings?.totalMarks || 100}`
                                                    : 'Awaiting Evaluation';

                                                return (
                                                    <tr key={sub._id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="py-3.5 px-4 font-extrabold text-slate-800">
                                                            {testTitle}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-slate-500 font-semibold">
                                                            <div className="flex flex-col">
                                                                <span>{subject}</span>
                                                                <span className="text-[10px] text-slate-400 capitalize">{category}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-slate-500 font-medium">
                                                            {submittedDate}
                                                        </td>
                                                        <td className="py-3.5 px-4 font-bold text-slate-700">
                                                            {marks}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right">
                                                            {sub.status === 'evaluated' || sub.status === 'returned' ? (
                                                                <button
                                                                    onClick={() => navigate(`/student/test-result/${sub._id}`)}
                                                                    className="px-3.5 py-1.5 bg-[#3E3ADD] hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                                                                >
                                                                    View Report
                                                                </button>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1.5 rounded-xl uppercase tracking-wider">
                                                                    Awaiting Evaluation
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            ) : (
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
                                            <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-indigo-650 shadow-sm">
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
                                        <p className="text-slate-450 font-medium italic">No upcoming tests found for your assigned subject.</p>
                                        <p className="text-[10px] text-slate-300 mt-2 lowercase">checked for institute: {profile?.institute?.name || 'N/A'}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* My Completed Activities / History */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800">My Completed Activities / History</h3>
                                <span className="text-xs text-slate-500 font-bold bg-slate-50 border border-slate-155 px-2.5 py-1 rounded-lg">
                                    Total: {submissions.length}
                                </span>
                            </div>
                            {submissions.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200/65 text-[10px] font-black uppercase tracking-wider text-slate-450">
                                                <th className="py-2.5 px-3">Activity / Test</th>
                                                <th className="py-2.5 px-3">Submitted Date</th>
                                                <th className="py-2.5 px-3">Total Marks</th>
                                                <th className="py-2.5 px-3 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {submissions.map((sub) => {
                                                const testTitle = sub.test?.title || 'Untitled Test';
                                                const date = new Date(sub.submittedAt || sub.createdAt).toLocaleDateString(undefined, {
                                                    dateStyle: 'medium'
                                                });
                                                const marks = sub.status === 'evaluated' || sub.status === 'returned'
                                                    ? `${sub.totalMarks} / ${sub.test?.settings?.totalMarks || 100}`
                                                    : 'Awaiting Evaluation';

                                                return (
                                                    <tr key={sub._id} className="hover:bg-slate-50/30 transition-colors">
                                                        <td className="py-3 px-3 font-extrabold text-slate-800">
                                                            {testTitle}
                                                        </td>
                                                        <td className="py-3 px-3 text-slate-500 font-medium">
                                                            {date}
                                                        </td>
                                                        <td className="py-3 px-3 font-bold text-slate-700">
                                                            {marks}
                                                        </td>
                                                        <td className="py-3 px-3 text-right">
                                                            <button
                                                                onClick={() => navigate(`/student/test-result/${sub._id}`)}
                                                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                                                            >
                                                                View Report
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-slate-400 font-medium italic">You haven't submitted any activities or tests yet.</p>
                                </div>
                            )}
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
                                    {(() => {
                                        const subjectStr = profile?.studentProfile?.subject;
                                        const subjectsList = subjectStr ? subjectStr.split(',').map(s => s.trim()).filter(Boolean) : [];
                                        return (
                                            <div className="flex flex-col gap-2 p-3 bg-indigo-50/50 rounded-xl text-left">
                                                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Subject(s)</span>
                                                {subjectsList.length > 0 ? (
                                                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1 mt-1 custom-scrollbar w-full">
                                                        {subjectsList.map((sub, idx) => (
                                                            <div key={idx} className="px-3 py-1.5 bg-white text-indigo-700 rounded-xl text-[11px] font-bold border border-indigo-100 shadow-sm leading-tight text-center">
                                                                {sub}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="font-bold text-indigo-700 text-xs">N/A</span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    <div className="flex justify-between text-sm items-center p-3 bg-slate-50 rounded-xl">
                                        <span className="text-slate-550">Status</span>
                                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold uppercase tracking-wide">
                                            Active
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </DashboardLayout>
);
};

export default StudentDashboard;
