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
    const [selectedIndex, setSelectedIndex] = useState('All');
    const [viewMode, setViewMode] = useState('pending'); // 'pending' | 'completed'
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('Institute');
    const [loading, setLoading] = useState(false);
    const [teacherInfo, setTeacherInfo] = useState(null);
    const [students, setStudents] = useState([]);
    const [studentSubmissions, setStudentSubmissions] = useState([]);
    const [infoModalData, setInfoModalData] = useState(null);
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
                const uniqueIndices = [...new Set(filtered.map(s => s.test?.index || 'No Index'))];
                setSelectedIndex(uniqueIndices[0]);
                setViewMode('pending');
            }
        } catch (error) {
            console.error("Error fetching student submissions:", error);
        }
    };

    // Group submissions by the Test's Index strictly for the left sidebar "Inboxes"
    const groupedByIndex = studentSubmissions.reduce((acc, sub) => {
        const indexStr = sub.test?.index || 'No Index';

        if (!acc[indexStr]) {
            acc[indexStr] = {
                id: indexStr,
                title: indexStr,
                submissions: [],
                pending: 0,
                completed: 0,
                latestTime: new Date(sub.submittedAt)
            };
        }
        acc[indexStr].submissions.push(sub);
        if (sub.status === 'submitted') acc[indexStr].pending++;
        else acc[indexStr].completed++;
        if (new Date(sub.submittedAt) > acc[indexStr].latestTime) acc[indexStr].latestTime = new Date(sub.submittedAt);
        return acc;
    }, {});

    const dynamicInboxes = Object.values(groupedByIndex).sort((a, b) => {
        const getNum = (s) => parseInt(s.match(/\d+/)?.[0] || 0);
        return getNum(a.id) - getNum(b.id) || b.latestTime - a.latestTime;
    });

    // Index filtering and counts for the dashboard
    const indexStats = studentSubmissions.reduce((acc, s) => {
        const indexKey = s.test?.index || 'No Index';

        if (!acc[indexKey]) acc[indexKey] = { count: 0, pending: 0, completed: 0 };
        acc[indexKey].count++;
        if (s.status === 'submitted') acc[indexKey].pending++;
        else acc[indexKey].completed++;
        return acc;
    }, {});

    const uniqueIndices = studentSubmissions.length ? Object.keys(indexStats).sort((a, b) => {
        const getNum = (s) => parseInt(s.match(/\d+/)?.[0] || 0);
        return getNum(a) - getNum(b);
    }) : [];

    const filteredSubmissions = studentSubmissions.filter(s => {
        const sIndex = s.test?.index || 'No Index';
        const matchesIndex = sIndex === selectedIndex;
        const matchesStatus = viewMode === 'pending' ? s.status === 'submitted' : s.status === 'evaluated';
        return matchesIndex && matchesStatus;
    }) || [];

    // Dashboard summary stats
    const summaryStats = {
        pending: indexStats[selectedIndex]?.pending || 0,
        completed: indexStats[selectedIndex]?.completed || 0
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <DashboardLayout role="Teacher">
            <div className="flex h-[calc(100vh-120px)] bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">

                {/* --- Left Sidebar: Activities Inbox --- */}
                <aside className="w-80 border-r border-slate-200 flex flex-col shrink-0 overflow-hidden bg-gray-100">
                    <div className="p-6 border-b border-slate-200 bg-gray-100">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Student Profile</h2>

                        {selectedStudent ? (
                            <div className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 mb-4">
                                <div className="flex items-center space-x-3">
                                    <div
                                        className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm cursor-pointer hover:scale-110 hover:ring-2 hover:ring-indigo-400 hover:ring-offset-2 transition-all overflow-hidden"
                                        onClick={() => openProfile(selectedStudent._id)}
                                        title="View student profile"
                                    >
                                        {selectedStudent.avatar ? (
                                            <img src={selectedStudent.avatar} alt={selectedStudent.name} className="w-full h-full object-cover" />
                                        ) : (
                                            selectedStudent.name[0]
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3
                                            className="font-bold text-slate-800 text-sm truncate cursor-pointer hover:text-indigo-600 transition-colors"
                                            onClick={() => openProfile(selectedStudent._id)}
                                        >
                                            {selectedStudent.name}
                                        </h3>
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
                                onClick={() => { setSelectedInbox(inbox); setSelectedIndex(inbox.title); }}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer group ${selectedInbox?.id === inbox.id ? 'border-indigo-500 bg-white shadow-md ring-1 ring-indigo-500/20' : 'border-transparent hover:border-indigo-200 hover:bg-white'}`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-indigo-500" />
                                        <h4 className="font-bold text-slate-700 text-sm group-hover:text-indigo-700 transition-colors uppercase tracking-tight">{inbox.title}</h4>
                                    </div>
                                    <button className="text-slate-300 hover:text-slate-500"><MoreVertical size={14} /></button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    <div
                                        onClick={(e) => { e.stopPropagation(); setSelectedInbox(inbox); setSelectedIndex(inbox.title); setViewMode('completed'); }}
                                        className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-lg border transition-all ${selectedInbox?.id === inbox.id && viewMode === 'completed' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-700 border-emerald-100/50 hover:bg-emerald-100'}`}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full ${selectedInbox?.id === inbox.id && viewMode === 'completed' ? 'bg-white' : 'bg-emerald-500'}`}></div>
                                        <span className={`text-[10px] font-black uppercase ${selectedInbox?.id === inbox.id && viewMode === 'completed' ? 'text-white' : 'text-emerald-700'}`}>Completed {inbox.completed}</span>
                                    </div>
                                    <div
                                        onClick={(e) => { e.stopPropagation(); setSelectedInbox(inbox); setSelectedIndex(inbox.title); setViewMode('pending'); }}
                                        className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-lg border transition-all ${selectedInbox?.id === inbox.id && viewMode === 'pending' ? 'bg-orange-500 text-white border-orange-600' : 'bg-orange-50 text-orange-700 border-orange-100/50 hover:bg-orange-100'}`}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full ${selectedInbox?.id === inbox.id && viewMode === 'pending' ? 'bg-white' : 'bg-orange-500'}`}></div>
                                        <span className={`text-[10px] font-black uppercase leading-none ${selectedInbox?.id === inbox.id && viewMode === 'pending' ? 'text-white' : 'text-orange-700'}`}>Pending : {inbox.pending}</span>
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
                                <div className={`rounded-xl p-3 flex items-center justify-between text-white shadow-md ${viewMode === 'pending' ? 'bg-red-500' : 'bg-emerald-500'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/20 p-2 rounded-lg"><BookOpen size={20} /></div>
                                        <h2 className="font-bold text-lg">{viewMode === 'pending' ? 'Pending Submissions' : 'Completed Submissions'}</h2>
                                    </div>
                                    {/* <div className="flex items-center gap-3">
                                        <button onClick={() => fetchStudentSubmissions(selectedStudent._id)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                            <RefreshCw size={18} />
                                        </button>
                                    </div> */}
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



                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Submission List</h4>
                                    </div>

                                    {filteredSubmissions.length > 0 ? (
                                        <div className="space-y-4">
                                            {filteredSubmissions.map((sub) => {
                                                const isEvaluated = sub.status === 'evaluated';
                                                return (
                                                    <div
                                                        key={sub._id}
                                                        onClick={() => navigate(`/teacher/evaluate/${sub._id}`)}
                                                        className={`bg-white rounded-2xl border-2 overflow-hidden transition-all cursor-pointer group hover:shadow-md ${isEvaluated ? 'border-emerald-500 shadow-emerald-50' : 'border-[#3E3ADD]'}`}
                                                    >
                                                        {/* Submission card header */}
                                                        <div className="p-4 flex items-center justify-between transition-colors">
                                                            <div className="flex items-start gap-3">
                                                                <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${isEvaluated ? 'bg-emerald-500' : 'bg-slate-900'}`} />
                                                                <div>
                                                                    <h3 className="font-bold text-slate-800 text-sm leading-tight transition-colors group-hover:text-indigo-600">{sub.test?.title || 'Test'}</h3>
                                                                    <p className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-wider">
                                                                        Submitted date: {new Date(sub.submittedAt).toLocaleDateString('en-GB')}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                <MoreVertical size={16} className="text-[#3E3ADD]" />
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setInfoModalData(sub.test);
                                                                        }}
                                                                        className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all"
                                                                    >
                                                                        Relevant Information
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            navigate(`/teacher/evaluate/${sub._id}`);
                                                                        }}
                                                                        className={`${isEvaluated ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-[#FFE4E6] text-[#E11D48] hover:bg-[#FECDD3]'} px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all`}
                                                                    >
                                                                        {isEvaluated ? 'Re-evaluate' : 'Evaluate Item'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
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
                <aside className="w-80 border-l border-slate-200 flex flex-col shrink-0 overflow-hidden bg-gray-100">
                    <div className="p-6 border-b border-slate-200 bg-gray-100">
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
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}} />

            {/* Relevant Information Modal */}
            {infoModalData && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-sans">
                    <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                        <BookOpen size={20} strokeWidth={2.5} />
                                    </div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Relevant Information</h2>
                                </div>
                                <button
                                    onClick={() => setInfoModalData(null)}
                                    className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-all"
                                >
                                    <RefreshCw size={20} className="rotate-45" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl mb-2">
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">Test Name</span>
                                    <span className="font-bold text-indigo-900 text-lg">{infoModalData.title || infoModalData.name || 'Untitled Test'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Institute</span>
                                        <span className="font-bold text-slate-900">{infoModalData.institute || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Course</span>
                                        <span className="font-bold text-slate-900">{infoModalData.course || 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Subject</span>
                                        <span className="font-bold text-slate-900">{infoModalData.subject || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Date</span>
                                        <span className="font-bold text-slate-900">{infoModalData.date || (infoModalData.createdAt ? new Date(infoModalData.createdAt).toLocaleDateString('en-GB') : 'N/A')}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Test Index</span>
                                        <span className="font-bold text-slate-900">{infoModalData.index || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Activity Type</span>
                                        <span className="font-bold text-slate-900">{infoModalData.activity || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setInfoModalData(null)}
                                className="w-full mt-10 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all active:scale-95 uppercase tracking-widest text-xs"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default TeacherActivities;
