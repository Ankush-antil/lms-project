import { useAuth } from '../../context/AuthContext';
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    Users, Search, ChevronRight, CheckCircle2, AlertCircle,
    BookOpen, Clock, MoreVertical, RefreshCw, Info, Menu,
    Hourglass, FileText, CheckCircle, MessageSquare, BarChart3, RotateCcw, Settings, ChevronDown, ChevronUp,
    Sparkles
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import { useUserProfile } from '../../components/common/UserProfileContext';

const getDisplayTitle = (title) => {
    if (!title) return 'Inbox No';
    const cleanTitle = title.trim();
    if (cleanTitle.toLowerCase().startsWith('inbox no')) return cleanTitle;
    if (cleanTitle.toLowerCase().startsWith('index')) {
        return cleanTitle.replace(/index/i, 'Inbox No');
    }
    if (/^\d+$/.test(cleanTitle)) {
        return `Inbox No ${cleanTitle}`;
    }
    return cleanTitle;
};

const getCategoryDisplayName = (act) => {
    if (!act) return 'General';
    const a = act.trim().toLowerCase();
    if (a === 'quiz' || a === 'mcq' || a === 'mcqs') return 'MCQs';
    if (a === 'short' || a === 'one-liner') return 'Short One-Liner Questions';
    if (a === 'long' || a === 'descriptive') return 'Long Descriptive Questions';
    if (a === 'oral') return 'Oral';
    if (a === 'true & false' || a === 'true/false') return 'True & False';
    if (a === 'fill in the blanks' || a === 'fill blanks') return 'Fill in the Blanks';
    if (a === 'match the following' || a === 'match') return 'Match the Following';
    if (a === 'assignment') return 'Assignment';
    if (a === 'activity') return 'Activity';
    if (a === 'projects' || a === 'project') return 'Projects';
    if (a === 'practical task') return 'Practical Task';
    if (a === 'practical viva' || a === 'viva') return 'Practical Viva';

    return act.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const TeacherActivities = () => {
    const { user } = useAuth();
    const userInfo = user;
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [viewMode, setViewMode] = useState('pending'); // 'pending' | 'submitted' | 'evaluated' | 'chat' | 'analytics'
    const [searchQuery, setSearchQuery] = useState('');
    const [inboxSearchQuery, setInboxSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('Institute');
    const [loading, setLoading] = useState(false);
    const [teacherInfo, setTeacherInfo] = useState(null);
    const [students, setStudents] = useState([]);
    const [studentSubmissions, setStudentSubmissions] = useState([]);
    const [allTests, setAllTests] = useState([]);
    const [selectedInboxId, setSelectedInboxId] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [infoModalData, setInfoModalData] = useState(null);
    const [showStudentList, setShowStudentList] = useState(true);
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState([
        { id: 1, sender: 'student', text: "Hello! Please make sure to submit your pending test category items before the scheduled deadline.", time: "10:00 AM" },
        { id: 2, sender: 'teacher', text: "Sure. I will review and let you know.", time: "10:05 AM" }
    ]);
    const [submissionsLoading, setSubmissionsLoading] = useState(false);
    const { openProfile } = useUserProfile();

    const navigate = useNavigate();

    useEffect(() => {
        if (userInfo) {
            setTeacherInfo(userInfo);
            fetchStudents(userInfo.token);
            fetchTests();
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

    const fetchTests = async () => {
        try {
            const { data } = await axios.get('/api/tests');
            setAllTests(data);
        } catch (error) {
            console.error("Error fetching all tests:", error);
        }
    };

    const fetchStudentSubmissions = async (studentId) => {
        try {
            setSubmissionsLoading(true);
            const { data } = await axios.get('/api/submissions');
            const filtered = data.filter(s => (s.student?._id || s.student) === studentId);
            setStudentSubmissions(filtered);
        } catch (error) {
            console.error("Error fetching student submissions:", error);
        } finally {
            setSubmissionsLoading(false);
        }
    };

    // Filter students by search bar
    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter assigned tests based on student profile (institute, course, subjects)
    const assignedTests = useMemo(() => {
        if (!selectedStudent) return [];
        const studentInstitute = selectedStudent.institute?.name?.trim() || '';
        const studentCourse = selectedStudent.studentProfile?.course?.name?.trim() || '';
        const studentSubject = selectedStudent.studentProfile?.subject?.trim() || '';

        if (!studentInstitute) return [];

        const subjects = studentSubject.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

        return allTests.filter(test => {
            // 1. Match Institute (case-insensitive)
            const instMatch = test.institute?.trim().toLowerCase() === studentInstitute.toLowerCase();
            if (!instMatch) return false;

            // 2. Match Subject
            const testSub = test.subject?.trim().toLowerCase() || '';
            const subMatch = subjects.some(sub => testSub === sub);
            if (!subMatch) return false;

            // 3. Match Course
            const testCourse = test.course?.trim().toLowerCase() || '';
            if (testCourse && testCourse !== studentCourse.toLowerCase()) return false;

            return true;
        });
    }, [allTests, selectedStudent]);

    const submissionMap = useMemo(() => {
        const map = new Map();
        studentSubmissions.forEach(sub => {
            const testId = sub.test?._id || sub.test;
            if (testId) map.set(testId, sub);
        });
        return map;
    }, [studentSubmissions]);

    const selectedStudentStats = useMemo(() => {
        if (!selectedStudent || !assignedTests) return { completed: 0, pending: 0 };
        const completed = assignedTests.filter(t => {
            const sub = submissionMap.get(t._id);
            return sub && sub.status === 'evaluated';
        }).length;
        const pending = assignedTests.length - completed;
        return { completed, pending };
    }, [assignedTests, submissionMap, selectedStudent]);

    // Group assigned tests by index for the student
    const dynamicInboxItems = useMemo(() => {
        const grouped = assignedTests.reduce((acc, test) => {
            const indexStr = test.index || 'No Index';
            if (!acc[indexStr]) acc[indexStr] = [];
            acc[indexStr].push(test);
            return acc;
        }, {});

        const getNum = (s) => parseInt(s.match(/\d+/)?.[0] || 0);

        return Object.keys(grouped)
            .sort((a, b) => getNum(a) - getNum(b))
            .map(indexStr => ({
                id: indexStr,
                title: indexStr,
                completed: grouped[indexStr].filter(t => {
                    const sub = submissionMap.get(t._id);
                    return sub && sub.status === 'evaluated';
                }).length,
                pending: grouped[indexStr].filter(t => {
                    const sub = submissionMap.get(t._id);
                    return !sub || sub.status !== 'evaluated';
                }).length,
                tests: grouped[indexStr]
            }));
    }, [assignedTests, submissionMap]);

    // Auto-select first group when student changes
    useEffect(() => {
        if (dynamicInboxItems.length > 0) {
            setSelectedInboxId(dynamicInboxItems[0].id);
            setViewMode('pending');
            setSelectedCategory(null);
        } else {
            setSelectedInboxId(null);
            setSelectedCategory(null);
        }
    }, [selectedStudent, dynamicInboxItems]);

    const selectedGroup = dynamicInboxItems.find(item => item.id === selectedInboxId);

    const pendingCount = useMemo(() => {
        if (!selectedGroup) return 0;
        return (selectedGroup.tests || []).filter(t => !submissionMap.get(t._id)).length;
    }, [selectedGroup, submissionMap]);

    const submittedCount = useMemo(() => {
        if (!selectedGroup) return 0;
        return (selectedGroup.tests || []).filter(t => {
            const sub = submissionMap.get(t._id);
            return sub && sub.status !== 'evaluated';
        }).length;
    }, [selectedGroup, submissionMap]);

    const evaluatedCount = useMemo(() => {
        if (!selectedGroup) return 0;
        return (selectedGroup.tests || []).filter(t => {
            const sub = submissionMap.get(t._id);
            return sub && sub.status === 'evaluated';
        }).length;
    }, [selectedGroup, submissionMap]);

    const activeTests = useMemo(() => {
        if (!selectedGroup) return [];
        return (selectedGroup.tests || []).filter(test => {
            const sub = submissionMap.get(test._id);
            if (viewMode === 'pending') {
                return !sub;
            } else if (viewMode === 'submitted') {
                return sub && sub.status !== 'evaluated';
            } else if (viewMode === 'evaluated') {
                return sub && sub.status === 'evaluated';
            }
            return false;
        });
    }, [selectedGroup, viewMode, submissionMap]);

    const categoriesMap = useMemo(() => {
        const map = {};
        activeTests.forEach(test => {
            const catName = getCategoryDisplayName(test.activity);
            if (!map[catName]) map[catName] = [];
            map[catName].push(test);
        });
        return map;
    }, [activeTests]);

    const filteredInboxItems = useMemo(() => {
        return dynamicInboxItems.filter(item =>
            getDisplayTitle(item.title).toLowerCase().includes(inboxSearchQuery.toLowerCase())
        );
    }, [dynamicInboxItems, inboxSearchQuery]);

    const getAvatarBgColor = (name) => {
        return 'bg-[#3E3ADD]';
    };

    return (
        <DashboardLayout role="Teacher" fullWidth={true}>
            <div className="flex h-[calc(100vh-120px)] bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">

                {/* --- Left Sidebar: Activities Inbox --- */}
                <aside className="w-72 border-r border-slate-200 flex flex-col shrink-0 overflow-hidden bg-white">
                    <div className="p-4 border-b border-slate-150 shrink-0 bg-white">
                        <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2">
                                <BookOpen className="text-slate-700" size={18} />
                                <h2 className="font-extrabold text-slate-800 text-[15px] leading-tight">Activities Inbox</h2>
                            </div>
                            {selectedStudent && (
                                <button
                                    onClick={() => setShowStudentList(prev => !prev)}
                                    className="p-1.5 bg-white hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-full border border-slate-200 shadow-sm transition-all"
                                    title="Toggle Student List"
                                >
                                    <Menu size={14} />
                                </button>
                            )}
                        </div>

                        {selectedStudent ? (
                            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-3 text-white shadow-lg shadow-indigo-500/10 mb-2.5 border border-white/20 relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-all duration-700" />
                                <div className="flex items-center space-x-2.5 relative z-10">
                                    <div
                                        className="w-9 h-9 rounded-full border border-white/30 bg-white/20 flex items-center justify-center text-white text-sm font-black shadow-inner cursor-pointer hover:scale-105 hover:border-white transition-all overflow-hidden shrink-0"
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
                                            className="font-bold text-white text-xs leading-tight truncate cursor-pointer hover:underline transition-all"
                                            onClick={() => openProfile(selectedStudent._id)}
                                        >
                                            {selectedStudent.name}
                                        </h3>
                                        <p className="text-[9px] text-indigo-100 font-semibold truncate mt-0.5">
                                            {selectedStudent.studentProfile?.course?.name || 'Web Dev'} • {selectedStudent.institute?.name || 'DPS Indore'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center mb-2.5 flex flex-col items-center justify-center py-4">
                                <span className="text-xs font-semibold text-slate-400">Select student from list</span>
                            </div>
                        )}

                        <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search Inboxes..."
                                value={inboxSearchQuery}
                                onChange={(e) => setInboxSearchQuery(e.target.value)}
                                disabled={!selectedStudent}
                                className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3E3ADD] focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400 text-slate-800 disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/10 custom-scrollbar">
                        {selectedStudent ? (
                            submissionsLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 bg-white h-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-900/20 border-t-indigo-900 mb-2"></div>
                                    <p className="text-xs text-slate-450 font-semibold">Loading activities...</p>
                                </div>
                            ) : filteredInboxItems.length > 0 ? (
                                filteredInboxItems.map(item => {
                                    const isActive = selectedInboxId === item.id;
                                    const firstTest = item.tests && item.tests.length > 0 ? item.tests[0] : null;

                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => {
                                                setSelectedInboxId(item.id);
                                                setSelectedCategory(null);
                                                if (!viewMode || !['pending', 'submitted', 'evaluated', 'practice', 'chat', 'analytics'].includes(viewMode)) {
                                                    setViewMode('pending');
                                                }
                                            }}
                                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isActive
                                                ? 'border-[#3E3ADD] bg-[#3E3ADD]/5 shadow-sm ring-1 ring-[#3E3ADD]/10'
                                                : 'border-slate-100 bg-white hover:border-[#3E3ADD]/40 hover:bg-slate-50/30'
                                                }`}
                                        >
                                            <div className="flex items-center space-x-2.5 min-w-0">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${isActive ? 'bg-[#3E3ADD] text-white shadow-sm' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    <BookOpen size={14} />
                                                </div>
                                                <h3 className={`font-bold text-xs truncate ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                    {getDisplayTitle(item.title)}
                                                </h3>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (firstTest) setInfoModalData(firstTest);
                                                }}
                                                className={`p-1 rounded-full border transition-all shrink-0 hover:bg-slate-150 ${isActive
                                                    ? 'border-indigo-200 text-indigo-600 bg-indigo-50/50'
                                                    : 'border-slate-200 text-slate-400 bg-white'
                                                    }`}
                                                title="Inbox Details"
                                            >
                                                <Info size={12} />
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 opacity-50 py-12">
                                    <Search size={32} strokeWidth={1.5} />
                                    <p className="text-xs font-semibold">No inboxes found</p>
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
                    {selectedStudent && (
                        <div className="bg-white border-b border-slate-200 p-4 flex flex-col gap-2.5 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-full bg-[#3E3ADD] text-white flex items-center justify-center shadow-md shadow-indigo-500/10 shrink-0">
                                    <BookOpen size={16} />
                                </div>
                                <div>
                                    <h1 className="text-lg font-extrabold text-indigo-950 tracking-tight leading-none">
                                        {selectedInboxId ? getDisplayTitle(selectedInboxId) : 'Select an Inbox'}
                                    </h1>
                                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wider">
                                        Your activities for this inbox
                                    </p>
                                </div>
                            </div>

                            {selectedInboxId && (
                                <div className="flex bg-slate-50/80 border border-slate-100 p-1 rounded-xl overflow-x-auto scrollbar-none gap-1 shrink-0">
                                    {[
                                        { id: 'pending', label: `Pending (${pendingCount})`, icon: Hourglass, activeClass: 'bg-[#EF4444] text-white shadow-md' },
                                        { id: 'submitted', label: `Submitted (${submittedCount})`, icon: FileText, activeClass: 'bg-blue-600 text-white shadow-md' },
                                        { id: 'evaluated', label: `Evaluated (${evaluatedCount})`, icon: CheckCircle2, activeClass: 'bg-emerald-600 text-white shadow-md' },
                                        { id: 'practice', label: 'Practice Tools', icon: Settings, activeClass: 'bg-purple-600 text-white shadow-md' },
                                        { id: 'chat', label: 'Chat with Student', icon: MessageSquare, activeClass: 'bg-teal-600 text-white shadow-md' },
                                        { id: 'analytics', label: 'Analytics', icon: BarChart3, activeClass: 'bg-amber-600 text-white shadow-md' }
                                    ].map(tab => {
                                        const isActive = viewMode === tab.id;
                                        const TabIcon = tab.icon;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => {
                                                    setViewMode(tab.id);
                                                    setSelectedCategory(null);
                                                }}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${isActive
                                                    ? tab.activeClass
                                                    : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-700'
                                                    }`}
                                            >
                                                <TabIcon size={12} className={isActive ? 'text-white' : 'text-slate-400'} />
                                                <span>{tab.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {!selectedStudent ? (
                            <div className="h-full flex flex-col items-center justify-center max-w-sm mx-auto text-center space-y-6">
                                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center shadow-inner">
                                    <Users size={32} className="text-indigo-500" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Welcome Back!</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        Select a student from the list to view their assigned inbox activities.
                                    </p>
                                </div>
                            </div>
                        ) : !selectedInboxId ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 max-w-md w-full text-center">
                                    <h2 className="text-xl font-bold text-slate-400 mb-2">No Inbox Assigned</h2>
                                    <p className="text-slate-400 text-xs leading-relaxed">
                                        This student does not have any assigned activities matching their course/subjects.
                                    </p>
                                </div>
                            </div>
                        ) : viewMode === 'chat' ? (
                            /* --- CHAT TAB --- */
                            <div className="animate-fade-in flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shadow-md">
                                            {selectedStudent.name[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm">{selectedStudent.name}</h3>
                                            <p className="text-[10px] text-slate-400 font-semibold">{selectedStudent.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500">
                                        Inbox Chat View
                                    </div>
                                </div>

                                <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50/20">
                                    {chatMessages.map(msg => (
                                        <div key={msg.id} className={`flex ${msg.sender === 'teacher' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] p-3 rounded-2xl text-xs leading-relaxed ${msg.sender === 'teacher'
                                                ? 'bg-[#3E3ADD] text-white rounded-tr-none'
                                                : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none shadow-sm'
                                                }`}>
                                                <p className="font-semibold">{msg.text}</p>
                                                <span className={`text-[8px] mt-1 block text-right ${msg.sender === 'teacher' ? 'text-indigo-200' : 'text-slate-400'
                                                    }`}>
                                                    {msg.time}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    if (!chatInput.trim()) return;
                                    const newMsg = {
                                        id: chatMessages.length + 1,
                                        sender: 'teacher',
                                        text: chatInput,
                                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    };
                                    setChatMessages(prev => [...prev, newMsg]);
                                    setChatInput('');
                                    setTimeout(() => {
                                        setChatMessages(prev => [...prev, {
                                            id: prev.length + 1,
                                            sender: 'student',
                                            text: "Thanks! I've received your note and will update the task accordingly.",
                                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        }]);
                                    }, 1000);
                                }} className="p-3 border-t border-slate-100 flex gap-2 bg-white">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        placeholder="Type your message to the student..."
                                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                                    />
                                    <button
                                        type="submit"
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-xl transition-colors shrink-0 flex items-center justify-center font-bold text-xs"
                                    >
                                        Send
                                    </button>
                                </form>
                            </div>
                        ) : viewMode === 'practice' ? (
                            /* --- PRACTICE TAB --- */
                            <div className="animate-fade-in space-y-6">
                                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
                                    <div className="relative z-10">
                                        <span className="text-[10px] font-black uppercase bg-white/20 px-2.5 py-1 rounded-full tracking-widest">Student Practice Details</span>
                                        <h2 className="text-xl font-bold mt-2">Practice Tools Analytics</h2>
                                        <p className="text-xs text-indigo-100 mt-1 max-w-md font-medium">Review this student's learning and practice tool activities generated under the current inbox syllabus.</p>
                                    </div>
                                    <div className="absolute right-4 bottom-0 opacity-10 pointer-events-none transform translate-y-4">
                                        <Sparkles size={180} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {[
                                        {
                                            title: "AI Quiz Generator",
                                            metrics: [
                                                { label: "Attempted Quizzes", value: "3 Quizzes" },
                                                { label: "Average Score", value: "85%" },
                                                { label: "Mastery Level", value: "Excellent" }
                                            ],
                                            color: "text-purple-600 bg-purple-50 border-purple-100"
                                        },
                                        {
                                            title: "Smart Flashcards",
                                            metrics: [
                                                { label: "Decks Reviewed", value: "2 Decks" },
                                                { label: "Total Cards Read", value: "24 Cards" },
                                                { label: "Retention Rate", value: "90%" }
                                            ],
                                            color: "text-indigo-600 bg-indigo-50 border-indigo-100"
                                        },
                                        {
                                            title: "Mindmap Builder",
                                            metrics: [
                                                { label: "Mindmaps Generated", value: "1 Mindmap" },
                                                { label: "Visual Nodes mapped", value: "8 Nodes" },
                                                { label: "Last Created", value: "Yesterday" }
                                            ],
                                            color: "text-teal-600 bg-teal-50 border-teal-100"
                                        }
                                    ].map((tool, idx) => (
                                        <div key={idx} className="bg-white p-4.5 rounded-2xl border border-slate-200 hover:border-[#3E3ADD] hover:shadow-md transition-all flex flex-col justify-between group">
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-xs border-b border-slate-105 pb-1.5 mb-3">{tool.title}</h3>
                                                <div className="space-y-2.5">
                                                    {tool.metrics.map((m, mIdx) => (
                                                        <div key={mIdx} className="flex justify-between items-center text-[11px]">
                                                            <span className="text-slate-400 font-semibold">{m.label}</span>
                                                            <span className="text-slate-700 font-bold">{m.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : viewMode === 'analytics' ? (
                            /* --- ANALYTICS TAB --- */
                            <div className="animate-fade-in space-y-6">
                                {(() => {
                                    const totalTests = selectedGroup.tests.length;
                                    const evaluatedTests = (selectedGroup.tests || []).filter(t => {
                                        const sub = submissionMap.get(t._id);
                                        return sub && sub.status === 'evaluated';
                                    }).length;
                                    const submittedTests = (selectedGroup.tests || []).filter(t => {
                                        const sub = submissionMap.get(t._id);
                                        return sub && sub.status !== 'evaluated';
                                    }).length;
                                    const unattemptedTests = totalTests - evaluatedTests - submittedTests;

                                    const evaluatedPct = totalTests > 0 ? Math.round((evaluatedTests / totalTests) * 100) : 0;
                                    const submittedPct = totalTests > 0 ? Math.round((submittedTests / totalTests) * 100) : 0;
                                    const unattemptedPct = totalTests > 0 ? (100 - evaluatedPct - submittedPct) : 0;

                                    return (
                                        <>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Inbox Items</span>
                                                        <span className="text-2xl font-black text-slate-800 mt-1 block">{totalTests}</span>
                                                    </div>
                                                    <div className="p-2.5 bg-indigo-50 text-[#3E3ADD] rounded-lg"><BookOpen size={16} /></div>
                                                </div>
                                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Evaluated</span>
                                                        <span className="text-2xl font-black text-emerald-600 mt-1 block">{evaluatedTests}</span>
                                                    </div>
                                                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 size={16} /></div>
                                                </div>
                                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Submitted</span>
                                                        <span className="text-2xl font-black text-blue-600 mt-1 block">{submittedTests}</span>
                                                    </div>
                                                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg"><FileText size={16} /></div>
                                                </div>
                                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unattempted</span>
                                                        <span className="text-2xl font-black text-[#EF4444] mt-1 block">{unattemptedTests}</span>
                                                    </div>
                                                    <div className="p-2.5 bg-rose-50 text-[#EF4444] rounded-lg"><Hourglass size={16} /></div>
                                                </div>
                                            </div>

                                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                                <h3 className="font-bold text-slate-800 text-sm">Overall Inbox Completion Progress</h3>
                                                <div>
                                                    <div className="flex justify-between items-center text-xs font-semibold text-slate-500 mb-2">
                                                        <span>Student Status Breakdown</span>
                                                        <span className="text-[#3E3ADD] font-bold">
                                                            {evaluatedPct}% Graded
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                                                        <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${evaluatedPct}%` }} title={`Evaluated: ${evaluatedPct}%`} />
                                                        <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${submittedPct}%` }} title={`Submitted for grading: ${submittedPct}%`} />
                                                        <div className="bg-[#EF4444] h-full transition-all duration-500" style={{ width: `${unattemptedPct}%` }} title={`Unattempted: ${unattemptedPct}%`} />
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-4 pt-2 text-xs font-bold text-slate-500 border-t border-slate-100">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 bg-emerald-500 rounded-full" />
                                                        <span>Evaluated / Graded ({evaluatedTests})</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 bg-blue-500 rounded-full" />
                                                        <span>Submitted for Grading ({submittedTests})</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 bg-[#EF4444] rounded-full" />
                                                        <span>Unattempted ({unattemptedTests})</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        ) : (
                            /* --- DIRECT TESTS GRID --- */
                            <div className="animate-fade-in space-y-4">
                                {!activeTests.length ? (
                                    <div className="py-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm max-w-md mx-auto">
                                        <div className="text-4xl mb-2">🎉</div>
                                        <p className="font-bold text-slate-700 text-sm">All caught up!</p>
                                        <p className="text-slate-400 text-xs mt-1 font-medium">No {viewMode} activities exist in this Inbox for the student.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                        {activeTests.map(test => {
                                            const sub = submissionMap.get(test._id);
                                            const isEvaluated = sub && sub.status === 'evaluated';

                                            return (
                                                <div
                                                    key={test._id}
                                                    className="bg-white p-2.5 rounded-xl border hover:shadow-md hover:border-[#3E3ADD] transition-all flex flex-col justify-between h-32 relative group"
                                                >
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setInfoModalData(test);
                                                        }}
                                                        className="absolute top-3 right-3 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-200 rounded-full hover:bg-slate-100 transition-colors shrink-0 z-10"
                                                    >
                                                        RI Details
                                                    </button>

                                                    <div className="flex items-start gap-2.5 min-w-0 pr-20">
                                                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!sub ? 'bg-orange-500' : isEvaluated ? 'bg-emerald-500' : 'bg-blue-500'
                                                            }`} />
                                                        <div className="min-w-0">
                                                            <h3 className="font-extrabold text-slate-800 text-xs leading-snug group-hover:text-[#3E3ADD] transition-colors line-clamp-2 uppercase tracking-tight">{test.title}</h3>
                                                            {test.activity && (
                                                                <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 rounded-md inline-block mt-1 w-max">
                                                                    {getCategoryDisplayName(test.activity)}
                                                                </span>
                                                            )}
                                                            <p className="text-[9px] font-black text-slate-405 mt-1.5 uppercase tracking-wider truncate">
                                                                Subject: {test.subject || 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {sub && (
                                                        <div className="flex items-center justify-end mt-2 border-t border-slate-50 pt-2" onClick={e => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => navigate(`/teacher/evaluate/${sub._id}`)}
                                                                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0 border ${isEvaluated
                                                                    ? 'bg-slate-105 text-slate-700 border-slate-200 hover:bg-slate-200'
                                                                    : 'bg-[#3E3ADD] text-white hover:bg-indigo-700'
                                                                    }`}
                                                            >
                                                                {isEvaluated ? 'Re-evaluate' : 'Evaluate Item'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>

                {/* --- Right Sidebar: Students Selecting --- */}
                {showStudentList && (
                    <aside className="w-64 border-l border-slate-200 flex flex-col shrink-0 overflow-hidden bg-white animate-slide-in-right">
                        <div className="p-4 border-b border-slate-150 bg-white">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-extrabold text-slate-800 tracking-tight">Student List</h2>
                                <span className="bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-[10px] font-black">
                                    {filteredStudents.length}
                                </span>
                            </div>

                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Find student..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 text-xs font-semibold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                />
                            </div>

                            <div className="flex bg-slate-100 p-0.5 rounded-xl">
                                {['Institute', 'Course'].map(filter => (
                                    <button
                                        key={filter}
                                        onClick={() => setActiveFilter(filter)}
                                        className={`flex-1 py-1.5 text-[10px] font-bold transition-all rounded-lg ${activeFilter === filter ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                            {loading && !students.length ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-900/20 border-t-indigo-900 mb-2"></div>
                                    <p className="text-xs text-indigo-950 font-semibold">Loading students...</p>
                                </div>
                            ) : filteredStudents.map(student => {
                                const isSelected = selectedStudent?._id === student._id;
                                const stats = isSelected ? selectedStudentStats : (student.stats || { completed: 0, pending: 0 });
                                const avatarBg = getAvatarBgColor(student.name);
                                return (
                                    <div
                                        key={student._id}
                                        onClick={() => {
                                            setSelectedStudent(student);
                                            fetchStudentSubmissions(student._id);
                                            setShowStudentList(false);
                                        }}
                                        className={`flex items-center space-x-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-white border-[#3E3ADD] shadow-md shadow-indigo-500/5 ring-1 ring-[#3E3ADD]/10' : 'bg-white border-slate-100 hover:border-[#3E3ADD]/40 hover:bg-slate-50/30'}`}
                                    >
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black !text-white shadow-sm transition-transform shrink-0 ${isSelected ? 'bg-[#3E3ADD] scale-105 shadow-sm shadow-indigo-500/10' : avatarBg}`} style={{ color: '#ffffff' }}>
                                            {student.name[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                {student.name}
                                            </h4>
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
                .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
                .scrollbar-none::-webkit-scrollbar { display: none; }
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
                                    <div className="w-10 h-10 rounded-full bg-[#3E3ADD] flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                        <BookOpen size={20} strokeWidth={2.5} />
                                    </div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Relevant Information</h2>
                                </div>
                                <button
                                    onClick={() => setInfoModalData(null)}
                                    className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-all"
                                >
                                    <RotateCcw size={20} className="rotate-45" />
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
