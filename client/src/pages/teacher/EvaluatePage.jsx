import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, ChevronDown, ChevronUp, User, BookOpen,
    CheckCircle2, Clock, Mic, Video, FileText, Star, MessageSquare, Info, RefreshCw, Send
} from 'lucide-react';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import { useUserProfile } from '../../components/common/UserProfileContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const EvaluatePage = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const { id } = useParams();

    const role = userInfo?.role || 'Teacher';
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(id || null);
    const [marks, setMarks] = useState({});     // submissionId -> { qIdx -> marks }
    const [feedback, setFeedback] = useState({}); // submissionId -> { qIdx -> feedback }
    const [saving, setSaving] = useState(null);
    const [showInfo, setShowInfo] = useState(false);
    const [collapsedFeedback, setCollapsedFeedback] = useState({}); // subId-qi -> boolean
    const { openProfile } = useUserProfile();

    useEffect(() => {
        const fetchSubmissions = async () => {
            if (!userInfo) return;
            setLoading(true);
            try {
                if (id) {
                    console.log("Fetching single submission:", id);
                    const res = await axios.get(`/api/submissions/${id}`);
                    setSubmissions([res.data]);
                    setExpandedId(id);
                } else {
                    console.log("Fetching all submissions");
                    const res = await axios.get('/api/submissions');
                    setSubmissions(res.data);
                }
            } catch (err) {
                console.error('Error fetching submissions:', err);
                toast.error('Failed to load submission data.');
            } finally {
                setLoading(false);
            }
        };
        fetchSubmissions();
    }, [id]);

    const setMark = (subId, qIdx, val) => {
        setMarks(prev => ({
            ...prev,
            [subId]: { ...(prev[subId] || {}), [qIdx]: val }
        }));
    };

    const setFeedbackText = (subId, qIdx, val) => {
        setFeedback(prev => ({
            ...prev,
            [subId]: { ...(prev[subId] || {}), [qIdx]: val }
        }));
    };

    const saveSingleFeedback = async (submission, qIdx) => {
        try {
            setSaving(`${submission._id}-${qIdx}`);


            const answersPayload = submission.answers.map((a, i) => ({
                marks: i === qIdx ? parseInt(marks[submission._id]?.[i] ?? a.marks ?? 0) : a.marks,
                feedback: i === qIdx ? (feedback[submission._id]?.[i] ?? '') : ''
            }));

            const total = answersPayload.reduce((sum, a) => sum + (a.marks || 0), 0);

            const res = await axios.put(`/api/submissions/${submission._id}/evaluate`, {
                answers: answersPayload,
                totalMarks: total
            });

            setSubmissions(prev => prev.map(s => s._id === submission._id ? res.data : s));

            setFeedback(prev => ({
                ...prev,
                [submission._id]: { ...(prev[submission._id] || {}), [qIdx]: '' }
            }));

            toast.success('Feedback sent!');
        } catch (err) {
            console.error('Single evaluate error:', err);
            toast.error('Error sending feedback.');
        } finally {
            setSaving(null);
        }
    };

    const submitEvaluation = async (submission) => {
        try {
            setSaving(submission._id);


            const answersPayload = submission.answers.map((a, i) => ({
                marks: parseInt(marks[submission._id]?.[i] ?? a.marks ?? 0),
                feedback: feedback[submission._id]?.[i] ?? a.feedback ?? ''
            }));

            const total = answersPayload.reduce((sum, a) => sum + (a.marks || 0), 0);

            const res = await axios.put(`/api/submissions/${submission._id}/evaluate`, {
                answers: answersPayload,
                totalMarks: total
            });

            // Update local state with fresh data from server
            setSubmissions(prev => prev.map(s =>
                s._id === submission._id ? res.data : s
            ));

            // Clear feedback inputs for this submission
            setFeedback(prev => ({
                ...prev,
                [submission._id]: {}
            }));

            toast.success('Evaluation updated!');

            // Redirect back to activities after final evaluation
            setTimeout(() => {
                navigate('/teacher/activities');
            }, 1000);
        } catch (err) {
            console.error('Evaluate error:', err);
            toast.error('Error saving evaluation.');
        } finally {
            setSaving(null);
        }
    };

    if (loading) return (
        <DashboardLayout role={role}>
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-white rounded-xl shadow-sm border border-slate-100 transition-all text-slate-500 hover:text-indigo-600">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Test Evaluations</h1>
            </div>
            <LoadingPlaceholder type="test" />
        </DashboardLayout>
    );

    return (
        <DashboardLayout role={role}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 transition-all text-slate-500 hover:text-indigo-600 hover:shadow-md">
                        <ArrowLeft size={22} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Test Evaluations</h1>
                        <p className="text-slate-500 text-sm font-medium">
                            {id ? 1 : submissions.length} total submission{(!id && submissions.length !== 1) ? 's' : ''}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setShowInfo(!showInfo)}
                        className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${showInfo ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-md' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50'}`}
                    >
                        <Info size={14} /> System Info
                    </button>
                    <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                        <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold">
                            {submissions.filter(s => s.status === 'submitted').length} Pending
                        </span>
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold">
                            {submissions.filter(s => s.status === 'evaluated').length} Done
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
                {showInfo && submissions.length > 0 && (
                    <div className="bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 p-6 animate-fade-in relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 -mr-16 -mt-16 rounded-full"></div>
                        <div className="relative z-10">
                            <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest block mb-1 opacity-70">Activity Identity</span>
                            <span className="text-white font-black text-lg">
                                {submissions[0].test?.index || 'No Index'}
                            </span>
                        </div>
                    </div>
                )}

                {submissions.length === 0 && (
                    <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-100">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileText size={32} className="text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No Submissions Yet</h3>
                        <p className="text-slate-500 font-medium max-w-xs mx-auto text-sm">Waiting for students to complete and submit their tests.</p>
                    </div>
                )}

                {submissions
                    .filter(sub => !id || sub._id === id)
                    .map((sub) => (
                        <div key={sub._id} className={`bg-white rounded-3xl shadow-sm border overflow-hidden transition-all duration-300 ${sub.status === 'evaluated' ? 'border-emerald-100 hover:border-emerald-200' : 'border-slate-100 hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/5'}`}>
                            {/* Submission Header */}
                            <div
                                className="p-6 flex items-center justify-between cursor-pointer group"
                                onClick={() => setExpandedId(expandedId === sub._id ? null : sub._id)}
                            >
                                <div className="flex items-center gap-5">
                                    <div
                                        className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg ring-4 ring-slate-50 group-hover:scale-105 transition-transform duration-300"
                                        onClick={(e) => { e.stopPropagation(); openProfile(sub.student?._id || sub.student); }}
                                    >
                                        {sub.studentName?.[0] || sub.student?.name?.[0] || 'S'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p
                                                className="font-black text-slate-900 text-lg group-hover:text-indigo-600 transition-colors"
                                                onClick={(e) => { e.stopPropagation(); openProfile(sub.student?._id || sub.student); }}
                                            >
                                                {sub.studentName || sub.student?.name}
                                            </p>
                                            {sub.answers.some(a => a.studentComment) && (
                                                <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[9px] font-black uppercase tracking-tighter animate-pulse">
                                                    <MessageSquare size={10} fill="currentColor" /> Student Note
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <BookOpen size={12} className="text-indigo-400" /> {sub.test?.title || 'Test'}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                                                <Clock size={12} className="text-indigo-400" /> {new Date(sub.submittedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    {sub.status === 'evaluated' && (
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-emerald-600 leading-none">{sub.totalMarks}</p>
                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Final Score</p>
                                        </div>
                                    )}
                                    <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${sub.status === 'evaluated' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                        {sub.status === 'evaluated' ? 'PASSED' : 'PENDING'}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                        {expandedId === sub._id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Answers */}
                            {expandedId === sub._id && (
                                <div className="border-t border-slate-50 p-6 space-y-8 bg-slate-50/30">
                                    {sub.answers.map((ans, qi) => (
                                        <div key={qi} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm relative group overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="flex-1 pr-4">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="w-6 h-6 bg-slate-900 text-white rounded-md flex items-center justify-center text-[10px] font-bold">Q{qi + 1}</span>
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[9px] font-bold uppercase tracking-widest border border-slate-200">{ans.questionType}</span>
                                                    </div>
                                                    <h4 className="font-bold text-slate-800 text-base leading-snug">{ans.questionText}</h4>
                                                </div>
                                            </div>

                                            <div className="space-y-4 mb-8">
                                                {/* Text Answer */}
                                                {ans.textAnswer && (
                                                    <div className="p-5 bg-white rounded-2xl border border-slate-100 ring-1 ring-slate-50">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <FileText size={14} className="text-indigo-500" />
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Student Response</span>
                                                        </div>
                                                        <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">{ans.textAnswer}</div>
                                                    </div>
                                                )}

                                                {/* Audio Answer */}
                                                {ans.audioData && (
                                                    <div className="p-5 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Mic size={14} className="text-indigo-600" />
                                                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em]">Voice Feedback</span>
                                                        </div>
                                                        <audio controls src={ans.audioData} className="w-full h-10" />
                                                    </div>
                                                )}

                                                {/* Video Answer */}
                                                {ans.videoData && (
                                                    <div className="p-5 bg-purple-50/30 rounded-2xl border border-purple-100/50">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Video size={14} className="text-purple-600" />
                                                            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-[0.2em]">Video Capture</span>
                                                        </div>
                                                        <video controls src={ans.videoData} className="w-full rounded-xl max-h-72 shadow-lg" />
                                                    </div>
                                                )}

                                                {!ans.textAnswer && !ans.audioData && !ans.videoData && (
                                                    <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No Response Provided</p>
                                                    </div>
                                                )}

                                                {/* Conversation Thread Display */}
                                                {(sub.status === 'evaluated' || marks[sub._id]?.[qi] || feedback[sub._id]?.[qi] || (ans.conversation && ans.conversation.length > 0)) ? (
                                                    <div className="mt-8 space-y-4">
                                                        <div
                                                            className="flex items-center justify-between mb-2 cursor-pointer group/toggle"
                                                            onClick={() => setCollapsedFeedback(prev => ({ ...prev, [`${sub._id}-${qi}`]: !prev[`${sub._id}-${qi}`] }))}
                                                        >
                                                            <div className="flex items-center gap-2 text-slate-400 group-hover/toggle:text-indigo-600 transition-colors">
                                                                <MessageSquare size={12} />
                                                                <span className="text-[9px] font-black uppercase tracking-widest">Feedback History</span>
                                                            </div>
                                                            <div className="px-2 py-1 bg-slate-100 rounded-md text-[8px] font-bold text-slate-500 uppercase group-hover/toggle:bg-indigo-50 group-hover/toggle:text-indigo-600 transition-all flex items-center gap-1">
                                                                {!collapsedFeedback[`${sub._id}-${qi}`] ? (
                                                                    <><ChevronDown size={10} /> Show Conversation</>
                                                                ) : (
                                                                    <><ChevronUp size={10} /> Hide Conversation</>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {collapsedFeedback[`${sub._id}-${qi}`] && (
                                                            <div className="space-y-4 animate-fade-in">
                                                                {/* Conversation History */}
                                                                {(ans.conversation || []).map((msg, mi) => (
                                                                    <div
                                                                        key={mi}
                                                                        className={`flex items-start gap-2 max-w-[90%] ${msg.role === 'Student' ? 'flex-row-reverse ml-auto' : ''}`}
                                                                    >
                                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-[10px] shrink-0 shadow-sm ${msg.role === 'Teacher' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                                                                            {msg.role === 'Teacher' ? 'T' : (sub.studentName?.[0]?.toUpperCase() || 'S')}
                                                                        </div>
                                                                        <div className={`p-3 rounded-xl shadow-sm border ${msg.role === 'Teacher'
                                                                            ? 'bg-indigo-50 border-indigo-100 rounded-tl-none'
                                                                            : 'bg-emerald-50 border-emerald-100 rounded-tr-none'
                                                                            }`}>
                                                                            <div className={`flex items-center gap-2 mb-1 ${msg.role === 'Student' ? 'justify-end' : ''}`}>
                                                                                <p className={`text-[8px] font-black uppercase tracking-widest ${msg.role === 'Teacher' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                                                                                    {msg.role === 'Teacher' ? 'Teacher' : (sub.studentName || 'Student')}
                                                                                </p>
                                                                                <span className="text-[7px] text-slate-400 font-bold">
                                                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                </span>
                                                                            </div>
                                                                            <p className={`text-xs text-slate-700 leading-relaxed font-medium ${msg.role === 'Student' ? 'text-right' : ''}`}>
                                                                                {msg.message}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ))}

                                                                {/* Teacher's Current Input Area */}
                                                                <div className="flex items-start gap-3 max-w-[95%] pt-2">
                                                                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm">
                                                                        T
                                                                    </div>
                                                                    <div className="bg-white border border-slate-200 rounded-2xl p-4 w-full shadow-sm">
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Add Note / Adjust Marks</p>
                                                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                                            <div className="md:col-span-1 space-y-1">
                                                                                <label className="text-[8px] font-bold text-slate-400 uppercase">Score</label>
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    value={marks[sub._id]?.[qi] ?? ans.marks ?? ''}
                                                                                    onChange={e => setMark(sub._id, qi, e.target.value)}
                                                                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                                                    placeholder="Marks"
                                                                                />
                                                                            </div>
                                                                            <div className="md:col-span-3 space-y-1">
                                                                                <label className="text-[8px] font-bold text-slate-400 uppercase">Next Feedback Note</label>
                                                                                <div className="relative">
                                                                                    <input
                                                                                        type="text"
                                                                                        value={feedback[sub._id]?.[qi] ?? ''}
                                                                                        onChange={e => setFeedbackText(sub._id, qi, e.target.value)}
                                                                                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 pr-10"
                                                                                        placeholder="Type notes for student..."
                                                                                    />
                                                                                    <button
                                                                                        onClick={() => saveSingleFeedback(sub, qi)}
                                                                                        disabled={saving === `${sub._id}-${qi}` || (!feedback[sub._id]?.[qi]?.trim() && marks[sub._id]?.[qi] === undefined)}
                                                                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
                                                                                    >
                                                                                        {saving === `${sub._id}-${qi}` ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    /* Initial Evaluation Input if nothing exists yet */
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-50">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                                                <Star size={12} className="text-amber-400" /> Score (Weightage)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={marks[sub._id]?.[qi] ?? ans.marks ?? ''}
                                                                onChange={e => setMark(sub._id, qi, e.target.value)}
                                                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all"
                                                                placeholder="0.0"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                                                <MessageSquare size={12} className="text-indigo-400" /> Improvement Feedback
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={feedback[sub._id]?.[qi] ?? ans.feedback ?? ''}
                                                                onChange={e => setFeedbackText(sub._id, qi, e.target.value)}
                                                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all"
                                                                placeholder="Type notes for student..."
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Save Evaluation Button */}
                                    <div className="flex justify-end pt-4">
                                        <button
                                            onClick={() => submitEvaluation(sub)}
                                            disabled={saving === sub._id}
                                            className={`px-10 py-4 font-black rounded-2xl transition-all shadow-xl hover:-translate-y-1 active:scale-95 disabled:opacity-60 flex items-center gap-3 tracking-widest text-xs uppercase ${sub.status === 'evaluated'
                                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200'
                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                                                }`}
                                        >
                                            {saving === sub._id ? (
                                                <RefreshCw size={18} className="animate-spin" />
                                            ) : (
                                                <>
                                                    <CheckCircle2 size={18} />
                                                    {sub.status === 'evaluated' ? 'UPDATE ASSESSMENT' : 'FINALIZE EVALUATION'}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
            </div>
            <style>{`
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </DashboardLayout >
    );
};

export default EvaluatePage;
