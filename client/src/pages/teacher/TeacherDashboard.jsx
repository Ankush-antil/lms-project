import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import { Users, FileText, CheckCircle, Clock, BookOpen, ChevronRight, AlertCircle, Phone, Video, Search, X, Trash2, Calendar, QrCode, FolderOpen, Inbox, RotateCcw, Star, Wrench } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';

const StatCard = ({ title, value, icon: Icon, color, onClick }) => (
    <div
        onClick={onClick}
        className={`bg-white p-3.5 md:p-4.5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 group relative overflow-hidden h-full ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
    >
        <div className={`absolute top-0 right-0 w-24 h-24 ${color.split(' ')[0]} opacity-[0.03] -mr-12 -mt-12 rounded-full transition-transform group-hover:scale-150 duration-700`}></div>
        <div className="flex items-center justify-between mb-3 relative z-10">
            <div className={`p-2.5 rounded-xl ${color.split(' ')[0]} bg-opacity-10 shadow-sm transition-transform group-hover:scale-110 duration-500`}>
                <Icon size={18} className={color.split(' ').find(c => c.startsWith('text-')) || color.replace('bg-', 'text-')} />
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

const TeacherDashboard = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const { callUser, callState, onlineUsers } = useSocket();

    const [stats, setStats] = useState({
        totalStudents: 0,
        courses: 0,
        totalSubjects: 0,
        totalTests: 0,
        activeTests: 0,
        pending: 0,
        returned: 0,
        completed: 0,
        expired: 0,
        studyMaterialsCount: 0
    });
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [showContactModal, setShowContactModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [missedCalls, setMissedCalls] = useState([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const [callEnabled, setCallEnabled] = useState(user?.callEnabled || false);

    useEffect(() => {
        if (user) {
            setCallEnabled(user.callEnabled || false);
        }
    }, [user]);

    const handleToggleCall = async () => {
        try {
            const { data } = await axios.put(`/api/calls/teachers/${user._id}/toggle`);
            setCallEnabled(data.callEnabled);

            // Sync with local storage
            const cachedUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
            cachedUser.callEnabled = data.callEnabled;
            localStorage.setItem('userInfo', JSON.stringify(cachedUser));

            toast.success(`Receiving calls: ${data.callEnabled ? 'ON' : 'OFF'}`);
        } catch (err) {
            console.error("Failed to toggle call receiving status:", err);
            toast.error("Failed to update call receiving status");
        }
    };

    const fetchCallHistory = async (student) => {
        setSelectedStudent(student);
        setShowHistoryModal(true);
        setHistoryLoading(true);
        try {
            const { data } = await axios.get(`/api/calls/history/${student._id}`);
            setHistoryLogs(data);
            setHistoryLoading(false);
        } catch (err) {
            console.error("Failed to fetch call history:", err);
            toast.error("Failed to load call history");
            setHistoryLoading(false);
        }
    };

    const handleDeleteRecording = async (callLogId) => {
        if (!window.confirm("Are you sure you want to delete this recording?")) return;
        try {
            await axios.delete(`/api/calls/recordings/${callLogId}`);
            toast.success("Recording deleted successfully");
            setHistoryLogs(prev => prev.map(log =>
                log._id === callLogId ? { ...log, recordingUrl: undefined } : log
            ));
        } catch (err) {
            console.error("Failed to delete recording:", err);
            toast.error("Failed to delete recording");
        }
    };

    const handleDeleteCallLog = async (callLogId) => {
        if (!window.confirm("Are you sure you want to delete this call log? This will also delete the recording if it exists.")) return;
        try {
            await axios.delete(`/api/calls/history/${callLogId}`);
            toast.success("Call log deleted successfully");
            setHistoryLogs(prev => prev.filter(log => log._id !== callLogId));
        } catch (err) {
            console.error("Failed to delete call log:", err);
            toast.error("Failed to delete call log");
        }
    };

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

    const controls = user?.teacherProfile?.controls;

    const resolveSubNote = (subKey) => {
        if (!controls || !controls.dashboard) return '';
        const db = controls.dashboard;
        if (db.subNotes && db.subNotes[subKey]) return db.subNotes[subKey];
        return db.note || '';
    };

    const isSubDisabled = (subKey) => {
        if (!controls || !controls.dashboard) return false;
        if (controls.dashboard.enabled === false) return true;
        return controls.dashboard[subKey] === false;
    };

    const getSubMode = () => {
        return controls?.dashboard?.mode || 'hide';
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                if (!userInfo) return navigate('/');

                // 1. Fetch all dashboard data concurrently
                const [studentsRes, missedRes, testsRes, materialsRes] = await Promise.all([
                    axios.get('/api/users/teacher-students'),
                    axios.get('/api/calls/missed'),
                    axios.get('/api/tests').catch(() => ({ data: [] })),
                    axios.get('/api/study-materials').catch(() => ({ data: [] }))
                ]);

                const studentsData = studentsRes.data;
                const missedCallsData = missedRes.data;
                const testsData = testsRes.data;
                const materialsData = materialsRes.data;

                setMissedCalls(missedCallsData);

                // 2. Aggregate counts
                const totalPending = studentsData.reduce((acc, s) => acc + (s.stats?.pending || 0), 0);
                const totalCompleted = studentsData.reduce((acc, s) => acc + (s.stats?.completed || 0), 0);
                const totalReturned = studentsData.reduce((acc, s) => acc + (s.stats?.returned || 0), 0);
                const totalSubmissions = totalPending + totalCompleted + totalReturned;

                setStudents(studentsData);
                setStats({
                    totalStudents: studentsData.length,
                    courses: userInfo.teacherProfile?.assignedCourses?.length || 0,
                    totalSubjects: userInfo.teacherProfile?.subjects?.length || 0,
                    totalTests: testsData.length,
                    totalSubmissions,
                    pending: totalPending,
                    completed: totalCompleted,
                    returned: totalReturned,
                    expired: testsData.filter(t => isTestExpired(t)).length,
                    studyMaterialsCount: materialsData.length
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
        <DashboardLayout role="Teacher" fullWidth={true}>
            <LoadingPlaceholder type="dashboard" />
        </DashboardLayout>
    );

    if (controls?.dashboard?.enabled === false) {
        return (
            <DashboardLayout role="Teacher" fullWidth={true}>
                <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white/60 backdrop-blur-xl border border-slate-100 rounded-[32px] text-center shadow-xl shadow-slate-100/50 max-w-2xl mx-auto my-12 relative overflow-hidden group">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500"></div>
                    <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <AlertCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Feature Deactivated</h2>
                    <p className="text-sm font-bold text-slate-500 max-w-md mb-6 leading-relaxed">
                        {controls.dashboard.note || 'This page has been deactivated by your administrator. Please contact support if you require access.'}
                    </p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="Teacher" fullWidth={true}>
            <div className="mb-8 space-y-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Teacher Console</h1>
                    <p className="text-slate-500 mt-1 text-sm md:text-base">Manage your courses, students, and evaluate tests in real-time.</p>
                </div>
                <div className="flex flex-wrap sm:flex-row items-center gap-3">
                    {(!isSubDisabled('receivingCalls') || getSubMode() === 'disable') && (
                        <button
                            disabled={isSubDisabled('receivingCalls')}
                            onClick={isSubDisabled('receivingCalls') ? () => toast.error(resolveSubNote('receivingCalls') || 'Feature Restricted') : handleToggleCall}
                            title={isSubDisabled('receivingCalls') ? (resolveSubNote('receivingCalls') || 'Feature Restricted') : undefined}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2 ${isSubDisabled('receivingCalls')
                                ? 'bg-slate-100 border border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                                : callEnabled
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100/50 cursor-pointer'
                                    : 'bg-white hover:bg-slate-50 text-slate-700 shadow-sm border border-slate-200 cursor-pointer'
                                }`}
                        >
                            <Phone size={16} />
                            <span>Receiving Calls: {callEnabled ? 'ON' : 'OFF'}</span>
                        </button>
                    )}
                    {(!isSubDisabled('takeAction') || getSubMode() === 'disable') && (
                        <button
                            disabled={isSubDisabled('takeAction')}
                            onClick={isSubDisabled('takeAction') ? () => toast.error(resolveSubNote('takeAction') || 'Feature Restricted') : () => navigate('/teacher/activities')}
                            title={isSubDisabled('takeAction') ? (resolveSubNote('takeAction') || 'Feature Restricted') : undefined}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2 ${isSubDisabled('takeAction')
                                ? 'bg-slate-100 border border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100/50 cursor-pointer'
                                }`}
                        >
                            <FileText size={16} />
                            <span>Take Action</span>
                        </button>
                    )}
                    {(!isSubDisabled('attendance') || getSubMode() === 'disable') && (
                        <button
                            disabled={isSubDisabled('attendance')}
                            onClick={isSubDisabled('attendance') ? () => toast.error(resolveSubNote('attendance') || 'Feature Restricted') : () => navigate('/teacher/attendance')}
                            title={isSubDisabled('attendance') ? (resolveSubNote('attendance') || 'Feature Restricted') : undefined}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2 ${isSubDisabled('attendance')
                                ? 'bg-slate-100 border border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-100/50 cursor-pointer'
                                }`}
                        >
                            <QrCode size={16} />
                            <span>QR Attendance</span>
                        </button>
                    )}
                    {(!isSubDisabled('contactStudents') || getSubMode() === 'disable') && (
                        <button
                            disabled={isSubDisabled('contactStudents')}
                            onClick={isSubDisabled('contactStudents') ? () => toast.error(resolveSubNote('contactStudents') || 'Feature Restricted') : () => setShowContactModal(true)}
                            title={isSubDisabled('contactStudents') ? (resolveSubNote('contactStudents') || 'Feature Restricted') : undefined}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2 ${isSubDisabled('contactStudents')
                                ? 'bg-slate-100 border border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                                : 'bg-slate-950 hover:bg-slate-800 text-white rounded-xl cursor-pointer'
                                }`}
                        >
                            <Phone size={16} />
                            <span>Contact Students</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
                <StatCard
                    title="My Students"
                    value={stats.totalStudents}
                    icon={Users}
                    color="bg-violet-500 text-violet-500"
                    onClick={() => !isSubDisabled('takeAction') ? navigate('/teacher/activities') : toast.error(resolveSubNote('takeAction') || 'Feature Restricted')}
                />
                <StatCard
                    title="Courses Taught"
                    value={stats.courses}
                    icon={FolderOpen}
                    color="bg-blue-500 text-blue-500"
                    onClick={() => navigate('/teacher/activities')}
                />
                <StatCard
                    title="Total Subjects"
                    value={stats.totalSubjects}
                    icon={BookOpen}
                    color="bg-indigo-600 text-indigo-600"
                    onClick={() => navigate('/teacher/activities')}
                />
                <StatCard
                    title="Total Tests"
                    value={stats.totalTests}
                    icon={FileText}
                    color="bg-slate-600 text-slate-600"
                    onClick={() => navigate('/teacher/activities')}
                />
                <StatCard
                    title="Total Submissions"
                    value={stats.totalSubmissions}
                    icon={Inbox}
                    color="bg-orange-500 text-orange-500"
                    onClick={() => navigate('/teacher/activities')}
                />
                <StatCard
                    title="Pending Eval."
                    value={stats.pending}
                    icon={CheckCircle}
                    color="bg-emerald-500 text-emerald-500"
                    onClick={() => !isSubDisabled('takeAction') ? navigate('/teacher/activities') : toast.error(resolveSubNote('takeAction') || 'Feature Restricted')}
                />
                <StatCard
                    title="Returned"
                    value={stats.returned}
                    icon={RotateCcw}
                    color="bg-rose-500 text-rose-500"
                    onClick={() => navigate('/teacher/activities')}
                />
                <StatCard
                    title="Evaluated"
                    value={stats.completed}
                    icon={Star}
                    color="bg-teal-650 text-teal-650"
                    onClick={() => !isSubDisabled('takeAction') ? navigate('/teacher/activities') : toast.error(resolveSubNote('takeAction') || 'Feature Restricted')}
                />
                <StatCard
                    title="Expired"
                    value={stats.expired}
                    icon={AlertCircle}
                    color="bg-slate-500 text-slate-500"
                    onClick={() => navigate('/teacher/activities')}
                />
                <StatCard
                    title="Study Material"
                    value={stats.studyMaterialsCount}
                    icon={FolderOpen}
                    color="bg-pink-500 text-pink-500"
                    onClick={() => navigate('/teacher/activities')}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                <div className="space-y-6">
                    {/* Missed Calls Log Panel */}
                    {missedCalls.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-[32px] p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-red-800 font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
                                    Missed Calls ({missedCalls.length})
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
                                            <span className="font-bold text-slate-800">{call.caller?.name || call.guestName || 'Student'}</span>
                                            <span className="text-[10px] text-slate-400 font-medium">{new Date(call.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => callUser(call.caller?._id || ('guest_' + call.guestEmail), call.caller?.name || call.guestName || 'Guest Student', 'Student')}
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
            </div>

            {/* Contact Students Modal */}
            {showContactModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
                    <div className="bg-white rounded-[32px] shadow-2xl p-6 max-w-md w-full mx-4 flex flex-col border border-slate-100 max-h-[85vh] overflow-hidden transform scale-100 transition-all">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-xl font-black text-slate-850 tracking-tight">Contact Students</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Call assigned students in real-time</p>
                            </div>
                            <button
                                onClick={() => { setShowContactModal(false); setSearchQuery(''); }}
                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-full transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Search bar */}
                        <div className="relative mt-4 mb-3">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                                <Search size={14} />
                            </span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search student by name..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-150 rounded-2xl text-xs font-semibold outline-none focus:bg-white focus:border-indigo-500 shadow-sm transition-all"
                            />
                        </div>

                        {/* Student list */}
                        <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1 custom-scrollbar">
                            {students
                                .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map(student => {
                                    const isOnline = onlineUsers.includes(student._id);
                                    return (
                                        <div key={student._id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/60 rounded-2xl border border-slate-150 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-slate-900 !text-white rounded-xl flex items-center justify-center font-bold text-sm relative" style={{ color: '#ffffff' }}>
                                                    {student.name[0]}
                                                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                                                </div>
                                                <div className="flex flex-col text-left">
                                                    <span className="text-xs font-bold text-slate-800 leading-none mb-1">{student.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                                        {student.studentProfile?.course?.name || 'Academic Course'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => {
                                                        fetchCallHistory(student);
                                                        setShowContactModal(false);
                                                    }}
                                                    className="p-2.5 bg-indigo-50 text-indigo-655 hover:bg-indigo-600 hover:text-white rounded-xl transition-all active:scale-95 flex items-center justify-center border border-indigo-100"
                                                    title="Call History"
                                                >
                                                    <Calendar size={14} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        callUser(student._id, student.name, 'Student');
                                                        setShowContactModal(false);
                                                    }}
                                                    className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/10 transition-all active:scale-95 flex items-center justify-center"
                                                    title="Call Student"
                                                >
                                                    <Phone size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            }
                            {students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                <p className="text-center text-xs text-slate-400 italic py-6">No matching students found.</p>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Call History Modal */}
            {showHistoryModal && selectedStudent && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
                    <div className="bg-white rounded-[32px] shadow-2xl p-6 max-w-lg w-full mx-4 flex flex-col border border-slate-100 max-h-[85vh] overflow-hidden transform scale-100 transition-all">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-xl font-black text-slate-850 tracking-tight">Call History</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                    With student: {selectedStudent.name}
                                </p>
                            </div>
                            <button
                                onClick={() => { setShowHistoryModal(false); setSelectedStudent(null); setHistoryLogs([]); }}
                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-full transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* History Log List */}
                        <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-1 custom-scrollbar">
                            {historyLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : historyLogs.length > 0 ? (
                                <div className="space-y-3">
                                    {historyLogs.map(log => {
                                        const isTeacherCaller = log.caller && log.caller._id === user._id;
                                        const dateStr = new Date(log.createdAt).toLocaleString();
                                        const durationStr = log.startTime && log.endTime
                                            ? `${Math.round((new Date(log.endTime) - new Date(log.startTime)) / 1000)}s`
                                            : null;

                                        return (
                                            <div key={log._id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col text-left">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-800">
                                                            {isTeacherCaller ? 'Outgoing Call' : 'Incoming Call'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-semibold mt-0.5">{dateStr}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${log.status === 'connected' || log.status === 'ended' ? 'bg-emerald-50 text-emerald-600' :
                                                            log.status === 'missed' ? 'bg-red-50 text-red-600' : 'bg-slate-200 text-slate-600'
                                                            }`}>
                                                            {log.status}
                                                        </span>
                                                        <button
                                                            onClick={() => handleDeleteCallLog(log._id)}
                                                            className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                                                            title="Delete Call History Log"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="text-xs text-slate-655 mt-1 flex flex-wrap gap-x-4">
                                                    {durationStr && <span>Duration: <strong className="text-slate-800">{durationStr}</strong></span>}
                                                    <span>Caller: <strong className="text-slate-800">{log.caller?.name || log.guestName || 'Unknown'}</strong></span>
                                                </div>
                                                {log.recordingUrl && (
                                                    <div className="mt-3 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/50 flex flex-col gap-1 relative group/rec">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] text-indigo-755 font-bold uppercase tracking-widest">Call Recording</span>
                                                            <button
                                                                onClick={() => handleDeleteRecording(log._id)}
                                                                className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors"
                                                                title="Delete Recording"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                        <audio controls src={log.recordingUrl} className="w-full h-8 mt-1" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-center text-xs text-slate-400 italic py-8">No calling history found with this student.</p>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </DashboardLayout>
    );
};

export default TeacherDashboard;