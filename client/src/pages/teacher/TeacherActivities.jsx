import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    Users, Search, ChevronRight, CheckCircle2, AlertCircle,
    BookOpen, Clock, MoreVertical, RefreshCw, Info
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import { useUserProfile } from '../../components/common/UserProfileContext';

const TeacherActivities = () => {
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedInbox, setSelectedInbox] = useState(null);
    const [selectedDate, setSelectedDate] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('Institute');
    const [loading, setLoading] = useState(false);
    const [teacherInfo, setTeacherInfo] = useState(null);
    const [students, setStudents] = useState([]);
    const [studentSubmissions, setStudentSubmissions] = useState([]);
    const { openProfile } = useUserProfile();

    const navigate = useNavigate();

    useEffect(() => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (userInfo) {
            setTeacherInfo(userInfo);
            fetchStudents(userInfo.token);
        } else {
            navigate('/');
        }
    }, [navigate]);

    const fetchStudents = async (token) => {
        try {
            setLoading(true);
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const { data } = await axios.get('/api/users/teacher-students', config);
            setStudents(data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching students:", error);
            setLoading(false);
        }
    };

    const fetchStudentSubmissions = async (studentId) => {
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
            const { data } = await axios.get('/api/submissions', config);
            const filtered = data.filter(s => (s.student?._id || s.student) === studentId);
            setStudentSubmissions(filtered);
            if (filtered.length > 0) {
                const sortedDates = [...new Set(filtered.map(s =>
                    new Date(s.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                ))].sort((a, b) => new Date(b) - new Date(a));
                setSelectedDate(sortedDates[0]);
            }
        } catch (error) {
            console.error("Error fetching student submissions:", error);
        }
    };

    // Group submissions by the Test's Assigned Date for the left sidebar "Inboxes"
    const groupedByDate = studentSubmissions.reduce((acc, sub) => {
        const dateStr = sub.test?.date
            ? new Date(sub.test.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : new Date(sub.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        if (!acc[dateStr]) {
            acc[dateStr] = {
                id: dateStr,
                title: dateStr,
                submissions: [],
                pending: 0,
                completed: 0,
                latestTime: new Date(sub.submittedAt)
            };
        }
        acc[dateStr].submissions.push(sub);
        if (sub.status === 'submitted') acc[dateStr].pending++;
        else acc[dateStr].completed++;
        if (new Date(sub.submittedAt) > acc[dateStr].latestTime) acc[dateStr].latestTime = new Date(sub.submittedAt);
        return acc;
    }, {});

    const dynamicInboxes = Object.values(groupedByDate).sort((a, b) => new Date(b.id) - new Date(a.id));

    // Date filtering and counts for the dashboard
    const dateStats = studentSubmissions.reduce((acc, s) => {
        const date = s.test?.date
            ? new Date(s.test.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : new Date(s.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        if (!acc[date]) acc[date] = { count: 0, pending: 0, completed: 0 };
        acc[date].count++;
        if (s.status === 'submitted') acc[date].pending++;
        else acc[date].completed++;
        return acc;
    }, {});

    const uniqueDates = studentSubmissions.length ? Object.keys(dateStats).sort((a, b) => new Date(b) - new Date(a)) : [];

    const filteredSubmissions = studentSubmissions.filter(s => {
        const sDate = s.test?.date
            ? new Date(s.test.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : new Date(s.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        return sDate === selectedDate;
    }) || [];

    // Dashboard summary stats
    const summaryStats = {
        pending: dateStats[selectedDate]?.pending || 0,
        completed: dateStats[selectedDate]?.completed || 0
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <DashboardLayout role="Teacher">
            <div className="flex h-[calc(100vh-120px)] bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">

                {/* --- Left Sidebar: Activities Inbox --- */}
                <aside className="w-80 border-r border-slate-100 flex flex-col shrink-0 overflow-hidden bg-slate-50/30">
                    <div className="p-6 border-b border-slate-100 bg-white">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Student Profile</h2>

                        {selectedStudent ? (
                            <div className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                                        {selectedStudent.name[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-slate-800 text-sm truncate">{selectedStudent.name}</h3>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate">{selectedStudent.studentProfile?.course?.name || 'No Course'}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center mb-4">
                                <p className="text-xs text-slate-400 italic">Select a student from the right</p>
                            </div>
                        )}

                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search activities..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {selectedStudent ? dynamicInboxes.map(inbox => (
                            <div
                                key={inbox.id}
                                onClick={() => { setSelectedInbox(inbox); setSelectedDate(inbox.title); }}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer group ${selectedInbox?.id === inbox.id ? 'border-indigo-500 bg-white shadow-md ring-1 ring-indigo-500/20' : 'border-transparent hover:border-indigo-200 hover:bg-white'}`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-indigo-500" />
                                        <h4 className="font-bold text-slate-700 text-sm group-hover:text-indigo-700 transition-colors uppercase tracking-tight">{inbox.title}</h4>
                                    </div>
                                    <button className="text-slate-300 hover:text-slate-500"><MoreVertical size={14} /></button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center space-x-1.5 px-2 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100/50">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                        <span className="text-[10px] font-black text-emerald-700 uppercase">Completed {inbox.completed}</span>
                                    </div>
                                    <div className="flex items-center space-x-1.5 px-2 py-1.5 bg-orange-50 rounded-lg border border-orange-100/50">
                                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                        <span className="text-[10px] font-black text-orange-700 uppercase leading-none">Pending : {inbox.pending}</span>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 text-slate-400 space-y-2">
                                <Clock size={40} strokeWidth={1} />
                                <p className="text-[10px] font-medium">No student selected</p>
                            </div>
                        )}
                    </div>
                </aside>

                {/* --- Center: Main Content --- */}
                <main className="flex-1 bg-white flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        {selectedStudent ? (
                            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                                <div className="flex justify-between items-end border-b border-slate-100 pb-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase tracking-widest">Activity Report</span>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{selectedDate === 'All' ? 'All Activities' : selectedDate}</span>
                                        </div>
                                        <h2
                                            className="text-4xl font-black text-slate-800 tracking-tight cursor-pointer hover:text-indigo-600 transition-colors"
                                            onClick={() => openProfile(selectedStudent._id)}
                                        >
                                            {selectedStudent.name}
                                        </h2>
                                    </div>
                                    <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-colors border border-slate-100">
                                        <RefreshCw size={20} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-6 bg-emerald-50/50 rounded-[32px] border border-emerald-100/50 flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Total Evaluated</span>
                                            <div className="text-4xl font-black text-emerald-800">{summaryStats.completed}</div>
                                        </div>
                                        <div className="p-4 bg-white rounded-2xl shadow-sm text-emerald-500"><CheckCircle2 size={24} /></div>
                                    </div>
                                    <div className="p-6 bg-orange-50/50 rounded-[32px] border border-orange-100/50 flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block mb-1">Awaiting Review</span>
                                            <div className="text-4xl font-black text-orange-800">{summaryStats.pending}</div>
                                        </div>
                                        <div className="p-4 bg-white rounded-2xl shadow-sm text-orange-500"><AlertCircle size={24} /></div>
                                    </div>
                                </div>

                                {selectedInbox && (
                                    <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 border-l-8 border-indigo-500 p-8 animate-fade-in">
                                        <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-[0.1em] mb-6 flex items-center gap-2">
                                            <Info size={16} /> Relevant Information
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Institute</span>
                                                <span className="text-slate-900 font-bold">{selectedInbox.submissions[0]?.test?.institute || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Course</span>
                                                <span className="text-slate-900 font-bold">{selectedInbox.submissions[0]?.test?.course || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Submission List</h4>
                                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-md">
                                            {uniqueDates.map(date => (
                                                <button
                                                    key={date}
                                                    onClick={() => setSelectedDate(date)}
                                                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all whitespace-nowrap border ${selectedDate === date ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-200'}`}
                                                >
                                                    {`${date} (${dateStats[date].count})`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {filteredSubmissions.length > 0 ? (
                                        <div className="space-y-4">
                                            {filteredSubmissions.map((sub) => (
                                                <div key={sub._id} className="flex items-center justify-between bg-slate-50 p-6 rounded-[32px] border border-slate-100 group hover:bg-white hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
                                                    <div className="flex items-center space-x-5">
                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border ${sub.status === 'submitted' ? 'bg-orange-50 text-orange-500 border-orange-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}>
                                                            <BookOpen size={24} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h5 className="font-bold text-slate-800">{sub.test?.title}</h5>
                                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${sub.status === 'submitted' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                                    {sub.status === 'submitted' ? 'Pending' : 'Completed'}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                                <Clock size={10} /> {new Date(sub.submittedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                                {sub.answers?.map((ans, idx) => (
                                                                    <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-100 rounded-lg text-[8px] font-bold shadow-sm text-slate-500">
                                                                        <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
                                                                        {ans.questionType || 'Item'}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => navigate(`/teacher/evaluate/${sub._id}`)}
                                                        className={`px-6 py-2.5 rounded-2xl text-xs font-bold transition-all ${sub.status === 'submitted' ? 'bg-slate-900 text-white hover:bg-indigo-600 shadow-lg shadow-slate-900/10' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
                                                    >
                                                        {sub.status === 'submitted' ? 'Evaluate Item' : 'View Outcome'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-24 text-center bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
                                            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-200 shadow-sm">
                                                <Search size={24} />
                                            </div>
                                            <p className="text-slate-400 text-sm font-medium italic">No submissions for the selected date.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center max-w-sm mx-auto text-center space-y-6">
                                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center shadow-inner">
                                    <Users size={32} className="text-indigo-500" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Welcome Back!</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        Select a student and an inbox item to view detailed activity reports.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* --- Right Sidebar: Students Selecting --- */}
                <aside className="w-80 border-l border-slate-100 flex flex-col shrink-0 overflow-hidden bg-slate-50/30">
                    <div className="p-6 border-b border-slate-100 bg-white">
                        <h2 className="text-lg font-bold text-slate-800 mb-6 tracking-tight">Student List</h2>

                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Find student..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-xs font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                            />
                        </div>

                        <div className="flex bg-slate-100 p-1 rounded-2xl">
                            {['Institute', 'Course'].map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setActiveFilter(filter)}
                                    className={`flex-1 py-2 text-[10px] font-bold transition-all rounded-xl ${activeFilter === filter ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {loading && !students.length ? (
                            <LoadingPlaceholder type="activities" />
                        ) : filteredStudents.map(student => (
                            <div
                                key={student._id}
                                onClick={() => {
                                    setSelectedStudent(student);
                                    setSelectedInbox(null);
                                    fetchStudentSubmissions(student._id);
                                }}
                                className={`flex items-center space-x-3 p-4 rounded-3xl border transition-all cursor-pointer ${selectedStudent?._id === student._id ? 'bg-white border-indigo-200 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/10' : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'}`}
                            >
                                <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white shadow-sm transition-transform ${selectedStudent?._id === student._id ? 'bg-indigo-600 scale-105' : 'bg-slate-800'}`}>
                                    {student.name[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-sm font-bold truncate ${selectedStudent?._id === student._id ? 'text-indigo-900' : 'text-slate-700'}`}>
                                        {student.name}
                                    </h4>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter bg-emerald-50 px-1.5 py-0.5 rounded">Complete: {student.stats?.completed || 0}</span>
                                        <span className="text-[8px] font-black text-orange-500 uppercase tracking-tighter bg-orange-50 px-1.5 py-0.5 rounded">Pending: {student.stats?.pending || 0}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}} />
        </DashboardLayout>
    );
};

export default TeacherActivities;
