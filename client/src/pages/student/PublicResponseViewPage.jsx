import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, AlertCircle, CheckCircle2, Printer, ArrowLeft, Calendar, Award, Volume2, Video, Sparkles } from 'lucide-react';

const PublicResponseViewPage = () => {
    const { submissionId } = useParams();
    const navigate = useNavigate();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [aiEvaluations, setAiEvaluations] = useState({});
    const [aiLoading, setAiLoading] = useState({});

    const handleCheckAi = async (questionId) => {
        try {
            setAiLoading(prev => ({ ...prev, [questionId]: true }));
            const res = await axios.post(`/api/public-tests/submission/${submissionId}/check-ai`, { questionId });
            if (res.data.success) {
                setAiEvaluations(prev => ({ ...prev, [questionId]: res.data }));
                toast.success("AI review generated successfully!");
            }
        } catch (err) {
            console.error("AI check error:", err);
            toast.error(err.response?.data?.message || 'Failed to check answer with AI.');
        } finally {
            setAiLoading(prev => ({ ...prev, [questionId]: false }));
        }
    };

    useEffect(() => {
        const fetchSubmission = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`/api/public-tests/submission/${submissionId}`);
                setSubmission(res.data);
            } catch (err) {
                console.error("Error fetching submission details:", err);
                setError(err.response?.data?.message || 'Failed to load your test responses.');
            } finally {
                setLoading(false);
            }
        };

        if (submissionId) {
            fetchSubmission();
        }
    }, [submissionId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                <span className="text-sm font-semibold text-slate-500">Loading your test responses...</span>
            </div>
        );
    }

    if (error || !submission) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-lg border border-slate-100 text-center space-y-6">
                    <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle size={36} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-slate-800">Error Loading Response</h2>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            {error || "We couldn't retrieve the details for this submission."}
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                        Back to Homepage
                    </button>
                </div>
            </div>
        );
    }

    const test = submission.test;
    const totalMarks = test?.questions?.reduce((sum, q) => sum + (q.marks || 1), 0) || submission.answers?.reduce((sum, a) => sum + (Number(a.marks) || 0), 0) || 10;
    const scorePct = Math.round(((submission.score || 0) / totalMarks) * 100);

    const handlePrint = () => {
        window.print();
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-slate-50/50 py-10 px-4 font-sans print:bg-white print:py-0">
            <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Back to Home & Print Actions */}
                <div className="flex justify-between items-center print:hidden">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-850 text-xs font-bold transition-all cursor-pointer"
                    >
                        <ArrowLeft size={16} />
                        <span>Go Back</span>
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    >
                        <Printer size={14} />
                        <span>Print Report</span>
                    </button>
                </div>

                {/* Score Summary Header */}
                <div className="bg-[#0b1329] text-white rounded-[32px] p-8 md:p-10 shadow-xl relative overflow-hidden print:bg-slate-900 print:text-black print:shadow-none print:border print:border-slate-250">
                    <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-[size:16px_16px] print:hidden" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-2">
                            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block print:text-indigo-600">Candidate Scorecard</span>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight">{test?.title || 'Public Assessment'}</h1>
                            <p className="text-xs text-slate-300 font-semibold print:text-slate-600">
                                Submitted on: {formatDate(submission.submittedAt)}
                            </p>
                        </div>
                        
                        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex items-center gap-4 shrink-0 print:bg-slate-50 print:border-slate-200">
                            <div className="relative w-16 h-16 rounded-full flex items-center justify-center border-4 border-indigo-400/30 font-mono text-center">
                                <span className="text-xl font-black text-white print:text-slate-900">{scorePct}%</span>
                            </div>
                            <div>
                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider block print:text-slate-500">Total Score</span>
                                <span className="text-2xl font-black text-white block mt-0.5 print:text-[#0b1329]">
                                    {submission.score} <span className="text-xs font-semibold text-slate-300 print:text-slate-500">/ {totalMarks} pts</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Candidate Metadata */}
                <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs font-semibold text-slate-650">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Candidate Details</span>
                        <span className="text-slate-800 font-bold block">{submission.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono block mt-0.5">{submission.email}</span>
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Contact Number</span>
                        <span className="text-slate-800 block">{submission.phone || 'N/A'}</span>
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Organization</span>
                        <span className="text-slate-800 block">{submission.organization || 'N/A'}</span>
                    </div>
                </div>

                {/* Questions & Responses */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-1">Response Details</h3>

                    {(() => {
                        const questionsList = test?.questions || submission.answers || [];
                        if (questionsList.length === 0) {
                            return (
                                <div className="bg-white p-8 rounded-2xl border border-slate-150 text-center text-slate-400 text-xs font-semibold">
                                    No questions found in this assessment response.
                                </div>
                            );
                        }

                        return questionsList.map((item, idx) => {
                            const isTestQuestion = !!item.text;
                            const qId = isTestQuestion ? item.id : item.questionId;
                            const qText = isTestQuestion ? item.text : item.questionText;
                            const qType = isTestQuestion ? item.type : item.questionType;
                            const totalQMarks = isTestQuestion ? (item.marks || 1) : 1;

                            const ans = submission.answers?.find(a => a.questionId === qId);
                            const marksEarned = ans?.marks || 0;
                            const isCorrect = Number(marksEarned) > 0;
                            const isChoice = ['multiple choice', 'dropdown', 'checkboxes'].includes(qType?.toLowerCase());

                            return (
                                <div 
                                    key={qId || idx} 
                                    className={`bg-white p-6 border rounded-2xl shadow-sm space-y-4 transition-all ${
                                        isChoice 
                                            ? isCorrect 
                                                ? 'border-emerald-150 bg-emerald-50/5' 
                                                : 'border-rose-150 bg-rose-50/5'
                                            : 'border-slate-150'
                                    }`}
                                >
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800">
                                                <span className="text-slate-450 mr-1.5 font-bold">Q{idx + 1}.</span> {qText}
                                            </h4>
                                            <span className="inline-block mt-2 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                                {qType || 'Answer'}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border ${
                                                isCorrect 
                                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                                                    : 'bg-rose-50 border-rose-100 text-rose-605'
                                            }`}>
                                                {marksEarned} / {totalQMarks} pts
                                            </span>
                                        </div>
                                    </div>

                                    {/* MCQ / checkboxes options */}
                                    {isChoice && isTestQuestion ? (
                                        <div className="space-y-2 pt-1">
                                            {item.options?.map((opt, oIdx) => {
                                                let isSelected = false;
                                                if (qType.toLowerCase() === 'checkboxes') {
                                                    let textAnswers = [];
                                                    if (Array.isArray(ans?.textAnswer)) {
                                                        textAnswers = ans.textAnswer;
                                                    } else if (typeof ans?.textAnswer === 'string') {
                                                        if (ans.textAnswer.startsWith('[')) {
                                                            try { textAnswers = JSON.parse(ans.textAnswer); } catch (e) { textAnswers = ans.textAnswer.split(','); }
                                                        } else {
                                                            textAnswers = ans.textAnswer.split(',');
                                                        }
                                                    }
                                                    isSelected = textAnswers.map(t => t?.trim()?.toLowerCase()).includes(opt.text?.trim()?.toLowerCase());
                                                } else {
                                                    isSelected = ans?.textAnswer?.trim()?.toLowerCase() === opt.text?.trim()?.toLowerCase();
                                                }

                                                const optCorrect = opt.isCorrect;

                                                let containerClass = 'border-slate-150 bg-slate-50/30 text-slate-600';
                                                let icon = <div className="w-4 h-4 rounded-full border border-slate-350" />;

                                                if (isSelected && optCorrect) {
                                                    containerClass = 'border-emerald-250 bg-emerald-50 text-emerald-900';
                                                    icon = (
                                                        <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                                                            ✓
                                                        </div>
                                                    );
                                                } else if (isSelected && !optCorrect) {
                                                    containerClass = 'border-rose-250 bg-rose-50 text-rose-900';
                                                    icon = (
                                                        <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">
                                                            ✗
                                                        </div>
                                                    );
                                                } else if (optCorrect) {
                                                    containerClass = 'border-emerald-150 bg-emerald-50/20 text-emerald-800';
                                                    icon = (
                                                        <div className="w-4 h-4 rounded-full border border-emerald-400 flex items-center justify-center text-[10px] text-emerald-605 font-bold">
                                                            ✓
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={oIdx} className={`flex items-center gap-3 p-3 border rounded-xl text-xs font-semibold ${containerClass}`}>
                                                        {icon}
                                                        <span className="flex-1">{opt.text}</span>
                                                        {isSelected && <span className="text-[9px] font-black uppercase tracking-wider bg-black/5 px-1.5 py-0.5 rounded">Selected</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="pt-1 text-xs">
                                            {ans?.audioData ? (
                                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Volume2 size={13} /> Voice Recording Response</span>
                                                    <audio src={ans.audioData} controls className="w-full max-w-md h-8 print:hidden" />
                                                    <p className="hidden print:block text-slate-500 italic">[Voice Recording Answered]</p>
                                                </div>
                                            ) : ans?.videoData ? (
                                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Video size={13} /> Video Recording Response</span>
                                                    <video src={ans.videoData} controls className="w-full max-w-md rounded-xl border border-slate-350 print:hidden" />
                                                    <p className="hidden print:block text-slate-500 italic">[Video Recording Answered]</p>
                                                </div>
                                            ) : (
                                                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Text Response</span>
                                                    <p className="text-slate-750 font-medium whitespace-pre-wrap">{ans?.textAnswer || 'No response submitted'}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* AI Evaluation Review Box */}
                                    {aiEvaluations[qId] && (
                                        <div className="mt-3 p-4 bg-indigo-50/30 border border-indigo-150 rounded-xl space-y-2 text-xs font-semibold relative overflow-hidden animate-slide-up">
                                            <div className="absolute top-0 right-0 p-3 text-indigo-300 pointer-events-none">
                                                <Sparkles size={40} className="opacity-15" />
                                            </div>
                                            
                                            <div className="flex items-center gap-2 text-indigo-800 font-extrabold">
                                                <Sparkles size={14} className="text-indigo-500" />
                                                <span>AI Check Results</span>
                                                <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                                    aiEvaluations[qId].isCorrect
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-rose-100 text-rose-800'
                                                }`}>
                                                    {aiEvaluations[qId].isCorrect ? 'Correct / Acceptable' : 'Incorrect / Needs Correction'}
                                                </span>
                                            </div>
                                            
                                            <p className="text-slate-650 leading-relaxed font-medium">
                                                {aiEvaluations[qId].feedback}
                                            </p>
                                            
                                            <div className="text-[10px] text-indigo-500 font-bold">
                                                Suggested Score: {aiEvaluations[qId].suggestedMarks} / {totalQMarks} pts
                                            </div>
                                        </div>
                                    )}

                                    {/* AI Check Button */}
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 print:hidden">
                                        <button
                                            type="button"
                                            onClick={() => handleCheckAi(qId)}
                                            disabled={aiLoading[qId]}
                                            className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                                        >
                                            {aiLoading[qId] ? (
                                                <Loader2 size={13} className="animate-spin text-indigo-500" />
                                            ) : (
                                                <Sparkles size={13} className="text-indigo-500" />
                                            )}
                                            <span>{aiEvaluations[qId] ? 'Recheck with AI' : 'Check with AI'}</span>
                                        </button>
                                    </div>

                                    {/* Evaluation Feedback */}
                                    {ans?.feedback && (
                                        <div className="mt-3 text-xs text-indigo-650 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 border-l-4 border-l-indigo-550 font-semibold">
                                            <span className="font-extrabold uppercase tracking-wide text-[10px] block mb-0.5">Evaluation Feedback</span>
                                            <p className="font-medium text-indigo-700">{ans.feedback}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        });
                    })()}
                </div>

            </div>
        </div>
    );
};

export default PublicResponseViewPage;
