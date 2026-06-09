import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import {
    Search, CheckCircle, Hourglass, MoreVertical, BookOpen,
    Mic, Video, FileText, Star, MessageSquare,
    Menu, Bell, RotateCcw, User, Play, Check,
    Settings, Sparkles, Layers, GitBranch, SendHorizontal, MessageCircle, BarChart3, AlertCircle
} from 'lucide-react';

const getDisplayTitle = (title) => {
    if (!title) return 'Inbox No';
    const cleanTitle = title.trim();
    if (cleanTitle.toLowerCase().startsWith('inbox no')) return cleanTitle;
    if (cleanTitle.toLowerCase().startsWith('index')) {
        return cleanTitle.replace(/index/i, 'Inbox No');
    }
    // if it's just a number:
    if (/^\d+$/.test(cleanTitle)) {
        return `Inbox No ${cleanTitle}`;
    }
    return cleanTitle;
};

// Helper to map DB activity string to readable display category
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
    
    // Capitalize words for custom categories
    return act.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const StudentTests = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const [tests, setTests] = useState([]);
    const [submissions, setSubmissions] = useState([]); // student's own submissions
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [viewMode, setViewMode] = useState(null); // 'pending' | 'completed' | null
    const [hiddenActivities, setHiddenActivities] = useState({});
    const [showRelevantInfo, setShowRelevantInfo] = useState(false);
    const [infoModalData, setInfoModalData] = useState(null);
    const [activeFilter, setActiveFilter] = useState('Institute');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState([
        { id: 1, sender: 'teacher', text: "Hello! Please make sure to submit your pending test category items before the scheduled deadline.", time: "10:00 AM" },
        { id: 2, sender: 'student', text: "Sure, Professor. I am working on it.", time: "10:05 AM" }
    ]);

    useEffect(() => {
        const fetch = async () => {
            try {

                if (!userInfo) return;


                // Fetch tests AND student's own submissions in parallel
                const [testsRes, subsRes] = await Promise.all([
                    axios.get('/api/tests'),
                    axios.get('/api/submissions')
                ]);

                setTests(testsRes.data);
                setSubmissions(subsRes.data); // already filtered by backend for students

            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    // Set of submitted test IDs (for quick lookup)
    const submittedTestIds = useMemo(() =>
        new Set(submissions.map(s => s.test?._id || s.test)),
        [submissions]
    );

    // Group tests by Index
    const dynamicInboxItems = useMemo(() => {
        const grouped = tests.reduce((acc, test) => {
            const indexStr = test.index || 'No Index';
            if (!acc[indexStr]) acc[indexStr] = [];
            acc[indexStr].push(test);
            return acc;
        }, {});

        // Sort by index numerically if possible
        const getNum = (s) => parseInt(s.match(/\d+/)?.[0] || 0);

        return Object.keys(grouped)
            .sort((a, b) => getNum(a) - getNum(b))
            .map(indexStr => ({
                id: indexStr,
                title: indexStr,
                // Done = tests in this index that have a submission
                completed: grouped[indexStr].filter(t => submittedTestIds.has(t._id)).length,
                // Pending = tests with no submission yet
                pending: grouped[indexStr].filter(t => !submittedTestIds.has(t._id)).length,
                tests: grouped[indexStr]
            }));
    }, [tests, submittedTestIds]);

    // Auto-select first group
    useEffect(() => {
        if (!selectedItem && dynamicInboxItems.length > 0) {
            setSelectedItem(dynamicInboxItems[0].id);
            setViewMode('pending');
        }
    }, [dynamicInboxItems, selectedItem]);

    const selectedGroup = dynamicInboxItems.find(item => item.id === selectedItem);

    // Map test IDs to their submissions for quick lookup
    const submissionMap = useMemo(() => {
        const map = new Map();
        submissions.forEach(sub => {
            const testId = sub.test?._id || sub.test;
            if (testId) map.set(testId, sub);
        });
        return map;
    }, [submissions]);

    // Active tests based on selected group and selected viewMode (pending, submitted, evaluated)
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

    // Group active tests by Category Name
    const categoriesMap = useMemo(() => {
        const map = {};
        activeTests.forEach(test => {
            const catName = getCategoryDisplayName(test.activity);
            if (!map[catName]) map[catName] = [];
            map[catName].push(test);
        });
        return map;
    }, [activeTests]);

    // Pending: tests in group without a submission
    const pendingTests = (selectedGroup?.tests || []).filter(t => !submittedTestIds.has(t._id));

    // Completed: submissions whose test is in the selected group
    const completedSubmissions = submissions.filter(sub => {
        const testId = sub.test?._id || sub.test;
        return (selectedGroup?.tests || []).some(t => t._id === testId);
    });

    const handleSendChatMessage = (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const newMsg = {
            id: chatMessages.length + 1,
            sender: 'student',
            text: chatInput,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setChatMessages(prev => [...prev, newMsg]);
        setChatInput('');

        // Simulated teacher response
        setTimeout(() => {
            setChatMessages(prev => [
                ...prev,
                {
                    id: prev.length + 1,
                    sender: 'teacher',
                    text: "Got it! I will review your submissions and update you soon. Let me know if you face any issues.",
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
        }, 1000);
    };

    return (
        <DashboardLayout role="Student">
            <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-9.5rem)] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

                {/* ── LEFT SIDEBAR ───────────────────────────────────── */}
                <div className="w-full md:w-[260px] lg:w-[280px] md:max-w-[260px] lg:max-w-[280px] max-w-[300px] border-b md:border-b-0 md:border-r border-slate-200 flex flex-col bg-white shrink-0">
                    <div className="p-2 border-b border-slate-100">
                        <h2 className="font-bold text-slate-800 text-[16px] leading-tight mb-1.5">Activities Inbox Sidebar</h2>
                        <div className="relative mb-1.5">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={11} />
                            <input
                                type="text"
                                placeholder="Search"
                                className="w-full h-7 pl-6 pr-2 bg-slate-50 border border-slate-200 rounded-md text-[11px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 transition-all placeholder:text-slate-400 text-slate-800"
                            />
                        </div>
                        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                            {['Institute', 'Course', 'Subject', 'Inbox No'].map(f => {
                                const isActive = activeFilter === f;
                                return (
                                    <button
                                        key={f}
                                        onClick={() => setActiveFilter(f)}
                                        className={`h-7 px-2 whitespace-nowrap border rounded-md text-[10px] font-bold transition-all flex items-center justify-center ${
                                            isActive
                                                ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm shadow-blue-500/10'
                                                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                        }`}
                                    >
                                        {f}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                        {loading ? (
                            <div className="space-y-2">
                                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-[80px] bg-slate-100 animate-pulse rounded-xl" />)}
                            </div>
                        ) : dynamicInboxItems.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-xs font-medium">No tests found for your course.</div>
                        ) : (
                            dynamicInboxItems.map(item => {
                                const isActive = selectedItem === item.id;
                                const firstTest = item.tests && item.tests.length > 0 ? item.tests[0] : null;

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => {
                                            setSelectedItem(item.id);
                                            setSelectedCategory(null);
                                            if (!viewMode || !['pending', 'submitted', 'evaluated', 'practice', 'chat', 'analytics'].includes(viewMode)) {
                                                setViewMode('pending');
                                            }
                                        }}
                                        className={`p-2 rounded-xl border transition-all cursor-pointer shadow-sm flex flex-col justify-between min-h-[92px] ${
                                            isActive
                                                ? 'border-[#3E3ADD] bg-[#3E3ADD]/5 ring-1 ring-[#3E3ADD]/10'
                                                : 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <h3 className="font-bold text-slate-800 text-[12px] leading-tight truncate mr-2">
                                                {getDisplayTitle(item.title)}
                                            </h3>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (firstTest) setInfoModalData(firstTest);
                                                }}
                                                className={`px-1.5 py-0.5 whitespace-nowrap border rounded text-[9px] font-bold transition-all shrink-0 ${
                                                    isActive
                                                        ? 'border-blue-300 text-blue-600 bg-blue-50/50 hover:bg-blue-100/50'
                                                        : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50'
                                                }`}
                                            >
                                                Info
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-1 mt-1">
                                            {/* Completed pill */}
                                            <div
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    setSelectedItem(item.id);
                                                    setSelectedCategory(null);
                                                    setViewMode('completed');
                                                }}
                                                className={`flex items-center gap-1.5 px-2 py-0.5 border rounded-md hover:shadow-sm transition-all cursor-pointer text-[10px] font-bold ${
                                                    isActive && (viewMode === 'completed' || viewMode === 'submitted' || viewMode === 'evaluated')
                                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                                        : 'bg-white border-slate-150 text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                <span className="text-emerald-600 text-[10px] font-bold">✓</span>
                                                <span className="whitespace-nowrap">{item.completed} Completed</span>
                                            </div>

                                            {/* Pending pill */}
                                            <div
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    setSelectedItem(item.id);
                                                    setSelectedCategory(null);
                                                    setViewMode('pending');
                                                }}
                                                className={`flex items-center gap-1.5 px-2 py-0.5 border rounded-md hover:shadow-sm transition-all cursor-pointer text-[10px] font-bold ${
                                                    isActive && viewMode === 'pending'
                                                        ? 'bg-orange-50 border-orange-350 text-orange-850'
                                                        : 'bg-white border-slate-150 text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                <span className="text-orange-500 text-[10px]">⏳</span>
                                                <span className="whitespace-nowrap">{item.pending} Pending</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ── MAIN CONTENT ──────────────────────────────────── */}
                <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden">
                    {/* Top Header Section with colourful modern tabs */}
                    <div className="bg-white border-b border-slate-200 p-4 flex flex-col gap-3 shrink-0">
                        <div className="flex items-center justify-between">
                            <h1 className="text-lg font-bold text-indigo-950 flex items-center gap-2">
                                <span className="bg-indigo-50 text-[#3E3ADD] p-1.5 rounded-lg border border-indigo-100">
                                    <BookOpen size={16} />
                                </span>
                                {selectedGroup ? getDisplayTitle(selectedGroup.title) : 'Select an Inbox'}
                            </h1>
                        </div>

                        {selectedGroup && (
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                                {[
                                    { id: 'pending', label: 'Pending', activeClass: 'bg-rose-500 text-white border-rose-600 shadow-sm' },
                                    { id: 'submitted', label: 'Submitted', activeClass: 'bg-blue-600 text-white border-blue-700 shadow-sm' },
                                    { id: 'evaluated', label: 'Evaluated', activeClass: 'bg-emerald-600 text-white border-emerald-700 shadow-sm' },
                                    { id: 'practice', label: 'Practice Through Tools', activeClass: 'bg-purple-600 text-white border-purple-700 shadow-sm' },
                                    { id: 'chat', label: 'Chat with Teacher', activeClass: 'bg-teal-600 text-white border-teal-700 shadow-sm' },
                                    { id: 'analytics', label: 'Analytics', activeClass: 'bg-amber-600 text-white border-amber-700 shadow-sm' }
                                ].map(tab => {
                                    const isActive = viewMode === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => {
                                                setViewMode(tab.id);
                                                setSelectedCategory(null);
                                            }}
                                            className={`px-4 py-2 border rounded-xl text-xs font-bold whitespace-nowrap transition-all uppercase tracking-wider ${
                                                isActive
                                                    ? tab.activeClass
                                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100/80 hover:text-slate-800'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
                        {!selectedGroup ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 max-w-md w-full text-center">
                                    <h2 className="text-xl font-bold text-slate-400 mb-2">No Inbox Selected</h2>
                                    <p className="text-slate-400 text-xs leading-relaxed">
                                        Select an Inbox item from the sidebar to view categories and assignments.
                                    </p>
                                </div>
                            </div>
                        ) : viewMode === 'practice' ? (
                            /* --- PRACTICE TAB --- */
                            <div className="animate-fade-in space-y-4">
                                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                                    <div className="relative z-10">
                                        <span className="text-[10px] font-black uppercase bg-white/20 px-2.5 py-1 rounded-full tracking-widest">Interactive Practice</span>
                                        <h2 className="text-xl font-bold mt-2">Practice Through Tools</h2>
                                        <p className="text-xs text-indigo-100 mt-1 max-w-md">Boost your performance by generating practice quizzes, flashcards, and concept maps for the current inbox syllabus.</p>
                                    </div>
                                    <div className="absolute right-4 bottom-0 opacity-10 pointer-events-none transform translate-y-4">
                                        <Sparkles size={180} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        {
                                            title: "AI Quiz Generator",
                                            desc: "Generate custom, interactive practice multiple-choice questions based on this index.",
                                            icon: Sparkles,
                                            color: "text-purple-600 bg-purple-50 border-purple-100"
                                        },
                                        {
                                            title: "Smart Flashcards",
                                            desc: "Quickly review key terms, details, and core course concepts using interactive decks.",
                                            icon: Layers,
                                            color: "text-indigo-600 bg-indigo-50 border-indigo-100"
                                        },
                                        {
                                            title: "Mindmap Builder",
                                            desc: "Generate mindmaps to visually map out relationships between topics in this inbox.",
                                            icon: GitBranch,
                                            color: "text-teal-600 bg-teal-50 border-teal-100"
                                        }
                                    ].map((tool, idx) => (
                                        <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between group">
                                            <div>
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${tool.color} mb-4 group-hover:scale-110 transition-all`}>
                                                    <tool.icon size={20} />
                                                </div>
                                                <h3 className="font-bold text-slate-800 text-sm">{tool.title}</h3>
                                                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{tool.desc}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    alert(`${tool.title} is ready! Generating simulator...`);
                                                }}
                                                className="mt-5 w-full py-2 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all"
                                            >
                                                Launch Tool
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : viewMode === 'chat' ? (
                            /* --- CHAT TAB --- */
                            <div className="animate-fade-in flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                {/* Chat Header */}
                                <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shadow-md">
                                        T
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm">Course Instructor</h3>
                                        <p className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Active Now
                                        </p>
                                    </div>
                                </div>

                                {/* Chat messages thread */}
                                <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50/20">
                                    {chatMessages.map(msg => (
                                        <div key={msg.id} className={`flex ${msg.sender === 'student' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] p-3 rounded-2xl text-xs leading-relaxed ${
                                                msg.sender === 'student'
                                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                                    : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none shadow-sm'
                                            }`}>
                                                <p>{msg.text}</p>
                                                <span className={`text-[8px] mt-1 block text-right ${
                                                    msg.sender === 'student' ? 'text-indigo-200' : 'text-slate-400'
                                                }`}>
                                                    {msg.time}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Chat Input box */}
                                <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-100 flex gap-2 bg-white">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        placeholder="Type your message to the instructor..."
                                        className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                                    />
                                    <button
                                        type="submit"
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl transition-colors shrink-0 flex items-center justify-center"
                                    >
                                        <SendHorizontal size={16} />
                                    </button>
                                </form>
                            </div>
                        ) : viewMode === 'analytics' ? (
                            /* --- ANALYTICS TAB --- */
                            <div className="animate-fade-in space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Inbox Items</span>
                                            <span className="text-3xl font-black text-slate-800 mt-1 block">{selectedGroup.tests.length}</span>
                                        </div>
                                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><BookOpen size={20} /></div>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed</span>
                                            <span className="text-3xl font-black text-emerald-600 mt-1 block">{selectedGroup.completed}</span>
                                        </div>
                                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle size={20} /></div>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending</span>
                                            <span className="text-3xl font-black text-orange-500 mt-1 block">{selectedGroup.pending}</span>
                                        </div>
                                        <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><Hourglass size={20} /></div>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
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
                        ) : selectedCategory ? (
                            /* --- TESTS LIST UNDER CATEGORY --- */
                            <div className="animate-fade-in space-y-4">
                                <div className="flex items-center justify-between mb-4 bg-slate-100 p-2.5 rounded-xl border border-slate-200/50">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-800 font-bold text-sm">
                                            {selectedCategory}
                                        </span>
                                        <span className="text-slate-400 text-xs">
                                            ({(categoriesMap[selectedCategory] || []).length} items found)
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setSelectedCategory(null)}
                                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white shadow-sm border border-slate-200 rounded-lg px-3 py-1.5 transition-colors"
                                    >
                                        <RotateCcw size={12} /> Back to Categories
                                    </button>
                                </div>

                                <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                    {!(categoriesMap[selectedCategory] || []).length ? (
                                        <div className="col-span-3 py-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
                                            <div className="text-4xl mb-2">📋</div>
                                            <p className="font-bold text-slate-700 text-sm">No tests found</p>
                                            <p className="text-slate-400 text-xs mt-1">There are no tests listed in this category.</p>
                                        </div>
                                    ) : (
                                        (categoriesMap[selectedCategory] || []).map(test => {
                                            const sub = submissionMap.get(test._id);
                                            const isEvaluated = sub && sub.status === 'evaluated';

                                            return (
                                                <div
                                                    key={test._id}
                                                    onClick={() => {
                                                        if (!sub) {
                                                            navigate(`/student/take-test/${test._id}`);
                                                        } else {
                                                            navigate(`/student/test-result/${sub._id}`);
                                                        }
                                                    }}
                                                    className={`bg-white p-4 rounded-xl border hover:shadow-md hover:border-[#3E3ADD] transition-all cursor-pointer group flex flex-col justify-between h-36 relative`}
                                                >
                                                    <div className="flex items-start gap-2.5 min-w-0">
                                                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                                            !sub ? 'bg-orange-500' : isEvaluated ? 'bg-emerald-500' : 'bg-blue-500'
                                                        }`} />
                                                        <div className="min-w-0">
                                                            <h3 className="font-bold text-slate-800 text-xs leading-snug group-hover:text-[#3E3ADD] transition-colors line-clamp-2">{test.title}</h3>
                                                            <p className="text-[9px] font-semibold text-slate-400 mt-1 uppercase tracking-wider truncate">
                                                                Subject: {test.subject || 'N/A'}
                                                            </p>
                                                            <p className="text-[9px] text-slate-400 mt-0.5">
                                                                Created: {test.createdAt ? new Date(test.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between mt-4 border-t border-slate-50 pt-2" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => setInfoModalData(test)}
                                                            className="px-2.5 py-1 text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-full hover:bg-slate-100 transition-colors"
                                                        >
                                                            RI Details
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                if (!sub) {
                                                                    navigate(`/student/take-test/${test._id}`);
                                                                } else {
                                                                    navigate(`/student/test-result/${sub._id}`);
                                                                }
                                                            }}
                                                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm ${
                                                                !sub
                                                                    ? 'bg-[#3E3ADD] text-white hover:bg-indigo-700'
                                                                    : isEvaluated
                                                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-250 hover:bg-emerald-200'
                                                                        : 'bg-blue-100 text-blue-800 border border-blue-250 hover:bg-blue-200'
                                                            }`}
                                                        >
                                                            {!sub ? 'Take Test' : isEvaluated ? 'View Feedback' : 'Submitted'}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* --- CATEGORIES GRID --- */
                            <div className="animate-fade-in space-y-4">
                                {!Object.keys(categoriesMap).length ? (
                                    <div className="py-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm max-w-md mx-auto">
                                        <div className="text-4xl mb-2">🎉</div>
                                        <p className="font-bold text-slate-700 text-sm">All caught up!</p>
                                        <p className="text-slate-400 text-xs mt-1">No {viewMode} test categories exist in this Inbox.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                        {Object.keys(categoriesMap).map(catName => {
                                            const testsInCat = categoriesMap[catName];
                                            return (
                                                <div
                                                    key={catName}
                                                    onClick={() => setSelectedCategory(catName)}
                                                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-[#3E3ADD] hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between h-32 group"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-2">
                                                            {/* bullet point */}
                                                            <span className="w-1.5 h-1.5 rounded-full bg-[#3E3ADD]" />
                                                            <h4 className="font-bold text-slate-800 text-xs group-hover:text-[#3E3ADD] transition-colors">
                                                                {catName}
                                                            </h4>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between mt-auto" onClick={e => e.stopPropagation()}>
                                                        <span className="text-[10px] text-slate-500 font-semibold bg-slate-50 border border-slate-100 rounded-md px-2 py-0.5">
                                                            {testsInCat.length} {testsInCat.length === 1 ? 'Test' : 'Tests'}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                onClick={() => {
                                                                    if (testsInCat.length > 0) setInfoModalData(testsInCat[0]);
                                                                }}
                                                                className="px-2.5 py-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full hover:bg-indigo-100 transition-all"
                                                            >
                                                                RI
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (testsInCat.length > 0) setInfoModalData(testsInCat[0]);
                                                                }}
                                                                className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-50 transition-all"
                                                            >
                                                                <Settings size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .scrollbar-none::-webkit-scrollbar { display: none; }
                .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 4px; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.25s ease-out; }
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
                                    <Menu size={20} className="rotate-45" />
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
