import { useAuth } from '../../context/AuthContext';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    Users, Search, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle,
    BookOpen, Clock, MoreVertical, RefreshCw, Info, Menu, Plus,
    Hourglass, FileText, CheckCircle, MessageSquare, BarChart3, RotateCcw, Settings, ChevronDown, ChevronUp,
    Sparkles, Eye, ThumbsUp, Camera, Mic, Phone, Video, MonitorPlay, Calendar, ArrowRight, Play, Upload, Link2,
    CreditCard, Activity, Edit3, Lock, Loader2
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import { useUserProfile } from '../../components/common/UserProfileContext';

const isTestExpired = (test, student) => {
    if (!test) return false;
    const now = new Date();
    let endTime = test.settings?.endTime;
    if (test.settings?.activeDays && student) {
        const enrollmentDate = student.studentProfile?.enrollmentDate || student.createdAt || new Date();
        const match = (test.index || '').match(/\d+/);
        const idxNum = match ? parseInt(match[0], 10) : 1;
        const week = Math.ceil(idxNum / 7);
        const offsetDays = (week - 1) * 7;
        const inboxUnlockDateMs = new Date(enrollmentDate).getTime() + offsetDays * 24 * 60 * 60 * 1000;
        const testCreatedMs = new Date(test.createdAt || test.updatedAt || Date.now()).getTime();
        const countdownStartMs = Math.max(inboxUnlockDateMs, testCreatedMs);
        endTime = new Date(countdownStartMs + test.settings.activeDays * 24 * 60 * 60 * 1000);
    }
    if (endTime && new Date(endTime) < now) return true;
    if (test.publicSettings?.expiryDate && new Date(test.publicSettings.expiryDate) < now) return true;
    return false;
};

const getStudentSpecificEndTime = (test, student) => {
    if (!test) return null;
    if (!test.settings?.activeDays) return test.settings?.endTime;
    if (!student) return null;
    const enrollmentDate = student.studentProfile?.enrollmentDate || student.createdAt || new Date();
    const match = (test.index || '').match(/\d+/);
    const idxNum = match ? parseInt(match[0], 10) : 1;
    const week = Math.ceil(idxNum / 7);
    const offsetDays = (week - 1) * 7;
    const inboxUnlockDateMs = new Date(enrollmentDate).getTime() + offsetDays * 24 * 60 * 60 * 1000;
    const testCreatedMs = new Date(test.createdAt || test.updatedAt || Date.now()).getTime();
    const countdownStartMs = Math.max(inboxUnlockDateMs, testCreatedMs);
    return new Date(countdownStartMs + test.settings.activeDays * 24 * 60 * 60 * 1000);
};

const getRemainingTimeText = (endTime) => {
    if (!endTime) return "No Expiry";
    const diff = new Date(endTime) - new Date();
    if (diff <= 0) return "Expired";

    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}d ${hours % 24}h left`;
    }
    if (hours > 0) {
        return `${hours}h ${mins % 60}m left`;
    }
    return `${mins}m left`;
};

const ActivityTimer = ({ endTime }) => {
    const [timeLeftMs, setTimeLeftMs] = useState(() => {
        if (!endTime) return null;
        return new Date(endTime) - new Date();
    });

    useEffect(() => {
        if (!endTime) return;

        const interval = setInterval(() => {
            const diff = new Date(endTime) - new Date();
            setTimeLeftMs(diff);
            if (diff <= 0) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [endTime]);

    if (!endTime) {
        return (
            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 border bg-slate-50 border-slate-200/50 text-slate-500 shrink-0">
                <Clock size={9} />
                No Expiry
            </span>
        );
    }

    if (timeLeftMs <= 0) {
        return (
            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 border bg-rose-50 border-rose-100 text-rose-600 shrink-0 animate-pulse">
                <Clock size={9} />
                Expired
            </span>
        );
    }

    const totalSecs = Math.floor(timeLeftMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const hours = Math.floor(mins / 60);
    const days = Math.ceil(hours / 24);

    let displayStr = "";
    if (days > 1) {
        displayStr = `${days} Days Left`;
    } else {
        displayStr = `Expires Today`;
    }

    const isCritical = totalSecs < 600;

    return (
        <span 
            className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 border shrink-0 transition-all duration-300 ${
                isCritical 
                    ? 'bg-red-50 border-red-200 text-red-600 font-extrabold animate-pulse' 
                    : 'bg-indigo-50 border-indigo-100 text-[#3E3ADD]'
            }`}
        >
            <Clock size={9} className={isCritical ? 'text-red-500' : 'text-[#3E3ADD]'} />
            {displayStr}
        </span>
    );
};

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

const getMatchingInboxIdsForTest = (test, subjectDaysMapping) => {
    if (!test.index) return ['no index'];
    const testIndexNorm = test.index.trim().toLowerCase();
    
    // Find the subjects of the test
    const testSubjects = (test.subject || '')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
        
    if (testSubjects.length === 0) {
        return [testIndexNorm];
    }
    
    // Use the first subject to find the local dayNum of this test
    const firstSub = testSubjects[0];
    const firstSubGroup = subjectDaysMapping.find(
        g => g.subjectName.toLowerCase() === firstSub
    );
    
    let localDayNum = null;
    if (firstSubGroup) {
        // Find if the test index matches any day's ID in firstSubGroup
        const matchedDay = firstSubGroup.days.find(d => {
            const dIdNorm = d.id.trim().toLowerCase();
            return dIdNorm === testIndexNorm;
        });
        if (matchedDay) {
            localDayNum = matchedDay.dayNum;
        } else {
            const match = testIndexNorm.match(/\d+/);
            if (match) {
                localDayNum = parseInt(match[0], 10);
            }
        }
    } else {
        const match = testIndexNorm.match(/\d+/);
        if (match) {
            localDayNum = parseInt(match[0], 10);
        }
    }

    if (localDayNum === null) {
        return [testIndexNorm];
    }

    // Now, for EVERY subject in testSubjects, find the global ID that corresponds to this localDayNum
    const matchedGlobalIds = [];
    testSubjects.forEach(subName => {
        const group = subjectDaysMapping.find(g => g.subjectName.toLowerCase() === subName);
        if (group) {
            const day = group.days.find(d => d.dayNum === localDayNum);
            if (day) {
                matchedGlobalIds.push(day.id.trim().toLowerCase());
            }
        }
    });

    if (matchedGlobalIds.length === 0) {
        return [testIndexNorm];
    }
    return matchedGlobalIds;
};

const TeacherActivities = () => {
    const { user } = useAuth();
    const userInfo = user;
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [inboxConfigs, setInboxConfigs] = useState([]);
    const [activityConfigs, setActivityConfigs] = useState([]);
    const [viewMode, setViewMode] = useState('pending'); // 'pending' | 'submitted' | 'evaluated' | 'chat' | 'analytics'
    const [searchQuery, setSearchQuery] = useState('');
    const [inboxSearchQuery, setInboxSearchQuery] = useState('');
    const [expandedSubjects, setExpandedSubjects] = useState({});
    const [subjectFilter, setSubjectFilter] = useState('All');
    const [activeFilter, setActiveFilter] = useState('Institute');
    const [selectedCourseId, setSelectedCourseId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [teacherInfo, setTeacherInfo] = useState(null);
    const [students, setStudents] = useState([]);
    const [studentSubmissions, setStudentSubmissions] = useState([]);
    const [allTests, setAllTests] = useState([]);
    const [selectedInboxId, setSelectedInboxId] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [infoModalData, setInfoModalData] = useState(null);
    const [activeDropdownInboxId, setActiveDropdownInboxId] = useState(null);
    const [activeDropdownTestId, setActiveDropdownTestId] = useState(null);
    const [renameInboxId, setRenameInboxId] = useState(null);
    const [renameSubject, setRenameSubject] = useState('');

    // States for feedback/report chat modal
    const [feedbackChatModalOpen, setFeedbackChatModalOpen] = useState(false);
    const [activeFeedbackChatSub, setActiveFeedbackChatSub] = useState(null);
    const [feedbackChatMessages, setFeedbackChatMessages] = useState([]);
    const [feedbackChatInput, setFeedbackChatInput] = useState('');
    const [loadingFeedbackChat, setLoadingFeedbackChat] = useState(false);
    const [sendingFeedbackChat, setSendingFeedbackChat] = useState(false);

    const loadFeedbackChatHistory = async (submissionId) => {
        setLoadingFeedbackChat(true);
        try {
            const res = await axios.get(`/api/submissions/${submissionId}/feedback`);
            setFeedbackChatMessages(res.data);
        } catch (err) {
            console.error("Failed to load feedback history:", err);
            toast.error("Failed to load feedback chat.");
        } finally {
            setLoadingFeedbackChat(false);
        }
    };

    const handleSendFeedbackChatMessage = async (submissionId) => {
        if (!feedbackChatInput.trim()) return;
        setSendingFeedbackChat(true);
        try {
            const res = await axios.post(`/api/submissions/${submissionId}/feedback`, { message: feedbackChatInput.trim() });
            setFeedbackChatMessages(res.data);
            setFeedbackChatInput('');
        } catch (err) {
            console.error("Failed to send feedback message:", err);
            toast.error("Failed to send message.");
        } finally {
            setSendingFeedbackChat(false);
        }
    };
    const [renameValue, setRenameValue] = useState('');
    const [showStudentList, setShowStudentList] = useState(true);
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [loadingChat, setLoadingChat] = useState(false);
    const messagesEndRef = useRef(null);
    const teacherTabsRef = useRef(null);
    const { socket, onlineUsers } = useSocket();

    // Multi-student bulk config modal state
    const [bulkConfigModal, setBulkConfigModal] = useState(null);
    const [bulkInboxConfigModal, setBulkInboxConfigModal] = useState(null);
    // { testId, visible, disabled, actionType: 'hide'|'disable' }
    const [bulkSelectedStudents, setBulkSelectedStudents] = useState([]);
    const [bulkSaving, setBulkSaving] = useState(false);

    const controls = user?.teacherProfile?.controls;

    const isSaDisabled = (subKey) => {
        if (!controls || !controls.studentActivities) return false;
        if (controls.studentActivities.enabled === false) return true;
        return controls.studentActivities[subKey] === false;
    };

    const saNote = (subKey) => {
        if (!controls || !controls.studentActivities) return '';
        const sa = controls.studentActivities;
        if (sa.subNotes && sa.subNotes[subKey]) return sa.subNotes[subKey];
        return sa.note || '';
    };

    const saMode = () => {
        return controls?.studentActivities?.mode || 'hide';
    };

    const isInboxCardDisabled = (cardKey) => {
        if (!controls || !controls.studentActivities) return false;
        if (controls.studentActivities.enabled === false) return true;
        if (controls.studentActivities.inbox === false) return true;
        const details = controls.studentActivities.inboxDetails;
        if (!details) return false;
        return details[cardKey] === false;
    };

    const inboxCardNote = (cardKey) => {
        if (!controls || !controls.studentActivities) return '';
        const sa = controls.studentActivities;
        if (sa.subNotes && sa.subNotes[cardKey]) return sa.subNotes[cardKey];
        return sa.note || '';
    };

    const handleTeacherTabsScroll = (direction) => {
        if (teacherTabsRef.current) {
            const { scrollLeft } = teacherTabsRef.current;
            const scrollAmount = 150;
            teacherTabsRef.current.scrollTo({
                left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
                behavior: 'smooth'
            });
        }
    };
    const [submissionsLoading, setSubmissionsLoading] = useState(false);
    const { openProfile } = useUserProfile();
    const navigate = useNavigate();

    const [studentTab, setStudentTab] = useState('tests'); // 'tests' | 'practice' | 'performance'
    const [expandedSections, setExpandedSections] = useState({});
    const [studentPracticeFiles, setStudentPracticeFiles] = useState([]);
    const [studentSharedNotes, setStudentSharedNotes] = useState([]);
    const [selectedPracticeDate, setSelectedPracticeDate] = useState('');
    const [loadingPracticeFiles, setLoadingPracticeFiles] = useState(false);

    // Inbox-linked practice states
    const [inboxPracticeFiles, setInboxPracticeFiles] = useState([]);
    const [inboxSharedNotes, setInboxSharedNotes] = useState([]);
    const [loadingInboxPractice, setLoadingInboxPractice] = useState(false);

    useEffect(() => {
        if (selectedStudent && selectedInboxId && viewMode === 'tools') {
            const fetchInboxPractice = async () => {
                try {
                    setLoadingInboxPractice(true);
                    const [filesRes, notesRes] = await Promise.all([
                        axios.get(`/api/practice-files?studentId=${selectedStudent._id}&inbox=${encodeURIComponent(selectedInboxId)}`),
                        axios.get(`/api/notes/shared?studentId=${selectedStudent._id}&inboxId=${encodeURIComponent(selectedInboxId)}`).catch(() => ({ data: [] }))
                    ]);
                    setInboxPracticeFiles(filesRes.data.files || []);
                    setInboxSharedNotes(notesRes.data || []);
                } catch (err) {
                    console.error("Error fetching inbox practice data:", err);
                } finally {
                    setLoadingInboxPractice(false);
                }
            };
            fetchInboxPractice();
        }
    }, [selectedStudent, selectedInboxId, viewMode]);

    useEffect(() => {
        const handleGlobalClick = () => {
            setActiveDropdownInboxId(null);
            setActiveDropdownTestId(null);
        };
        document.addEventListener('click', handleGlobalClick);
        return () => document.removeEventListener('click', handleGlobalClick);
    }, []);

    // Expiry Modal States
    const [expiryModalOpen, setExpiryModalOpen] = useState(false);
    const [expiryModalTest, setExpiryModalTest] = useState(null);
    const [isNoExpiry, setIsNoExpiry] = useState(false);
    const [activeDays, setActiveDays] = useState(3);
    const [assignmentScope, setAssignmentScope] = useState('particular');
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);

    const openExpiryModal = (test) => {
        setExpiryModalTest(test);
        if (test.settings?.endTime) {
            const diffMs = new Date(test.settings.endTime) - new Date();
            const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
            setActiveDays(days > 0 ? days : 3);
            setIsNoExpiry(false);
        } else {
            setActiveDays(3);
            setIsNoExpiry(true);
        }
        setAssignmentScope(test.assignmentType || 'particular');
        setSelectedStudentIds(test.assignedStudents || []);
        setExpiryModalOpen(true);
    };

    const validateExpiryDays = (daysVal, isNoExpiryOption) => {
        if (isNoExpiryOption) return { valid: true };
        if (!daysVal || isNaN(daysVal) || daysVal < 1) {
            return { valid: false, error: "Please enter a valid number of days (at least 1)." };
        }
        if (daysVal > 300) {
            return { valid: false, error: "Active days cannot exceed 300 days." };
        }
        return { valid: true };
    };

    const handleSaveExpiry = async () => {
        if (!expiryModalTest) return;
        const validation = validateExpiryDays(activeDays, isNoExpiry);
        if (!validation.valid) {
            toast.error(validation.error);
            return;
        }

        try {
            const endTimeValue = isNoExpiry ? null : new Date(Date.now() + activeDays * 24 * 60 * 60 * 1000);
            
            let finalAssignedStudents = [];
            if (assignmentScope === 'particular') {
                if (selectedStudent) {
                    finalAssignedStudents = [selectedStudent._id];
                }
            } else if (assignmentScope === 'selected') {
                if (selectedStudentIds.length === 0) {
                    toast.error("Please select at least one student.");
                    return;
                }
                finalAssignedStudents = selectedStudentIds;
            } else if (assignmentScope === 'all') {
                finalAssignedStudents = [];
            }

            await axios.put(`/api/tests/${expiryModalTest._id}`, {
                testDetails: { 
                    isAssigned: true,
                    assignedStudents: finalAssignedStudents,
                    assignmentType: assignmentScope
                },
                settings: {
                    ...expiryModalTest.settings,
                    endTime: endTimeValue,
                    activeDays: isNoExpiry ? null : activeDays
                }
            });
            toast.success(expiryModalTest.isAssigned ? "Expiry and assignment settings updated successfully!" : "Activity assigned successfully!");
            setExpiryModalOpen(false);
            setExpiryModalTest(null);
            fetchTests();
        } catch (err) {
            console.error("Error setting test expiry:", err);
            toast.error("Failed to update settings");
        }
    };

    const handleForceExpire = async (test) => {
        if (!window.confirm("Are you sure you want to force expire this activity immediately?")) return;
        try {
            const pastDate = new Date(Date.now() - 5 * 60 * 1000);
            await axios.put(`/api/tests/${test._id}`, {
                testDetails: { isAssigned: true },
                settings: {
                    ...test.settings,
                    endTime: pastDate
                }
            });
            toast.success("Activity force expired successfully!");
            setExpiryModalOpen(false);
            setExpiryModalTest(null);
            fetchTests();
        } catch (err) {
            console.error("Error force expiring test:", err);
            toast.error("Failed to force expire activity");
        }
    };

    const [studyMaterials, setStudyMaterials] = useState([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);
    const [matTitle, setMatTitle] = useState('');
    const [matFile, setMatFile] = useState(null);
    const [matUrl, setMatUrl] = useState('');
    const [uploadType, setUploadType] = useState('url'); // 'file' or 'url'
    const [uploadingMaterial, setUploadingMaterial] = useState(false);
    const [showMatModal, setShowMatModal] = useState(false);

    useEffect(() => {
        if ((viewMode === 'study-material' || viewMode === 'pending' || viewMode === 'assign') && selectedInboxId) {
            const fetchMaterials = async () => {
                try {
                    setLoadingMaterials(true);
                    const statusParam = viewMode === 'pending' ? 'upcoming' : viewMode === 'assign' ? 'assign' : 'study-material';
                    const { data } = await axios.get(`/api/study-materials?inboxId=${selectedInboxId}&status=${statusParam}`);
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
            const noInboxFiles = (filesRes.data.files || []).filter(f => !f.inbox);
            const noInboxNotes = (notesRes.data || []).filter(n => !n.inboxId);
            setStudentPracticeFiles(noInboxFiles);
            setStudentSharedNotes(noInboxNotes);
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
            // Fetch first 20 students for instant display
            const { data } = await axios.get('/api/users/teacher-students?limit=20&page=1');
            setStudents(data);
            setLoading(false);

            // Deferred background load for remaining students
            setTimeout(async () => {
                try {
                    const { data: fullData } = await axios.get('/api/users/teacher-students');
                    setStudents(fullData);
                } catch (e) {
                    console.error("Error background loading full teacher students:", e);
                }
            }, 1000);
        } catch (error) {
            console.error("Error fetching students:", error);
            setLoading(false);
        }
    };

    const [allStudyMaterials, setAllStudyMaterials] = useState([]);

    const fetchTests = async () => {
        try {
            // Load first 20 tests/materials initially
            const [testsRes, materialsRes] = await Promise.all([
                axios.get('/api/tests?limit=20&page=1'),
                axios.get('/api/study-materials?limit=20&page=1').catch(() => ({ data: [] }))
            ]);
            setAllTests(testsRes.data);
            setAllStudyMaterials(materialsRes.data || []);

            // Deferred background load for remaining tests/materials
            setTimeout(async () => {
                try {
                    const [fullTestsRes, fullMaterialsRes] = await Promise.all([
                        axios.get('/api/tests'),
                        axios.get('/api/study-materials').catch(() => ({ data: [] }))
                    ]);
                    setAllTests(fullTestsRes.data);
                    setAllStudyMaterials(fullMaterialsRes.data || []);
                } catch (e) {
                    console.error("Error background loading full tests/materials:", e);
                }
            }, 1200);
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

    const fetchInboxConfigs = async (studentId) => {
        try {
            const [inboxRes, actRes] = await Promise.all([
                axios.get(`/api/users/inbox-configs/${studentId}`),
                axios.get(`/api/users/activity-configs/${studentId}`).catch(() => ({ data: [] }))
            ]);
            setInboxConfigs(inboxRes.data || []);
            setActivityConfigs(actRes.data || []);
        } catch (err) {
            console.error("Error fetching configs:", err);
            setInboxConfigs([]);
            setActivityConfigs([]);
        }
    };

    const handleUpdateActivityConfig = async (testId, visible, disabled) => {
        if (!selectedStudent) return;
        try {
            const { data } = await axios.post('/api/users/activity-configs', {
                studentId: selectedStudent._id,
                testId,
                visible,
                disabled
            });
            setActivityConfigs(prev => {
                const copy = [...prev];
                const idx = copy.findIndex(c => c.test === testId);
                if (idx !== -1) {
                    copy[idx] = data;
                } else {
                    copy.push(data);
                }
                return copy;
            });
            toast.success("Activity configuration updated successfully!");
        } catch (err) {
            console.error("Error saving activity config:", err);
            toast.error("Failed to update activity configuration");
        }
    };

    // Open the bulk config modal (intercepts hide/disable toggle clicks)
    const openBulkConfigModal = (testId, newVisible, newDisabled, actionType) => {
        setBulkConfigModal({ testId, newVisible, newDisabled, actionType });
        // Pre-select the current student
        setBulkSelectedStudents(selectedStudent ? [selectedStudent._id] : []);
        setActiveDropdownTestId(null);
    };

    // Save config for ALL selected students
    const handleBulkSave = async () => {
        if (!bulkConfigModal || bulkSelectedStudents.length === 0) return;
        setBulkSaving(true);
        try {
            await Promise.all(
                bulkSelectedStudents.map(studentId =>
                    axios.post('/api/users/activity-configs', {
                        studentId,
                        testId: bulkConfigModal.testId,
                        visible: bulkConfigModal.newVisible,
                        disabled: bulkConfigModal.newDisabled
                    })
                )
            );
            // Refresh configs for the currently viewed student
            if (selectedStudent) {
                await fetchInboxConfigs(selectedStudent._id);
            }
            toast.success(`Applied to ${bulkSelectedStudents.length} student(s)!`);
            setBulkConfigModal(null);
        } catch (err) {
            console.error('Bulk config error:', err);
            toast.error('Failed to apply changes to some students.');
        } finally {
            setBulkSaving(false);
        }
    };

    // Open bulk inbox config modal
    const openBulkInboxConfigModal = (inboxId, newVisible, newDisabled, currentDisplayName, actionType, subject) => {
        setBulkInboxConfigModal({ inboxId, visible: newVisible, disabled: newDisabled, currentDisplayName, actionType, subject });
        setBulkSelectedStudents(selectedStudent ? [selectedStudent._id] : []);
        setActiveDropdownInboxId(null);
    };

    // Save inbox config for ALL selected students
    const handleBulkInboxSave = async () => {
        if (!bulkInboxConfigModal || bulkSelectedStudents.length === 0) return;
        setBulkSaving(true);
        try {
            await Promise.all(
                bulkSelectedStudents.map(studentId =>
                    axios.post('/api/users/inbox-configs', {
                        studentId,
                        inboxId: bulkInboxConfigModal.inboxId,
                        displayName: bulkInboxConfigModal.currentDisplayName,
                        visible: bulkInboxConfigModal.visible,
                        disabled: bulkInboxConfigModal.disabled,
                        subject: bulkInboxConfigModal.subject
                    })
                )
            );
            // Refresh configs for the currently viewed student
            if (selectedStudent) {
                await fetchInboxConfigs(selectedStudent._id);
            }
            toast.success(`Applied to ${bulkSelectedStudents.length} student(s)!`);
            setBulkInboxConfigModal(null);
        } catch (err) {
            console.error('Bulk inbox config error:', err);
            toast.error('Failed to apply changes to some students.');
        } finally {
            setBulkSaving(false);
        }
    };

    const handleUpdateInboxConfig = async (inboxId, displayName, visible, subject) => {
        if (!selectedStudent) return;
        try {
            const { data } = await axios.post('/api/users/inbox-configs', {
                studentId: selectedStudent._id,
                inboxId,
                displayName,
                visible,
                subject
            });
            setInboxConfigs(prev => {
                const copy = [...prev];
                const idx = copy.findIndex(c => c.inboxId === inboxId);
                if (idx !== -1) {
                    copy[idx] = data;
                } else {
                    copy.push(data);
                }
                return copy;
            });
        } catch (err) {
            console.error("Error saving inbox config:", err);
            toast.error("Failed to update inbox settings");
        }
    };

    const handleUploadStudyMaterial = async (e) => {
        e.preventDefault();
        if (!matTitle.trim() || !selectedInboxId) {
            toast.error("Please fill in the title");
            return;
        }

        if (uploadType === 'file' && !matFile) {
            toast.error("Please select a file to upload");
            return;
        }

        if (uploadType === 'url' && !matUrl.trim()) {
            toast.error("Please provide a Web Link (URL)");
            return;
        }

        try {
            setUploadingMaterial(true);
            const formData = new FormData();
            formData.append('title', matTitle.trim());
            formData.append('inboxId', selectedInboxId);
            // Send status based on current tab
            const matStatus = viewMode === 'pending' ? 'upcoming' : (viewMode === 'assign' ? 'assign' : 'study-material');
            formData.append('status', matStatus);
            
            if (selectedStudent) {
                formData.append('studentId', selectedStudent._id);
            }
            if (activeDayDetails) {
                formData.append('subject', activeDayDetails.subjectName || '');
                formData.append('dayNum', activeDayDetails.dayNum || '');
            }
            if (selectedStudentActiveCourseObj) {
                formData.append('course', selectedStudentActiveCourseObj.name || '');
            }

            if (uploadType === 'file') {
                formData.append('file', matFile);
            } else {
                formData.append('fileUrl', matUrl.trim());
            }

            const { data } = await axios.post('/api/study-materials', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success(uploadType === 'file' ? "Study material uploaded successfully!" : "Web Link added successfully!");
            setStudyMaterials(prev => [data, ...prev]);
            setMatTitle('');
            setMatFile(null);
            setMatUrl('');
            setShowMatModal(false);
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

    useEffect(() => {
        if (userInfo && !selectedCourseId) {
            const courses = userInfo.teacherProfile?.assignedCourses || [];
            if (courses.length > 0) {
                const defaultId = courses[0]._id || courses[0];
                setSelectedCourseId(String(defaultId));
            }
        }
    }, [userInfo, selectedCourseId]);

    const teacherCoursesList = useMemo(() => {
        if (!userInfo) return [];
        const list = userInfo.teacherProfile?.assignedCourses || [];
        return list.map(c => ({
            id: c._id || c,
            name: c.name || 'N/A'
        })).filter(c => c.id);
    }, [userInfo]);

    const selectedStudentActiveCourseObj = useMemo(() => {
        if (!selectedStudent || !selectedCourseId) return null;
        const list = selectedStudent.studentProfile?.coursesList || [];
        const foundInList = list.find(item => {
            const cId = item.course?._id || item.course;
            return String(cId) === String(selectedCourseId);
        });
        if (foundInList && foundInList.course && typeof foundInList.course === 'object') {
            return foundInList.course;
        }
        const primCourse = selectedStudent.studentProfile?.course;
        if (primCourse && String(primCourse._id || primCourse) === String(selectedCourseId)) {
            return typeof primCourse === 'object' ? primCourse : null;
        }
        return null;
    }, [selectedStudent, selectedCourseId]);

    const selectedStudentAssignedSubjects = useMemo(() => {
        if (!selectedStudent || !selectedCourseId) return [];
        const list = selectedStudent.studentProfile?.coursesList || [];
        const foundInList = list.find(item => {
            const cId = item.course?._id || item.course;
            return String(cId) === String(selectedCourseId);
        });
        if (foundInList) {
            return foundInList.subjects || [];
        }
        const primCourse = selectedStudent.studentProfile?.course;
        if (primCourse && String(primCourse._id || primCourse) === String(selectedCourseId)) {
            const assignedSubjectsString = selectedStudent.studentProfile?.subject;
            if (assignedSubjectsString) {
                return assignedSubjectsString.split(',').map(s => s.trim()).filter(Boolean);
            }
        }
        return [];
    }, [selectedStudent, selectedCourseId]);

    // Filter students by search bar and selected active course
    const filteredStudents = useMemo(() => {
        let list = students;
        if (selectedCourseId) {
            list = list.filter(s => {
                const matchesPrimary = String(s.studentProfile?.course?._id || s.studentProfile?.course) === String(selectedCourseId);
                const matchesSecondary = s.studentProfile?.coursesList?.some(item => 
                    String(item.course?._id || item.course) === String(selectedCourseId)
                );
                return matchesPrimary || matchesSecondary;
            });
        }
        if (searchQuery) {
            list = list.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return list;
    }, [students, selectedCourseId, searchQuery]);

    // Check if we should group students by section (if teacher has multiple sections assigned)
    const showSectionsGrouped = useMemo(() => {
        const mode = userInfo?.teacherProfile?.studentAssignmentMode;
        const sections = userInfo?.teacherProfile?.assignedSections || [];
        return mode === 'section' && sections.length > 1;
    }, [userInfo]);

    // Group students by section if grouping is active
    const studentsBySection = useMemo(() => {
        if (!showSectionsGrouped) return {};
        const groups = {};
        filteredStudents.forEach(student => {
            const sec = student.studentProfile?.section || 'No Section';
            if (!groups[sec]) groups[sec] = [];
            groups[sec].push(student);
        });
        return groups;
    }, [filteredStudents, showSectionsGrouped]);

    // Filter assigned tests based on student profile (institute, course, subjects)
    const assignedTests = useMemo(() => {
        if (!selectedStudent || !selectedCourseId) return [];
        const studentInstitute = selectedStudent.institute?.name?.trim() || '';
        
        // Find course name of selected course
        const activeCourseName = userInfo?.teacherProfile?.assignedCourses?.find(c => 
            String(c._id || c) === String(selectedCourseId)
        )?.name?.trim();

        if (!studentInstitute || !activeCourseName) return [];

        const subjects = selectedStudentAssignedSubjects.map(s => s.toLowerCase());

        return allTests.filter(test => {
            // 1. Match Institute (case-insensitive)
            const instMatch = test.institute?.trim().toLowerCase() === studentInstitute.toLowerCase();
            if (!instMatch) return false;

            // 2. Match Subject
            const testSubs = (test.subject || '')
                .split(',')
                .map(s => s.trim().toLowerCase())
                .filter(Boolean);
            const subMatch = testSubs.some(tSub => subjects.includes(tSub));
            if (!subMatch) return false;

            // 3. Match Course
            const testCourse = test.course?.trim().toLowerCase() || '';
            if (testCourse) {
                const testCoursesList = testCourse.split(',').map(c => c.trim()).filter(Boolean);
                const isCourseMatched = testCoursesList.includes(activeCourseName.toLowerCase());
                if (!isCourseMatched) return false;
            }

            // 4. Match student-specific assignment
            if (test.assignedStudents && test.assignedStudents.length > 0) {
                const isAssignedToThisStudent = test.assignedStudents.some(id =>
                    id.toString() === selectedStudent._id.toString()
                );
                if (!isAssignedToThisStudent) return false;
            }

            return true;
        });
    }, [allTests, selectedStudent, selectedCourseId, selectedStudentAssignedSubjects, userInfo]);

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

    const courseDuration = useMemo(() => {
        if (!selectedStudent) return 5;
        const profileDuration = selectedStudentActiveCourseObj?.duration;
        if (profileDuration && profileDuration > 0) return profileDuration;

        // Fallback: find highest index in tests
        let maxIndex = 0;
        assignedTests.forEach(test => {
            if (test.index) {
                const match = test.index.match(/\d+/);
                if (match) {
                    const num = parseInt(match[0]);
                    if (num > maxIndex) maxIndex = num;
                }
            }
        });
        return Math.max(maxIndex, 5); // Default to at least 5 inboxes
    }, [selectedStudent, selectedStudentActiveCourseObj, assignedTests]);

    const subjectDaysMapping = useMemo(() => {
        if (!selectedStudent || !selectedStudentActiveCourseObj) return [];
        const course = selectedStudentActiveCourseObj;
        const subjects = course.subjects || [];
        const durations = course.subjectDurations || [];
        const totalDuration = course.duration || 5;

        let currentDayIndex = 1;
        const mapping = [];

        if (subjects && subjects.length > 0) {
            subjects.forEach(subjName => {
                const d = durations.find(dur => dur.subjectName?.toLowerCase() === subjName.toLowerCase());
                if (d) {
                    const subName = d.subjectName;
                    const subDur = Number(d.duration) || 0;
                    const daysList = [];
                    for (let i = 1; i <= subDur; i++) {
                        if (currentDayIndex <= totalDuration) {
                            daysList.push({
                                dayNum: i,
                                indexNum: currentDayIndex,
                                id: `Inbox ${currentDayIndex}`
                            });
                            currentDayIndex++;
                        }
                    }
                    if (daysList.length > 0) {
                        mapping.push({
                            subjectName: subName,
                            days: daysList
                        });
                    }
                }
            });
        }

        if (currentDayIndex <= totalDuration) {
            const mappedSubjectNames = mapping.map(m => m.subjectName.toLowerCase());
            const remainingSubjects = subjects.filter(s => !mappedSubjectNames.includes(s.toLowerCase()));

            if (remainingSubjects.length > 0) {
                const remainingDays = totalDuration - currentDayIndex + 1;
                const daysPerSubject = Math.floor(remainingDays / remainingSubjects.length);
                const extraDays = remainingDays % remainingSubjects.length;

                remainingSubjects.forEach((subName, idx) => {
                    const subDur = daysPerSubject + (idx < extraDays ? 1 : 0);
                    const daysList = [];
                    for (let i = 1; i <= subDur; i++) {
                        if (currentDayIndex <= totalDuration) {
                            daysList.push({
                                dayNum: i,
                                indexNum: currentDayIndex,
                                id: `Inbox ${currentDayIndex}`
                            });
                            currentDayIndex++;
                        }
                    }
                    if (daysList.length > 0) {
                        mapping.push({
                            subjectName: subName,
                            days: daysList
                        });
                    }
                });
            } else {
                const daysList = [];
                let dayCounter = 1;
                while (currentDayIndex <= totalDuration) {
                    daysList.push({
                        dayNum: dayCounter,
                        indexNum: currentDayIndex,
                        id: `Inbox ${currentDayIndex}`
                    });
                    currentDayIndex++;
                    dayCounter++;
                }
                if (daysList.length > 0) {
                    mapping.push({
                        subjectName: 'Other Subjects',
                        days: daysList
                    });
                }
            }
        }

        if (mapping.length === 0) {
            const daysList = [];
            for (let i = 1; i <= totalDuration; i++) {
                daysList.push({
                    dayNum: i,
                    indexNum: i,
                    id: `Inbox ${i}`
                });
            }
            mapping.push({
                subjectName: 'General',
                days: daysList
            });
        }

        if (selectedStudentAssignedSubjects && selectedStudentAssignedSubjects.length > 0) {
            const lowerAssigned = selectedStudentAssignedSubjects.map(s => s.toLowerCase());
            return mapping.filter(m => lowerAssigned.includes(m.subjectName.toLowerCase()));
        }

        return mapping;
    }, [selectedStudent, selectedStudentActiveCourseObj, selectedStudentAssignedSubjects]);

    // Group assigned tests by index for the student
    const dynamicInboxItems = useMemo(() => {
        if (!selectedStudent) return [];

        // Group tests by matched global inbox IDs
        const testsGrouped = assignedTests.reduce((acc, test) => {
            const matchedIds = getMatchingInboxIdsForTest(test, subjectDaysMapping);
            matchedIds.forEach(id => {
                const normalized = id.toLowerCase();
                if (!acc[normalized]) acc[normalized] = [];
                if (!acc[normalized].some(t => t._id === test._id)) {
                    acc[normalized].push(test);
                }
            });
            return acc;
        }, {});

        // Group study materials by normalized index
        const materialsGrouped = allStudyMaterials.reduce((acc, mat) => {
            const indexStr = mat.inboxId || 'No Index';
            const normalized = indexStr.trim().toLowerCase();
            if (!acc[normalized]) acc[normalized] = [];
            acc[normalized].push(mat);
            return acc;
        }, {});

        // Generate standard keys from 1 to courseDuration
        const standardKeys = [];
        for (let i = 1; i <= courseDuration; i++) {
            standardKeys.push(`Inbox ${i}`);
        }

        // Add any other keys present in testsGrouped or materialsGrouped that are not standard
        const allKeys = [...standardKeys];
        const addKeyIfNew = (key) => {
            const norm = key.trim().toLowerCase();
            const exists = standardKeys.some(sk => sk.trim().toLowerCase() === norm);
            if (!exists) {
                const pretty = key.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                allKeys.push(pretty);
            }
        };

        Object.keys(testsGrouped).forEach(addKeyIfNew);
        Object.keys(materialsGrouped).forEach(addKeyIfNew);

        const enrollmentDate = selectedStudent?.studentProfile?.enrollmentDate || selectedStudent?.createdAt || new Date();

        return allKeys.map(keyName => {
            const normalized = keyName.trim().toLowerCase();
            const testsInInbox = testsGrouped[normalized] || [];
            const materialsInInbox = materialsGrouped[normalized] || [];

            const subjectName = (() => {
                for (const group of subjectDaysMapping) {
                    if (group.days.some(d => d.id.trim().toLowerCase() === normalized)) {
                        return group.subjectName;
                    }
                }
                return '';
            })();
            const config = inboxConfigs.find(c => 
                c.inboxId?.trim().toLowerCase() === normalized &&
                (!c.subject || c.subject.trim().toLowerCase() === subjectName.trim().toLowerCase())
            );
            const isVisible = config ? config.visible : true;
            
            const isInboxDisabledByDefault = false;

            const isInboxDisabled = config && config.disabled !== undefined ? config.disabled : isInboxDisabledByDefault;
            
            const customTitle = config && config.displayName ? config.displayName : keyName;

            return {
                id: keyName,
                title: customTitle,
                completed: testsInInbox.filter(t => {
                    const sub = submissionMap.get(t._id);
                    return sub && sub.status === 'evaluated';
                }).length,
                pending: testsInInbox.filter(t => {
                    const sub = submissionMap.get(t._id);
                    return !sub || sub.status !== 'evaluated';
                }).length,
                tests: testsInInbox,
                visible: isVisible,
                disabled: isInboxDisabled,
                materials: materialsInInbox,
                hasContent: testsInInbox.length > 0 || materialsInInbox.length > 0
            };
        });
    }, [selectedStudent, assignedTests, allStudyMaterials, submissionMap, inboxConfigs, courseDuration, subjectDaysMapping]);

    useEffect(() => {
        if (subjectDaysMapping.length > 0) {
            const initial = {};
            subjectDaysMapping.forEach(g => {
                initial[g.subjectName] = false;
            });
            setExpandedSubjects(initial);
        }
    }, [subjectDaysMapping]);

    const groupedInboxItems = useMemo(() => {
        const resultGroups = subjectDaysMapping.map(group => {
            if (subjectFilter !== 'All' && group.subjectName.toLowerCase() !== subjectFilter.toLowerCase()) {
                return null;
            }

            const matchedDays = group.days.map(day => {
                const inboxItem = dynamicInboxItems.find(item => item.id?.trim().toLowerCase() === day.id?.trim().toLowerCase());
                if (!inboxItem) return null;

                const matchesSearch = getDisplayTitle(inboxItem.title).toLowerCase().includes(inboxSearchQuery.toLowerCase());
                if (!matchesSearch) return null;

                const config = inboxConfigs.find(c => 
                    c.inboxId?.trim().toLowerCase() === day.id?.trim().toLowerCase() &&
                    (!c.subject || c.subject.trim().toLowerCase() === group.subjectName.trim().toLowerCase())
                );
                const cleanDisplayName = config && config.displayName ? config.displayName : `Inbox ${day.dayNum}`;
                const titleWithIndex = cleanDisplayName;

                return {
                    ...inboxItem,
                    displayTitle: titleWithIndex,
                    dayNum: day.dayNum,
                    indexNum: day.indexNum
                };
            }).filter(Boolean);

            // Sort days under this subject numerically based on displayTitle prefix
            matchedDays.sort((a, b) => {
                const getNum = (title) => {
                    const match = String(title).match(/^(\d+)/);
                    return match ? parseInt(match[1], 10) : 999999;
                };
                return getNum(a.displayTitle) - getNum(b.displayTitle);
            });

            return {
                subjectName: group.subjectName,
                days: matchedDays
            };
        }).filter(Boolean).filter(group => group.days.length > 0);

        // Sort the subject groups themselves numerically based on their subjectName prefix
        resultGroups.sort((a, b) => {
            const getNum = (name) => {
                const match = String(name).match(/^(\d+)/);
                return match ? parseInt(match[1], 10) : 999999;
            };
            return getNum(a.subjectName) - getNum(b.subjectName);
        });

        return resultGroups;
    }, [subjectDaysMapping, dynamicInboxItems, inboxSearchQuery, subjectFilter, inboxConfigs]);

    // Reset filter when student changes
    useEffect(() => {
        setSubjectFilter('All');
    }, [selectedStudent]);

    useEffect(() => {
        if (subjectFilter && subjectFilter !== 'All') {
            setExpandedSubjects(prev => ({
                ...prev,
                [subjectFilter]: true
            }));
        }
    }, [subjectFilter]);

    // Reset selection when student changes
    useEffect(() => {
        setSelectedInboxId(null);
        setSelectedCategory(null);
    }, [selectedStudent]);

    const selectedGroup = dynamicInboxItems.find(item => item.id === selectedInboxId);

    const activeDayDetails = useMemo(() => {
        if (!selectedInboxId || subjectDaysMapping.length === 0) return null;
        for (const group of subjectDaysMapping) {
            const foundDay = group.days.find(d => d.id === selectedInboxId);
            if (foundDay) {
                return {
                    dayNum: foundDay.dayNum,
                    subjectName: group.subjectName
                };
            }
        }
        return null;
    }, [selectedInboxId, subjectDaysMapping]);

    const headerTitle = useMemo(() => {
        if (!selectedInboxId) return 'Select an Inbox';
        const subj = activeDayDetails?.subjectName;
        const config = inboxConfigs.find(c => 
            c.inboxId?.trim().toLowerCase() === selectedInboxId.trim().toLowerCase() &&
            (!c.subject || c.subject.trim().toLowerCase() === subj?.trim().toLowerCase())
        );
        if (config && config.displayName) return config.displayName;
        if (activeDayDetails) return `Inbox ${activeDayDetails.dayNum}`;
        return selectedGroup ? getDisplayTitle(selectedGroup.title) : 'Inbox';
    }, [selectedInboxId, activeDayDetails, inboxConfigs, selectedGroup]);

    const assignCount = useMemo(() => {
        if (!selectedGroup) return 0;
        return (selectedGroup.tests || []).filter(t => t.isAssigned === false).length;
    }, [selectedGroup]);

    const pendingCount = useMemo(() => {
        if (!selectedGroup) return 0;
        return (selectedGroup.tests || []).filter(t => t.isAssigned === true && !isTestExpired(t, selectedStudent) && (!submissionMap.get(t._id) || submissionMap.get(t._id).status === 'reported')).length;
    }, [selectedGroup, submissionMap, selectedStudent]);

    const submittedCount = useMemo(() => {
        if (!selectedGroup) return 0;
        return (selectedGroup.tests || []).filter(t => {
            const sub = submissionMap.get(t._id);
            return t.isAssigned === true && sub && sub.status === 'submitted';
        }).length;
    }, [selectedGroup, submissionMap]);

    const returnedCount = useMemo(() => {
        if (!selectedGroup) return 0;
        return (selectedGroup.tests || []).filter(t => {
            const sub = submissionMap.get(t._id);
            return t.isAssigned === true && !isTestExpired(t, selectedStudent) && sub && sub.status === 'returned';
        }).length;
    }, [selectedGroup, submissionMap, selectedStudent]);

    const evaluatedCount = useMemo(() => {
        if (!selectedGroup) return 0;
        return (selectedGroup.tests || []).filter(t => {
            const sub = submissionMap.get(t._id);
            return t.isAssigned === true && sub && sub.status === 'evaluated';
        }).length;
    }, [selectedGroup, submissionMap]);

    const expiredCount = useMemo(() => {
        if (!selectedGroup) return 0;
        return (selectedGroup.tests || []).filter(t => {
            const sub = submissionMap.get(t._id);
            const isUnfinished = !sub || sub.status === 'returned' || sub.status === 'reported';
            return t.isAssigned === true && isTestExpired(t, selectedStudent) && isUnfinished;
        }).length;
    }, [selectedGroup, submissionMap, selectedStudent]);

    const feedbackCount = useMemo(() => {
        if (!selectedGroup) return 0;
        return (selectedGroup.tests || []).filter(t => {
            const sub = submissionMap.get(t._id);
            return t.isAssigned === true && sub && sub.status === 'evaluated' && sub.answers.some(a => (a.conversation && a.conversation.some(msg => msg.role === 'Student')) || a.reaction);
        }).length;
    }, [selectedGroup, submissionMap]);

    const activeTests = useMemo(() => {
        if (!selectedGroup) return [];
        return (selectedGroup.tests || []).filter(test => {
            const sub = submissionMap.get(test._id);
            if (viewMode === 'assign') {
                return test.isAssigned === false;
            } else if (viewMode === 'pending') {
                return test.isAssigned === true && !isTestExpired(test, selectedStudent) && (!sub || sub.status === 'reported');
            } else if (viewMode === 'submitted') {
                return test.isAssigned === true && sub && sub.status === 'submitted';
            } else if (viewMode === 'returned') {
                return test.isAssigned === true && !isTestExpired(test, selectedStudent) && sub && sub.status === 'returned';
            } else if (viewMode === 'evaluated') {
                return test.isAssigned === true && sub && sub.status === 'evaluated';
            } else if (viewMode === 'expired') {
                const isUnfinished = !sub || sub.status === 'returned' || sub.status === 'reported';
                return test.isAssigned === true && isTestExpired(test, selectedStudent) && isUnfinished;
            } else if (viewMode === 'student-feedback') {
                return test.isAssigned === true && sub && sub.status === 'evaluated' && sub.answers.some(a => (a.conversation && a.conversation.some(msg => msg.role === 'Student')) || a.reaction);
            }
            return false;
        });
    }, [selectedGroup, viewMode, submissionMap, selectedStudent]);

    const categoriesMap = useMemo(() => {
        const map = {};
        activeTests.forEach(test => {
            const catName = getCategoryDisplayName(test.activity);
            if (!map[catName]) map[catName] = [];
            map[catName].push(test);
        });
        return map;
    }, [activeTests]);

    const uniqueSubjects = useMemo(() => {
        if (!selectedStudent || !userInfo) return [];
        const studentSubject = selectedStudent.studentProfile?.subject?.trim() || '';
        let baseSubjects = [];
        if (studentSubject) {
            baseSubjects = studentSubject.split(',').map(s => s.trim()).filter(Boolean);
        } else if (selectedStudent.studentProfile?.course) {
            const course = selectedStudent.studentProfile.course;
            const courseSubs = course.subjects || [];
            const durations = course.subjectDurations || [];
            const allSubs = new Set();
            courseSubs.forEach(s => {
                if (s) allSubs.add(s.trim());
            });
            durations.forEach(d => {
                if (d && d.subjectName) allSubs.add(d.subjectName.trim());
            });
            baseSubjects = Array.from(allSubs);
        }
        
        const uniqueOriginals = Array.from(new Set(baseSubjects));

        if (userInfo.role !== 'Teacher') {
            return uniqueOriginals;
        }

        const baseSubsLower = uniqueOriginals.map(s => s.toLowerCase());
        const teacherSubs = userInfo.teacherProfile?.subjects?.map(s => s.trim().toLowerCase()) || [];
        
        if (teacherSubs.length === 0) {
            return uniqueOriginals;
        }

        const commonSubs = baseSubsLower.filter(sub => teacherSubs.includes(sub));
        return uniqueOriginals.filter(sub => commonSubs.includes(sub.toLowerCase()));
    }, [selectedStudent, userInfo]);

    const filteredInboxItems = useMemo(() => {
        return dynamicInboxItems.filter(item => {
            const matchesSearch = getDisplayTitle(item.title).toLowerCase().includes(inboxSearchQuery.toLowerCase());
            if (!matchesSearch) return false;
            
            if (subjectFilter === 'All') return true;
            
            const hasMatchingTest = item.tests?.some(t => t.subject?.trim().toLowerCase() === subjectFilter.toLowerCase());
            const hasMatchingMaterial = item.materials?.some(m => m.subject?.trim().toLowerCase() === subjectFilter.toLowerCase());
            
            return hasMatchingTest || hasMatchingMaterial;
        });
    }, [dynamicInboxItems, inboxSearchQuery, subjectFilter]);

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
        if (studentTab === 'practice') {
            if (practiceDatesList.length > 0) {
                if (!selectedPracticeDate || !practiceDatesList.includes(selectedPracticeDate)) {
                    setSelectedPracticeDate(practiceDatesList[0]);
                }
            } else {
                setSelectedPracticeDate('');
            }
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

    // Live Sync Student Tools Activities
    useEffect(() => {
        if (!socket || !selectedStudent) return;

        const handleStudentActivitySync = (payload) => {
            if (String(payload.studentId) === String(selectedStudent._id)) {
                console.log("[SOCKET] Live sync student activity:", payload);
                // 1. Auto-refresh files and notes list
                fetchStudentPracticeFiles(selectedStudent._id);

                // 2. Format tool label
                const toolName = payload.toolType
                    .split('-')
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ');

                let actionLabel = 'updated';
                if (payload.action === 'delete') actionLabel = 'deleted a record';
                else if (payload.action === 'upload') actionLabel = 'uploaded a file';
                else if (payload.action === 'save') actionLabel = 'saved content';

                // 3. Show live notification toast
                toast.success(`Live Sync: ${payload.studentName} ${actionLabel} in ${toolName}!`, {
                    icon: '🔄',
                    duration: 4000
                });
            }
        };

        socket.on('student-activity-sync', handleStudentActivitySync);
        return () => {
            socket.off('student-activity-sync', handleStudentActivitySync);
        };
    }, [socket, selectedStudent]);

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

    if (controls?.studentActivities?.enabled === false) {
        return (
            <DashboardLayout role="Teacher" collapsed={false}>
                <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white/60 backdrop-blur-xl border border-slate-100 rounded-[32px] text-center shadow-xl shadow-slate-100/50 max-w-2xl mx-auto my-12 relative overflow-hidden group">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500"></div>
                    <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <AlertCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Feature Deactivated</h2>
                    <p className="text-sm font-bold text-slate-500 max-w-md mb-6 leading-relaxed">
                        {controls.studentActivities.note || 'This page has been deactivated by your administrator. Please contact support if you require access.'}
                    </p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="Teacher" fullWidth={true}>
            <div className="flex h-[calc(100vh-120px)] bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                {/* --- Left Sidebar: Activities Inbox --- */}
                {(!isSaDisabled('inbox') || saMode() === 'disable') && (
                    <aside className="w-72 border-r border-slate-200 flex flex-col shrink-0 overflow-hidden bg-white relative">
                        {isSaDisabled('inbox') ? (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center">
                                <Lock size={32} className="text-red-500 mb-3 animate-bounce" />
                                <h3 className="font-extrabold text-slate-800 text-sm mb-1">Inbox View Locked</h3>
                                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                                    {saNote('inbox') || 'This list has been deactivated by your administrator.'}
                                </p>
                            </div>
                        ) : null}
                        {studentTab === 'tests' ? (
                            <>
                                <div className="p-4 border-b border-slate-150 shrink-0 bg-white">
                                    <div className="flex items-center justify-between mb-2.5">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="text-slate-700" size={18} />
                                            <h2 className="font-extrabold text-slate-800 text-[15px] leading-tight">Activities Inbox</h2>
                                        </div>
                                        {selectedStudent && (!isSaDisabled('student') || saMode() === 'disable') && (
                                            <button
                                                onClick={isSaDisabled('student') ? () => toast.error(saNote('student') || 'Feature Restricted') : () => setShowStudentList(prev => !prev)}
                                                className={`p-1.5 rounded-full border shadow-sm transition-all ${
                                                    isSaDisabled('student')
                                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-250'
                                                        : 'bg-white hover:bg-slate-200 text-slate-600 hover:text-slate-800 border-slate-200 cursor-pointer'
                                                }`}
                                                title={isSaDisabled('student') ? (saNote('student') || 'Feature Restricted') : "Toggle Student List"}
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

                                {selectedStudent && uniqueSubjects.length > 0 && (
                                    <div className="mb-2">
                                        <select
                                            value={subjectFilter}
                                            onChange={(e) => setSubjectFilter(e.target.value)}
                                            className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3E3ADD] focus:ring-2 focus:ring-indigo-100 transition-all text-slate-700 font-bold cursor-pointer"
                                        >
                                            <option value="All">All Subjects</option>
                                            {uniqueSubjects.map(sub => (
                                                <option key={sub} value={sub}>
                                                    {sub}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/10 custom-scrollbar">
                                {selectedStudent ? (
                                    submissionsLoading ? (
                                        <div className="flex flex-col items-center justify-center py-12 bg-white h-full">
                                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-900/20 border-t-indigo-900 mb-2"></div>
                                            <p className="text-xs text-slate-450 font-semibold">Loading activities...</p>
                                        </div>
                                    ) : groupedInboxItems.length > 0 ? (
                                        groupedInboxItems.map(group => {
                                            const isExpanded = expandedSubjects[group.subjectName] === true;
                                            return (
                                                <div key={group.subjectName} className="space-y-1.5 animate-fade-in mb-3">
                                                    <div
                                                        onClick={() => setExpandedSubjects(prev => ({
                                                            ...prev,
                                                            [group.subjectName]: !isExpanded
                                                        }))}
                                                        className="flex items-center justify-between p-2.5 bg-slate-100/70 hover:bg-slate-200/50 rounded-xl cursor-pointer select-none text-[11px] font-black text-slate-700 tracking-wide transition-all uppercase"
                                                    >
                                                        <div className="flex items-center gap-1.5">
                                                            <span>{group.subjectName}</span>
                                                            <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">
                                                                {group.days.length}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            {isExpanded ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
                                                        </div>
                                                    </div>

                                                    {/* Days List under this Subject */}
                                                    {isExpanded && (
                                                        <div className="space-y-1.5 pl-1.5 border-l border-slate-200/65 ml-2">
                                                            {group.days.map(item => {
                                                                const isActive = selectedInboxId === item.id;
                                                                const firstTest = item.tests && item.tests.length > 0 ? item.tests[0] : null;
                                                                const isInboxDisabled = item.disabled;

                                                                return (
                                                                    <div
                                                                        key={item.id}
                                                                        onClick={() => {
                                                                            setSelectedInboxId(item.id);
                                                                            setSelectedCategory(null);
                                                                            if (!viewMode || !['pending', 'submitted', 'returned', 'evaluated', 'study-material', 'student-feedback', 'chat', 'analytics'].includes(viewMode)) {
                                                                                setViewMode('pending');
                                                                            }
                                                                        }}
                                                                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isActive
                                                                            ? 'border-[#3E3ADD] bg-[#3E3ADD]/5 shadow-sm ring-1 ring-[#3E3ADD]/10'
                                                                            : isInboxDisabled
                                                                                ? 'border-slate-200 bg-slate-50/40 opacity-70 hover:shadow-none hover:border-slate-200'
                                                                                : 'border-slate-100 bg-white hover:border-[#3E3ADD]/40 hover:bg-slate-50/30'
                                                                            }`}
                                                                    >
                                                                        <div className="flex items-center space-x-2.5 min-w-0">
                                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${isActive 
                                                                                ? 'bg-[#3E3ADD] text-white shadow-sm' 
                                                                                : isInboxDisabled 
                                                                                    ? 'bg-slate-200 text-slate-400' 
                                                                                    : 'bg-slate-100 text-slate-500'
                                                                                }`}>
                                                                                {isInboxDisabled ? <Lock size={12} /> : <BookOpen size={14} />}
                                                                            </div>
                                                                            <h3 className={`font-bold text-xs truncate flex items-center ${isActive ? 'text-indigo-900' : 'text-slate-700'} ${(!item.visible || isInboxDisabled) ? 'opacity-60' : ''}`}>
                                                                                {item.displayTitle}
                                                                                {!item.visible && (
                                                                                    <span className="ml-1 text-[9px] font-black text-red-500 bg-red-50 px-1 py-0.5 rounded shrink-0">
                                                                                        Hidden
                                                                                    </span>
                                                                                )}
                                                                                {isInboxDisabled && (
                                                                                    <span className="ml-1 text-[9px] font-black text-amber-600 bg-amber-50 px-1 py-0.5 rounded shrink-0">
                                                                                        Locked
                                                                                    </span>
                                                                                )}
                                                                            </h3>
                                                                        </div>

                                                                        <div className="relative shrink-0 flex items-center space-x-1">
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

                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setActiveDropdownInboxId(activeDropdownInboxId === item.id ? null : item.id);
                                                                                }}
                                                                                className={`p-1 rounded-full border transition-all shrink-0 hover:bg-slate-150 ${isActive
                                                                                    ? 'border-indigo-200 text-indigo-600 bg-indigo-50/50'
                                                                                    : 'border-slate-200 text-slate-400 bg-white'
                                                                                    }`}
                                                                                title="Settings"
                                                                            >
                                                                                <MoreVertical size={12} />
                                                                            </button>

                                                                            {activeDropdownInboxId === item.id && (
                                                                                <>
                                                                                    <div
                                                                                        className="fixed inset-0 z-40 bg-transparent"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setActiveDropdownInboxId(null);
                                                                                        }}
                                                                                    />
                                                                                    <div
                                                                                        className="absolute right-0 top-7 bg-white border border-slate-150 rounded-xl shadow-xl py-1 z-50 w-44 animate-fade-in text-slate-705 text-left"
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                    >
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                const config = inboxConfigs.find(c => c.inboxId?.trim().toLowerCase() === item.id?.trim().toLowerCase() && (!c.subject || c.subject.trim().toLowerCase() === group.subjectName.trim().toLowerCase()));
                                                                                                const currentDisplayName = config ? config.displayName : '';
                                                                                                openBulkInboxConfigModal(item.id, !item.visible, item.disabled, currentDisplayName, 'hide', group.subjectName);
                                                                                            }}
                                                                                            className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between text-[10px] font-extrabold transition-colors"
                                                                                        >
                                                                                            <span>Visible to Student</span>
                                                                                            <div className="w-8 h-4 rounded-full p-0.5 transition-colors duration-200" style={{ backgroundColor: item.visible ? '#3E3ADD' : '#cbd5e1' }}>
                                                                                                <div className="w-3 h-3 bg-white rounded-full transition-transform duration-200" style={{ transform: item.visible ? 'translateX(16px)' : 'translateX(0px)' }} />
                                                                                            </div>
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                const config = inboxConfigs.find(c => c.inboxId?.trim().toLowerCase() === item.id?.trim().toLowerCase() && (!c.subject || c.subject.trim().toLowerCase() === group.subjectName.trim().toLowerCase()));
                                                                                                const currentDisplayName = config ? config.displayName : '';
                                                                                                openBulkInboxConfigModal(item.id, item.visible, !item.disabled, currentDisplayName, 'disable', group.subjectName);
                                                                                            }}
                                                                                            className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between text-[10px] font-extrabold transition-colors border-t border-slate-100"
                                                                                        >
                                                                                            <span>Enable Inbox</span>
                                                                                            <div className="w-8 h-4 rounded-full p-0.5 transition-colors duration-200" style={{ backgroundColor: !item.disabled ? '#3E3ADD' : '#cbd5e1' }}>
                                                                                                <div className="w-3 h-3 bg-white rounded-full transition-transform duration-200" style={{ transform: !item.disabled ? 'translateX(16px)' : 'translateX(0px)' }} />
                                                                                            </div>
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setRenameInboxId(item.id);
                                                                                                setRenameSubject(group.subjectName);
                                                                                                const config = inboxConfigs.find(c => c.inboxId?.trim().toLowerCase() === item.id?.trim().toLowerCase() && (!c.subject || c.subject.trim().toLowerCase() === group.subjectName.trim().toLowerCase()));
                                                                                                setRenameValue(config && config.displayName ? config.displayName : item.id);
                                                                                                setActiveDropdownInboxId(null);
                                                                                            }}
                                                                                            className="w-full px-3 py-1.5 hover:bg-slate-50 text-[10px] font-extrabold text-left transition-colors border-t border-slate-100 flex items-center gap-1.5"
                                                                                        >
                                                                                            <span>✏️ </span>
                                                                                            <span>Rename Inbox</span>
                                                                                        </button>
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
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
            )}

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
                                    { id: 'performance', label: 'SnapShots', icon: BarChart3 }
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
                            <div className="flex justify-between items-center gap-4 w-full">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-full bg-[#3E3ADD] text-white flex items-center justify-center shadow-md shadow-indigo-500/10 shrink-0">
                                        <BookOpen size={16} />
                                    </div>
                                    <div>
                                        <h1 className="text-lg font-extrabold text-indigo-950 tracking-tight leading-none">
                                            {headerTitle}
                                        </h1>
                                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wider">
                                            Your activities for this inbox
                                        </p>
                                    </div>
                                </div>

                                {/* Duplicated Subject Filter on the Right Side */}
                                {selectedInboxId && uniqueSubjects.length > 0 && (
                                    <div className="shrink-0">
                                        <select
                                            value={subjectFilter}
                                            onChange={(e) => setSubjectFilter(e.target.value)}
                                            className="h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3E3ADD] focus:ring-2 focus:ring-indigo-100 transition-all text-slate-700 font-extrabold cursor-pointer shadow-sm min-w-[130px]"
                                        >
                                            <option value="All">All Subjects</option>
                                            {uniqueSubjects.map(sub => (
                                                <option key={sub} value={sub}>
                                                    {sub}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {selectedInboxId && (
                                <div className="flex items-center gap-1 bg-slate-50/80 border border-slate-100 p-1 rounded-xl shrink-0 relative group/tabs">
                                    {/* Left Scroll Button */}
                                    <button
                                        type="button"
                                        onClick={() => handleTeacherTabsScroll('left')}
                                        className="p-1 hover:bg-slate-200/50 text-slate-400 hover:text-slate-700 rounded-lg transition-all shrink-0"
                                        title="Scroll Left"
                                    >
                                        <ChevronLeft size={14} strokeWidth={2.5} />
                                    </button>

                                    {/* Scrollable Container */}
                                    <div
                                        ref={teacherTabsRef}
                                        className="flex-1 flex overflow-x-auto scrollbar-none gap-1 shrink-0 scroll-smooth"
                                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                    >
                                        {[
                                            { id: 'assign', label: `Assign (${assignCount})`, icon: Plus, activeClass: 'bg-indigo-600 text-white shadow-md', key: 'assign' },
                                            { id: 'pending', label: `Upcoming (${pendingCount})`, icon: Hourglass, activeClass: 'bg-[#EF4444] text-white shadow-md', key: 'upcoming' },
                                            { id: 'submitted', label: `Submitted (${submittedCount})`, icon: FileText, activeClass: 'bg-blue-600 text-white shadow-md', key: 'submitted' },
                                            { id: 'returned', label: `Returned (${returnedCount})`, icon: RotateCcw, activeClass: 'bg-orange-500 text-white shadow-md', key: 'returned' },
                                            { id: 'evaluated', label: `Evaluated (${evaluatedCount})`, icon: CheckCircle2, activeClass: 'bg-emerald-600 text-white shadow-md', key: 'evaluated' },
                                            { id: 'expired', label: `Expired (${expiredCount})`, icon: Clock, activeClass: 'bg-rose-600 text-white shadow-md', key: 'expired' },
                                            { id: 'study-material', label: 'Study Material', icon: BookOpen, activeClass: 'bg-[#3E3ADD] text-white shadow-md', key: 'studyMaterial' },
                                            { id: 'tools', label: 'Tools', icon: Settings, activeClass: 'bg-purple-600 text-white shadow-md', key: 'tools' },
                                            { id: 'analytics', label: 'Analytics', icon: BarChart3, activeClass: 'bg-amber-600 text-white shadow-md', key: 'analytics' }
                                        ].filter(tab => {
                                            const isDisabled = isInboxCardDisabled(tab.key);
                                            const mode = saMode();
                                            return !isDisabled || mode === 'disable';
                                        }).map(tab => {
                                            const isActive = viewMode === tab.id;
                                            const TabIcon = tab.icon;
                                            const isDisabled = isInboxCardDisabled(tab.key);
                                            return (
                                                <button
                                                    key={tab.id}
                                                    disabled={isDisabled}
                                                    onClick={isDisabled ? () => toast.error(inboxCardNote(tab.key) || 'Feature Restricted') : () => {
                                                        setViewMode(tab.id);
                                                        setSelectedCategory(null);
                                                    }}
                                                    title={isDisabled ? (inboxCardNote(tab.key) || 'Feature Restricted') : tab.label}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                                                        isDisabled
                                                            ? 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed border border-slate-200/60'
                                                            : isActive
                                                                ? tab.activeClass
                                                                : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-700'
                                                    }`}
                                                >
                                                    <TabIcon size={12} className={isDisabled ? 'text-slate-400' : (isActive ? 'text-white' : 'text-slate-400')} />
                                                    <span>{tab.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Right Scroll Button */}
                                    <button
                                        type="button"
                                        onClick={() => handleTeacherTabsScroll('right')}
                                        className="p-1 hover:bg-slate-200/50 text-slate-400 hover:text-slate-700 rounded-lg transition-all shrink-0"
                                        title="Scroll Right"
                                    >
                                        <ChevronRight size={14} strokeWidth={2.5} />
                                    </button>
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
                            <>
                                {!selectedInboxId ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="bg-white p-8 rounded-[32px] shadow-lg border border-slate-100 max-w-md w-full text-center space-y-4 animate-fade-in">
                                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-[#3E3ADD] mx-auto border border-indigo-100">
                                                <BookOpen size={28} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <h2 className="text-base font-black text-slate-800 tracking-tight">Select Subject & Inbox</h2>
                                                <p className="text-slate-450 text-xs leading-relaxed">
                                                    Select your subject and inbox to perform your activities.
                                                </p>
                                            </div>
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
                                    <div className="animate-fade-in space-y-6 text-left relative">

                                        <div className="space-y-4">
                                            <div className="flex items-center">
                                                <div>
                                                    <h3 className="font-extrabold text-slate-800 text-sm">Study Materials</h3>
                                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{studyMaterials.length} material{studyMaterials.length !== 1 ? 's' : ''} uploaded</p>
                                                </div>
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
                                                                <p className="text-xs text-slate-450 truncate" title={mat.filename}>
                                                                    {mat.filename === 'Web Link' ? (
                                                                        <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">🔗 Web Link</span>
                                                                    ) : (
                                                                        mat.filename
                                                                    )}
                                                                </p>
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
                                                                    {mat.filename === 'Web Link' ? 'Open Link' : 'View File'}
                                                                </a>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : viewMode === 'tools' ? (
                                    /* --- INBOX TOOLS TAB FOR TEACHER --- */
                                    <div className="animate-fade-in space-y-6 text-left animate-slide-up">
                                        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                                            <h3 className="font-extrabold text-slate-800 text-sm mb-2">Inbox Tools Activity</h3>
                                            <p className="text-slate-500 text-xs leading-relaxed">
                                                Here you can inspect the files and notes created by {selectedStudent.name} specifically for <strong>{selectedGroup ? getDisplayTitle(selectedGroup.title) : getDisplayTitle(selectedInboxId)}</strong>.
                                            </p>
                                        </div>

                                        {loadingInboxPractice ? (
                                            <div className="flex flex-col items-center justify-center py-12 bg-white">
                                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-900/20 border-t-indigo-900 mb-2"></div>
                                                <p className="text-xs text-slate-450 font-semibold">Loading tools data...</p>
                                            </div>
                                        ) : (inboxPracticeFiles.length === 0 && inboxSharedNotes.length === 0) ? (
                                            <div className="py-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm max-w-md mx-auto">
                                                <div className="text-4xl mb-2">📂</div>
                                                <p className="font-bold text-slate-700 text-sm">No Tools Activity</p>
                                                <p className="text-slate-450 text-xs mt-1 font-medium">The student has not recorded any work or shared notes for this inbox.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-6 max-w-4xl">
                                                {/* Render Practice Files Grouped by Tool Type */}
                                                {inboxPracticeFiles.length > 0 && ['screenshot', 'screen-recorder', 'voice-recorder', 'video-recorder', 'web-calling', 'file-uploader'].map(type => {
                                                    const files = inboxPracticeFiles.filter(f => f.toolType === type);
                                                    if (files.length === 0) return null;

                                                    const typeLabels = {
                                                        'screenshot': { label: 'Screenshots Captured', icon: Camera, bg: 'bg-indigo-50 text-indigo-655' },
                                                        'screen-recorder': { label: 'Screen Recordings', icon: Video, bg: 'bg-emerald-50 text-emerald-655' },
                                                        'voice-recorder': { label: 'Voice Recordings', icon: Mic, bg: 'bg-blue-50 text-blue-655' },
                                                        'video-recorder': { label: 'Video Recordings', icon: MonitorPlay, bg: 'bg-purple-50 text-purple-655' },
                                                        'web-calling': { label: 'Web Calling History', icon: Phone, bg: 'bg-pink-50 text-pink-655' },
                                                        'file-uploader': { label: 'Uploaded Files', icon: Upload, bg: 'bg-amber-50 text-amber-655' }
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
                                                                                Date: {new Date(file.createdAt).toLocaleDateString()} • Time: {new Date(file.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                                                                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold"
                                                                                    >
                                                                                        View Fullscreen
                                                                                    </a>
                                                                                </div>
                                                                            )}

                                                                            {type === 'screen-recorder' && (
                                                                                <video src={file.fileUrl} controls className="w-full rounded-xl border border-slate-200 bg-slate-900 max-h-48" />
                                                                            )}

                                                                            {type === 'video-recorder' && (
                                                                                <video src={file.fileUrl} controls className="w-full rounded-xl border border-slate-200 bg-slate-900 max-h-48" />
                                                                            )}

                                                                            {type === 'voice-recorder' && (
                                                                                <audio src={file.fileUrl} controls className="w-full" />
                                                                            )}

                                                                            {type === 'file-uploader' && (
                                                                                <a
                                                                                    href={file.fileUrl}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                                                                >
                                                                                    Download File
                                                                                </a>
                                                                            )}

                                                                            {type === 'web-calling' && (
                                                                                <div className="bg-white p-3 rounded-lg border border-slate-200/80 text-[11px] leading-relaxed text-slate-600">
                                                                                    <p><strong>Duration:</strong> {file.metadata?.duration || 'N/A'}</p>
                                                                                    <p className="mt-1"><strong>Resolution:</strong> {file.metadata?.resolution || 'N/A'}</p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {/* Render Shared Written Notes */}
                                                {inboxSharedNotes.length > 0 && (
                                                    <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                                                        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
                                                                <FileText size={16} />
                                                            </div>
                                                            <h3 className="font-extrabold text-sm text-slate-800">Shared Written Notes ({inboxSharedNotes.length})</h3>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {inboxSharedNotes.map((note, idx) => (
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
                                                                        <span>Date: {new Date(note.createdAt).toLocaleDateString()}</span>
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
                                                return sub && sub.status === 'submitted';
                                            }).length;
                                            const returnedTests = (selectedGroup.tests || []).filter(t => {
                                                const sub = submissionMap.get(t._id);
                                                return sub && sub.status === 'returned';
                                            }).length;
                                            const unattemptedTests = totalTests - evaluatedTests - submittedTests - returnedTests;

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
                                        {!activeTests.length && viewMode !== 'assign' && !(viewMode === 'pending' && studyMaterials.length > 0) ? (
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
                                                    const config = activityConfigs.find(c => c.test === test._id);
                                                    const isActivityVisible = config ? config.visible : true;
                                                    const isActivityDisabled = config ? !!config.disabled : false;

                                                    return (
                                                        <div
                                                            key={test._id}
                                                            onClick={() => sub && navigate(`/student/test-result/${sub._id}`)}
                                                            className={`bg-white p-2.5 rounded-xl border hover:shadow-md hover:border-[#3E3ADD] transition-all flex flex-col justify-between h-auto relative group ${!isActivityVisible ? 'opacity-60 border-slate-200' : ''} ${sub ? 'cursor-pointer' : ''}`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2 min-w-0">
                                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${!sub ? 'bg-orange-500' : isEvaluated ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                                                    <h3 className="font-extrabold text-slate-800 text-xs leading-snug group-hover:text-[#3E3ADD] transition-colors line-clamp-1 uppercase tracking-tight truncate min-w-0 flex-1">
                                                                        {test.title}
                                                                    </h3>
                                                                </div>
                                                                {/* Options menu or direct Eye button depending on tab */}
                                                                {viewMode === 'pending' || viewMode === 'assign' || viewMode === 'expired' ? (
                                                                    <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActiveDropdownTestId(activeDropdownTestId === test._id ? null : test._id);
                                                                            }}
                                                                            className="p-1 text-slate-400 hover:text-[#3E3ADD] hover:bg-slate-100 rounded-lg transition-all"
                                                                            title="Options"
                                                                        >
                                                                            <MoreVertical size={14} />
                                                                        </button>
                                                                        {activeDropdownTestId === test._id && (
                                                                            <div className="absolute right-0 top-7 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 w-52 animate-fade-in text-left">
                                                                                {/* View Details */}
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setActiveDropdownTestId(null);
                                                                                        setInfoModalData(test);
                                                                                    }}
                                                                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors text-left"
                                                                                >
                                                                                    <Eye size={13} className="text-slate-400" />
                                                                                    View Details
                                                                                </button>

                                                                                {/* Student's Report */}
                                                                                {sub && sub.status === 'reported' && (
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setActiveDropdownTestId(null);
                                                                                            setActiveFeedbackChatSub(sub);
                                                                                            loadFeedbackChatHistory(sub._id);
                                                                                            setFeedbackChatModalOpen(true);
                                                                                        }}
                                                                                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors text-left border-b border-slate-100"
                                                                                    >
                                                                                        <MessageSquare size={13} className="text-slate-400" />
                                                                                        Student's Report
                                                                                    </button>
                                                                                )}

                                                                                {/* Edit Activity */}
                                                                                {(viewMode === 'pending' || viewMode === 'assign') && (
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setActiveDropdownTestId(null);
                                                                                            const isCreator = test.createdBy === user._id || test.createdBy?._id === user._id;
                                                                                            if (isCreator || test.allowTeacherEdit) {
                                                                                                navigate(`/teacher/activities-builder?id=${test._id}&studentId=${selectedStudent._id}&inboxId=${selectedInboxId}`);
                                                                                            } else {
                                                                                                toast.error("Permission Denied: Editor has not authorized editing for this activity.");
                                                                                            }
                                                                                        }}
                                                                                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors text-left"
                                                                                    >
                                                                                        <Edit3 size={13} className="text-slate-400" />
                                                                                        Edit Activity
                                                                                    </button>
                                                                                )}

                                                                                {/* Edit Expiry */}
                                                                                {(viewMode === 'pending' || viewMode === 'expired') && (
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setActiveDropdownTestId(null);
                                                                                            openExpiryModal(test);
                                                                                        }}
                                                                                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors text-left"
                                                                                    >
                                                                                        <Clock size={13} className="text-slate-400" />
                                                                                        Edit Expiry
                                                                                    </button>
                                                                                )}

                                                                                {viewMode === 'pending' && (
                                                                                    <>
                                                                                        <div className="border-t border-slate-100 my-1" />

                                                                                        {/* Visibility toggle */}
                                                                                        <div
                                                                                            className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 transition-colors cursor-pointer"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                openBulkConfigModal(test._id, !isActivityVisible, isActivityDisabled, 'hide');
                                                                                            }}
                                                                                        >
                                                                                            <span className="text-xs font-bold text-slate-700">
                                                                                                Visible to Student
                                                                                            </span>
                                                                                            <button
                                                                                                className="w-8 h-4 rounded-full p-0.5 transition-colors duration-200 shrink-0 flex items-center"
                                                                                                style={{ backgroundColor: isActivityVisible ? '#3E3ADD' : '#cbd5e1' }}
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    openBulkConfigModal(test._id, !isActivityVisible, isActivityDisabled, 'hide');
                                                                                                }}
                                                                                            >
                                                                                                <div className="w-3 h-3 bg-white rounded-full transition-transform duration-200" style={{ transform: isActivityVisible ? 'translateX(16px)' : 'translateX(0px)' }} />
                                                                                            </button>
                                                                                        </div>

                                                                                        {/* Disable toggle */}
                                                                                        <div
                                                                                            className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 transition-colors cursor-pointer"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                openBulkConfigModal(test._id, isActivityVisible, !isActivityDisabled, 'disable');
                                                                                            }}
                                                                                        >
                                                                                            <span className="text-xs font-bold text-slate-700">
                                                                                                Enable Activity
                                                                                            </span>
                                                                                            <button
                                                                                                className="w-8 h-4 rounded-full p-0.5 transition-colors duration-200 shrink-0 flex items-center"
                                                                                                style={{ backgroundColor: !isActivityDisabled ? '#3E3ADD' : '#cbd5e1' }}
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    openBulkConfigModal(test._id, isActivityVisible, !isActivityDisabled, 'disable');
                                                                                                }}
                                                                                            >
                                                                                                <div className="w-3 h-3 bg-white rounded-full transition-transform duration-200" style={{ transform: !isActivityDisabled ? 'translateX(16px)' : 'translateX(0px)' }} />
                                                                                            </button>
                                                                                        </div>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setInfoModalData(test);
                                                                        }}
                                                                        className="p-1 text-slate-450 hover:text-[#3E3ADD] hover:bg-slate-100 rounded-lg transition-all shrink-0"
                                                                        title="View Details"
                                                                    >
                                                                        <Eye size={14} />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Status badges */}
                                                            {((!isActivityVisible) || isActivityDisabled) && (
                                                                <div className="flex items-center gap-1 mt-1.5">
                                                                    {!isActivityVisible && (
                                                                        <span className="text-[8px] font-black uppercase text-red-500 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100">Hidden</span>
                                                                    )}
                                                                    {isActivityDisabled && (
                                                                        <span className="text-[8px] font-black uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100">Disabled</span>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                                                                {/* Left Side: Expiry display */}
                                                                {viewMode === 'pending' && (
                                                                    <ActivityTimer endTime={getStudentSpecificEndTime(test, selectedStudent)} />
                                                                )}

                                                                {/* Right Side: Action Button */}
                                                                <div className="flex-1 flex justify-end">
                                                                    {viewMode === 'assign' ? (
                                                                        <button
                                                                            onClick={() => openExpiryModal(test)}
                                                                            className="px-3.5 py-1.5 bg-[#3E3ADD] hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0 border border-transparent"
                                                                        >
                                                                            Move to upcoming
                                                                        </button>
                                                                     ) : sub ? (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                navigate(`/teacher/evaluate/${sub._id}${viewMode === 'student-feedback' ? '?mode=feedback' : isEvaluated ? '?mode=reevaluate' : ''}`);
                                                                            }}
                                                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0 border ${isEvaluated
                                                                                ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                                                                : 'bg-[#3E3ADD] text-white hover:bg-indigo-700 border-transparent'
                                                                                }`}
                                                                        >
                                                                            {viewMode === 'student-feedback' ? 'Feedback' : (isEvaluated ? 'Re-evaluate' : 'Evaluate Item')}
                                                                        </button>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Upcoming Materials Section (only on pending tab) */}
                                {viewMode === 'pending' && (studyMaterials.length > 0 || loadingMaterials) && (
                                    <div className="animate-fade-in mt-6 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center">
                                                <FileText size={12} className="text-red-500" />
                                            </div>
                                            <h3 className="font-extrabold text-slate-700 text-xs uppercase tracking-widest">Upcoming Materials</h3>
                                            {studyMaterials.length > 0 && (
                                                <span className="bg-red-50 text-red-500 border border-red-100 px-2 py-0.5 rounded-full text-[10px] font-black">{studyMaterials.length}</span>
                                            )}
                                        </div>
                                        {loadingMaterials ? (
                                            <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold py-4">
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-200 border-t-indigo-500"></div>
                                                Loading materials...
                                            </div>
                                        ) : (
                                            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                                                {studyMaterials.map((mat) => (
                                                    <div key={mat._id} className="bg-white p-4 rounded-2xl border border-slate-200 hover:shadow-md transition-all flex flex-col justify-between">
                                                        <div className="space-y-1.5">
                                                            <h4 className="font-extrabold text-slate-800 text-xs leading-snug line-clamp-1">{mat.title}</h4>
                                                            <p className="text-[10px] text-slate-400 truncate">
                                                                {mat.filename === 'Web Link' ? (
                                                                    <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">🔗 Web Link</span>
                                                                ) : mat.filename}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400">{new Date(mat.createdAt).toLocaleDateString()}</p>
                                                        </div>
                                                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-between items-center">
                                                            <button
                                                                onClick={() => handleDeleteStudyMaterial(mat._id)}
                                                                className="text-red-400 hover:text-red-600 text-[10px] font-bold transition-colors"
                                                            >
                                                                Delete
                                                            </button>
                                                            <a
                                                                href={mat.fileUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="px-3 py-1.5 bg-[#EF4444] hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all"
                                                            >
                                                                {mat.filename === 'Web Link' ? 'Open Link' : 'View File'}
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Assign Materials Section (only on assign tab) */}
                                {viewMode === 'assign' && (studyMaterials.length > 0 || loadingMaterials) && (
                                    <div className="animate-fade-in mt-6 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                                                <FileText size={12} className="text-indigo-600" />
                                            </div>
                                            <h3 className="font-extrabold text-slate-700 text-xs uppercase tracking-widest">Assigned Materials</h3>
                                            {studyMaterials.length > 0 && (
                                                <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full text-[10px] font-black">{studyMaterials.length}</span>
                                            )}
                                        </div>
                                        {loadingMaterials ? (
                                            <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold py-4">
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-200 border-t-indigo-500"></div>
                                                Loading materials...
                                            </div>
                                        ) : (
                                            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                                                {studyMaterials.map((mat) => (
                                                    <div key={mat._id} className="bg-white p-4 rounded-2xl border border-slate-200 hover:shadow-md transition-all flex flex-col justify-between">
                                                        <div className="space-y-1.5">
                                                            <h4 className="font-extrabold text-slate-800 text-xs leading-snug line-clamp-1">{mat.title}</h4>
                                                            <p className="text-[10px] text-slate-400 truncate">
                                                                {mat.filename === 'Web Link' ? (
                                                                    <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">🔗 Web Link</span>
                                                                ) : mat.filename}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400">{new Date(mat.createdAt).toLocaleDateString()}</p>
                                                        </div>
                                                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-2">
                                                            {/* Move to Upcoming */}
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await axios.patch(`/api/study-materials/${mat._id}`, { status: 'upcoming' });
                                                                        setStudyMaterials(prev => prev.filter(m => m._id !== mat._id));
                                                                        toast.success('Moved to Upcoming!');
                                                                    } catch (err) {
                                                                        toast.error('Failed to move material');
                                                                    }
                                                                }}
                                                                className="w-full py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                                                            >
                                                                <Hourglass size={10} strokeWidth={3} />
                                                                Move to Upcoming
                                                            </button>
                                                            <div className="flex justify-between items-center">
                                                                <button
                                                                    onClick={() => handleDeleteStudyMaterial(mat._id)}
                                                                    className="text-red-400 hover:text-red-600 text-[10px] font-bold transition-colors"
                                                                >
                                                                    Delete
                                                                </button>
                                                                <a
                                                                    href={mat.fileUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all"
                                                                >
                                                                    {mat.filename === 'Web Link' ? 'Open Link' : 'View File'}
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                            </>
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

                                {(activePracticeFiles.length === 0 && activePracticeNotes.length === 0) ? (
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

                    {/* Sticky bottom bar — Add More + Add Material (on pending and assign tabs) */}
                    {selectedStudent && selectedInboxId && studentTab === 'tests' && (viewMode === 'pending' || viewMode === 'assign') && (
                        <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-3 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowMatModal(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm hover:shadow-md active:scale-95"
                            >
                                <Plus size={14} strokeWidth={3} />
                                <span>Add Material</span>
                            </button>
                             <button
                                 onClick={() => {
                                     const inst = selectedStudent?.institute?.name || selectedStudent?.institute || '';
                                     const crs = selectedStudent?.studentProfile?.course?.name || '';
                                     const subj = activeDayDetails?.subjectName || '';
                                     const inbox = selectedInboxId || 'Inbox 1';
                                     
                                     navigate(`/teacher/activities-builder?studentId=${selectedStudent._id}&inboxId=${selectedInboxId}&institute=${encodeURIComponent(inst)}&course=${encodeURIComponent(crs)}&subject=${encodeURIComponent(subj)}&inbox=${encodeURIComponent(inbox)}&locked=true`);
                                 }}
                                 className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3E3ADD] hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-200 hover:shadow-indigo-300 active:scale-95"
                             >
                                 <Plus size={14} strokeWidth={3} />
                                 <span>Add More</span>
                             </button>
                        </div>
                    )}

                    {/* Sticky bottom bar — Add Material (study-material tab) */}
                    {selectedStudent && selectedInboxId && studentTab === 'tests' && viewMode === 'study-material' && (
                        <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-3 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowMatModal(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3E3ADD] hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-200 hover:shadow-indigo-300 active:scale-95"
                            >
                                <Plus size={14} strokeWidth={3} />
                                <span>Add Material</span>
                            </button>
                        </div>
                    )}

                    {/* Global Add Study Material Modal — renders on any tab */}
                    {showMatModal && (
                        <div
                            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                            style={{ backgroundColor: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
                            onClick={() => setShowMatModal(false)}
                        >
                            <div
                                className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Modal Header */}
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                                            <FileText size={15} className="text-[#3E3ADD]" />
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-slate-800 text-sm">Add Study Material</h3>
                                            <p className="text-[10px] text-slate-400 font-medium">Upload a file or paste a web link</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowMatModal(false)}
                                        className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all cursor-pointer text-sm font-bold"
                                    >
                                        ×
                                    </button>
                                </div>

                                <form onSubmit={handleUploadStudyMaterial} className="space-y-4">
                                    {/* Segmented Tab */}
                                    <div className="grid grid-cols-2 bg-slate-50 border border-slate-200/60 p-1 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setUploadType('url')}
                                            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${uploadType === 'url' ? 'bg-white text-slate-800 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <Link2 size={13} /> Paste Link
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setUploadType('file')}
                                            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${uploadType === 'file' ? 'bg-white text-slate-800 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <Upload size={13} /> Upload File
                                        </button>
                                    </div>

                                    {/* Title */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Material Title</label>
                                        <input
                                            type="text"
                                            value={matTitle}
                                            onChange={(e) => setMatTitle(e.target.value)}
                                            placeholder="e.g. React Cheatsheet"
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white"
                                            autoFocus
                                        />
                                    </div>

                                    {/* URL or File */}
                                    {uploadType === 'url' ? (
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Web Link (URL)</label>
                                            <input
                                                type="url"
                                                value={matUrl}
                                                onChange={(e) => setMatUrl(e.target.value)}
                                                placeholder="https://drive.google.com/... or any URL"
                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white"
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Choose File</label>
                                            <div
                                                className="border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-xl p-6 bg-slate-50/50 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
                                                onClick={() => document.getElementById('study-material-file-global').click()}
                                            >
                                                <input
                                                    type="file"
                                                    id="study-material-file-global"
                                                    onChange={(e) => setMatFile(e.target.files[0])}
                                                    className="hidden"
                                                />
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                                    <Upload size={18} className="text-[#3E3ADD]" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs font-bold text-slate-600">
                                                        {matFile ? matFile.name : 'Click to choose a file'}
                                                    </p>
                                                    {!matFile && <p className="text-[10px] text-slate-400 mt-0.5">PDF, DOC, PPT, Images supported</p>}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-3 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setShowMatModal(false)}
                                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={uploadingMaterial}
                                            className="flex-1 py-2.5 bg-[#3E3ADD] hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                                        >
                                            {uploadingMaterial ? (
                                                <><Loader2 size={12} className="animate-spin" /> Adding...</>
                                            ) : 'Add Material'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </main>

                {/* --- Right Sidebar: Students Selecting --- */}
                {showStudentList && (!isSaDisabled('student') || saMode() === 'disable') && (
                    <aside className="w-64 border-l border-slate-200 flex flex-col shrink-0 overflow-hidden bg-white animate-slide-in-right relative">
                        {isSaDisabled('student') ? (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center">
                                <Lock size={32} className="text-red-500 mb-3 animate-bounce" />
                                <h3 className="font-extrabold text-slate-800 text-sm mb-1">Student List Locked</h3>
                                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                                    {saNote('student') || 'This list has been deactivated by your administrator.'}
                                </p>
                            </div>
                        ) : null}
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
                            {activeFilter === 'Institute' && selectedCourseId && (
                                <div className="p-2.5 bg-indigo-50/50 border border-indigo-100/40 rounded-xl flex items-center justify-between px-3 animate-fade-in mb-2 shrink-0">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600">Active Course:</span>
                                    <span className="text-[10px] font-black text-indigo-700 max-w-[120px] truncate" title={teacherCoursesList.find(c => String(c.id) === String(selectedCourseId))?.name || 'N/A'}>
                                        {teacherCoursesList.find(c => String(c.id) === String(selectedCourseId))?.name || 'N/A'}
                                    </span>
                                </div>
                            )}
                            {activeFilter === 'Course' ? (
                                teacherCoursesList.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 text-xs font-semibold">No courses found.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {teacherCoursesList.map(course => {
                                            const isSelected = String(course.id) === String(selectedCourseId);
                                            return (
                                                <button
                                                    key={course.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedCourseId(String(course.id));
                                                        setActiveFilter('Institute');
                                                    }}
                                                    className={`w-full p-4 rounded-2xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between group ${
                                                        isSelected
                                                            ? 'border-[#3E3ADD] bg-[#3E3ADD]/5 text-[#3E3ADD]'
                                                            : 'border-slate-100 bg-white hover:border-[#3E3ADD]/40 text-slate-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2.5 rounded-xl shadow-xs transition-colors ${
                                                            isSelected ? 'bg-[#3E3ADD] text-white' : 'bg-slate-50 text-slate-500 group-hover:bg-indigo-50 group-hover:text-[#3E3ADD]'
                                                        }`}>
                                                            <BookOpen size={16} />
                                                        </div>
                                                        <span className="text-xs font-black tracking-wide truncate max-w-[130px] uppercase">
                                                            {course.name}
                                                        </span>
                                                    </div>
                                                    {isSelected && <CheckCircle size={14} className="text-[#3E3ADD] shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )
                            ) : loading && !students.length ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-900/20 border-t-indigo-900 mb-2"></div>
                                    <p className="text-xs text-indigo-950 font-semibold">Loading students...</p>
                                </div>
                            ) : showSectionsGrouped ? (
                                Object.keys(studentsBySection).sort().map(secName => {
                                    const secStudents = studentsBySection[secName];
                                    const isExpanded = !!expandedSections[secName];
                                    return (
                                        <div key={secName} className="space-y-1.5 mb-3 border border-slate-100 rounded-xl bg-slate-50/20 overflow-hidden">
                                            <div 
                                                onClick={() => setExpandedSections(prev => ({ ...prev, [secName]: !prev[secName] }))}
                                                className="flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100/70 border-b border-slate-100 cursor-pointer select-none transition-all"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                                        Section {secName}
                                                    </span>
                                                    <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
                                                        {secStudents.length} Students
                                                    </span>
                                                </div>
                                                <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                            {isExpanded && (
                                                <div className="space-y-1.5 p-2 bg-white animate-fade-in">
                                                {secStudents.map(student => {
                                                    const isSelected = selectedStudent?._id === student._id;
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
                                                                fetchInboxConfigs(student._id);
                                                                setShowStudentList(false);
                                                            }}
                                                            className={`flex items-center space-x-2.5 p-2 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-white border-[#3E3ADD] shadow-md shadow-indigo-500/5 ring-1 ring-[#3E3ADD]/10' : 'bg-white border-slate-100 hover:border-[#3E3ADD]/40 hover:bg-slate-50/30'}`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black !text-white shadow-sm transition-transform shrink-0 ${isSelected ? 'bg-[#3E3ADD] scale-105 shadow-sm shadow-indigo-500/10' : avatarBg}`} style={{ color: '#ffffff' }}>
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
                                            )}
                                        </div>
                                    );
                                })
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
                                            fetchInboxConfigs(student._id);
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
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Test Inbox</span>
                                        <span className="font-bold text-slate-900">{infoModalData.index || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Activity Type</span>
                                        <span className="font-bold text-slate-900">{infoModalData.activity || 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Created By</span>
                                        <span className="font-bold text-slate-900">
                                            {infoModalData.createdBy?.name || 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Creator Role</span>
                                        <span className="font-bold text-slate-900 uppercase text-xs">
                                            {infoModalData.createdBy?.role || 'N/A'}
                                        </span>
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

            {/* Rename Inbox Modal */}
            {renameInboxId && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-sans">
                    <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 max-w-sm w-full p-8 animate-slide-up relative">
                        <h3 className="font-extrabold text-slate-800 text-lg mb-1 tracking-tight">Rename Inbox</h3>
                        <p className="text-xs text-slate-400 mb-6">Enter a new display name for this student's inbox.</p>

                        <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            placeholder="Enter new inbox name..."
                            className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-[#3E3ADD] focus:ring-2 focus:ring-indigo-100 transition-all text-slate-805 font-bold mb-6"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setRenameInboxId(null);
                                    setRenameValue('');
                                }}
                                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-xs transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    const config = inboxConfigs.find(c => c.inboxId === renameInboxId && (!c.subject || c.subject.trim().toLowerCase() === renameSubject.trim().toLowerCase()));
                                    const isVisible = config ? config.visible : true;
                                    await handleUpdateInboxConfig(renameInboxId, renameValue.trim(), isVisible, renameSubject);
                                    setRenameInboxId(null);
                                    setRenameValue('');
                                    setRenameSubject('');
                                }}
                                className="flex-1 py-3.5 bg-[#3E3ADD] hover:bg-[#322ebd] text-white font-bold rounded-2xl text-xs transition-colors shadow-lg shadow-indigo-100"
                            >
                                Save Name
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Config Modal */}
            {bulkConfigModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-sans">
                    <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 max-w-md w-full p-8 animate-slide-up relative flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="mb-4">
                            <h3 className="font-extrabold text-slate-800 text-lg mb-1 tracking-tight">
                                {bulkConfigModal.actionType === 'hide'
                                    ? (bulkConfigModal.newVisible ? 'Show Activity' : 'Hide Activity')
                                    : (bulkConfigModal.newDisabled ? 'Disable Activity' : 'Enable Activity')
                                }
                            </h3>
                            <p className="text-xs text-slate-400">
                                Apply this configuration for "{allTests.find(t => t._id === bulkConfigModal.testId)?.title || 'Activity'}" to selected students.
                            </p>
                        </div>

                        {/* Search & Select All Actions */}
                        <div className="flex items-center justify-between gap-3 mb-4 bg-slate-50 p-2 rounded-xl">
                            <button
                                onClick={() => {
                                    const allIds = students.map(s => s._id);
                                    const allSelected = allIds.every(id => bulkSelectedStudents.includes(id));
                                    if (allSelected) {
                                        setBulkSelectedStudents([]);
                                    } else {
                                        setBulkSelectedStudents(allIds);
                                    }
                                }}
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-[#3E3ADD] uppercase tracking-wider hover:bg-slate-50 transition-colors"
                            >
                                {students.map(s => s._id).every(id => bulkSelectedStudents.includes(id)) ? 'Deselect All' : 'Select All'}
                            </button>

                            <span className="text-[10px] font-bold text-slate-550">
                                {bulkSelectedStudents.length} of {students.length} Selected
                            </span>
                        </div>

                        {/* Scrollable list of students */}
                        <div className="flex-1 overflow-y-auto min-h-[150px] max-h-[300px] border border-slate-100 rounded-2xl p-2.5 space-y-1.5 custom-scrollbar mb-6">
                            {students.map(student => {
                                const isChecked = bulkSelectedStudents.includes(student._id);
                                const isCurrent = selectedStudent?._id === student._id;
                                return (
                                    <div
                                        key={student._id}
                                        onClick={() => {
                                            if (isChecked) {
                                                setBulkSelectedStudents(prev => prev.filter(id => id !== student._id));
                                            } else {
                                                setBulkSelectedStudents(prev => [...prev, student._id]);
                                            }
                                        }}
                                        className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${isChecked
                                                ? 'bg-indigo-50/50 border-indigo-150'
                                                : 'bg-white border-slate-100 hover:bg-slate-50/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                                                {student.name?.[0]?.toUpperCase() || 'S'}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-bold text-slate-700 truncate">{student.name}</h4>
                                                <p className="text-[9px] text-slate-400 truncate">{student.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isCurrent && (
                                                <span className="px-1.5 py-0.5 bg-[#3E3ADD]/10 text-[#3E3ADD] border border-[#3E3ADD]/20 text-[8px] font-black uppercase tracking-wider rounded-md">
                                                    Current
                                                </span>
                                            )}
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => { }} // Handled by parent div onClick
                                                className="w-4 h-4 rounded border-slate-300 text-[#3E3ADD] focus:ring-[#3E3ADD] cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 shrink-0">
                            <button
                                onClick={() => setBulkConfigModal(null)}
                                className="flex-1 py-3.5 bg-slate-105 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-xs transition-colors uppercase tracking-wider"
                                disabled={bulkSaving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkSave}
                                className="flex-1 py-3.5 bg-[#3E3ADD] hover:bg-[#322ebd] text-white font-bold rounded-2xl text-xs transition-colors shadow-lg shadow-indigo-100 uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                                disabled={bulkSaving || bulkSelectedStudents.length === 0}
                            >
                                {bulkSaving ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>Save & Apply</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Inbox Config Modal */}
            {bulkInboxConfigModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-sans">
                    <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 max-w-md w-full p-8 animate-slide-up relative flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="mb-4">
                            <h3 className="font-extrabold text-slate-800 text-lg mb-1 tracking-tight">
                                {bulkInboxConfigModal.actionType === 'hide'
                                    ? (bulkInboxConfigModal.visible ? 'Show Inbox' : 'Hide Inbox')
                                    : (bulkInboxConfigModal.disabled ? 'Disable Inbox' : 'Enable Inbox')
                                }
                            </h3>
                            <p className="text-xs text-slate-400">
                                Apply this configuration for "{getDisplayTitle(bulkInboxConfigModal.inboxId)}" to selected students.
                            </p>
                        </div>

                        {/* Search & Select All Actions */}
                        <div className="flex items-center justify-between gap-3 mb-4 bg-slate-50 p-2 rounded-xl">
                            <button
                                onClick={() => {
                                    const allIds = students.map(s => s._id);
                                    const allSelected = allIds.every(id => bulkSelectedStudents.includes(id));
                                    if (allSelected) {
                                        setBulkSelectedStudents([]);
                                    } else {
                                        setBulkSelectedStudents(allIds);
                                    }
                                }}
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-[#3E3ADD] uppercase tracking-wider hover:bg-slate-50 transition-colors"
                            >
                                {students.map(s => s._id).every(id => bulkSelectedStudents.includes(id)) ? 'Deselect All' : 'Select All'}
                            </button>

                            <span className="text-[10px] font-bold text-slate-550">
                                {bulkSelectedStudents.length} of {students.length} Selected
                            </span>
                        </div>

                        {/* Scrollable list of students */}
                        <div className="flex-1 overflow-y-auto min-h-[150px] max-h-[300px] border border-slate-100 rounded-2xl p-2.5 space-y-1.5 custom-scrollbar mb-6">
                            {students.map(student => {
                                const isChecked = bulkSelectedStudents.includes(student._id);
                                const isCurrent = selectedStudent?._id === student._id;
                                return (
                                    <div
                                        key={student._id}
                                        onClick={() => {
                                            if (isChecked) {
                                                setBulkSelectedStudents(prev => prev.filter(id => id !== student._id));
                                            } else {
                                                setBulkSelectedStudents(prev => [...prev, student._id]);
                                            }
                                        }}
                                        className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${isChecked
                                                ? 'bg-indigo-50/50 border-indigo-150'
                                                : 'bg-white border-slate-100 hover:bg-slate-50/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                                                {student.name?.[0]?.toUpperCase() || 'S'}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-bold text-slate-700 truncate">{student.name}</h4>
                                                <p className="text-[9px] text-slate-400 truncate">{student.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isCurrent && (
                                                <span className="px-1.5 py-0.5 bg-[#3E3ADD]/10 text-[#3E3ADD] border border-[#3E3ADD]/20 text-[8px] font-black uppercase tracking-wider rounded-md">
                                                    Current
                                                </span>
                                            )}
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => { }} // Handled by parent div onClick
                                                className="w-4 h-4 rounded border-slate-300 text-[#3E3ADD] focus:ring-[#3E3ADD] cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 shrink-0">
                            <button
                                onClick={() => setBulkInboxConfigModal(null)}
                                className="flex-1 py-3.5 bg-slate-105 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-xs transition-colors uppercase tracking-wider"
                                disabled={bulkSaving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkInboxSave}
                                className="flex-1 py-3.5 bg-[#3E3ADD] hover:bg-[#322ebd] text-white font-bold rounded-2xl text-xs transition-colors shadow-lg shadow-indigo-100 uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                                disabled={bulkSaving || bulkSelectedStudents.length === 0}
                            >
                                {bulkSaving ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>Save & Apply</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Expiry Configuration Modal */}
            {expiryModalOpen && expiryModalTest && (
                <div className="fixed inset-0 z-[100] bg-white/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-sans">
                    <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl border-none flex flex-col max-h-[85vh] overflow-hidden relative animate-slide-up animate-fade-in">
                        {/* Fixed Header */}
                        <div className="px-8 py-5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#3E3ADD] flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                    <Clock size={20} strokeWidth={2.5} />
                                </div>
                                <h2 className="text-lg font-black text-slate-800 tracking-tight">
                                    {expiryModalTest.isAssigned ? "Edit Expiry Settings" : "Configure Expiry"}
                                </h2>
                            </div>
                            <button
                                onClick={() => {
                                    setExpiryModalOpen(false);
                                    setExpiryModalTest(null);
                                }}
                                className="p-2 hover:bg-slate-50 text-slate-450 hover:text-slate-600 rounded-full transition-all"
                            >
                                <RotateCcw size={20} className="rotate-45" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="px-8 py-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar text-left">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Activity</label>
                                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                    <span className="font-bold text-indigo-900 text-sm block">{expiryModalTest.title}</span>
                                    <span className="text-[10px] text-indigo-500 font-semibold block mt-0.5 uppercase tracking-wider">{expiryModalTest.activity || 'Test'}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">EXPIRY SETTINGS</label>
                                {/* Option 1: Always Available / No Expiry */}
                                <div 
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                        isNoExpiry 
                                            ? 'bg-purple-50/40 border-purple-200' 
                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}
                                    onClick={() => setIsNoExpiry(true)}
                                >
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="radio" 
                                            id="expiry-none"
                                            name="expiry-type"
                                            checked={isNoExpiry}
                                            onChange={() => setIsNoExpiry(true)}
                                            className="w-4 h-4 text-[#3E3ADD] focus:ring-[#3E3ADD] cursor-pointer"
                                        />
                                        <div className="text-left">
                                            <label htmlFor="expiry-none" className="text-xs font-bold text-slate-850 cursor-pointer">No Expiry</label>
                                            <p className="text-[9px] text-slate-450 mt-0.5">Always available to students in upcoming activities</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Option 2: Set Expiry Days */}
                                <div 
                                    className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 ${
                                        !isNoExpiry 
                                            ? 'bg-indigo-50/40 border-indigo-200' 
                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <div 
                                        className="flex items-center gap-3 cursor-pointer"
                                        onClick={() => setIsNoExpiry(false)}
                                    >
                                        <input 
                                            type="radio" 
                                            id="expiry-set"
                                            name="expiry-type"
                                            checked={!isNoExpiry}
                                            onChange={() => setIsNoExpiry(false)}
                                            className="w-4 h-4 text-[#3E3ADD] focus:ring-[#3E3ADD] cursor-pointer"
                                        />
                                        <div className="text-left">
                                            <label htmlFor="expiry-set" className="text-xs font-bold text-slate-850 cursor-pointer">Set Active Duration (Days)</label>
                                            <p className="text-[9px] text-slate-450 mt-0.5">Specify how many days this activity will remain active</p>
                                        </div>
                                    </div>

                                    {!isNoExpiry && (
                                        <div className="space-y-2 animate-fade-in text-left">
                                            <input 
                                                type="number" 
                                                min="1"
                                                max="300"
                                                value={activeDays}
                                                onChange={(e) => setActiveDays(parseInt(e.target.value) || 1)}
                                                className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                            />
                                            <p className="text-[9px] text-amber-600 font-bold bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100 leading-relaxed">
                                                ℹ Activity will expire after {activeDays} day(s). Maximum duration is 300 days.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4 pt-4">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">ASSIGN TO</label>
                                
                                {/* Particular Student */}
                                {selectedStudent && (
                                    <div 
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                            assignmentScope === 'particular'
                                                ? 'bg-indigo-50/40 border-indigo-200' 
                                                : 'bg-white border-slate-200 hover:border-slate-300'
                                        }`}
                                        onClick={() => setAssignmentScope('particular')}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="radio" 
                                                id="assign-particular"
                                                name="assign-scope"
                                                checked={assignmentScope === 'particular'}
                                                onChange={() => setAssignmentScope('particular')}
                                                className="w-4 h-4 text-[#3E3ADD] focus:ring-[#3E3ADD] cursor-pointer"
                                        />
                                        <div className="text-left">
                                            <label htmlFor="assign-particular" className="text-xs font-bold text-slate-850 cursor-pointer">Particular Student</label>
                                            <p className="text-[9px] text-slate-450 mt-0.5">Only assign to {selectedStudent.name}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Selected Students */}
                            <div 
                                className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 ${
                                    assignmentScope === 'selected'
                                        ? 'bg-indigo-50/40 border-indigo-200' 
                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <div 
                                    className="flex items-center gap-3 cursor-pointer"
                                    onClick={() => setAssignmentScope('selected')}
                                >
                                    <input 
                                        type="radio" 
                                        id="assign-selected"
                                        name="assign-scope"
                                        checked={assignmentScope === 'selected'}
                                        onChange={() => setAssignmentScope('selected')}
                                        className="w-4 h-4 text-[#3E3ADD] focus:ring-[#3E3ADD] cursor-pointer"
                                    />
                                    <div className="text-left">
                                        <label htmlFor="assign-selected" className="text-xs font-bold text-slate-850 cursor-pointer">Selected Students</label>
                                        <p className="text-[9px] text-slate-450 mt-0.5">Choose multiple students to assign this activity</p>
                                    </div>
                                </div>

                                {assignmentScope === 'selected' && (
                                    <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/50 animate-fade-in custom-scrollbar">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Select Students ({selectedStudentIds.length} selected)</span>
                                        <div className="space-y-1.5">
                                            {students.map(s => {
                                                const isChecked = selectedStudentIds.includes(s._id);
                                                return (
                                                    <label key={s._id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100/50 rounded-lg cursor-pointer transition-colors text-left">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedStudentIds(prev => [...prev, s._id]);
                                                                } else {
                                                                    setSelectedStudentIds(prev => prev.filter(id => id !== s._id));
                                                                }
                                                            }}
                                                            className="w-3.5 h-3.5 text-[#3E3ADD] focus:ring-[#3E3ADD] rounded cursor-pointer"
                                                        />
                                                        <span className="text-xs font-semibold text-slate-700">{s.name}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* All Students */}
                            <div 
                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                    assignmentScope === 'all'
                                        ? 'bg-indigo-50/40 border-indigo-200' 
                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                                onClick={() => setAssignmentScope('all')}
                            >
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="radio" 
                                        id="assign-all"
                                        name="assign-scope"
                                        checked={assignmentScope === 'all'}
                                        onChange={() => setAssignmentScope('all')}
                                        className="w-4 h-4 text-[#3E3ADD] focus:ring-[#3E3ADD] cursor-pointer"
                                    />
                                    <div className="text-left">
                                        <label htmlFor="assign-all" className="text-xs font-bold text-slate-850 cursor-pointer">All Students</label>
                                        <p className="text-[9px] text-slate-450 mt-0.5">Assign this activity to all students</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Force Expire Button (Only if test is already assigned) */}
                        {expiryModalTest.isAssigned && (
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => handleForceExpire(expiryModalTest)}
                                    className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-black rounded-xl text-[10px] uppercase tracking-wider transition-all"
                                >
                                    Force Expire Immediately
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Fixed Footer */}
                    <div className="px-8 py-5 flex gap-3 shrink-0">
                        <button
                            onClick={() => {
                                setExpiryModalOpen(false);
                                setExpiryModalTest(null);
                            }}
                            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-[10px] transition-colors uppercase tracking-wider"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveExpiry}
                            className="flex-1 py-3 bg-[#3E3ADD] hover:bg-[#322ebd] text-white font-bold rounded-2xl text-[10px] transition-colors shadow-lg shadow-indigo-100 uppercase tracking-wider"
                        >
                            {expiryModalTest.isAssigned ? "Save Changes" : "Assign Activity"}
                        </button>
                    </div>
                </div>
            </div>
        )}

            {/* Student Feedback Chat Modal */}
            {feedbackChatModalOpen && (
                <div className="fixed inset-0 bg-white/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fade-in font-sans">
                    <div className="bg-white w-full max-w-lg rounded-[2rem] border-none shadow-2xl overflow-hidden flex flex-col h-[80vh] max-h-[600px] text-left">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3E3ADD] to-purple-500 text-white font-extrabold flex items-center justify-center shadow-md">
                                    {activeFeedbackChatSub?.studentName?.[0]?.toUpperCase() || 'S'}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-extrabold text-slate-800 text-sm truncate">Student: {activeFeedbackChatSub?.studentName || 'Student'}</h3>
                                    <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Feedback: {activeFeedbackChatSub?.test?.title || 'Activity'}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setFeedbackChatModalOpen(false)}
                                className="p-1.5 hover:bg-slate-200/50 text-slate-450 hover:text-slate-700 rounded-xl transition-all font-bold text-xs"
                            >
                                Close
                            </button>
                        </div>

                        {/* Messages Body */}
                        <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50/20">
                            {loadingFeedbackChat ? (
                                <div className="h-full flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : feedbackChatMessages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none">
                                    <MessageSquare size={36} className="text-slate-350 mb-2 opacity-60 animate-pulse" />
                                    <h4 className="font-bold text-slate-700 text-sm">No messages yet</h4>
                                    <p className="text-slate-400 text-[11px] mt-1">
                                        No conversation history found.
                                    </p>
                                </div>
                            ) : (
                                feedbackChatMessages.map((msg, index) => {
                                    const isSelf = msg.role === 'Teacher';
                                    const formattedTime = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                                    return (
                                        <div key={index} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${isSelf
                                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                                : 'bg-white text-slate-850 border border-slate-150 rounded-tl-none'
                                                }`}>
                                                <p className="font-semibold">{msg.message}</p>
                                                <span className={`text-[8px] mt-1 block text-right font-bold ${isSelf ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                    {formattedTime}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Message Input Box */}
                        <div className="p-3 border-t border-slate-100 flex gap-2 bg-white shrink-0">
                            <input
                                type="text"
                                value={feedbackChatInput}
                                onChange={e => setFeedbackChatInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !sendingFeedbackChat && feedbackChatInput.trim()) {
                                        handleSendFeedbackChatMessage(activeFeedbackChatSub?._id);
                                    }
                                }}
                                placeholder="Type your reply..."
                                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                disabled={sendingFeedbackChat}
                            />
                            <button
                                onClick={() => handleSendFeedbackChatMessage(activeFeedbackChatSub?._id)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors shrink-0 flex items-center justify-center font-bold text-xs disabled:opacity-50"
                                disabled={sendingFeedbackChat || !feedbackChatInput.trim()}
                            >
                                {sendingFeedbackChat ? <Loader2 size={12} className="animate-spin" /> : 'Send'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default TeacherActivities;
