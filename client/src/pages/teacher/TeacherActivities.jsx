import { useAuth } from '../../context/AuthContext';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    Users, Search, ChevronRight, CheckCircle2, AlertCircle,
    BookOpen, Clock, MoreVertical, RefreshCw, Info, Menu,
    Hourglass, FileText, CheckCircle, MessageSquare, BarChart3, RotateCcw, Settings, ChevronDown, ChevronUp,
    Sparkles, Eye, ThumbsUp, Camera, Mic, Phone, Video, MonitorPlay, Calendar, ArrowRight, Play, Upload,
    CreditCard, Activity
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
    const [chatMessages, setChatMessages] = useState([]);
    const [loadingChat, setLoadingChat] = useState(false);
    const messagesEndRef = useRef(null);
    const { socket, onlineUsers } = useSocket();
    const [submissionsLoading, setSubmissionsLoading] = useState(false);
    const { openProfile } = useUserProfile();
    const navigate = useNavigate();

    const [studentTab, setStudentTab] = useState('tests'); // 'tests' | 'practice' | 'performance'
    const [studentPracticeFiles, setStudentPracticeFiles] = useState([]);
    const [studentSharedNotes, setStudentSharedNotes] = useState([]);
    const [selectedPracticeDate, setSelectedPracticeDate] = useState('');
    const [loadingPracticeFiles, setLoadingPracticeFiles] = useState(false);

    const [studyMaterials, setStudyMaterials] = useState([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);
    const [matTitle, setMatTitle] = useState('');
    const [matFile, setMatFile] = useState(null);
    const [uploadingMaterial, setUploadingMaterial] = useState(false);

    useEffect(() => {
        if (viewMode === 'study-material' && selectedInboxId) {
            const fetchMaterials = async () => {
                try {
                    setLoadingMaterials(true);
                    const { data } = await axios.get(`/api/study-materials?inboxId=${selectedInboxId}`);
                    setStudyMaterials(data);
                } catch (err) {
                    console.error("Error fetching study materials:", err);
                    toast.error("Failed to load study materials");
                } finally {
                    setLoadingMaterials(false);
                }
            };
            fetchMaterials();
        }
    }, [viewMode, selectedInboxId]);

    // ERP Fee Accounting & Ledger Mock States
    const [erpPresent, setErpPresent] = useState(42);
    const [erpTotal] = useState(50);
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSyncERP = () => {
        setIsSyncing(true);
        const loadingToast = toast.loading("Syncing data with College ERP Server...");

        setTimeout(() => {
            toast.dismiss(loadingToast);
            const randomAdd = Math.floor(Math.random() * 3) - 1;
            const newPresent = Math.min(erpTotal, Math.max(35, erpPresent + randomAdd));
            setErpPresent(newPresent);

            toast.success("ERP Attendance and Fees records synced successfully!");
            setIsSyncing(false);
        }, 1500);
    };

    const erpAttendancePercent = useMemo(() => {
        return Math.round((erpPresent / erpTotal) * 100);
    }, [erpPresent, erpTotal]);

    const fetchStudentPracticeFiles = async (studentId) => {
        try {
            setLoadingPracticeFiles(true);
            const [filesRes, notesRes] = await Promise.all([
                axios.get(`/api/practice-files?studentId=${studentId}`),
                axios.get(`/api/notes/shared?studentId=${studentId}`).catch(() => ({ data: [] }))
            ]);
            setStudentPracticeFiles(filesRes.data.files || []);
            setStudentSharedNotes(notesRes.data || []);
        } catch (error) {
            console.error("Error fetching student practice files:", error);
        } finally {
            setLoadingPracticeFiles(false);
        }
    };

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

    const handleUploadStudyMaterial = async (e) => {
        e.preventDefault();
        if (!matTitle.trim() || !matFile || !selectedInboxId) {
            toast.error("Please fill in the title and select a file");
            return;
        }
        try {
            setUploadingMaterial(true);
            const formData = new FormData();
            formData.append('title', matTitle.trim());
            formData.append('inboxId', selectedInboxId);
            formData.append('file', matFile);

            const { data } = await axios.post('/api/study-materials', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Study material uploaded successfully!");
            setStudyMaterials(prev => [data, ...prev]);
            setMatTitle('');
            setMatFile(null);
            const fileInput = document.getElementById('study-material-file');
            if (fileInput) fileInput.value = '';
        } catch (err) {
            console.error("Error uploading study material:", err);
            toast.error(err.response?.data?.message || "Failed to upload study material");
        } finally {
            setUploadingMaterial(false);
        }
    };

    const handleDeleteStudyMaterial = async (id) => {
        if (!window.confirm("Are you sure you want to delete this study material?")) return;
        try {
            await axios.delete(`/api/study-materials/${id}`);
            toast.success("Study material deleted successfully!");
            setStudyMaterials(prev => prev.filter(m => m._id !== id));
        } catch (err) {
            console.error("Error deleting study material:", err);
            toast.error("Failed to delete study material");
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

    const feedbackCount = useMemo(() => {
        if (!selectedGroup) return 0;
        return (selectedGroup.tests || []).filter(t => {
            const sub = submissionMap.get(t._id);
            return sub && sub.status === 'evaluated' && sub.answers.some(a => (a.conversation && a.conversation.some(msg => msg.role === 'Student')) || a.reaction);
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
            } else if (viewMode === 'student-feedback') {
                return sub && sub.status === 'evaluated' && sub.answers.some(a => (a.conversation && a.conversation.some(msg => msg.role === 'Student')) || a.reaction);
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

    // ── Student Practice Logs & Dates Memos ──
    const practiceDatesList = useMemo(() => {
        const datesMap = {};
        studentPracticeFiles.forEach(f => {
            const date = new Date(f.createdAt);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const parsed = `${day}-${month}-${year}`;
            datesMap[parsed] = true;
        });
        studentSharedNotes.forEach(n => {
            const date = new Date(n.createdAt);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const parsed = `${day}-${month}-${year}`;
            datesMap[parsed] = true;
        });
        return Object.keys(datesMap).sort((a, b) => {
            const aParts = a.split('-');
            const bParts = b.split('-');
            const aTime = new Date(`${aParts[2]}-${aParts[1]}-${aParts[0]}`).getTime();
            const bTime = new Date(`${bParts[2]}-${bParts[1]}-${bParts[0]}`).getTime();
            return bTime - aTime;
        });
    }, [studentPracticeFiles, studentSharedNotes]);

    const activePracticeFiles = useMemo(() => {
        if (!selectedPracticeDate) return [];
        return studentPracticeFiles.filter(f => {
            const date = new Date(f.createdAt);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const parsed = `${day}-${month}-${year}`;
            return parsed === selectedPracticeDate;
        });
    }, [studentPracticeFiles, selectedPracticeDate]);

    const activePracticeNotes = useMemo(() => {
        if (!selectedPracticeDate) return [];
        return studentSharedNotes.filter(n => {
            const date = new Date(n.createdAt);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const parsed = `${day}-${month}-${year}`;
            return parsed === selectedPracticeDate;
        });
    }, [studentSharedNotes, selectedPracticeDate]);

    useEffect(() => {
        if (studentTab === 'practice' && practiceDatesList.length > 0 && !selectedPracticeDate) {
            setSelectedPracticeDate(practiceDatesList[0]);
        }
    }, [studentTab, practiceDatesList, selectedPracticeDate]);

    // ── Student Performance Analytics Memos ──
    const performanceAttendanceLogs = useMemo(() => {
        const dates = {};
        studentSubmissions.forEach(sub => {
            const dateStr = new Date(sub.submittedAt || sub.createdAt).toDateString();
            dates[dateStr] = { type: 'Submission', desc: `Submitted test: ${sub.test?.title || 'Test'}` };
        });
        studentPracticeFiles.forEach(file => {
            const dateStr = new Date(file.createdAt).toDateString();
            dates[dateStr] = { type: 'Practice Tool', desc: `Uploaded ${file.filename} via ${file.toolType}` };
        });
        studentSharedNotes.forEach(note => {
            const dateStr = new Date(note.createdAt).toDateString();
            dates[dateStr] = { type: 'Notes Tool', desc: `Shared Note: ${note.title}` };
        });

        const logs = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            const activity = dates[dateStr];

            logs.push({
                date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
                dayName: date.toLocaleDateString('en-GB', { weekday: 'short' }),
                status: activity ? 'Present' : 'Absent',
                description: activity ? activity.desc : 'Self-study / No system logs'
            });
        }
        return logs;
    }, [studentSubmissions, studentPracticeFiles, studentSharedNotes]);

    const activeDaysCount = useMemo(() => {
        const dates = {};
        studentSubmissions.forEach(sub => {
            const dateStr = new Date(sub.submittedAt || sub.createdAt).toDateString();
            dates[dateStr] = true;
        });
        studentPracticeFiles.forEach(file => {
            const dateStr = new Date(file.createdAt).toDateString();
            dates[dateStr] = true;
        });
        studentSharedNotes.forEach(note => {
            const dateStr = new Date(note.createdAt).toDateString();
            dates[dateStr] = true;
        });
        return Object.keys(dates).length;
    }, [studentSubmissions, studentPracticeFiles, studentSharedNotes]);

    const performanceAttendancePercentage = useMemo(() => {
        const baseline = 88;
        const bonus = activeDaysCount * 2;
        return Math.min(100, baseline + bonus);
    }, [activeDaysCount]);

    const performanceAttendanceStatus = useMemo(() => {
        if (performanceAttendancePercentage >= 95) return { label: 'Outstanding', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
        if (performanceAttendancePercentage >= 90) return { label: 'Good', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
        return { label: 'Needs Consistency', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    }, [performanceAttendancePercentage]);



    useEffect(() => {
        if (!selectedStudent || viewMode !== 'chat' || !selectedInboxId) return;

        const fetchMessages = async () => {
            try {
                setLoadingChat(true);
                const { data } = await axios.get(`/api/chat/messages/${selectedStudent._id}?inboxId=${selectedInboxId}`);
                setChatMessages(data);

                await axios.put(`/api/chat/messages/${selectedStudent._id}/read`);
            } catch (err) {
                console.error("Error fetching student chat messages:", err);
            } finally {
                setLoadingChat(false);
            }
        };
        fetchMessages();
    }, [selectedStudent, viewMode, selectedInboxId]);

    useEffect(() => {
        if (!socket || !selectedStudent || !selectedInboxId) return;

        const handleReceiveMessage = (msg) => {
            if (String(msg.sender) === String(selectedStudent._id) && !msg.test && msg.inboxId === selectedInboxId) {
                setChatMessages(prev => {
                    if (prev.some(m => m._id === msg._id)) return prev;
                    return [...prev, msg];
                });

                axios.put(`/api/chat/messages/${selectedStudent._id}/read`).catch(() => { });
            }
        };

        socket.on('receive-message', handleReceiveMessage);
        return () => {
            socket.off('receive-message', handleReceiveMessage);
        };
    }, [socket, selectedStudent, selectedInboxId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (viewMode === 'chat') {
            scrollToBottom();
        }
    }, [chatMessages, viewMode]);

    const handleSendChatMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !selectedStudent || !selectedInboxId) return;

        const text = chatInput.trim();
        setChatInput('');

        try {
            const payload = {
                receiver: selectedStudent._id,
                text,
                inboxId: selectedInboxId
            };
            const { data } = await axios.post('/api/chat/messages', payload);

            setChatMessages(prev => [...prev, data]);

            if (socket) {
                socket.emit('send-message', {
                    _id: data._id,
                    senderId: userInfo._id,
                    receiverId: selectedStudent._id,
                    text,
                    senderName: userInfo.name,
                    createdAt: data.createdAt,
                    inboxId: selectedInboxId
                });
            }
        } catch (err) {
            console.error("Error sending message:", err);
            toast.error("Failed to send message");
        }
    };

    const getAvatarBgColor = (name) => {
        return 'bg-[#3E3ADD]';
    };

    return (
        <DashboardLayout role="Teacher" fullWidth={true}>
            <div className="flex h-[calc(100vh-120px)] bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                {/* --- Left Sidebar: Activities Inbox --- */}
                <aside className="w-72 border-r border-slate-200 flex flex-col shrink-0 overflow-hidden bg-white">
                    {studentTab === 'tests' ? (
                        <>
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
                                                    <img src={selectedStudent.avatar} alt={selectedStudent.name} className="w-full h-full object-cover animate-fade-in" />
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
                                                        if (!viewMode || !['pending', 'submitted', 'evaluated', 'study-material', 'student-feedback', 'chat', 'analytics'].includes(viewMode)) {
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
                        </>
                    ) : studentTab === 'practice' ? (
                        <>
                            <div className="p-4 border-b border-slate-150 shrink-0 bg-white">
                                <div className="flex items-center justify-between mb-2.5">
                                    <div className="flex items-center gap-2">
                                        <Clock className="text-slate-700" size={18} />
                                        <h2 className="font-extrabold text-slate-800 text-[15px] leading-tight">Practice Log Dates</h2>
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
                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Select archive date</p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/10 custom-scrollbar">
                                {loadingPracticeFiles ? (
                                    <div className="space-y-3">
                                        {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-xl" />)}
                                    </div>
                                ) : practiceDatesList.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 text-xs font-semibold">No dates registered.</div>
                                ) : (
                                    practiceDatesList.map(date => {
                                        const isActive = selectedPracticeDate === date;
                                        return (
                                            <div
                                                key={date}
                                                onClick={() => setSelectedPracticeDate(date)}
                                                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isActive
                                                    ? 'border-[#3E3ADD] bg-[#3E3ADD]/5 shadow-sm ring-1 ring-[#3E3ADD]/10'
                                                    : 'border-slate-100 bg-white hover:border-[#3E3ADD]/40 hover:bg-slate-50/30'
                                                    }`}
                                            >
                                                <div className="flex items-center space-x-3 min-w-0">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${isActive ? 'bg-[#3E3ADD] text-white shadow-sm' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        <Calendar size={14} />
                                                    </div>
                                                    <div>
                                                        <h3 className={`font-bold text-xs ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                            {date}
                                                        </h3>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="p-6 border-b border-slate-150 shrink-0 bg-white text-center flex flex-col items-center">
                                <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-black mb-3 shadow-md">
                                    {selectedStudent.name[0].toUpperCase()}
                                </div>
                                <h3 className="font-extrabold text-sm text-slate-800 leading-tight">{selectedStudent.name}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider truncate max-w-full">{selectedStudent.email}</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/10 custom-scrollbar text-xs font-semibold text-slate-600 text-left">
                                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Total Assigned Tests</span>
                                        <span className="font-extrabold text-slate-850">{assignedTests.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Total Submissions</span>
                                        <span className="font-extrabold text-slate-850">{studentSubmissions.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Evaluated Tests</span>
                                        <span className="font-extrabold text-slate-850">{studentSubmissions.filter(s => s.status === 'evaluated').length}</span>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Total Practice Files</span>
                                        <span className="font-extrabold text-slate-850">{studentPracticeFiles.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Practice Days Active</span>
                                        <span className="font-extrabold text-slate-850">{activeDaysCount} Days</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </aside>

                {/* --- Center: Main Content --- */}
                <main className="flex-1 bg-white flex flex-col overflow-hidden text-left">
                    {selectedStudent && (
                        <div className="bg-slate-900 text-white p-3.5 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-800 shrink-0 select-none">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-md">
                                    {selectedStudent.avatar ? (
                                        <img src={selectedStudent.avatar} alt={selectedStudent.name} className="w-full h-full object-cover rounded-xl" />
                                    ) : (
                                        selectedStudent.name[0].toUpperCase()
                                    )}
                                </div>
                                <div className="text-left">
                                    <h2 className="font-extrabold text-xs tracking-tight leading-none text-white">{selectedStudent.name}</h2>
                                    <p className="text-[9px] text-slate-400 font-semibold mt-1 leading-none">{selectedStudent.email}</p>
                                </div>
                            </div>

                            <div className="flex bg-white/10 p-1 rounded-xl gap-1 border border-white/5 shrink-0">
                                {[
                                    { id: 'tests', label: 'Tests', icon: FileText },
                                    { id: 'practice', label: 'Tool', icon: Settings },
                                    { id: 'performance', label: 'Performance', icon: BarChart3 }
                                ].map(tab => {
                                    const TabIcon = tab.icon;
                                    const isTabActive = studentTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setStudentTab(tab.id)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${isTabActive
                                                    ? 'bg-white text-slate-900 shadow-md animate-fade-in'
                                                    : 'text-slate-355 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <TabIcon size={12} />
                                            <span>{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {selectedStudent && studentTab === 'tests' && (
                        <div className="bg-white border-b border-slate-200 p-4 flex flex-col gap-2.5 shrink-0 select-none">
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
                                        { id: 'study-material', label: 'Study Material', icon: BookOpen, activeClass: 'bg-[#3E3ADD] text-white shadow-md' },
                                        { id: 'student-feedback', label: `Student Feedback (${feedbackCount})`, icon: ThumbsUp, activeClass: 'bg-pink-600 text-white shadow-md' },
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
                            <div className="h-full flex flex-col items-center justify-center max-w-sm mx-auto text-center space-y-6 animate-fade-in">
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
                        ) : studentTab === 'tests' ? (
                            !selectedInboxId ? (
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
                                <div className="animate-fade-in flex flex-col h-[calc(100vh-310px)] min-h-[350px] bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                        <div className="flex items-center gap-3">
                                            <div className="relative shrink-0">
                                                <div className="w-10 h-10 rounded-full bg-indigo-150 text-indigo-700 font-bold flex items-center justify-center shadow-md overflow-hidden">
                                                    {selectedStudent.avatar ? (
                                                        <img src={selectedStudent.avatar} alt={selectedStudent.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        selectedStudent.name?.[0]?.toUpperCase() || 'S'
                                                    )}
                                                </div>
                                                {onlineUsers.includes(selectedStudent._id) ? (
                                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white ring-1 ring-emerald-500/20"></span>
                                                ) : (
                                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-slate-350 rounded-full border-2 border-white"></span>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-sm">{selectedStudent.name}</h3>
                                                <p className="text-[10px] text-slate-450 font-semibold">{selectedStudent.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-[10px] font-black uppercase text-indigo-650 tracking-wider">
                                            Inbox Chat View
                                        </div>
                                    </div>

                                    <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50/20">
                                        {loadingChat ? (
                                            <div className="h-full flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                                            </div>
                                        ) : chatMessages.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none">
                                                <MessageSquare size={36} className="text-slate-355 mb-2 opacity-60 animate-pulse" />
                                                <h4 className="font-bold text-slate-700 text-sm">No messages yet</h4>
                                                <p className="text-slate-400 text-[11px] mt-1">
                                                    Send a message to start conversation with {selectedStudent.name}.
                                                </p>
                                            </div>
                                        ) : (
                                            chatMessages.map((msg, index) => {
                                                const isSelf = msg.sender === userInfo._id || msg.sender?._id === userInfo._id;
                                                const formattedTime = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (msg.time || '');
                                                return (
                                                    <div key={msg._id || msg.id || index} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[70%] p-3 rounded-2xl text-xs leading-relaxed ${isSelf
                                                            ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm'
                                                            : 'bg-white text-slate-800 border border-slate-150 rounded-tl-none shadow-sm'
                                                            }`}>
                                                            <p className="font-semibold">{msg.text}</p>
                                                            <span className={`text-[8px] mt-1 block text-right ${isSelf ? 'text-indigo-200' : 'text-slate-455'
                                                                }`}>
                                                                {formattedTime}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-100 flex gap-2 bg-white">
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            placeholder="Type your message to the student..."
                                            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                        />
                                        <button
                                            type="submit"
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors shrink-0 flex items-center justify-center font-bold text-xs"
                                            disabled={!chatInput.trim()}
                                        >
                                            Send
                                        </button>
                                    </form>
                                </div>
                             ) : viewMode === 'study-material' ? (
                                 /* --- STUDY MATERIAL TAB --- */
                                 <div className="animate-fade-in space-y-6 text-left">
                                     <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                                         <h3 className="font-extrabold text-slate-800 text-sm mb-4">Upload Study Material</h3>
                                         <form onSubmit={handleUploadStudyMaterial} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                             <div className="space-y-1.5">
                                                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Material Title</label>
                                                 <input
                                                     type="text"
                                                     value={matTitle}
                                                     onChange={(e) => setMatTitle(e.target.value)}
                                                     placeholder="e.g. React Cheatsheet"
                                                     className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                                 />
                                             </div>
                                             <div className="space-y-1.5">
                                                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Choose File</label>
                                                 <input
                                                     type="file"
                                                     id="study-material-file"
                                                     onChange={(e) => setMatFile(e.target.files[0])}
                                                     className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                                                 />
                                             </div>
                                             <button
                                                 type="submit"
                                                 disabled={uploadingMaterial}
                                                 className="h-9 px-6 bg-[#3E3ADD] hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                                             >
                                                 {uploadingMaterial ? 'Uploading...' : 'Upload File'}
                                             </button>
                                         </form>
                                     </div>

                                     <div className="space-y-4">
                                         <div className="flex justify-between items-center">
                                             <h3 className="font-extrabold text-slate-800 text-sm">Uploaded Materials</h3>
                                             <span className="text-xs bg-slate-100 text-slate-650 px-3 py-1 rounded-full font-bold">
                                                 Total Files: {studyMaterials.length}
                                             </span>
                                         </div>

                                         {loadingMaterials ? (
                                             <div className="flex flex-col items-center justify-center py-12 bg-white">
                                                 <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-900/20 border-t-indigo-900 mb-2"></div>
                                                 <p className="text-xs text-slate-450 font-semibold">Loading materials...</p>
                                             </div>
                                         ) : studyMaterials.length === 0 ? (
                                             <div className="py-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm max-w-md mx-auto">
                                                 <div className="text-4xl mb-2">📂</div>
                                                 <p className="font-bold text-slate-700 text-sm">No Materials Uploaded</p>
                                                 <p className="text-slate-450 text-xs mt-1 font-medium">Upload PDF/Docs above for this activities inbox.</p>
                                             </div>
                                         ) : (
                                             <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                                                 {studyMaterials.map((mat) => (
                                                     <div key={mat._id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:shadow-md transition-all flex flex-col justify-between hover:-translate-y-0.5 duration-200">
                                                         <div className="space-y-2">
                                                             <h4 className="font-extrabold text-slate-800 text-sm leading-snug line-clamp-1">{mat.title}</h4>
                                                             <p className="text-xs text-slate-450 truncate" title={mat.filename}>{mat.filename}</p>
                                                             <p className="text-[10px] text-slate-400">Uploaded on {new Date(mat.createdAt).toLocaleDateString()}</p>
                                                         </div>
                                                         <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                                                             <button
                                                                 onClick={() => handleDeleteStudyMaterial(mat._id)}
                                                                 className="text-red-500 hover:text-red-700 text-[10px] font-bold"
                                                             >
                                                                 Delete
                                                             </button>
                                                             <a
                                                                 href={mat.fileUrl}
                                                                 target="_blank"
                                                                 rel="noreferrer"
                                                                 className="px-3.5 py-1.5 bg-[#3E3ADD] hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all"
                                                             >
                                                                 View File
                                                             </a>
                                                         </div>
                                                     </div>
                                                 ))}
                                             </div>
                                         )}
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
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Evaluated Items</span>
                                                            <span className="text-2xl font-black text-slate-800 mt-1 block">{evaluatedTests}</span>
                                                        </div>
                                                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 size={16} /></div>
                                                    </div>
                                                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                                        <div>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Submitted Pending Evaluation</span>
                                                            <span className="text-2xl font-black text-slate-800 mt-1 block">{submittedTests}</span>
                                                        </div>
                                                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg"><FileText size={16} /></div>
                                                    </div>
                                                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                                        <div>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unattempted Items</span>
                                                            <span className="text-2xl font-black text-slate-800 mt-1 block">{unattemptedTests}</span>
                                                        </div>
                                                        <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg"><Hourglass size={16} /></div>
                                                    </div>
                                                </div>

                                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                                    <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Completion Analytics</h3>
                                                    <div className="space-y-4">
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                                                                <span>Evaluated Completion Rate</span>
                                                                <span>{evaluatedPct}%</span>
                                                            </div>
                                                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${evaluatedPct}%` }} />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                                                                <span>Pending Evaluation Rate</span>
                                                                <span>{submittedPct}%</span>
                                                            </div>
                                                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${submittedPct}%` }} />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                                                                <span>Unattempted Items Rate</span>
                                                                <span>{unattemptedPct}%</span>
                                                            </div>
                                                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${unattemptedPct}%` }} />
                                                            </div>
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
                                                        className="bg-white p-3.5 rounded-xl border hover:shadow-md hover:border-[#3E3ADD] transition-all flex flex-col justify-between h-auto relative group"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${!sub ? 'bg-orange-500' : isEvaluated ? 'bg-emerald-500' : 'bg-blue-500'
                                                                }`} />
                                                            <h3 className="font-extrabold text-slate-800 text-xs leading-snug group-hover:text-[#3E3ADD] transition-colors line-clamp-1 uppercase tracking-tight truncate min-w-0 flex-1">
                                                                {test.title}
                                                            </h3>
                                                        </div>

                                                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setInfoModalData(test);
                                                                }}
                                                                className="p-1.5 text-slate-400 hover:text-[#3E3ADD] hover:bg-slate-50 border border-slate-200 rounded-lg transition-all"
                                                                title="RI Details"
                                                            >
                                                                <Eye size={14} />
                                                            </button>

                                                            {sub ? (
                                                                <button
                                                                    onClick={() => navigate(`/teacher/evaluate/${sub._id}${viewMode === 'student-feedback' ? '?mode=feedback' : ''}`)}
                                                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0 border ${isEvaluated
                                                                            ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                                                            : 'bg-[#3E3ADD] text-white hover:bg-indigo-700 border-transparent'
                                                                        }`}
                                                                >
                                                                    {viewMode === 'student-feedback' ? 'Feedback' : (isEvaluated ? 'Re-evaluate' : 'Evaluate Item')}
                                                                </button>
                                                            ) : (
                                                                <span className="text-[9px] font-black uppercase text-slate-400 select-none mr-1">
                                                                    Pending Submit
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        ) : studentTab === 'practice' ? (
                            /* --- PRACTICE WORKSPACE REVIEW --- */
                            <div className="animate-fade-in space-y-6">
                                <div className="bg-white border-b border-slate-200 pb-4 flex flex-col gap-2.5 shrink-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[#3E3ADD] text-white flex items-center justify-center shadow-md shadow-indigo-500/10 shrink-0">
                                                <Settings size={18} />
                                            </div>
                                            <div>
                                                <h1 className="text-lg font-extrabold text-indigo-950 tracking-tight leading-none">
                                                    Practice Workspace: {selectedPracticeDate || 'Select a Date'}
                                                </h1>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3.5 rounded-2xl border flex items-start gap-3 mt-2 text-xs leading-relaxed bg-amber-50/70 border-amber-100 text-amber-900">
                                        <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                                        <div>
                                            <p className="font-bold">Student Practice Log Archive (Read-Only Preview)</p>
                                            <p className="text-amber-800/80 text-[11px] font-medium mt-0.5">
                                                You are inspecting the screenshots, recordings, and calling sessions created by {selectedStudent.name} on this date.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                ) : (activePracticeFiles.length === 0 && activePracticeNotes.length === 0) ? (
                                    <div className="text-center py-12 text-slate-400 text-xs italic font-medium">
                                        No practice uploads recorded on this date.
                                    </div>
                                ) : (
                                    <div className="space-y-6 max-w-4xl">
                                        {activePracticeFiles.length > 0 && ['screenshot', 'screen-recorder', 'voice-recorder', 'video-recorder', 'web-calling'].map(type => {
                                            const files = activePracticeFiles.filter(f => f.toolType === type);
                                            if (files.length === 0) return null;

                                            const typeLabels = {
                                                'screenshot': { label: 'Screenshots Captured', icon: Camera, bg: 'bg-indigo-50 text-indigo-655' },
                                                'screen-recorder': { label: 'Screen Recordings', icon: Video, bg: 'bg-emerald-50 text-emerald-655' },
                                                'voice-recorder': { label: 'Voice Recordings', icon: Mic, bg: 'bg-blue-50 text-blue-655' },
                                                'video-recorder': { label: 'Video Recordings', icon: MonitorPlay, bg: 'bg-purple-50 text-purple-655' },
                                                'web-calling': { label: 'Web Calling History', icon: Phone, bg: 'bg-pink-50 text-pink-655' }
                                            };
                                            const labelConfig = typeLabels[type] || { label: type, icon: Settings, bg: 'bg-slate-100 text-slate-655' };
                                            const ToolIcon = labelConfig.icon;

                                            return (
                                                <div key={type} className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                                                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${labelConfig.bg}`}>
                                                            <ToolIcon size={16} />
                                                        </div>
                                                        <h3 className="font-extrabold text-sm text-slate-800">{labelConfig.label} ({files.length})</h3>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {files.map((file, fileIdx) => (
                                                            <div key={file._id || fileIdx} className="bg-slate-50 p-3.5 border border-slate-105 rounded-xl space-y-3 flex flex-col justify-between">
                                                                <div className="space-y-1">
                                                                    <p className="font-bold text-slate-700 text-xs truncate" title={file.filename}>
                                                                        {file.filename}
                                                                    </p>
                                                                    <p className="text-[10px] text-slate-455 font-semibold uppercase tracking-wider">
                                                                        Time: {new Date(file.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Size: {(file.size / (1024 * 1024)).toFixed(2)} MB
                                                                    </p>
                                                                </div>

                                                                <div className="pt-2">
                                                                    {type === 'screenshot' && (
                                                                        <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white">
                                                                            <img
                                                                                src={file.fileUrl}
                                                                                alt="Screenshot Preview"
                                                                                className="w-full max-h-48 object-contain bg-slate-900"
                                                                            />
                                                                            <a
                                                                                href={file.fileUrl}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-all"
                                                                            >
                                                                                Open in New Tab
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                    {type === 'voice-recorder' && (
                                                                        <audio controls src={file.fileUrl} className="w-full mt-1.5 focus:outline-none" />
                                                                    )}
                                                                    {(type === 'screen-recorder' || type === 'video-recorder') && (
                                                                        <video controls src={file.fileUrl} className="w-full max-h-56 bg-slate-950 rounded-xl border border-slate-200 mt-1.5" />
                                                                    )}
                                                                    {type === 'web-calling' && (
                                                                        <div className="bg-white p-2.5 rounded-lg border border-slate-100 text-[11px] font-semibold text-slate-500 space-y-1">
                                                                            <div className="flex justify-between">
                                                                                <span>Duration</span>
                                                                                <span className="font-bold text-slate-800">{file.metadata?.duration || 'N/A'} mins</span>
                                                                            </div>
                                                                            <div className="flex justify-between">
                                                                                <span>Calling Format</span>
                                                                                <span className="font-bold text-slate-800 uppercase">{file.metadata?.format || 'Audio'}</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {activePracticeNotes.length > 0 && (
                                            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                                                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
                                                        <FileText size={16} />
                                                    </div>
                                                    <h3 className="font-extrabold text-sm text-slate-800">Shared Written Notes ({activePracticeNotes.length})</h3>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {activePracticeNotes.map((note, idx) => (
                                                        <div key={note._id || idx} className="bg-amber-50/20 p-4 border border-amber-100 rounded-xl space-y-3 flex flex-col justify-between text-left">
                                                            <div className="space-y-1.5">
                                                                <h4 className="font-extrabold text-slate-800 text-xs truncate">
                                                                    {note.title}
                                                                </h4>
                                                                <p className="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed line-clamp-4">
                                                                    {note.content}
                                                                </p>
                                                            </div>
                                                            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold">
                                                                <span>Time: {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider text-[8px] font-black">
                                                                    Shared
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* --- STUDENT PERFORMANCE DASHBOARD --- */
                            <div className="animate-fade-in space-y-8 text-left">
                                {/* ── HEADER ROW ───────────────────────────────────── */}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm gap-4">
                                    <div>
                                        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5 font-sans">
                                            <Activity className="text-indigo-600 animate-pulse" size={26} />
                                            Student Performance Dashboard
                                        </h1>
                                        <p className="text-slate-500 text-sm mt-1">
                                            Track class attendance, academic progress, and official billing receipts for {selectedStudent.name}.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="px-4 py-2 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-2xl text-xs font-black shadow-sm">
                                            Subject: {selectedStudent.studentProfile?.subject || 'N/A'}
                                        </span>
                                        <span className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl text-xs font-bold shadow-sm">
                                            Course: {selectedStudent.studentProfile?.course?.name || 'N/A'}
                                        </span>
                                    </div>
                                </div>

                                {/* ── METRICS GRID ─────────────────────────────────── */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                                    {/* CARD 1: Attendance Rate */}
                                    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                                        <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />

                                        <div>
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">LMS Attendance</span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${performanceAttendanceStatus.color}`}>
                                                    {performanceAttendanceStatus.label}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-6 my-2">
                                                {/* Circular SVG Indicator */}
                                                <div className="relative w-20 h-20 shrink-0">
                                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                                        <path
                                                            className="text-slate-100"
                                                            strokeWidth="3.5"
                                                            stroke="currentColor"
                                                            fill="transparent"
                                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                        />
                                                        <path
                                                            className="text-indigo-600 transition-all duration-1000 ease-out"
                                                            strokeWidth="3.5"
                                                            strokeDasharray={`${performanceAttendancePercentage}, 100`}
                                                            strokeLinecap="round"
                                                            stroke="currentColor"
                                                            fill="transparent"
                                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="text-base font-black text-slate-800">{performanceAttendancePercentage}%</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="text-2xl font-black text-slate-800">{activeDaysCount} Days</h4>
                                                    <p className="text-slate-500 text-xs font-semibold uppercase mt-0.5">Active Workspace Logs</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
                                            <Info size={14} className="text-indigo-500 shrink-0" />
                                            <p className="text-[11px] text-slate-500 font-medium">
                                                Calculated from test submissions and workspace practice sessions.
                                            </p>
                                        </div>
                                    </div>

                                </div>

                                {/* ── ERP FEE ACCOUNTING & LEDGER ────────────────── */}
                                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden text-left animate-fade-in">
                                    <div className="border-b border-slate-100 p-6 bg-slate-50/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shadow-sm">
                                                <CreditCard size={18} />
                                            </div>
                                            <div>
                                                <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">ERP Financial Ledger & Accounting</h3>
                                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Semester fee transactions and official receipts</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-655">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Account Status: <span className="text-emerald-700 font-black">CLEARED</span>
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-6">
                                        {/* Summary Stats Row */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between">
                                                <span className="text-slate-450 text-[10px] font-bold uppercase tracking-wider">Total Semester Fee</span>
                                                <h4 className="text-xl font-black text-slate-800 mt-2">₹48,500</h4>
                                                <span className="text-[9px] text-slate-400 font-semibold mt-1">Course: {selectedStudent.studentProfile?.course?.name || 'N/A'}</span>
                                            </div>
                                            <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-2xl flex flex-col justify-between">
                                                <span className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider">Total Amount Paid</span>
                                                <h4 className="text-xl font-black text-emerald-800 mt-2">₹48,500</h4>
                                                <span className="text-[9px] text-emerald-600/80 font-semibold mt-1">100% Cleared on 18 Jan 2026</span>
                                            </div>
                                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between">
                                                <span className="text-slate-455 text-[10px] font-bold uppercase tracking-wider">Outstanding Dues</span>
                                                <h4 className="text-xl font-black text-slate-800 mt-2">₹0</h4>
                                                <span className="text-[9px] text-emerald-600 font-extrabold mt-1">No pending dues found</span>
                                            </div>
                                        </div>

                                        {/* Fee Allocation Meter */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                                                <span>Fee Structure breakdown</span>
                                                <span>Total: ₹48,500</span>
                                            </div>
                                            <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden flex">
                                                <div className="h-full bg-indigo-500" style={{ width: '86.6%' }} title="Tuition Fee: ₹42,000 (86.6%)" />
                                                <div className="h-full bg-teal-500" style={{ width: '7.2%' }} title="Lab & Internet Fee: ₹3,500 (7.2%)" />
                                                <div className="h-full bg-purple-500" style={{ width: '6.2%' }} title="Exam & Library Fee: ₹3,000 (6.2%)" />
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] font-bold text-slate-505 pt-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Tuition Fee (₹42,000)
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Lab & Internet Fee (₹3,500)
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Exam & Library Fee (₹3,000)
                                                </div>
                                            </div>
                                        </div>

                                        {/* Transactions Ledger Table */}
                                        <div className="space-y-3">
                                            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">Official Receipts & Transactions</h4>
                                            <div className="overflow-x-auto">
                                                <table className="w-full min-w-[600px] border-collapse text-xs">
                                                    <thead>
                                                        <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider text-left bg-slate-50/50">
                                                            <th className="py-2.5 px-3">Receipt No</th>
                                                            <th className="py-2.5 px-3">Date</th>
                                                            <th className="py-2.5 px-3">Category</th>
                                                            <th className="py-2.5 px-3 text-right">Amount</th>
                                                            <th className="py-2.5 px-3">Payment Mode</th>
                                                            <th className="py-2.5 px-3 text-center">Status</th>
                                                            <th className="py-2.5 px-3 text-center">Receipt</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                                        {[
                                                            { receipt: 'ERP/REC/2026/1024', date: '15 Jan 2026', category: 'Tuition Fee', amount: '₹42,000', mode: 'Net Banking', status: 'SUCCESS' },
                                                            { receipt: 'ERP/REC/2026/1089', date: '16 Jan 2026', category: 'Lab & Internet Fee', amount: '₹3,500', mode: 'UPI / GPay', status: 'SUCCESS' },
                                                            { receipt: 'ERP/REC/2026/1105', date: '18 Jan 2026', category: 'Exam & Library Fee', amount: '₹3,000', mode: 'Credit Card', status: 'SUCCESS' }
                                                        ].map((tx, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{tx.receipt}</td>
                                                                <td className="py-3 px-3 text-slate-500">{tx.date}</td>
                                                                <td className="py-3 px-3 text-slate-800">{tx.category}</td>
                                                                <td className="py-3 px-3 text-right font-black text-slate-850">{tx.amount}</td>
                                                                <td className="py-3 px-3 text-slate-500">{tx.mode}</td>
                                                                <td className="py-3 px-3 text-center">
                                                                    <span className="inline-block px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 font-black rounded-lg text-[9px]">
                                                                        {tx.status}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 px-3 text-center">
                                                                    <button
                                                                        onClick={() => toast.success(`Downloading PDF Receipt ${tx.receipt}...`)}
                                                                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-850 underline uppercase tracking-wider"
                                                                    >
                                                                        Download
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
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
                                            setStudentTab('tests');
                                            setSelectedPracticeDate('');
                                            fetchStudentSubmissions(student._id);
                                            fetchStudentPracticeFiles(student._id);
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
