import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import toast from 'react-hot-toast';
import {
    Search, CheckCircle, Hourglass, MoreVertical, BookOpen,
    Mic, Video, FileText, Star, MessageSquare,
    Menu, Bell, RotateCcw, User, Play, Check,
    Settings, Sparkles, Layers, GitBranch, SendHorizontal, MessageCircle, BarChart3, AlertCircle, Info, Eye,
    Camera, MonitorPlay, Phone, Upload, ChevronLeft, ChevronRight, Lock, Clock, Loader2
} from 'lucide-react';

const isTestExpired = (test) => {
    if (!test) return false;
    const now = new Date();
    if (test.settings?.endTime && new Date(test.settings.endTime) < now) return true;
    if (test.publicSettings?.expiryDate && new Date(test.publicSettings.expiryDate) < now) return true;
    return false;
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
            className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 border shrink-0 transition-all duration-300 ${isCritical
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

const StudentTests = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const [tests, setTests] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [inboxConfigs, setInboxConfigs] = useState([]);
    const [activityConfigs, setActivityConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [viewMode, setViewMode] = useState(null); // 'pending' | 'completed' | etc
    const [infoModalData, setInfoModalData] = useState(null);
    const [activeFilter, setActiveFilter] = useState('Institute');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [inboxSearchQuery, setInboxSearchQuery] = useState('');
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [teacherContact, setTeacherContact] = useState(null);
    const [loadingChat, setLoadingChat] = useState(false);
    const messagesEndRef = useRef(null);
    const studentTabsRef = useRef(null);
    const { socket, onlineUsers } = useSocket();
    const [activeDropdownTestId, setActiveDropdownTestId] = useState(null);

    // States for feedback/report chat modal
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [activeFeedbackSub, setActiveFeedbackSub] = useState(null);
    const [feedbackMessages, setFeedbackMessages] = useState([]);
    const [feedbackInput, setFeedbackInput] = useState('');
    const [loadingFeedback, setLoadingFeedback] = useState(false);
    const [sendingFeedback, setSendingFeedback] = useState(false);

    const loadFeedbackHistory = async (submissionId) => {
        setLoadingFeedback(true);
        try {
            const res = await axios.get(`/api/submissions/${submissionId}/feedback`);
            setFeedbackMessages(res.data);
        } catch (err) {
            console.error("Failed to load feedback history:", err);
            toast.error("Failed to load feedback chat.");
        } finally {
            setLoadingFeedback(false);
        }
    };

    const handleSendFeedbackMessage = async (submissionId) => {
        if (!feedbackInput.trim()) return;
        setSendingFeedback(true);
        try {
            const res = await axios.post(`/api/submissions/${submissionId}/feedback`, { message: feedbackInput.trim() });
            setFeedbackMessages(res.data);
            setFeedbackInput('');
        } catch (err) {
            console.error("Failed to send feedback message:", err);
            toast.error("Failed to send message.");
        } finally {
            setSendingFeedback(false);
        }
    };

    const handleStudentTabsScroll = (direction) => {
        if (studentTabsRef.current) {
            const { scrollLeft } = studentTabsRef.current;
            const scrollAmount = 150;
            studentTabsRef.current.scrollTo({
                left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const [studyMaterials, setStudyMaterials] = useState([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);

    // Practice counts states
    const [cloudFiles, setCloudFiles] = useState([]);
    const [localFiles, setLocalFiles] = useState([]);
    const [notesList, setNotesList] = useState([]);
    const [loadingPractice, setLoadingPractice] = useState(false);

    useEffect(() => {
        if (viewMode === 'study-material' && selectedItem) {
            const fetchMaterials = async () => {
                try {
                    setLoadingMaterials(true);
                    const { data } = await axios.get(`/api/study-materials?inboxId=${selectedItem}`);
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
    }, [viewMode, selectedItem]);

    const loadPracticeCounts = async () => {
        if (!selectedItem) return;
        setLoadingPractice(true);
        try {
            const [cloudRes, notesRes] = await Promise.all([
                axios.get(`/api/practice-files?inbox=${encodeURIComponent(selectedItem)}`),
                axios.get(`/api/notes?inboxId=${encodeURIComponent(selectedItem)}`).catch(() => ({ data: [] }))
            ]);

            setCloudFiles(cloudRes.data.files || []);
            setNotesList(notesRes.data || []);

            const allLocal = [];

            // Screenshots
            const screenshotsStr = localStorage.getItem('practice_screenshots');
            if (screenshotsStr) {
                try {
                    const list = JSON.parse(screenshotsStr);
                    list.forEach(item => {
                        if (String(item.inbox) === String(selectedItem)) {
                            allLocal.push({
                                timestamp: item.timestamp,
                                toolType: 'Screenshot Tool'
                            });
                        }
                    });
                } catch (e) { }
            }

            // Screen Recordings
            const screenStr = localStorage.getItem('practice_screen_recordings');
            if (screenStr) {
                try {
                    const list = JSON.parse(screenStr);
                    list.forEach(item => {
                        if (String(item.inbox) === String(selectedItem)) {
                            allLocal.push({
                                timestamp: item.timestamp,
                                toolType: 'Screen Recorder'
                            });
                        }
                    });
                } catch (e) { }
            }

            // Videos
            const videoStr = localStorage.getItem('practice_videos');
            if (videoStr) {
                try {
                    const list = JSON.parse(videoStr);
                    list.forEach(item => {
                        if (String(item.inbox) === String(selectedItem)) {
                            allLocal.push({
                                timestamp: item.timestamp,
                                toolType: 'Video Recorder'
                            });
                        }
                    });
                } catch (e) { }
            }

            // Audios
            const audioStr = localStorage.getItem('practice_audios');
            if (audioStr) {
                try {
                    const list = JSON.parse(audioStr);
                    list.forEach(item => {
                        if (String(item.inbox) === String(selectedItem)) {
                            allLocal.push({
                                timestamp: item.timestamp,
                                toolType: 'Voice Recorder'
                            });
                        }
                    });
                } catch (e) { }
            }

            // Call Logs
            const logsStr = localStorage.getItem('practice_call_logs');
            if (logsStr) {
                try {
                    const list = JSON.parse(logsStr);
                    list.forEach(item => {
                        if (String(item.inbox) === String(selectedItem)) {
                            allLocal.push({
                                timestamp: item.date,
                                toolType: 'Web-Calling Tool'
                            });
                        }
                    });
                } catch (e) { }
            }

            // File Uploads
            const fileUploadsStr = localStorage.getItem('practice_file_uploads');
            if (fileUploadsStr) {
                try {
                    const list = JSON.parse(fileUploadsStr);
                    list.forEach(item => {
                        if (String(item.inbox) === String(selectedItem)) {
                            allLocal.push({
                                timestamp: item.timestamp,
                                toolType: 'File Uploader'
                            });
                        }
                    });
                } catch (e) { }
            }

            setLocalFiles(allLocal);
        } catch (err) {
            console.error("Failed to load practice counts in inbox:", err);
        } finally {
            setLoadingPractice(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'practice' && selectedItem) {
            loadPracticeCounts();
        }
    }, [viewMode, selectedItem]);

    const getFileCountForTool = (toolTitle) => {
        if (toolTitle === 'Notes Writing') {
            return notesList.length;
        }

        const dbTypeMap = {
            'Screenshot Tool': 'screenshot',
            'Screen Recorder': 'screen-recorder',
            'Voice Recorder': 'voice-recorder',
            'Video Recorder': 'video-recorder',
            'Web-Calling Tool': 'web-calling',
            'File Uploader': 'file-uploader'
        };

        const localCount = localFiles.filter(f => f.toolType === toolTitle).length;
        const dbType = dbTypeMap[toolTitle];
        const cloudCount = cloudFiles.filter(c => c.toolType === dbType).length;

        return localCount + cloudCount;
    };

    const [allStudyMaterials, setAllStudyMaterials] = useState([]);

    useEffect(() => {
        const fetch = async () => {
            try {
                if (!userInfo) return;
                const [testsRes, subsRes, configsRes, actConfigsRes, materialsRes] = await Promise.all([
                    axios.get('/api/tests'),
                    axios.get('/api/submissions'),
                    axios.get('/api/users/inbox-configs').catch(() => ({ data: [] })),
                    axios.get('/api/users/activity-configs').catch(() => ({ data: [] })),
                    axios.get('/api/study-materials').catch(() => ({ data: [] }))
                ]);
                setTests(testsRes.data);
                setSubmissions(subsRes.data);
                setInboxConfigs(configsRes.data || []);
                setActivityConfigs(actConfigsRes.data || []);
                setAllStudyMaterials(materialsRes.data || []);
            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [userInfo]);

    const submittedTestIds = useMemo(() =>
        new Set(submissions.map(s => s.test?._id || s.test)),
        [submissions]
    );

    const courseDuration = useMemo(() => {
        const profileDuration = userInfo?.studentProfile?.course?.duration;
        if (profileDuration && profileDuration > 0) return profileDuration;

        // Fallback: find highest index in tests
        let maxIndex = 0;
        tests.forEach(test => {
            if (test.index) {
                const match = test.index.match(/\d+/);
                if (match) {
                    const num = parseInt(match[0]);
                    if (num > maxIndex) maxIndex = num;
                }
            }
        });
        return Math.max(maxIndex, 5); // Default to at least 5 inboxes
    }, [userInfo, tests]);

    const dynamicInboxItems = useMemo(() => {
        // Group tests by normalized index
        const testsGrouped = tests.reduce((acc, test) => {
            const indexStr = test.index || 'No Index';
            const normalized = indexStr.trim().toLowerCase();
            if (!acc[normalized]) acc[normalized] = [];
            acc[normalized].push(test);
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
            standardKeys.push(`Index ${i}`);
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

        const enrollmentDate = userInfo?.studentProfile?.enrollmentDate || userInfo?.createdAt || new Date();

        return allKeys.map(keyName => {
            const normalized = keyName.trim().toLowerCase();
            const testsInInbox = testsGrouped[normalized] || [];
            const materialsInInbox = materialsGrouped[normalized] || [];

            const config = inboxConfigs.find(c => c.inboxId?.trim().toLowerCase() === normalized);
            const isVisible = config ? config.visible : true;

            const match = keyName.match(/\d+/);
            const idxNum = match ? parseInt(match[0], 10) : 1;
            const week = Math.ceil(idxNum / 7);
            const offsetDays = (week - 1) * 7;
            const inboxUnlockDateMs = new Date(enrollmentDate).getTime() + offsetDays * 24 * 60 * 60 * 1000;
            const isInboxDisabledByDefault = Date.now() < inboxUnlockDateMs;

            const isInboxDisabled = config && config.disabled !== undefined ? config.disabled : isInboxDisabledByDefault;

            const customTitle = config && config.displayName ? config.displayName : keyName;

            return {
                id: keyName,
                title: customTitle,
                completed: testsInInbox.filter(t => submittedTestIds.has(t._id)).length,
                pending: testsInInbox.filter(t => !submittedTestIds.has(t._id)).length,
                tests: testsInInbox,
                visible: isVisible,
                disabled: isInboxDisabled,
                hasContent: testsInInbox.length > 0 || materialsInInbox.length > 0
            };
        }).filter(item => item.visible);
    }, [tests, allStudyMaterials, submittedTestIds, inboxConfigs, courseDuration, userInfo]);

    useEffect(() => {
        if (!selectedItem && dynamicInboxItems.length > 0) {
            setSelectedItem(dynamicInboxItems[0].id);
            setViewMode('pending');
        }
    }, [dynamicInboxItems, selectedItem]);

    const selectedGroup = dynamicInboxItems.find(item => item.id === selectedItem);

    const submissionMap = useMemo(() => {
        const map = new Map();
        submissions.forEach(sub => {
            const testId = sub.test?._id || sub.test;
            if (testId) map.set(testId, sub);
        });
        return map;
    }, [submissions]);

    const pendingCount = useMemo(() => {
        if (!selectedGroup) return 0;
        return (selectedGroup.tests || []).filter(t => {
            const sub = submissionMap.get(t._id);
            return t.isAssigned !== false && !isTestExpired(t) && (!sub || sub.status === 'reported');
        }).length;
    }, [selectedGroup, submissionMap]);

    const submittedCount = useMemo(() => {
        if (!selectedGroup) return 0;
        return (selectedGroup.tests || []).filter(t => {
            const sub = submissionMap.get(t._id);
            return t.isAssigned !== false && sub && sub.status === 'submitted';
        }).length;
    }, [selectedGroup, submissionMap]);

    const returnedCount = useMemo(() => {
        if (!selectedGroup) return 0;
        return (selectedGroup.tests || []).filter(t => {
            const sub = submissionMap.get(t._id);
            return t.isAssigned !== false && !isTestExpired(t) && sub && sub.status === 'returned';
        }).length;
    }, [selectedGroup, submissionMap]);

    const evaluatedCount = useMemo(() => {
        if (!selectedGroup) return 0;
        return (selectedGroup.tests || []).filter(t => {
            const sub = submissionMap.get(t._id);
            return t.isAssigned !== false && sub && sub.status === 'evaluated';
        }).length;
    }, [selectedGroup, submissionMap]);

    const expiredCount = useMemo(() => {
        if (!selectedGroup) return 0;
        return (selectedGroup.tests || []).filter(t => {
            const sub = submissionMap.get(t._id);
            const isUnfinished = !sub || sub.status === 'returned' || sub.status === 'reported';
            return t.isAssigned !== false && isTestExpired(t) && isUnfinished;
        }).length;
    }, [selectedGroup, submissionMap]);

    const activeTests = useMemo(() => {
        if (!selectedGroup) return [];
        return (selectedGroup.tests || []).filter(test => {
            const sub = submissionMap.get(test._id);
            const isConfiguredHidden = activityConfigs.some(c => c.test === test._id && c.visible === false);
            if (isConfiguredHidden) return false;
            if (test.isAssigned === false) return false;

            if (viewMode === 'pending') {
                return (!sub || sub.status === 'reported') && !isTestExpired(test);
            } else if (viewMode === 'submitted') {
                return sub && sub.status === 'submitted';
            } else if (viewMode === 'returned') {
                return !isTestExpired(test) && sub && sub.status === 'returned';
            } else if (viewMode === 'evaluated') {
                return sub && sub.status === 'evaluated';
            } else if (viewMode === 'expired') {
                const isUnfinished = !sub || sub.status === 'returned' || sub.status === 'reported';
                return isTestExpired(test) && isUnfinished;
            }
            return false;
        });
    }, [selectedGroup, viewMode, submissionMap, activityConfigs]);

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

    useEffect(() => {
        const fetchContacts = async () => {
            try {
                const { data } = await axios.get('/api/chat/contacts');
                setContacts(data);
            } catch (err) {
                console.error("Error fetching contacts:", err);
            }
        };
        if (userInfo) {
            fetchContacts();
        }
    }, [userInfo]);

    useEffect(() => {
        if (contacts.length === 0) return;

        const testsInGroup = selectedGroup?.tests || [];
        const matchingContact = contacts.find(c =>
            testsInGroup.some(t => t.createdBy && String(t.createdBy) === String(c._id))
        );

        const resolved = matchingContact ||
            contacts.find(c => c.role === 'Teacher') ||
            contacts.find(c => c.role === 'Admin') ||
            contacts[0];

        setTeacherContact(resolved);
    }, [contacts, selectedGroup]);

    useEffect(() => {
        if (!teacherContact || viewMode !== 'chat' || !selectedItem) return;

        const fetchMessages = async () => {
            try {
                setLoadingChat(true);
                const { data } = await axios.get(`/api/chat/messages/${teacherContact._id}?inboxId=${selectedItem}`);
                setChatMessages(data);

                await axios.put(`/api/chat/messages/${teacherContact._id}/read`);
            } catch (err) {
                console.error("Error fetching chat messages:", err);
            } finally {
                setLoadingChat(false);
            }
        };
        fetchMessages();
    }, [teacherContact, viewMode, selectedItem]);

    useEffect(() => {
        if (!socket || !teacherContact || !selectedItem) return;

        const handleReceiveMessage = (msg) => {
            if (String(msg.sender) === String(teacherContact._id) && !msg.test && msg.inboxId === selectedItem) {
                setChatMessages(prev => {
                    if (prev.some(m => m._id === msg._id)) return prev;
                    return [...prev, msg];
                });

                axios.put(`/api/chat/messages/${teacherContact._id}/read`).catch(() => { });
            }
        };

        socket.on('receive-message', handleReceiveMessage);
        return () => {
            socket.off('receive-message', handleReceiveMessage);
        };
    }, [socket, teacherContact, selectedItem]);

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
        if (!chatInput.trim() || !teacherContact || !selectedItem) return;

        const text = chatInput.trim();
        setChatInput('');

        try {
            const payload = {
                receiver: teacherContact._id,
                text,
                inboxId: selectedItem
            };
            const { data } = await axios.post('/api/chat/messages', payload);

            setChatMessages(prev => [...prev, data]);

            if (socket) {
                socket.emit('send-message', {
                    _id: data._id,
                    senderId: userInfo._id,
                    receiverId: teacherContact._id,
                    text,
                    senderName: userInfo.name,
                    createdAt: data.createdAt,
                    inboxId: selectedItem
                });
            }
        } catch (err) {
            console.error("Error sending message:", err);
            toast.error("Failed to send message");
        }
    };

    return (
        <DashboardLayout role="Student" fullWidth={true}>
            <div className="flex h-[calc(100vh-120px)] bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">

                {/* ── LEFT SIDEBAR ───────────────────────────────────── */}
                <aside className="w-72 border-r border-slate-200 flex flex-col bg-white shrink-0 overflow-hidden">
                    <div className="p-6 border-b border-slate-150 shrink-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <BookOpen className="text-slate-700" size={18} />
                            <h2 className="font-extrabold text-slate-800 text-[15px] leading-tight">Activities Inbox</h2>
                        </div>
                        <p className="text-[10px] text-slate-400 mb-3 font-semibold uppercase tracking-wider">Browse your inboxes</p>

                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search Inboxes..."
                                value={inboxSearchQuery}
                                onChange={(e) => setInboxSearchQuery(e.target.value)}
                                className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3E3ADD] focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400 text-slate-800"
                            />
                        </div>

                        <div className="flex bg-slate-100 p-0.5 rounded-xl">
                            {['Institute', 'Course'].map(f => {
                                const isActive = activeFilter === f;
                                return (
                                    <button
                                        key={f}
                                        onClick={() => setActiveFilter(f)}
                                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${isActive
                                            ? 'bg-white text-[#3E3ADD] shadow-sm border border-slate-200/10'
                                            : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        {f}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar bg-slate-50/10">
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-2xl" />)}
                            </div>
                        ) : filteredInboxItems.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-xs font-semibold">No inboxes found.</div>
                        ) : (
                            filteredInboxItems.map(item => {
                                const isActive = selectedItem === item.id;
                                const firstTest = item.tests && item.tests.length > 0 ? item.tests[0] : null;
                                const isDisabled = item.disabled;

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => {
                                            if (isDisabled) {
                                                toast.error("This inbox is locked by your teacher or has not unlocked yet.");
                                                return;
                                            }
                                            setSelectedItem(item.id);
                                            setSelectedCategory(null);
                                            if (!viewMode || !['pending', 'submitted', 'returned', 'evaluated', 'study-material', 'practice', 'chat', 'analytics'].includes(viewMode)) {
                                                setViewMode('pending');
                                            }
                                        }}
                                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isActive
                                            ? 'border-[#3E3ADD] bg-[#3E3ADD]/5 shadow-sm ring-1 ring-[#3E3ADD]/10'
                                            : isDisabled
                                                ? 'border-slate-200 bg-slate-50/40 opacity-70 cursor-not-allowed hover:shadow-none hover:border-slate-200'
                                                : 'border-slate-100 bg-white hover:border-[#3E3ADD]/40 hover:bg-slate-50/30'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-2.5 min-w-0">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${isActive
                                                ? 'bg-[#3E3ADD] text-white shadow-sm'
                                                : isDisabled
                                                    ? 'bg-slate-200 text-slate-400'
                                                    : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {isDisabled ? <Lock size={12} /> : <BookOpen size={14} />}
                                            </div>
                                            <h3 className={`font-bold text-xs truncate flex items-center ${isActive
                                                ? 'text-indigo-900'
                                                : isDisabled
                                                    ? 'text-slate-400'
                                                    : 'text-slate-700'
                                                }`}>
                                                {getDisplayTitle(item.title)}
                                                {isDisabled && (
                                                    <span className="ml-1 text-[9px] font-black text-amber-600 bg-amber-50 px-1 py-0.5 rounded shrink-0">
                                                        Locked
                                                    </span>
                                                )}
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
                        )}
                    </div>
                </aside>

                {/* ── MAIN CONTENT ──────────────────────────────────── */}
                <main className="flex-1 flex flex-col bg-white overflow-hidden">
                    {/* Top Header Section */}
                    <div className="bg-white border-b border-slate-200 p-4 flex flex-col gap-2.5 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-full bg-[#3E3ADD] text-white flex items-center justify-center shadow-md shadow-indigo-500/10 shrink-0">
                                <BookOpen size={16} />
                            </div>
                            <div>
                                <h1 className="text-lg font-extrabold text-indigo-950 tracking-tight leading-none">
                                    {selectedGroup ? getDisplayTitle(selectedGroup.title) : 'Select an Inbox'}
                                </h1>
                                <p className="text-[10px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wider">
                                    Your activities for this inbox
                                </p>
                            </div>
                        </div>

                        {selectedGroup && (
                            <div className="flex items-center gap-1 bg-slate-50/80 border border-slate-100 p-1 rounded-xl shrink-0 relative group/tabs">
                                {/* Left Scroll Button */}
                                <button
                                    type="button"
                                    onClick={() => handleStudentTabsScroll('left')}
                                    className="p-1 hover:bg-slate-200/50 text-slate-400 hover:text-slate-700 rounded-lg transition-all shrink-0"
                                    title="Scroll Left"
                                >
                                    <ChevronLeft size={14} strokeWidth={2.5} />
                                </button>

                                {/* Scrollable Container */}
                                <div
                                    ref={studentTabsRef}
                                    className="flex-1 flex overflow-x-auto scrollbar-none gap-1 shrink-0 scroll-smooth"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    {[
                                        { id: 'pending', label: `Upcoming (${pendingCount})`, icon: Sparkles, activeClass: 'bg-[#EF4444] text-white shadow-md' },
                                        { id: 'submitted', label: `Submitted (${submittedCount})`, icon: FileText, activeClass: 'bg-blue-600 text-white shadow-md' },
                                        { id: 'returned', label: `Returned (${returnedCount})`, icon: RotateCcw, activeClass: 'bg-orange-500 text-white shadow-md' },
                                        { id: 'evaluated', label: `Evaluated (${evaluatedCount})`, icon: CheckCircle, activeClass: 'bg-emerald-600 text-white shadow-md' },
                                        { id: 'expired', label: `Expired (${expiredCount})`, icon: Clock, activeClass: 'bg-rose-700 text-white shadow-md' },
                                        { id: 'study-material', label: 'Study Material', icon: BookOpen, activeClass: 'bg-indigo-600 text-white shadow-md' },
                                        { id: 'practice', label: 'Tools', icon: Settings, activeClass: 'bg-purple-600 text-white shadow-md' },
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

                                {/* Right Scroll Button */}
                                <button
                                    type="button"
                                    onClick={() => handleStudentTabsScroll('right')}
                                    className="p-1 hover:bg-slate-200/50 text-slate-400 hover:text-slate-700 rounded-lg transition-all shrink-0"
                                    title="Scroll Right"
                                >
                                    <ChevronRight size={14} strokeWidth={2.5} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                        {!selectedGroup ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-md w-full text-center">
                                    <h2 className="text-xl font-bold text-slate-400 mb-2">No Inbox Selected</h2>
                                    <p className="text-slate-455 text-xs leading-relaxed">
                                        Select an Inbox item from the sidebar to view categories and assignments.
                                    </p>
                                </div>
                            </div>
                        ) : selectedGroup.disabled ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 max-w-md w-full text-center space-y-4">
                                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mx-auto border border-amber-100">
                                        <Lock size={28} />
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Inbox Locked</h2>
                                        <p className="text-slate-450 text-xs leading-relaxed">
                                            This Inbox has been disabled by your teacher. You cannot view or submit assignments here at the moment.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : viewMode === 'study-material' ? (
                            /* --- STUDY MATERIAL TAB --- */
                            <div className="animate-fade-in space-y-6 text-left">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-sm font-bold text-slate-800">Study Materials</h2>
                                    <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">
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
                                        <div className="text-4xl mb-2">📚</div>
                                        <p className="font-bold text-slate-700 text-sm">No Study Material Yet</p>
                                        <p className="text-slate-450 text-xs mt-1 font-medium">Your instructor hasn't uploaded any study materials for this Inbox.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                                        {studyMaterials.map((mat) => (
                                            <div key={mat._id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:shadow-md transition-all flex flex-col justify-between hover:-translate-y-0.5 duration-200">
                                                <div className="space-y-2">
                                                    <h4 className="font-extrabold text-slate-800 text-sm leading-snug line-clamp-1">{mat.title}</h4>
                                                    <p className="text-xs text-slate-450 truncate" title={mat.filename}>{mat.filename}</p>
                                                    <p className="text-[10px] text-slate-450">Uploaded on {new Date(mat.createdAt).toLocaleDateString()}</p>
                                                </div>
                                                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-[#3E3ADD] bg-indigo-50 px-2.5 py-1 rounded-lg">
                                                        By: {mat.uploadedBy?.name || 'Instructor'}
                                                    </span>
                                                    <a
                                                        href={mat.fileUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="px-3.5 py-1.5 bg-[#3E3ADD] hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all"
                                                    >
                                                        Open File
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : viewMode === 'practice' ? (
                            /* --- PRACTICE TAB --- */
                            <div className="animate-fade-in space-y-6 text-left">

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[
                                        {
                                            title: "Voice Recorder",
                                            icon: Mic,
                                            color: "text-blue-600 bg-blue-50 border-blue-150 hover:border-blue-300",
                                            path: "/student/practice-tools/voice-recorder"
                                        },
                                        {
                                            title: "Video Recorder",
                                            icon: MonitorPlay,
                                            color: "text-purple-600 bg-purple-50 border-purple-150 hover:border-purple-300",
                                            path: "/student/practice-tools/video-recorder"
                                        },
                                        {
                                            title: "File Uploader",
                                            icon: Upload,
                                            color: "text-amber-600 bg-amber-50 border-amber-150 hover:border-amber-300",
                                            path: "/student/practice-tools/file-uploader"
                                        },
                                        {
                                            title: "Notes Writing",
                                            icon: FileText,
                                            color: "text-amber-500 bg-amber-50 border-amber-150 hover:border-amber-300",
                                            path: "/student/practice-tools/notes"
                                        },
                                        {
                                            title: "Screenshot Tool",
                                            icon: Camera,
                                            color: "text-indigo-600 bg-indigo-50 border-indigo-150 hover:border-indigo-300",
                                            path: "/student/practice-tools/screenshot"
                                        },
                                        {
                                            title: "Screen Recorder",
                                            icon: Video,
                                            color: "text-emerald-600 bg-emerald-50 border-emerald-150 hover:border-emerald-300",
                                            path: "/student/practice-tools/screen-recorder"
                                        },
                                        {
                                            title: "Web-Calling Tool",
                                            icon: Phone,
                                            color: "text-pink-600 bg-pink-50 border-pink-150 hover:border-pink-300",
                                            path: "/student/practice-tools/web-calling"
                                        }
                                    ].map((tool, idx) => {
                                        const fileCount = getFileCountForTool(tool.title);
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => navigate(`${tool.path}?inbox=${selectedItem}`)}
                                                className="bg-white p-5 rounded-2xl border border-slate-200 hover:shadow-md transition-all flex items-center justify-between group hover:-translate-y-0.5 duration-200 cursor-pointer text-left h-20"
                                            >
                                                {/* Left Side: Icon */}
                                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${tool.color.split(' hover:')[0]} group-hover:scale-105 transition-all duration-200 shrink-0`}>
                                                    <tool.icon size={18} />
                                                </div>
                                                {/* Right Side: Files Count and Tool Title */}
                                                <div className="flex flex-col items-end gap-1.5 text-right min-w-0">
                                                    <span className={`px-2 py-0.5 rounded-md font-black text-[8px] uppercase tracking-wider ${fileCount > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' : 'bg-slate-100 text-slate-400'
                                                        }`}>
                                                        {fileCount} {fileCount === 1 ? 'file' : 'files'}
                                                    </span>
                                                    <h3 className="font-extrabold text-slate-850 text-[11px] tracking-tight leading-tight truncate max-w-full">{tool.title}</h3>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : viewMode === 'chat' ? (
                            /* --- CHAT TAB --- */
                            <div className="animate-fade-in flex flex-col h-[calc(100vh-320px)] min-h-[350px] bg-white border border-slate-250 rounded-2xl overflow-hidden shadow-sm">
                                <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                                    <div className="relative shrink-0">
                                        <div className="w-10 h-10 rounded-full bg-indigo-150 text-indigo-700 font-bold flex items-center justify-center shadow-md overflow-hidden">
                                            {teacherContact?.avatar ? (
                                                <img src={teacherContact.avatar} alt={teacherContact.name} className="w-full h-full object-cover" />
                                            ) : (
                                                teacherContact?.name?.[0]?.toUpperCase() || 'T'
                                            )}
                                        </div>
                                        {teacherContact && onlineUsers.includes(teacherContact._id) ? (
                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white ring-1 ring-emerald-500/20"></span>
                                        ) : (
                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-slate-350 rounded-full border-2 border-white"></span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm">
                                            {teacherContact ? teacherContact.name : 'Loading Instructor...'}
                                        </h3>
                                        <p className="text-[10px] text-slate-450 font-semibold">
                                            {teacherContact?.role || 'Teacher'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50/20">
                                    {loadingChat ? (
                                        <div className="h-full flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                                        </div>
                                    ) : chatMessages.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none">
                                            <MessageSquare size={36} className="text-slate-350 mb-2 opacity-60 animate-pulse" />
                                            <h4 className="font-bold text-slate-700 text-sm">No messages yet</h4>
                                            <p className="text-slate-400 text-[11px] mt-1">
                                                Send a message to start conversation with {teacherContact ? teacherContact.name : 'your teacher'}.
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
                                                        <span className={`text-[8px] mt-1 block text-right ${isSelf ? 'text-indigo-200' : 'text-slate-450'
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
                                        placeholder="Type your message to the instructor..."
                                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                        disabled={!teacherContact}
                                    />
                                    <button
                                        type="submit"
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors shrink-0 flex items-center justify-center shadow-sm disabled:opacity-50"
                                        disabled={!teacherContact || !chatInput.trim()}
                                    >
                                        <SendHorizontal size={16} />
                                    </button>
                                </form>
                            </div>
                        ) : viewMode === 'analytics' ? (
                            /* --- ANALYTICS TAB --- */
                            <div className="animate-fade-in space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Inbox Items</span>
                                            <span className="text-2xl font-black text-slate-800 mt-1 block">{selectedGroup.tests.length}</span>
                                        </div>
                                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg"><BookOpen size={16} /></div>
                                    </div>
                                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed</span>
                                            <span className="text-2xl font-black text-emerald-600 mt-1 block">{selectedGroup.completed}</span>
                                        </div>
                                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle size={16} /></div>
                                    </div>
                                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending</span>
                                            <span className="text-2xl font-black text-orange-500 mt-1 block">{selectedGroup.pending}</span>
                                        </div>
                                        <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg"><Hourglass size={16} /></div>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                                    <h3 className="font-bold text-slate-800 text-sm">Overall Completion Progress</h3>
                                    <div>
                                        <div className="flex justify-between items-center text-xs font-semibold text-slate-500 mb-1">
                                            <span>Progress Status</span>
                                            <span className="text-indigo-600">
                                                {selectedGroup.tests.length > 0 ? Math.round((selectedGroup.completed / selectedGroup.tests.length) * 100) : 0}% Completed
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                            <div
                                                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                                                style={{ width: `${selectedGroup.tests.length > 0 ? (selectedGroup.completed / selectedGroup.tests.length) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* --- DIRECT TESTS GRID --- */
                            <div className="animate-fade-in space-y-4">
                                {!activeTests.length ? (
                                    <div className="py-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm max-w-md mx-auto">
                                        <div className="text-4xl mb-2">🎉</div>
                                        <p className="font-bold text-slate-700 text-sm">All caught up!</p>
                                        <p className="text-slate-400 text-xs mt-1 font-medium">No {viewMode} activities exist in this Inbox.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                        {activeTests.map(test => {
                                            const sub = submissionMap.get(test._id);
                                            const isEvaluated = sub && sub.status === 'evaluated';
                                            const isReturned = sub && sub.status === 'returned';
                                            const isReported = sub && sub.status === 'reported';
                                            const config = activityConfigs.find(c => c.test === test._id);
                                            const isDisabled = config ? !!config.disabled : false;

                                            const isExpired = isTestExpired(test);
                                            const cannotTake = isExpired && (!sub || isReturned || isReported);
                                            const isBtnDisabled = isDisabled || cannotTake;

                                            return (
                                                <div
                                                    key={test._id}
                                                    onClick={() => {
                                                        if (isDisabled) {
                                                            toast.error("This test has been disabled by your teacher.");
                                                            return;
                                                        }
                                                        if (cannotTake) {
                                                            toast.error("This activity has expired and cannot be taken.");
                                                            return;
                                                        }
                                                        if (!sub || isReturned || isReported) {
                                                            navigate(`/student/take-test/${test._id}`);
                                                        } else {
                                                            navigate(`/student/test-result/${sub._id}`);
                                                        }
                                                    }}
                                                    className={`bg-white p-3.5 rounded-xl border hover:shadow-md transition-all flex flex-col justify-between h-auto relative group ${isBtnDisabled
                                                        ? 'border-slate-200 opacity-60 bg-slate-50/50 cursor-not-allowed hover:shadow-none'
                                                        : isReturned
                                                            ? 'border-orange-300 hover:border-orange-400 ring-1 ring-orange-100 cursor-pointer'
                                                            : isReported
                                                                ? 'border-amber-300 hover:border-amber-400 ring-1 ring-amber-100 cursor-pointer'
                                                                : 'hover:border-[#3E3ADD] cursor-pointer'
                                                        }`}
                                                >
                                                    {/* Returned warning banner */}
                                                    {isReturned && !isExpired && (
                                                        <div className="absolute -top-0.5 left-0 right-0 bg-orange-500 text-white text-[8px] font-black uppercase tracking-widest text-center py-0.5 rounded-t-xl">
                                                            ⚠ Returned — Redo Required
                                                        </div>
                                                    )}
                                                    {/* Reported warning banner */}
                                                    {isReported && !isExpired && (
                                                        <div className="absolute -top-0.5 left-0 right-0 bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest text-center py-0.5 rounded-t-xl">
                                                            ⚠ Reported — Resume Required
                                                        </div>
                                                    )}
                                                    {/* Disabled warning banner */}
                                                    {isDisabled && (
                                                        <div className="absolute -top-0.5 left-0 right-0 bg-slate-400 text-white text-[8px] font-black uppercase tracking-widest text-center py-0.5 rounded-t-xl">
                                                            🔒 Disabled by Teacher
                                                        </div>
                                                    )}
                                                    {/* Expired warning banner */}
                                                    {cannotTake && (
                                                        <div className="absolute -top-0.5 left-0 right-0 bg-rose-500 text-white text-[8px] font-black uppercase tracking-widest text-center py-0.5 rounded-t-xl">
                                                            ⏰ Expired
                                                        </div>
                                                    )}
                                                    <div className={`flex items-center justify-between gap-2 min-w-0 ${(isReturned || isReported || isDisabled || cannotTake) ? 'mt-3' : ''}`}>
                                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isBtnDisabled
                                                                ? 'bg-slate-400'
                                                                : !sub
                                                                    ? 'bg-orange-500'
                                                                    : isEvaluated
                                                                        ? 'bg-emerald-500'
                                                                        : isReturned
                                                                            ? 'bg-orange-500 animate-pulse'
                                                                            : isReported
                                                                                ? 'bg-amber-500 animate-pulse'
                                                                                : 'bg-blue-500'
                                                                }`} />
                                                            <h3 className={`font-extrabold text-slate-800 text-xs leading-snug transition-colors line-clamp-1 uppercase tracking-tight truncate min-w-0 flex-1 ${isBtnDisabled
                                                                ? 'text-slate-400'
                                                                : isReturned
                                                                    ? 'group-hover:text-orange-500'
                                                                    : isReported
                                                                        ? 'group-hover:text-amber-500'
                                                                        : 'group-hover:text-[#3E3ADD]'
                                                                }`}>
                                                                {test.title}
                                                            </h3>
                                                        </div>

                                                        <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveDropdownTestId(activeDropdownTestId === test._id ? null : test._id);
                                                                }}
                                                                className="p-1 text-slate-450 hover:text-[#3E3ADD] hover:bg-slate-100 rounded-lg transition-all"
                                                                title="Options"
                                                            >
                                                                <MoreVertical size={14} />
                                                            </button>
                                                            {activeDropdownTestId === test._id && (
                                                                <div className="absolute right-0 top-7 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 w-40 animate-fade-in text-left">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveDropdownTestId(null);
                                                                            setInfoModalData(test);
                                                                        }}
                                                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors text-left"
                                                                    >
                                                                        <Eye size={13} className="text-slate-400" />
                                                                        View Details
                                                                    </button>
                                                                    {sub && sub.conversation && sub.conversation.length > 0 && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActiveDropdownTestId(null);
                                                                                setActiveFeedbackSub(sub);
                                                                                loadFeedbackHistory(sub._id);
                                                                                setFeedbackModalOpen(true);
                                                                            }}
                                                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors text-left border-t border-slate-100"
                                                                        >
                                                                            <MessageSquare size={13} className="text-slate-400" />
                                                                            Teacher's Reply
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-row items-center justify-between gap-3 mt-3 pt-2.5 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                                                        <div className="flex items-center gap-1.5">
                                                            {viewMode === 'pending' && <ActivityTimer endTime={test.settings?.endTime} />}
                                                        </div>

                                                        <button
                                                            onClick={() => {
                                                                if (isDisabled) {
                                                                    toast.error("This test has been disabled by your teacher.");
                                                                    return;
                                                                }
                                                                if (cannotTake) {
                                                                    toast.error("This activity has expired and cannot be taken.");
                                                                    return;
                                                                }
                                                                if (!sub || isReturned || isReported) {
                                                                    navigate(`/student/take-test/${test._id}`);
                                                                } else {
                                                                    navigate(`/student/test-result/${sub._id}`);
                                                                }
                                                            }}
                                                            disabled={isBtnDisabled}
                                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0 border ${isBtnDisabled
                                                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                                                : isReturned
                                                                    ? 'bg-orange-500 text-white hover:bg-orange-600 border-transparent'
                                                                    : !sub
                                                                        ? 'bg-[#3E3ADD] text-white hover:bg-indigo-700 border-transparent'
                                                                        : isReported
                                                                            ? 'bg-amber-500 text-white hover:bg-amber-600 border-transparent'
                                                                            : isEvaluated
                                                                                ? 'bg-[#ECFDF5] text-emerald-800 border-emerald-250 hover:bg-emerald-100'
                                                                                : 'bg-blue-105 text-blue-800 border border-blue-250 hover:bg-blue-200'
                                                                }`}
                                                        >
                                                            {isDisabled ? 'Disabled' : cannotTake ? 'Expired' : isReturned ? 'Redo' : isReported ? 'Continue' : !sub ? 'Take Test' : isEvaluated ? 'Feedback' : 'Submitted'}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            <style>{`
                .scrollbar-none::-webkit-scrollbar { display: none; }
                .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 4px; }
            `}</style>

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

            {/* Teacher Feedback Chat Modal */}
            {feedbackModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in font-sans">
                    <div className="bg-white w-full max-w-lg rounded-[2rem] border border-slate-100/80 shadow-2xl overflow-hidden flex flex-col h-[80vh] max-h-[600px] text-left">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-extrabold flex items-center justify-center shadow-md">
                                    T
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-extrabold text-slate-800 text-sm truncate">Feedback: {activeFeedbackSub?.test?.title || 'Test'}</h3>
                                    <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Teacher Feedback Chat</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setFeedbackModalOpen(false)}
                                className="p-1.5 hover:bg-slate-200/50 text-slate-450 hover:text-slate-700 rounded-xl transition-all font-bold text-xs"
                            >
                                Close
                            </button>
                        </div>

                        {/* Messages Body */}
                        <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50/20">
                            {loadingFeedback ? (
                                <div className="h-full flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : feedbackMessages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none">
                                    <MessageSquare size={36} className="text-slate-350 mb-2 opacity-60 animate-pulse" />
                                    <h4 className="font-bold text-slate-700 text-sm">No messages yet</h4>
                                    <p className="text-slate-400 text-[11px] mt-1">
                                        Send a message to start conversation with the teacher.
                                    </p>
                                </div>
                            ) : (
                                feedbackMessages.map((msg, index) => {
                                    const isSelf = msg.role === 'Student';
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
                                value={feedbackInput}
                                onChange={e => setFeedbackInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !sendingFeedback && feedbackInput.trim()) {
                                        handleSendFeedbackMessage(activeFeedbackSub?._id);
                                    }
                                }}
                                placeholder="Type your reply..."
                                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                disabled={sendingFeedback}
                            />
                            <button
                                onClick={() => handleSendFeedbackMessage(activeFeedbackSub?._id)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors shrink-0 flex items-center justify-center font-bold text-xs disabled:opacity-50"
                                disabled={sendingFeedback || !feedbackInput.trim()}
                            >
                                {sendingFeedback ? <Loader2 size={12} className="animate-spin" /> : 'Send'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </DashboardLayout>
    );
};

export default StudentTests;
