import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import { BookOpen, Clock, FileText, CheckCircle, User, Phone, X, Lock, FolderOpen, Inbox, RotateCcw, Star, AlertCircle, Wrench } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

const StatCard = ({ title, value, icon: Icon, color, onClick }) => (
    <div
        onClick={onClick}
        className={`bg-white p-3.5 md:p-4.5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 group relative overflow-hidden h-full ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
    >
        <div className={`absolute top-0 right-0 w-24 h-24 ${color.split(' ')[0]} opacity-[0.03] -mr-12 -mt-12 rounded-full transition-transform group-hover:scale-150 duration-700`}></div>
        <div className="flex items-center justify-between mb-3 relative z-10">
            <div className={`p-2.5 rounded-xl ${color.split(' ')[0]} bg-opacity-10 text-white shadow-sm transition-transform group-hover:scale-110 duration-500`}>
                <Icon size={18} className={color.split(' ').find(c => c.startsWith('text-'))} />
            </div>
            <span className="text-[9px] font-extrabold text-emerald-500 bg-emerald-50/70 px-2 py-0.5 rounded-full tracking-wide">
                Live
            </span>
        </div>
        <div className="relative z-10">
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-0.5">{value}</h3>
            <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wider opacity-85 leading-tight">{title}</p>
        </div>
    </div>
);

const isTestExpired = (test) => {
    if (!test) return false;
    const now = new Date();
    if (test.settings?.endTime && new Date(test.settings.endTime) < now) return true;
    if (test.publicSettings?.expiryDate && new Date(test.publicSettings.expiryDate) < now) return true;
    return false;
};

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

    // Stats variables
    const [inboxes, setInboxes] = useState([]);
    const [studyMaterials, setStudyMaterials] = useState([]);
    const [practiceFiles, setPracticeFiles] = useState([]);
    const [notes, setNotes] = useState([]);
    const [isSubjectsModalOpen, setIsSubjectsModalOpen] = useState(false);

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

                // Concurrent fetch for profile, tests, submissions, missed calls, and stats
                const [
                    profileRes,
                    testsRes,
                    subsRes,
                    missedRes,
                    inboxesRes,
                    materialsRes,
                    practiceRes,
                    notesRes
                ] = await Promise.all([
                    axios.get('/api/users/profile'),
                    axios.get('/api/tests'),
                    axios.get('/api/submissions'),
                    axios.get('/api/calls/missed'),
                    axios.get('/api/users/inbox-configs').catch(() => ({ data: [] })),
                    axios.get('/api/study-materials').catch(() => ({ data: [] })),
                    axios.get('/api/practice-files?all=true').catch(() => ({ data: { files: [] } })),
                    axios.get('/api/notes?all=true').catch(() => ({ data: [] }))
                ]);

                setProfile(profileRes.data);
                setTests(testsRes.data);
                setSubmissions(subsRes.data);
                setMissedCalls(missedRes.data);
                setInboxes(inboxesRes.data || []);
                setStudyMaterials(materialsRes.data || []);
                setPracticeFiles(practiceRes.data?.files || []);
                setNotes(notesRes.data || []);
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
    const upcomingTests = pendingTests.slice(0, 3); // Just show first 3 for dashboard list

    // Calculations for the 10 stats cards
    // 1. Total Subjects
    const assignedCourses = profile?.studentProfile?.coursesList && profile.studentProfile.coursesList.length > 0
        ? profile.studentProfile.coursesList
        : (profile?.studentProfile?.course ? [{ course: profile.studentProfile.course, subjects: profile.studentProfile.subject ? profile.studentProfile.subject.split(',').map(s => s.trim()).filter(Boolean) : [] }] : []);

    const uniqueSubjects = new Set();
    assignedCourses.forEach(item => {
        (item.subjects || []).forEach(sub => uniqueSubjects.add(sub));
    });
    if (uniqueSubjects.size === 0 && profile?.studentProfile?.subject) {
        profile.studentProfile.subject.split(',').map(s => s.trim()).filter(Boolean).forEach(sub => uniqueSubjects.add(sub));
    }
    const totalSubjects = uniqueSubjects.size;
    const subjectsList = Array.from(uniqueSubjects);

    // 2. Total Inboxes
    const totalInboxes = inboxes.filter(i => i.visible !== false).length;

    // 3. Total Assigned
    const totalAssigned = tests.length;

    // 4. Upcoming
    const upcomingCount = pendingTests.filter(t => !isTestExpired(t)).length;

    // 5. Submitted
    const submittedCount = submissions.filter(s => s.status === 'submitted' || s.status === 'reported').length;

    // 6. Returned
    const returnedCount = submissions.filter(s => s.status === 'returned').length;

    // 7. Evaluated
    const evaluatedCount = submissions.filter(s => s.status === 'evaluated').length;

    // 8. Expired
    const expiredCount = pendingTests.filter(t => isTestExpired(t)).length;

    // 9. Study Material
    const studyMaterialsCount = studyMaterials.length;

    // 10. Tools Submitted Content
    const getLocalToolsCount = () => {
        let count = 0;
        const keys = [
            'practice_screenshots',
            'practice_screen_recordings',
            'practice_videos',
            'practice_audios',
            'practice_call_logs',
            'practice_file_uploads'
        ];
        keys.forEach(key => {
            const dataStr = localStorage.getItem(key);
            if (dataStr) {
                try {
                    const list = JSON.parse(dataStr);
                    if (Array.isArray(list)) {
                        count += list.length;
                    }
                } catch (e) { }
            }
        });
        return count;
    };
    const toolsContentCount = getLocalToolsCount() + practiceFiles.length + notes.length;

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
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer border ${activeView === 'activities'
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

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
                    <StatCard
                        title="Total Subjects"
                        value={totalSubjects}
                        icon={FolderOpen}
                        color="bg-violet-500 text-violet-500"
                        onClick={() => setIsSubjectsModalOpen(true)}
                    />
                    <StatCard
                        title="Total Inboxes"
                        value={totalInboxes}
                        icon={Inbox}
                        color="bg-blue-500 text-blue-500"
                        onClick={() => navigate('/student/practice-tools')}
                    />
                    <StatCard
                        title="Total Assigned"
                        value={totalAssigned}
                        icon={FileText}
                        color="bg-indigo-600 text-indigo-600"
                        onClick={() => navigate('/student/tests')}
                    />
                    <StatCard
                        title="Upcoming"
                        value={upcomingCount}
                        icon={Clock}
                        color="bg-orange-500 text-orange-500"
                        onClick={() => navigate('/student/tests')}
                    />
                    <StatCard
                        title="Submitted"
                        value={submittedCount}
                        icon={CheckCircle}
                        color="bg-emerald-500 text-emerald-500"
                        onClick={() => { setActiveView('activities'); setSubTab('submitted'); }}
                    />
                    <StatCard
                        title="Returned"
                        value={returnedCount}
                        icon={RotateCcw}
                        color="bg-rose-500 text-rose-500"
                        onClick={() => { setActiveView('activities'); setSubTab('evaluated'); }}
                    />
                    <StatCard
                        title="Evaluated"
                        value={evaluatedCount}
                        icon={Star}
                        color="bg-teal-600 text-teal-600"
                        onClick={() => { setActiveView('activities'); setSubTab('evaluated'); }}
                    />
                    <StatCard
                        title="Expired"
                        value={expiredCount}
                        icon={AlertCircle}
                        color="bg-slate-600 text-slate-600"
                        onClick={() => navigate('/student/tests')}
                    />
                    <StatCard
                        title="Study Material"
                        value={studyMaterialsCount}
                        icon={BookOpen}
                        color="bg-pink-500 text-pink-500"
                        onClick={() => navigate('/student/tests')}
                    />
                    <StatCard
                        title="Tools Submitted Content"
                        value={toolsContentCount}
                        icon={Wrench}
                        color="bg-cyan-600 text-cyan-600"
                        onClick={() => navigate('/student/practice-tools')}
                    />
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
                                    className={`pb-2.5 text-xs font-black uppercase tracking-wider relative transition-all cursor-pointer ${subTab === tab.id
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
                                                                <button
                                                                    onClick={() => navigate(`/student/test-result/${sub._id}`)}
                                                                    className="text-left font-extrabold hover:text-[#3E3ADD] transition-colors focus:outline-none cursor-pointer"
                                                                >
                                                                    {testTitle}
                                                                </button>
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
                                                                    <button
                                                                        onClick={() => navigate(`/student/test-result/${sub._id}`)}
                                                                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer border border-slate-200"
                                                                    >
                                                                        Awaiting Evaluation
                                                                    </button>
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
                    <div className="space-y-6">
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
                    </div>
                )}

                {isSubjectsModalOpen && createPortal(
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-[#f5f5f5] rounded-[2rem] border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
                            {/* Header */}
                            <div className="bg-slate-50 border-b border-slate-100 px-6 py-5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-violet-50 text-violet-650 rounded-xl">
                                        <FolderOpen size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-lg leading-tight">My Subjects</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Enrolled Course Curriculum</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsSubjectsModalOpen(false)}
                                    className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-200"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            {/* Body */}
                            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-2.5 custom-scrollbar">
                                {subjectsList.length > 0 ? (
                                    subjectsList.map((subject, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-3.5 p-3.5 bg-white hover:bg-violet-50/30 rounded-2xl border border-slate-100 hover:border-violet-100/50 transition-all duration-300 group"
                                        >
                                            <span className="w-7 h-7 rounded-xl bg-violet-100/70 text-violet-750 flex items-center justify-center text-xs font-black shadow-sm group-hover:scale-105 transition-transform duration-300">
                                                {idx + 1}
                                            </span>
                                            <span className="font-extrabold text-slate-800 text-sm leading-snug">{subject}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-slate-400 font-bold italic text-sm">
                                        No subjects assigned.
                                    </div>
                                )}
                            </div>
                            {/* Footer */}
                            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-end">
                                <button
                                    onClick={() => setIsSubjectsModalOpen(false)}
                                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </DashboardLayout>
    );
};

export default StudentDashboard;
