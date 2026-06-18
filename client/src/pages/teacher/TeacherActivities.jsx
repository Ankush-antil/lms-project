import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    Users, Search, ChevronRight, CheckCircle2, AlertCircle,
    BookOpen, Clock, MoreVertical, RefreshCw, Info, Menu
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import { useUserProfile } from '../../components/common/UserProfileContext';

const TeacherActivities = () => {
    const { user } = useAuth();
    const userInfo = user;
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [viewMode, setViewMode] = useState('pending'); // 'pending' | 'completed'
    const [searchQuery, setSearchQuery] = useState('');
    const [activitySearchQuery, setActivitySearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('Institute');
    const [loading, setLoading] = useState(false);
    const [teacherInfo, setTeacherInfo] = useState(null);
    const [students, setStudents] = useState([]);
    const [studentSubmissions, setStudentSubmissions] = useState([]);
    const [infoModalData, setInfoModalData] = useState(null);
    const [showStudentList, setShowStudentList] = useState(true);
    const { openProfile } = useUserProfile();

    const navigate = useNavigate();

    useEffect(() => {
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
            const { data } = await axios.get('/api/users/teacher-students');
            setStudents(data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching students:", error);
            setLoading(false);
        }
    };

    const fetchStudentSubmissions = async (studentId) => {
        try {
            const { data } = await axios.get('/api/submissions');
            const filtered = data.filter(s => (s.student?._id || s.student) === studentId);
            setStudentSubmissions(filtered);
        } catch (error) {
            console.error("Error fetching student submissions:", error);
        }
    };

    // Filter students by search bar
    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter activities by viewMode and search query
    const filteredActivities = studentSubmissions.filter(sub => {
        const matchesStatus = viewMode === 'pending' ? sub.status === 'submitted' : sub.status === 'evaluated';
        const matchesSearch = sub.test?.title?.toLowerCase().includes(activitySearchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const getAvatarBgColor = (name) => {
        const colors = [
            'bg-[#3E3ADD]', // Purple
            'bg-[#EC4899]', // Pink/Magenta
            'bg-[#10B981]', // Green
            'bg-[#F59E0B]', // Orange
            'bg-[#06B6D4]', // Cyan
            'bg-[#3B82F6]'  // Blue
        ];
        if (!name) return colors[0];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    };

    return (
        <DashboardLayout role="Teacher">
            <div className="flex h-[calc(100vh-120px)] bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">

                {/* --- Left Sidebar: Activities Inbox --- */}
                <aside className="w-80 border-r border-slate-200 flex flex-col shrink-0 overflow-hidden bg-gray-100">
                    <div className="p-6 border-b border-slate-200 bg-gray-100 shrink-0">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Student Profile</h2>
                            {selectedStudent && (
                                <button
                                    onClick={() => setShowStudentList(prev => !prev)}
                                    className="p-2 bg-white hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-full border border-slate-200 shadow-sm transition-all"
                                    title="Toggle Student List"
                                >
                                    <Menu size={16} />
                                </button>
                            )}
                        </div>

                        {selectedStudent ? (
                            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl p-5 text-white shadow-lg shadow-indigo-500/10 mb-4 relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-all duration-700" />
                                <div className="flex items-center space-x-3.5 relative z-10">
                                    <div
                                        className="w-12 h-12 rounded-full border-2 border-white/30 bg-white/20 flex items-center justify-center text-white text-lg font-black shadow-inner cursor-pointer hover:scale-105 hover:border-white transition-all overflow-hidden shrink-0"
                                        onClick={() => openProfile(selectedStudent._id)}
                                        title="View student profile"
                                    >
                                        {selectedStudent.avatar ? (
                                            <img src={selectedStudent.avatar} alt={selectedStudent.name} className="w-full h-full object-cover" />
                                        ) : (
                                            selectedStudent.name[0].toUpperCase()
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3
                                            className="font-bold text-white text-base leading-tight truncate cursor-pointer hover:underline transition-all"
                                            onClick={() => openProfile(selectedStudent._id)}
                                        >
                                            {selectedStudent.name}
                                        </h3>
                                        <p className="text-[10px] text-indigo-100 font-semibold truncate mt-1">
                                            {selectedStudent.studentProfile?.course?.name || 'Web Dev'} • {selectedStudent.institute?.name || 'DPS Indore'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-5 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center mb-4 flex flex-col items-center justify-center py-6">
                                <span className="text-xs font-semibold text-slate-400">Select a student from the list</span>
                            </div>
                        )}

                        {selectedStudent && (
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div
                                    onClick={() => setViewMode('completed')}
                                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${viewMode === 'completed' ? 'bg-emerald-50/50 border-emerald-500 shadow-sm' : 'bg-slate-50/50 border-transparent hover:border-slate-200'}`}
                                >
                                    <div className="flex items-center justify-between text-emerald-600">
                                        <span className="text-[10px] font-black uppercase tracking-wider">Complete</span>
                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                    </div>
                                    <span className="text-2xl font-black text-emerald-800 mt-1">
                                        {studentSubmissions.filter(s => s.status === 'evaluated').length}
                                    </span>
                                </div>
                                <div
                                    onClick={() => setViewMode('pending')}
                                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${viewMode === 'pending' ? 'bg-orange-50/50 border-orange-500 shadow-sm' : 'bg-slate-50/50 border-transparent hover:border-slate-200'}`}
                                >
                                    <div className="flex items-center justify-between text-orange-600">
                                        <span className="text-[10px] font-black uppercase tracking-wider">Pending</span>
                                        <Clock size={14} className="text-orange-500" />
                                    </div>
                                    <span className="text-2xl font-black text-orange-800 mt-1">
                                        {studentSubmissions.filter(s => s.status === 'submitted').length}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search activities..."
                                value={activitySearchQuery}
                                onChange={(e) => setActivitySearchQuery(e.target.value)}
                                disabled={!selectedStudent}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
                        {selectedStudent ? (
                            filteredActivities.length > 0 ? (
                                filteredActivities.map(sub => {
                                    const isQuiz = sub.test?.title?.toLowerCase().includes('quiz');
                                    const isAssignment = sub.test?.title?.toLowerCase().includes('assignment');
                                    const isProject = sub.test?.title?.toLowerCase().includes('project') || sub.test?.title?.toLowerCase().includes('mastery');
                                    
                                    let iconBg = 'bg-indigo-50 text-indigo-500';
                                    if (isQuiz) iconBg = 'bg-emerald-50 text-emerald-500';
                                    else if (isAssignment) iconBg = 'bg-sky-50 text-sky-500';
                                    else if (isProject) iconBg = 'bg-amber-50 text-amber-500';
                                    
                                    const isSelected = selectedSubmission?._id === sub._id;
                                    return (
                                        <div
                                            key={sub._id}
                                            onClick={() => setSelectedSubmission(sub)}
                                            className={`flex items-center space-x-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'border-indigo-500 bg-white shadow-md ring-1 ring-indigo-500/10' : 'border-transparent bg-slate-50/30 hover:border-slate-200 hover:bg-white'}`}
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg} shadow-sm shrink-0`}>
                                                <BookOpen size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`font-bold text-slate-800 text-xs truncate uppercase tracking-tight ${isSelected ? 'text-indigo-600' : ''}`}>{sub.test?.title || 'Test'}</h4>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    {sub.submittedAt ? `Submitted ${new Date(sub.submittedAt).toLocaleDateString('en-GB')}` : 'No date'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 opacity-50 py-12">
                                    <Search size={32} strokeWidth={1.5} />
                                    <p className="text-xs font-semibold">No activities found</p>
                                </div>
                            )
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 text-slate-400 space-y-2 py-12">
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
                                <div className={`rounded-[24px] p-6 flex items-center justify-between text-white shadow-md transition-all duration-300 ${viewMode === 'pending' ? 'bg-gradient-to-r from-rose-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shadow-inner"><BookOpen size={24} /></div>
                                        <div>
                                            <h2 className="font-black text-xl tracking-tight">{viewMode === 'pending' ? 'Pending Submissions' : 'Completed Submissions'}</h2>
                                            <p className="text-white/80 text-[11px] font-semibold mt-1">
                                                {selectedStudent.name} • {selectedStudent.studentProfile?.course?.name || 'Web Dev'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-6 bg-[#ECFDF5] rounded-[24px] border border-emerald-100/50 flex items-center justify-between shadow-sm">
                                        <div>
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Total Evaluated</span>
                                            <div className="text-4xl font-black text-emerald-800">
                                                {studentSubmissions.filter(s => s.status === 'evaluated').length}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-white rounded-2xl shadow-sm text-emerald-500 border border-emerald-50"><CheckCircle2 size={24} /></div>
                                    </div>
                                    
                                    <div className="p-6 bg-[#FFFBEB] rounded-[24px] border border-amber-100/50 flex items-center justify-between shadow-sm">
                                        <div>
                                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">Awaiting Review</span>
                                            <div className="text-4xl font-black text-amber-800">
                                                {studentSubmissions.filter(s => s.status === 'submitted').length}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-white rounded-2xl shadow-sm text-amber-500 border border-amber-50"><AlertCircle size={24} /></div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Submission List</h4>
                                    </div>

                                    {selectedSubmission ? (
                                        <div className="bg-white rounded-3xl border-2 border-[#3E3ADD] p-6 shadow-md shadow-[#3E3ADD]/5 flex items-center justify-between transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${selectedSubmission.status === 'evaluated' ? 'bg-emerald-500' : 'bg-[#3E3ADD]'}`} />
                                                <div>
                                                    <h3 className="font-extrabold text-slate-800 text-base leading-tight">{selectedSubmission.test?.title || 'Test'}</h3>
                                                    <p className="text-[10px] font-semibold text-slate-400 mt-1.5 uppercase tracking-wider">
                                                        Submitted date: {new Date(selectedSubmission.submittedAt).toLocaleDateString('en-GB')}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => setInfoModalData(selectedSubmission.test)}
                                                    className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all shadow-sm"
                                                >
                                                    Connect it
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/teacher/evaluate/${selectedSubmission._id}`)}
                                                    className={`${selectedSubmission.status === 'evaluated' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-red-500 text-white hover:bg-red-600'} px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95`}
                                                >
                                                    {selectedSubmission.status === 'evaluated' ? 'Re-evaluate' : 'Evaluate Item'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-24 text-center bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200 flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-300 shadow-sm border border-slate-100">
                                                <Search size={24} />
                                            </div>
                                            <p className="text-slate-700 text-base font-extrabold">No submissions for the selected date.</p>
                                            <p className="text-slate-400 text-xs font-medium mt-1">Pick an activity from the left to view its details.</p>
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
                {showStudentList && (
                    <aside className="w-80 border-l border-slate-200 flex flex-col shrink-0 overflow-hidden bg-gray-100 animate-slide-in-right">
                        <div className="p-6 border-b border-slate-200 bg-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Student List</h2>
                                <span className="bg-indigo-50 border border-indigo-100 text-indigo-600 px-2.5 py-0.5 rounded-full text-xs font-black">
                                    {filteredStudents.length}
                                </span>
                            </div>

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
                            ) : filteredStudents.map(student => {
                                const isSelected = selectedStudent?._id === student._id;
                                const avatarBg = getAvatarBgColor(student.name);
                                return (
                                    <div
                                        key={student._id}
                                        onClick={() => {
                                            setSelectedStudent(student);
                                            setSelectedSubmission(null);
                                            fetchStudentSubmissions(student._id);
                                            setShowStudentList(false);
                                        }}
                                        className={`flex items-center space-x-3 p-4 rounded-3xl border transition-all cursor-pointer ${isSelected ? 'bg-white border-indigo-200 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/10' : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'}`}
                                    >
                                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-white shadow-sm transition-transform shrink-0 ${isSelected ? 'bg-indigo-600 scale-105' : avatarBg}`}>
                                            {student.name[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                {student.name}
                                            </h4>
                                            <div className="flex items-center space-x-2 mt-1.5">
                                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded-md">
                                                    C: {student.stats?.completed || 0}
                                                </span>
                                                <span className="text-[9px] font-black text-orange-600 uppercase tracking-tighter bg-orange-50 border border-orange-100/50 px-2 py-0.5 rounded-md">
                                                    P: {student.stats?.pending || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </aside>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-slide-in-right { animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
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
