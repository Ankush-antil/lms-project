import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import { Users, FileText, CheckCircle, Clock, BookOpen, ChevronRight, AlertCircle, Phone, Video, Search, X, Trash2, Calendar } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

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
    const { callUser, callState, onlineUsers } = useSocket();
    
    const [stats, setStats] = useState({ totalStudents: 0, pending: 0, completed: 0, courses: 0 });
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [showContactModal, setShowContactModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [missedCalls, setMissedCalls] = useState([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

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

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                if (!userInfo) return navigate('/');

                // 1. Fetch Students & their personal stats
                const { data: studentsData } = await axios.get('/api/users/teacher-students');

                // 2. Fetch Missed Calls
                const { data: missedCallsData } = await axios.get('/api/calls/missed');
                setMissedCalls(missedCallsData);

                // 3. Aggregate counts
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
        <DashboardLayout role="Teacher" fullWidth={true}>
            <LoadingPlaceholder type="dashboard" />
        </DashboardLayout>
    );

    return (
        <DashboardLayout role="Teacher" fullWidth={true}>
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
                    <button
                        onClick={() => setShowContactModal(true)}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2"
                    >
                        <Phone size={18} /> Contact Students
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
                                {students.slice(0, 5).map((student) => {
                                    const isOnline = onlineUsers.includes(student._id);
                                    return (
                                        <tr key={student._id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform shadow-md flex-shrink-0 relative">
                                                        {student.name[0]}
                                                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
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
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => fetchCallHistory(student)}
                                                        className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-colors"
                                                        title="Call History"
                                                    >
                                                        <Calendar size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => callUser(student._id, student.name, 'Student')}
                                                        className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-colors"
                                                        title="Audio Call Student"
                                                    >
                                                        <Phone size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => callUser(student._id, student.name, 'Student', 'video')}
                                                        className="p-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-600 hover:text-white transition-colors"
                                                        title="Video Call Student"
                                                    >
                                                        <Video size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => navigate('/teacher/activities')}
                                                        className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                                                    >
                                                        <ChevronRight size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

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

            {/* Contact Students Modal */}
            {showContactModal && (
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
                                                <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold text-sm relative">
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
                </div>
            )}

            {/* Call History Modal */}
            {showHistoryModal && selectedStudent && (
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
                                                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                             log.status === 'connected' || log.status === 'ended' ? 'bg-emerald-50 text-emerald-600' :
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
                </div>
            )}
        </DashboardLayout>
    );
};

export default TeacherDashboard;