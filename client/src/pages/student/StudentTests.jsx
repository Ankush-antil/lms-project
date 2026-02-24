import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import {
    Search, CheckCircle, Hourglass, MoreVertical, BookOpen,
    Mic, Video, FileText, Star, MessageSquare, ChevronDown, ChevronUp,
    Menu, Bell, RotateCcw, User, Play
} from 'lucide-react';

const StudentTests = () => {
    const navigate = useNavigate();
    const [tests, setTests] = useState([]);
    const [submissions, setSubmissions] = useState([]); // student's own submissions
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [viewMode, setViewMode] = useState(null); // 'pending' | 'completed' | null
    const [hiddenActivities, setHiddenActivities] = useState({});
    const [showRelevantInfo, setShowRelevantInfo] = useState(false);
    const [expandedResult, setExpandedResult] = useState(null); // submission._id expanded in completed view

    useEffect(() => {
        const fetch = async () => {
            try {
                const userInfo = JSON.parse(localStorage.getItem('userInfo'));
                if (!userInfo) return;
                const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };

                // Fetch tests AND student's own submissions in parallel
                const [testsRes, subsRes] = await Promise.all([
                    axios.get('/api/tests', config),
                    axios.get('/api/submissions', config)
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

    // Group tests by Assigned Date
    const dynamicInboxItems = useMemo(() => {
        const grouped = tests.reduce((acc, test) => {
            const dateStr = test.date ? new Date(test.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No Date';
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(test);
            return acc;
        }, {});

        return Object.keys(grouped)
            .sort((a, b) => new Date(b) - new Date(a)) // Sort by date descending
            .map(dateStr => ({
                id: dateStr,
                title: dateStr,
                // Done = tests in this date that have a submission
                completed: grouped[dateStr].filter(t => submittedTestIds.has(t._id)).length,
                // Pending = tests with no submission yet
                pending: grouped[dateStr].filter(t => !submittedTestIds.has(t._id)).length,
                tests: grouped[dateStr]
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
                        <h2 className="font-bold text-slate-800 text-lg mb-4">Academic Days</h2>
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
                                            <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-bold border border-indigo-100 uppercase tracking-tighter">Date</span>
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
                                        <h2 className="font-bold text-lg">Assigned Date: {selectedGroup?.title} ({viewMode === 'pending' ? 'Pending' : 'Completed'})</h2>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/20 rounded-full flex items-center px-3 py-1.5 gap-2 border border-white/30">
                                            <Search size={16} />
                                            <input type="text" placeholder="Search" className="bg-transparent border-none text-white placeholder-red-100 text-sm focus:ring-0 w-24 md:w-40" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 border-red-500 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Created Date</span>
                                        <span className="text-slate-900 font-bold">{selectedGroup?.tests?.[0]?.createdAt ? new Date(selectedGroup.tests[0].createdAt).toLocaleDateString('en-GB') : 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Institute</span>
                                        <span className="text-slate-900 font-bold">{selectedGroup?.tests?.[0]?.institute || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Course</span>
                                        <span className="text-slate-900 font-bold">{selectedGroup?.tests?.[0]?.course || 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group flex items-center justify-between gap-3 ring-2 ring-transparent hover:ring-indigo-100"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-slate-800 group-hover:bg-indigo-500 transition-colors"></div>
                                                    <div>
                                                        <span className="font-semibold text-slate-700 group-hover:text-indigo-700 block">{test.title}</span>
                                                        <span className="text-xs text-slate-400">{test.subject} · {test.questions?.length || 0} Qs</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Assigned Date</span>
                                                    <span className="text-[10px] text-indigo-600 font-bold">{test.date ? new Date(test.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No Date'}</span>
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
                                        <h2 className="font-bold text-lg">Assigned Date: {selectedGroup?.title} (Completed)</h2>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 border-emerald-500 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Created Date</span>
                                        <span className="text-slate-900 font-bold">{selectedGroup?.tests?.[0]?.createdAt ? new Date(selectedGroup.tests[0].createdAt).toLocaleDateString('en-GB') : 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Institute</span>
                                        <span className="text-slate-900 font-bold">{selectedGroup?.tests?.[0]?.institute || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Course</span>
                                        <span className="text-slate-900 font-bold">{selectedGroup?.tests?.[0]?.course || 'N/A'}</span>
                                    </div>
                                </div>

                                {completedSubmissions.length === 0 ? (
                                    <div className="py-16 text-center">
                                        <div className="text-5xl mb-3">📋</div>
                                        <p className="font-bold text-slate-700 text-lg">No submissions yet</p>
                                        <p className="text-slate-400 text-sm mt-1">Submit a test to see it here.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {completedSubmissions.map(sub => {
                                            const isEvaluated = sub.status === 'evaluated';
                                            const isExpanded = expandedResult === sub._id;

                                            return (
                                                <div key={sub._id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${isEvaluated ? 'border-emerald-200' : 'border-slate-200'}`}>
                                                    {/* Submission card header */}
                                                    <div
                                                        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                                        onClick={() => setExpandedResult(isExpanded ? null : sub._id)}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm text-lg ${isEvaluated ? 'bg-emerald-500' : 'bg-indigo-400'}`}>
                                                                {isEvaluated ? '✓' : '⏳'}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-800">{sub.test?.title || 'Test'}</p>
                                                                <p className="text-xs text-slate-400 mt-0.5">
                                                                    Submitted {new Date(sub.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                    {isEvaluated && ` · ${sub.answers?.length || 0} questions evaluated`}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            {isEvaluated && (
                                                                <div className="text-center">
                                                                    <p className="text-xl font-bold text-emerald-600">{sub.totalMarks}</p>
                                                                    <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Total Marks</p>
                                                                </div>
                                                            )}
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${isEvaluated ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                {isEvaluated ? '✓ Evaluated' : 'Awaiting Evaluation'}
                                                            </span>
                                                            {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                                        </div>
                                                    </div>

                                                    {/* Expanded: answers + marks + feedback */}
                                                    {isExpanded && (
                                                        <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4">
                                                            {sub.answers?.map((ans, qi) => (
                                                                <div key={qi} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                                                    <div className="flex justify-between items-start mb-3">
                                                                        <h4 className="font-bold text-slate-800 text-sm">Q{qi + 1}. {ans.questionText}</h4>
                                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">{ans.questionType}</span>
                                                                    </div>

                                                                    {/* Student's answer */}
                                                                    {ans.textAnswer && (
                                                                        <div className="mb-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                                <FileText size={12} className="text-indigo-500" />
                                                                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">Your Answer</span>
                                                                            </div>
                                                                            <p className="text-slate-700 text-sm">{ans.textAnswer}</p>
                                                                        </div>
                                                                    )}
                                                                    {ans.audioData && (
                                                                        <div className="mb-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                                                                            <div className="flex items-center gap-1.5 mb-2">
                                                                                <Mic size={12} className="text-indigo-500" />
                                                                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">Your Audio Answer</span>
                                                                            </div>
                                                                            <audio controls src={ans.audioData} className="w-full" />
                                                                        </div>
                                                                    )}
                                                                    {ans.videoData && (
                                                                        <div className="mb-3 p-3 bg-purple-50/50 rounded-lg border border-purple-100">
                                                                            <div className="flex items-center gap-1.5 mb-2">
                                                                                <Video size={12} className="text-purple-500" />
                                                                                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">Your Video Answer</span>
                                                                            </div>
                                                                            <video controls src={ans.videoData} className="w-full rounded-lg max-h-40" />
                                                                        </div>
                                                                    )}

                                                                    {/* Teacher evaluation (marks + feedback) */}
                                                                    {isEvaluated && (
                                                                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                                                                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-center gap-2">
                                                                                <Star size={14} className="text-amber-500 shrink-0" fill="currentColor" />
                                                                                <div>
                                                                                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Marks</p>
                                                                                    <p className="text-lg font-bold text-slate-800">{ans.marks ?? 0}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-start gap-2">
                                                                                <MessageSquare size={14} className="text-blue-500 shrink-0 mt-0.5" />
                                                                                <div>
                                                                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Teacher Feedback</p>
                                                                                    <p className="text-sm text-slate-700 mt-0.5">{ans.feedback || <span className="italic text-slate-400">No feedback added</span>}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {!isEvaluated && (
                                                                        <div className="mt-3 pt-3 border-t border-slate-100">
                                                                            <p className="text-xs text-amber-500 font-semibold flex items-center gap-1">
                                                                                ⏳ Marks and feedback will appear here once your teacher evaluates this answer.
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
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
        </DashboardLayout>
    );
};

export default StudentTests;
