import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, ChevronDown, ChevronUp, User, BookOpen,
    CheckCircle2, Clock, Mic, Video, FileText, Star, MessageSquare, Info
} from 'lucide-react';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import { useUserProfile } from '../../components/common/UserProfileContext';

const EvaluatePage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(id || null);
    const [marks, setMarks] = useState({});     // submissionId -> { qIdx -> marks }
    const [feedback, setFeedback] = useState({}); // submissionId -> { qIdx -> feedback }
    const [saving, setSaving] = useState(null);
    const [showInfo, setShowInfo] = useState(false);
    const { openProfile } = useUserProfile();

    useEffect(() => {
        const fetchSubmissions = async () => {
            try {
                const userInfo = JSON.parse(localStorage.getItem('userInfo'));
                const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
                const res = await axios.get('/api/submissions', config);
                setSubmissions(res.data);
            } catch (err) {
                console.error('Error fetching submissions:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSubmissions();
    }, []);

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

    const submitEvaluation = async (submission) => {
        try {
            setSaving(submission._id);
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };

            const answersPayload = submission.answers.map((a, i) => ({
                marks: parseInt(marks[submission._id]?.[i] ?? a.marks ?? 0),
                feedback: feedback[submission._id]?.[i] ?? a.feedback ?? ''
            }));

            const total = answersPayload.reduce((sum, a) => sum + (a.marks || 0), 0);

            await axios.put(`/api/submissions/${submission._id}/evaluate`, {
                answers: answersPayload,
                totalMarks: total
            }, config);

            // Update local state
            setSubmissions(prev => prev.map(s =>
                s._id === submission._id
                    ? { ...s, status: 'evaluated', totalMarks: total, answers: s.answers.map((a, i) => ({ ...a, marks: answersPayload[i].marks, feedback: answersPayload[i].feedback })) }
                    : s
            ));
            toast.success('Evaluation saved successfully!');
        } catch (err) {
            console.error('Evaluate error:', err);
            toast.error('Error saving evaluation.');
        } finally {
            setSaving(null);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50">
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shadow-sm sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-slate-900">Test Evaluations</h1>
            </div>
            <LoadingPlaceholder type="test" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shadow-sm sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Test Evaluations</h1>
                    <p className="text-xs text-slate-500">{submissions.length} submission{submissions.length !== 1 ? 's' : ''} received</p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <button
                        onClick={() => setShowInfo(!showInfo)}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${showInfo ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600 border border-purple-100 hover:bg-purple-100'}`}
                    >
                        <Info size={14} /> Relevant Information
                    </button>
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                        {submissions.filter(s => s.status === 'submitted').length} Pending
                    </span>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                        {submissions.filter(s => s.status === 'evaluated').length} Evaluated
                    </span>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-6 space-y-4">
                {showInfo && submissions.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-l-4 border-purple-500 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in mb-6">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Activity Date</span>
                            <span className="text-slate-900 font-bold">{new Date(submissions[0].test?.date || submissions[0].test?.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Institute</span>
                            <span className="text-slate-900 font-bold">{submissions[0].test?.institute?.name || submissions[0].test?.institute || 'Digital Study Institute'}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Subject</span>
                            <span className="text-slate-900 font-bold">{submissions[0].test?.subject || 'Academic'}</span>
                        </div>
                    </div>
                )}

                {submissions.length === 0 && (
                    <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-slate-200">
                        <div className="text-5xl mb-4">📭</div>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">No Submissions Yet</h3>
                        <p className="text-slate-400">Student submissions will appear here once they complete their tests.</p>
                    </div>
                )}

                {submissions.map((sub) => (
                    <div key={sub._id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${sub.status === 'evaluated' ? 'border-emerald-200' : 'border-slate-200'}`}>
                        {/* Submission Header */}
                        <div
                            className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => setExpandedId(expandedId === sub._id ? null : sub._id)}
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-11 h-11 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm cursor-pointer hover:scale-110 transition-transform"
                                    onClick={(e) => { e.stopPropagation(); openProfile(sub.student?._id || sub.student); }}
                                >
                                    {sub.studentName?.[0] || sub.student?.name?.[0] || 'S'}
                                </div>
                                <div>
                                    <p
                                        className="font-bold text-slate-800 text-base cursor-pointer hover:text-indigo-600 transition-colors"
                                        onClick={(e) => { e.stopPropagation(); openProfile(sub.student?._id || sub.student); }}
                                    >
                                        {sub.studentName || sub.student?.name}
                                    </p>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                            <BookOpen size={11} /> {sub.test?.title || 'Test'}
                                        </span>
                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                            <Clock size={11} /> {new Date(sub.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {sub.status === 'evaluated' && (
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-emerald-600">{sub.totalMarks}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Marks</p>
                                    </div>
                                )}
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${sub.status === 'evaluated' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {sub.status === 'evaluated' ? '✓ Evaluated' : 'Pending'}
                                </span>
                                {expandedId === sub._id ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                            </div>
                        </div>

                        {/* Expanded Answers */}
                        {expandedId === sub._id && (
                            <div className="border-t border-slate-100 p-5 space-y-6 bg-slate-50/50">
                                {sub.answers.map((ans, qi) => (
                                    <div key={qi} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-bold text-slate-800 text-sm">Q{qi + 1}. {ans.questionText}</h4>
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">{ans.questionType}</span>
                                        </div>

                                        {/* Text Answer */}
                                        {ans.textAnswer && (
                                            <div className="mb-4 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <FileText size={13} className="text-indigo-500" />
                                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Text Answer</span>
                                                </div>
                                                <p className="text-slate-700 text-sm leading-relaxed">{ans.textAnswer}</p>
                                            </div>
                                        )}

                                        {/* Audio Answer */}
                                        {ans.audioData && (
                                            <div className="mb-4 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <Mic size={13} className="text-indigo-500" />
                                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Audio Answer</span>
                                                </div>
                                                <audio controls src={ans.audioData} className="w-full" />
                                            </div>
                                        )}

                                        {/* Video Answer */}
                                        {ans.videoData && (
                                            <div className="mb-4 p-4 bg-purple-50/50 rounded-lg border border-purple-100">
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <Video size={13} className="text-purple-500" />
                                                    <span className="text-xs font-bold text-purple-600 uppercase tracking-wide">Video Answer</span>
                                                </div>
                                                <video controls src={ans.videoData} className="w-full rounded-lg max-h-56" />
                                            </div>
                                        )}

                                        {!ans.textAnswer && !ans.audioData && !ans.videoData && (
                                            <p className="text-sm text-slate-400 italic py-2">No answer provided.</p>
                                        )}

                                        {/* Marks & Feedback */}
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-1">
                                                    <Star size={12} /> Marks
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={marks[sub._id]?.[qi] ?? ans.marks ?? ''}
                                                    onChange={e => setMark(sub._id, qi, e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-bold focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none transition-all"
                                                    placeholder="Enter marks"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1 mb-1">
                                                    <MessageSquare size={12} /> Feedback
                                                </label>
                                                <input
                                                    type="text"
                                                    value={feedback[sub._id]?.[qi] ?? ans.feedback ?? ''}
                                                    onChange={e => setFeedbackText(sub._id, qi, e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none transition-all"
                                                    placeholder="Add feedback for student..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Save Evaluation Button */}
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={() => submitEvaluation(sub)}
                                        disabled={saving === sub._id}
                                        className="px-8 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all shadow-md disabled:opacity-60 flex items-center gap-2"
                                    >
                                        {saving === sub._id ? 'Saving...' : <><CheckCircle2 size={16} /> Save Evaluation</>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <style>{`
                .animate-fade-in { animation: fadeIn 0.3s ease-out; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default EvaluatePage;
