import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import {
    Search, CheckCircle, Hourglass, MoreVertical, BookOpen,
    Mic, Video, FileText, Star, MessageSquare,
    Menu, Bell, RotateCcw, User, Play
} from 'lucide-react';

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

    // Pending: tests in group without a submission
    const pendingTests = (selectedGroup?.tests || []).filter(t => !submittedTestIds.has(t._id));

    // Completed: submissions whose test is in the selected group
    const completedSubmissions = submissions.filter(sub => {
        const testId = sub.test?._id || sub.test;
        return (selectedGroup?.tests || []).some(t => t._id === testId);
    });

    return (
        <DashboardLayout role="Student">
            <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

                {/* ── LEFT SIDEBAR ───────────────────────────────────── */}
                <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col bg-white">
                    <div className="p-4 border-b border-slate-100">
                        <h2 className="font-bold text-slate-800 text-lg mb-4">Course Progress</h2>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search"
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                            {['Category', 'Institute', 'Subject', 'Date Created'].map(f => (
                                <button key={f} className="px-3 py-1.5 whitespace-nowrap border border-indigo-200 text-indigo-700 rounded-full text-xs font-medium hover:bg-indigo-50 transition-colors">
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl" />)}
                            </div>
                        ) : dynamicInboxItems.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 font-medium">No tests found for your course.</div>
                        ) : (
                            dynamicInboxItems.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => { setSelectedItem(item.id); setViewMode(null); }}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${selectedItem === item.id ? 'border-indigo-500 bg-indigo-50/10 ring-1 ring-indigo-500/20' : 'border-slate-200 bg-white hover:border-indigo-300'}`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                                <RotateCcw size={14} />
                                            </div>
                                            <h3 className="font-bold text-slate-700 text-sm">{item.title}</h3>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-bold border border-indigo-100 uppercase tracking-tighter">Index</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Done pill — click to see completed */}
                                        <div
                                            onClick={e => { e.stopPropagation(); setSelectedItem(item.id); setViewMode('completed'); }}
                                            className={`flex-1 flex items-center gap-2 px-3 py-2 border rounded-lg hover:shadow-sm transition-all cursor-pointer ${selectedItem === item.id && viewMode === 'completed' ? 'bg-green-50 border-green-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            <div className="bg-green-600 rounded text-white p-0.5">
                                                <CheckCircle size={12} fill="currentColor" className="text-white" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-700">Completed {item.completed}</span>
                                        </div>

                                        {/* Wait pill */}
                                        <div
                                            onClick={e => { e.stopPropagation(); setSelectedItem(item.id); setViewMode('pending'); }}
                                            className={`flex-1 flex items-center gap-2 px-3 py-2 border rounded-lg hover:shadow-sm transition-all cursor-pointer ${selectedItem === item.id && viewMode === 'pending' ? 'bg-orange-50 border-orange-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            <div className="bg-orange-500 rounded text-white p-0.5">
                                                <Hourglass size={12} fill="currentColor" className="text-white" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-700">Pending {item.pending}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ── MAIN CONTENT ──────────────────────────────────── */}
                <div className="flex-1 flex flex-col bg-slate-50/50">
                    <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
                        <h1 className="text-xl font-bold text-slate-800">My Test Schedule</h1>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto">
                        {/* ── PENDING VIEW ────────────────────────────── */}
                        {viewMode === 'pending' && (
                            <div className="animate-fade-in space-y-6">
                                <div className="bg-red-500 rounded-xl p-3 flex items-center justify-between text-white shadow-md">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/20 p-2 rounded-lg"><BookOpen size={20} /></div>
                                        <h2 className="font-bold text-lg">{viewMode === 'pending' ? 'Pending Tests' : 'Completed Tests'}</h2>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/20 rounded-full flex items-center px-3 py-1.5 gap-2 border border-white/30">
                                            <Search size={16} />
                                            <input type="text" placeholder="Search" className="bg-transparent border-none text-white placeholder-red-100 text-sm focus:ring-0 w-24 md:w-40" />
                                        </div>
                                    </div>
                                </div>



                                <div className={`grid gap-4 ${pendingTests.length === 1 ? 'grid-cols-1' :
                                        pendingTests.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                                            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                                    }`}>
                                    {pendingTests.length === 0 ? (
                                        <div className="col-span-3 py-16 text-center">
                                            <div className="text-5xl mb-3">🎉</div>
                                            <p className="font-bold text-slate-700 text-lg">All caught up!</p>
                                            <p className="text-slate-400 text-sm mt-1">You have submitted all tests for this date.</p>
                                        </div>
                                    ) : (
                                        pendingTests.map(test => (
                                            <div
                                                key={test._id}
                                                onClick={() => navigate(`/student/take-test/${test._id}`)}
                                                className="bg-white p-4 rounded-xl shadow-sm border-2 border-[#3E3ADD] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between gap-4"
                                            >
                                                <div className="flex items-start gap-3">
                                                    {/* Bullet point */}
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-2 flex-shrink-0" />
                                                    <div>
                                                        <h3 className="font-bold text-slate-800 text-sm leading-tight group-hover:text-[#3E3ADD] transition-colors">{test.title}</h3>
                                                        <p className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-wider">
                                                            Created date: {test.createdAt ? new Date(test.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <MoreVertical size={16} className="text-[#3E3ADD]" />
                                                    <div className="bg-[#1E293B] p-2 rounded-xl flex items-center justify-center">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setInfoModalData(test);
                                                            }}
                                                            className="bg-[#FFE4E6] text-[#E11D48] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-[#FECDD3] transition-colors"
                                                        >
                                                            Relevant Information
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── COMPLETED VIEW ──────────────────────────── */}
                        {viewMode === 'completed' && (
                            <div className="animate-fade-in space-y-6">
                                <div className="bg-emerald-600 rounded-xl p-3 flex items-center justify-between text-white shadow-md">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/20 p-2 rounded-lg"><CheckCircle size={20} /></div>
                                        <h2 className="font-bold text-lg">Test Index: {selectedGroup?.title} (Completed)</h2>
                                    </div>
                                </div>



                                {completedSubmissions.length === 0 ? (
                                    <div className="py-16 text-center">
                                        <div className="text-5xl mb-3">📋</div>
                                        <p className="font-bold text-slate-700 text-lg">No submissions yet</p>
                                        <p className="text-slate-400 text-sm mt-1">Submit a test to see it here.</p>
                                    </div>
                                ) : (
                                    <div className={`grid gap-4 ${completedSubmissions.length === 1 ? 'grid-cols-1' :
                                            completedSubmissions.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                                                'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                                        }`}>
                                        {completedSubmissions.map(sub => {
                                            const isEvaluated = sub.status === 'evaluated';

                                            return (
                                                <div
                                                    key={sub._id}
                                                    onClick={(e) => {
                                                        console.log("Card clicked, navigating to result:", sub._id);
                                                        navigate(`/student/test-result/${sub._id}`);
                                                    }}
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
                                                            <div className="bg-[#1E293B] p-2 rounded-xl flex items-center justify-center">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setInfoModalData(sub.test);
                                                                    }}
                                                                    className={`${isEvaluated ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-[#FFE4E6] text-[#E11D48] hover:bg-[#FECDD3]'} px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all`}
                                                                >
                                                                    {isEvaluated ? 'View Feedback' : 'Relevant Information'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── DEFAULT / NO SELECTION ──────────────────── */}
                        {!viewMode && (
                            <div className="h-full flex items-center justify-center">
                                <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 max-w-lg w-full text-center">
                                    <h2 className="text-2xl font-bold text-slate-500 mb-4">Welcome Back!</h2>
                                    <p className="text-slate-400 leading-relaxed">
                                        Select <span className="font-bold text-orange-500">Pending</span> to see tests you need to attempt or <span className="font-bold text-emerald-600">Completed</span> to see submitted tests.
                                    </p>
                                </div>
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
                                    <Menu size={20} className="rotate-45" /> {/* Use Menu icon or a proper X if available, keeping style consistent */}
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
