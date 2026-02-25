import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
    Info, FileText, CheckCircle, Clock, ChevronLeft,
    Mic, Video, Star, MessageSquare, RefreshCw, User, Send
} from 'lucide-react';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import toast from 'react-hot-toast';

const ViewTestResult = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showInfo, setShowInfo] = useState(false);
    const [studentComments, setStudentComments] = useState({}); // idx -> comment
    const [savingComments, setSavingComments] = useState(false);
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const isTeacher = userInfo?.role === 'Teacher';

    useEffect(() => {
        const fetchSubmission = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${userInfo?.token}` } };
                const res = await axios.get(`/api/submissions/${id}`, config);
                setSubmission(res.data);
                setLoading(false);
            } catch (error) {
                console.error("[ViewTestResult] Error fetching submission:", error);
                setLoading(false);
            }
        };
        if (id && userInfo?.token) fetchSubmission();
    }, [id, userInfo?.token]);

    useEffect(() => {
        if (submission && Object.keys(studentComments).length === 0) {
            const initial = {};
            submission.answers.forEach((ans, idx) => {
                initial[idx] = '';
            });
            setStudentComments(initial);
        }
    }, [submission]);

    const saveStudentComments = async (idx) => {
        try {
            setSavingComments(true);
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
            const isGlobalSave = idx === undefined || idx === null || typeof idx !== 'number';

            // Send the updated comments to the backend
            const answersPayload = submission.answers.map((ans, i) => {
                // If it's a global save, take whatever is in the input box for that question.
                // If it's a specific question send, only take that one.
                const comment = isGlobalSave ? studentComments[i] : (i === idx ? studentComments[i] : '');
                return { studentComment: comment?.trim() || '' };
            });

            // Filter to only questions that actually have a new comment to send
            const hasNewComments = answersPayload.some(a => a.studentComment);

            if (hasNewComments) {
                await axios.put(`/api/submissions/${id}/student-comment`, { answers: answersPayload }, config);
            }

            toast.success(isGlobalSave ? 'All comments saved!' : 'Response sent!');

            // Update local submission state to reflect the new comments
            setSubmission(prev => {
                const newAnswers = [...prev.answers];
                if (isGlobalSave) {
                    newAnswers.forEach((ans, i) => {
                        if (studentComments[i]?.trim()) {
                            const newConversation = [...(ans.conversation || [])];
                            newConversation.push({
                                role: 'Student',
                                message: studentComments[i].trim(),
                                timestamp: new Date().toISOString()
                            });
                            newAnswers[i] = { ...ans, conversation: newConversation };
                        }
                    });
                } else {
                    const newConversation = [...(newAnswers[idx].conversation || [])];
                    newConversation.push({
                        role: isTeacher ? 'Teacher' : 'Student',
                        message: studentComments[idx],
                        timestamp: new Date().toISOString()
                    });
                    newAnswers[idx] = { ...newAnswers[idx], conversation: newConversation };
                }
                return { ...prev, answers: newAnswers };
            });

            // Clear the relevant input boxes
            if (isGlobalSave) {
                setStudentComments({});
                // Redirect student after global save
                setTimeout(() => navigate('/student/tests'), 1000);
            } else {
                setStudentComments(prev => ({ ...prev, [idx]: '' }));
            }

        } catch (error) {
            console.error("Error sending student response:", error);
            toast.error('Failed to send response');
        } finally {
            setSavingComments(false);
        }
    };

    if (loading) return <LoadingPlaceholder type="test" />;
    if (!submission) return <div className="p-10 text-center">Submission not found.</div>;

    const test = submission.test;
    const isEvaluated = submission.status === 'evaluated';
    const answers = submission.answers || [];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="bg-[#6F42C1] px-4 md:px-6 py-4 flex flex-col md:flex-row items-center justify-between shadow-md z-10 gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button
                        onClick={() => {
                            console.log("Navigating back to tests");
                            navigate('/student/tests');
                        }}
                        className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div className="flex items-center gap-3">
                        <span className="text-white/80 font-bold text-lg">Result:</span>
                        <h2 className="text-white font-bold text-lg truncate">{test?.title || 'Test Result'}</h2>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowInfo(!showInfo)}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all shadow-sm ${showInfo ? 'bg-white text-indigo-600' : 'bg-white/20 text-white border border-white/30 hover:bg-white/30'}`}
                    >
                        <Info size={14} /> Relevant Information
                    </button>
                    {JSON.parse(localStorage.getItem('userInfo'))?.role === 'Teacher' && (
                        <button
                            onClick={() => navigate(`/teacher/evaluate/${id}`)}
                            className="bg-amber-500 hover:bg-amber-600 px-4 py-1.5 rounded-full text-white font-black text-sm border-2 border-white shadow-sm flex items-center gap-2 transition-all active:scale-95"
                        >
                            <RefreshCw size={14} /> {isEvaluated ? 'Re-evaluate Test' : 'Evaluate Test'}
                        </button>
                    )}
                    {isEvaluated && userInfo?.role === 'Student' && (
                        <div className="bg-emerald-500 px-4 py-1.5 rounded-full text-white font-black text-sm border-2 border-white shadow-sm flex items-center gap-2">
                            <Star size={14} fill="white" /> {submission.totalMarks} Marks
                        </div>
                    )}
                    {isEvaluated && !isTeacher && (
                        <button
                            onClick={saveStudentComments}
                            disabled={savingComments}
                            className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-full text-white font-black text-sm shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {savingComments ? 'Saving...' : 'Save Comments'}
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 space-y-6 pb-24 max-w-5xl mx-auto w-full">

                {showInfo && (
                    <div className="bg-white rounded-xl shadow-lg border-l-4 border-indigo-500 p-8 animate-fade-in text-slate-800">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Institute</span>
                                <span className="font-bold text-slate-900">{test?.institute || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Course</span>
                                <span className="font-bold text-slate-900">{test?.course || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Subject</span>
                                <span className="font-bold text-slate-900">{test?.subject || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Date</span>
                                <span className="font-bold text-slate-900">{test?.date || (test?.createdAt ? new Date(test.createdAt).toLocaleDateString('en-GB') : 'N/A')}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Test Index</span>
                                <span className="font-bold text-slate-900">{test?.index || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Activity Type</span>
                                <span className="font-bold text-slate-900">{test?.activity || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-8">
                    {answers.length === 0 ? (
                        <div className="bg-white p-10 rounded-2xl text-center text-slate-400 font-medium border-2 border-dashed">
                            No answers found for this submission.
                        </div>
                    ) : (
                        answers.map((ans, idx) => {
                            const type = ans.questionType?.toLowerCase();
                            const isAudio = type?.includes('voice') || type?.includes('audio') || type?.includes('mic');
                            const isVideo = type?.includes('video') || type?.includes('cam');

                            return (
                                <div key={idx} className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col md:flex-row transition-all border-slate-200`}>
                                    <div className={`w-full md:w-2 ${isEvaluated ? 'bg-emerald-500' : 'bg-[#00A36C]'}`}></div>

                                    <div className="flex-1 p-6">
                                        <div className="flex justify-between items-start mb-6">
                                            <h3 className="text-xl font-bold text-slate-800">Q{idx + 1}. {ans.questionText || "Question"}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-wider">{ans.questionType || "Short Answer"}</span>
                                            </div>
                                        </div>

                                        {/* Submissions Details */}
                                        <div className="space-y-4 mb-6">
                                            {ans.textAnswer && (
                                                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <FileText size={14} className="text-indigo-600" />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your Answer</span>
                                                    </div>
                                                    <p className="whitespace-pre-wrap">{ans.textAnswer}</p>
                                                </div>
                                            )}

                                            {ans.audioData && (
                                                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Mic size={14} className="text-indigo-600" />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your Audio Answer</span>
                                                    </div>
                                                    <audio controls src={ans.audioData} className="w-full" />
                                                </div>
                                            )}

                                            {ans.videoData && (
                                                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Video size={14} className="text-indigo-600" />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your Video Answer</span>
                                                    </div>
                                                    <video controls src={ans.videoData} className="w-full rounded-lg max-h-64" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Conversation Thread */}
                                        {isEvaluated && (
                                            <div className="mt-8 pt-8 border-t border-slate-100">
                                                <div className="flex items-center gap-2 mb-6 text-slate-400">
                                                    <MessageSquare size={16} />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Feedback Conversation</span>
                                                </div>

                                                <div className="space-y-6">
                                                    {/* Conversation History */}
                                                    {(ans.conversation || []).map((msg, mi) => (
                                                        <div
                                                            key={mi}
                                                            className={`flex items-start gap-3 max-w-[85%] ${msg.role === 'Student' ? 'flex-row-reverse ml-auto' : ''}`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm ${msg.role === 'Teacher' ? 'bg-indigo-600' : 'bg-purple-600'}`}>
                                                                {msg.role === 'Teacher' ? 'T' : (submission.studentName?.[0]?.toUpperCase() || 'S')}
                                                            </div>
                                                            <div className={`rounded-2xl p-4 shadow-sm ${msg.role === 'Teacher'
                                                                ? 'bg-blue-50 border border-blue-100 rounded-tl-none'
                                                                : 'bg-purple-50 border border-purple-100 rounded-tr-none'
                                                                }`}>
                                                                <div className={`flex items-center gap-2 mb-1 ${msg.role === 'Student' ? 'justify-end' : ''}`}>
                                                                    <p className={`text-[8px] font-black uppercase tracking-widest ${msg.role === 'Teacher' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                                                                        {msg.role === 'Teacher' ? 'Teacher' : (submission.studentName || 'Student')}
                                                                    </p>
                                                                    <span className="text-[8px] text-slate-400 font-bold italic">
                                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                                <p className={`text-sm text-slate-700 leading-relaxed font-medium ${msg.role === 'Student' ? 'text-right' : ''}`}>
                                                                    {msg.message}
                                                                </p>
                                                                {msg.role === 'Teacher' && mi === 0 && (
                                                                    <div className="mt-2 flex items-center gap-1.5">
                                                                        <Star size={10} className="text-amber-500" fill="currentColor" />
                                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Initial Score: {ans.marks ?? 0}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Dynamic Chat Input Box */}
                                                    <div className={`flex items-start gap-3 max-w-[85%] ${!isTeacher ? 'flex-row-reverse ml-auto' : ''}`}>
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 shadow-sm ${isTeacher ? 'bg-indigo-600 text-white' : 'bg-purple-600 text-white'}`}>
                                                            {isTeacher ? 'T' : (submission.studentName?.[0]?.toUpperCase() || 'S')}
                                                        </div>
                                                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm w-full relative">
                                                            <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${isTeacher ? 'text-blue-400' : 'text-slate-400 text-right'}`}>
                                                                {isTeacher ? 'Add further feedback' : 'Send another response'}
                                                            </p>
                                                            <textarea
                                                                className={`w-full bg-slate-50 border border-slate-50 rounded-xl p-3 pr-12 text-sm focus:ring-2 transition-all outline-none resize-none min-h-[60px] ${isTeacher ? 'focus:ring-blue-400' : 'focus:ring-indigo-400'}`}
                                                                placeholder={isTeacher ? "Type further notes..." : "Type your response here..."}
                                                                value={studentComments[idx] || ''}
                                                                onChange={(e) => setStudentComments(prev => ({ ...prev, [idx]: e.target.value }))}
                                                            />
                                                            <button
                                                                onClick={() => saveStudentComments(idx)}
                                                                disabled={savingComments || !studentComments[idx]?.trim()}
                                                                className={`absolute bottom-6 right-6 p-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${isTeacher ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                                            >
                                                                {savingComments ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {!isEvaluated && (
                                            <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-2">
                                                <Clock size={16} className="text-amber-500" />
                                                <p className="text-xs text-amber-700 font-bold uppercase tracking-wider">Awaiting Teacher Evaluation</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
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
        </div>
    );
};

export default ViewTestResult;
