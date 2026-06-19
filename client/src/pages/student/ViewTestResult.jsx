import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
    Info, FileText, CheckCircle, Clock, ChevronLeft,
    Mic, Video, Star, MessageSquare, RefreshCw, User, Send, ChevronDown, ChevronUp, Volume2,
    MoreVertical, ThumbsUp, ThumbsDown, Eye, EyeOff, Share2, Calendar, Cpu
} from 'lucide-react';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';

const getYouTubeId = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = String(url).match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
};

const getEmbedUrl = (url) => {
    if (!url) return '';
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&#?/]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    const loomMatch = url.match(/loom\.com\/share\/([a-f0-9]+)/);
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
    if (url.includes('embed') || url.includes('player')) return url;
    return url;
};

const ViewTestResult = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const { id } = useParams();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showInfo, setShowInfo] = useState(false);
    const [studentComments, setStudentComments] = useState({}); // idx -> comment
    const [savingComments, setSavingComments] = useState(false);
    const [collapsedFeedback, setCollapsedFeedback] = useState({}); // idx -> boolean
    const [collapsedQuestions, setCollapsedQuestions] = useState({}); // idx -> boolean
    const [collapsedToolbars, setCollapsedToolbars] = useState({}); // idx -> boolean
    const [pageContentHidden, setPageContentHidden] = useState(false);
    const [reactions, setReactions] = useState({});

    const isTeacher = userInfo?.role === 'Teacher' || userInfo?.role === 'Admin';

    // Read reactions from database on mount or when submission is loaded
    useEffect(() => {
        if (submission) {
            const initialReactions = {};
            submission.answers.forEach((ans, index) => {
                if (ans.reaction) {
                    initialReactions[index] = ans.reaction;
                }
            });
            setReactions(initialReactions);
        }
    }, [submission]);

    const handleToggleLike = async (index, type) => {
        const currentReaction = reactions[index];
        const newReaction = currentReaction === type ? '' : type;

        // Update UI state optimistically
        setReactions(prev => ({ ...prev, [index]: newReaction }));

        try {
            // Prepare payload containing the updated reaction for the target question index
            const answersPayload = submission.answers.map((ans, i) => {
                return {
                    reaction: i === index ? newReaction : (reactions[i] || '')
                };
            });

            await axios.put(`/api/submissions/${id}/student-comment`, { answers: answersPayload });

            // Sync updated reaction inside the main submission state
            setSubmission(prev => {
                const newAnswers = [...prev.answers];
                if (newAnswers[index]) {
                    newAnswers[index] = { ...newAnswers[index], reaction: newReaction };
                }
                return { ...prev, answers: newAnswers };
            });
        } catch (error) {
            console.error("Error saving student reaction:", error);
            toast.error('Failed to save reaction');
            // Revert state back on error
            setReactions(prev => ({ ...prev, [index]: currentReaction }));
        }
    };

    const handleShare = (index) => {
        const textObj = `Question ${index + 1}: ${submission?.answers?.[index]?.questionText || 'Feedback'} - My Answer: ${submission?.answers?.[index]?.textAnswer || ''}`;
        navigator.clipboard.writeText(textObj);
        toast.success(`Copied question ${index + 1} feedback details to clipboard!`);
    };

    const handleShareOverall = () => {
        const textObj = `I have received feedback for my test "${test?.title || 'Test'}"! Total Score: ${submission?.totalMarks || 0} Marks. Check out the LMS Portal for details.`;
        navigator.clipboard.writeText(textObj);
        toast.success('Overall test result details copied to clipboard!');
    };

    const handleToggleAllComments = () => {
        setCollapsedFeedback(prev => {
            const anyOpen = answers.some((_, i) => prev[i]);
            const newState = {};
            answers.forEach((_, i) => {
                newState[i] = !anyOpen;
            });
            return newState;
        });
    };

    useEffect(() => {
        const fetchSubmission = async () => {
            try {

                const res = await axios.get(`/api/submissions/${id}`);
                setSubmission(res.data);
                setLoading(false);
            } catch (error) {
                console.error("[ViewTestResult] Error fetching submission:", error);
                setLoading(false);
            }
        };
        if (id) fetchSubmission();
    }, [id]);

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
                await axios.put(`/api/submissions/${id}/student-comment`, { answers: answersPayload });
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

    const getFormattedDateTime = () => {
        let dateStr = '12 Aug 2026';
        let timeStr = '10:30 AM';
        if (test?.date) {
            dateStr = test.date;
        } else if (test?.createdAt) {
            const dateObj = new Date(test.createdAt);
            dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            timeStr = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
        }
        return { dateStr, timeStr };
    };
    const { dateStr: formattedDate, timeStr: formattedTime } = getFormattedDateTime();

    return (
        <DashboardLayout role="Student" fullWidth={true}>
            {/* Single cohesive outer container */}
            <div className="max-w-5xl mx-auto w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-[#151719] px-4 md:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-[#24282B]">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button
                            onClick={() => {
                                console.log("Navigating back to tests");
                                navigate('/student/tests');
                            }}
                            className="p-1.5 hover:bg-[#25282A] rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="text-white font-semibold text-sm md:text-base">Activity Name: {test?.title || 'Test Result'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap md:flex-nowrap justify-end w-full md:w-auto">
                        <button
                            onClick={() => setShowInfo(!showInfo)}
                            className={`px-4 py-1 rounded-full text-xs font-semibold tracking-wide transition-all shadow-sm ${showInfo ? 'bg-[#FF80A1] text-white' : 'bg-[#FF80A1]/15 text-[#FF80A1] border border-[#FF80A1]/30 hover:bg-[#FF80A1]/25'}`}
                        >
                            Relevant Information
                        </button>
                        
                        <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                            <span>{formattedDate}</span>
                            <span className="text-slate-600">❖</span>
                            <span>{formattedTime}</span>
                        </div>
                        
                        <button className="text-slate-400 hover:text-white transition-colors">
                            <MoreVertical size={16} />
                        </button>

                        {isTeacher && (
                            <button
                                onClick={() => navigate(`/teacher/evaluate/${id}`)}
                                className="bg-amber-500 hover:bg-amber-600 px-4 py-1 rounded-full text-white font-black text-xs border border-amber-600 shadow-sm flex items-center gap-2 transition-all active:scale-95"
                            >
                                <RefreshCw size={12} /> {isEvaluated ? 'Re-evaluate Test' : 'Evaluate Test'}
                            </button>
                        )}

                        {isEvaluated && !isTeacher && (
                            <div className="bg-emerald-500 px-4 py-1 rounded-full text-white font-black text-xs border border-emerald-600 shadow-sm flex items-center gap-1.5">
                                <Star size={12} fill="white" /> {submission.totalMarks} Marks
                            </div>
                        )}
                        
                        <button
                            onClick={() => setPageContentHidden(!pageContentHidden)}
                            className="flex items-center gap-2 px-3 py-1 bg-[#25282A] text-slate-300 border border-[#3E4246] rounded-md text-xs font-semibold hover:text-white hover:bg-[#34373a] transition-all"
                        >
                            {pageContentHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                            <span>{pageContentHidden ? 'Show' : 'Hide'}</span>
                        </button>
                    </div>
                </div>

                {/* Relevant Info Panel */}
                {showInfo && (
                    <div className="bg-slate-50 border-b border-slate-100 p-6 text-slate-800 transition-all">
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

                {/* Main Content Area */}
                <div className="p-6 flex-1 flex flex-col">
                    {pageContentHidden ? (
                        <div className="p-12 text-center text-slate-400 font-medium max-w-md mx-auto my-auto">
                            <EyeOff className="mx-auto mb-3 text-slate-350" size={40} />
                            <p className="text-slate-700 font-bold mb-1">Test Contents Hidden</p>
                            <p className="text-xs text-slate-400">Click the 'Show' button in the header to view details.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {answers.length === 0 ? (
                                <div className="p-10 text-center text-slate-400 font-medium border border-dashed border-slate-200 rounded-2xl">
                                    No answers found for this submission.
                                </div>
                            ) : (
                                answers.map((ans, idx) => {
                                    const type = ans.questionType?.toLowerCase();
                                    const isAudio = type?.includes('voice') || type?.includes('audio') || type?.includes('mic');
                                    const isVideo = type?.includes('video') || type?.includes('cam');
                                    const q = test?.questions?.[idx];

                                    const isImageDisplay = type === 'image displaying' || type === 'image';
                                    const isVideoDisplay = type === 'video displaying' || type === 'video';
                                    const isPdfDisplay = type === 'pdf displaying' || type === 'pdf';
                                    const isEmbeddedVideo = type === 'embedded video displaying' || type === 'youtube';
                                    const isAudioListening = type === 'audio listening displaying' || type === 'audio listening';

                                    const isCollapsed = collapsedQuestions[idx] ?? true;

                                    return (
                                        <div key={idx} className="flex flex-col gap-4 border-b border-slate-100 last:border-b-0 pb-6 last:pb-0">
                                            {/* Question Header Bar */}
                                            <div className="flex justify-between items-center pb-2 border-b border-slate-100 gap-4">
                                                <h3 className="text-base font-bold text-slate-800 flex-1 text-left">
                                                    Q{idx + 1}: {ans.questionText || "Question"}
                                                </h3>
                                                <button
                                                    onClick={() => setCollapsedQuestions(prev => ({ ...prev, [idx]: !(prev[idx] ?? true) }))}
                                                    className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-md text-xs font-semibold shadow-sm transition-all"
                                                >
                                                    {isCollapsed ? <Eye size={14} className="text-slate-500" /> : <EyeOff size={14} className="text-slate-500" />}
                                                    <span>{isCollapsed ? 'Show' : 'Hide'}</span>
                                                </button>
                                            </div>

                                            {!isCollapsed && (
                                                <>
                                                    {/* Question Media Elements */}
                                                    {q && q.imageUrl && !isImageDisplay && (
                                                        <div className="mb-2 flex justify-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                            <img
                                                                src={q.imageUrl}
                                                                alt={q.altText || 'Question Image'}
                                                                className={`max-w-full max-h-60 rounded-xl object-contain shadow-sm ${q.align === 'left' ? 'mr-auto' : q.align === 'right' ? 'ml-auto' : 'mx-auto'}`}
                                                            />
                                                        </div>
                                                    )}

                                                    {q && q.videoUrl && !isVideoDisplay && (
                                                        <div className="mb-2 flex justify-center bg-slate-900 p-2 rounded-2xl border border-slate-800 overflow-hidden">
                                                            <video
                                                                src={q.videoUrl}
                                                                controls
                                                                autoPlay={!!q.autoplay}
                                                                loop={!!q.loop}
                                                                className="w-full max-h-60 rounded-lg object-contain bg-black"
                                                            />
                                                        </div>
                                                    )}

                                                    {q && q.pdfUrl && !isPdfDisplay && (
                                                        <div className="mb-2 flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                                                                    <FileText size={22} />
                                                                </div>
                                                                <div className="flex flex-col text-left">
                                                                    <span className="font-bold text-slate-700 text-sm">{q.text || 'View Document'}</span>
                                                                    <span className="text-xs text-slate-400">PDF Document File</span>
                                                                </div>
                                                            </div>
                                                            <a
                                                                href={q.pdfUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/10"
                                                            >
                                                                View Document
                                                            </a>
                                                        </div>
                                                    )}

                                                    {q && (q.youtubeUrl || q.embeddedVideoUrl) && !isEmbeddedVideo && (
                                                        <div className="mb-2 overflow-hidden rounded-2xl border border-slate-200 shadow-sm aspect-video bg-black max-h-[300px] flex items-center justify-center">
                                                            <iframe
                                                                src={getEmbedUrl(q.embeddedVideoUrl || q.youtubeUrl)}
                                                                title="YouTube Video"
                                                                className="w-full h-full border-0"
                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                allowFullScreen
                                                            ></iframe>
                                                        </div>
                                                    )}

                                                    {q && q.audioUrl && !isAudioListening && (
                                                        <div className="mb-2 border border-slate-200 rounded-2xl p-4 bg-slate-50 flex items-center gap-3">
                                                            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                                                                <Volume2 size={22} />
                                                            </div>
                                                            <div className="flex-1 text-left">
                                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Audio Track</span>
                                                                <audio src={q.audioUrl} controls className="w-full mt-1.5 h-9" />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Submissions Details */}
                                                    <div className="space-y-4 text-left">
                                                        {ans.textAnswer && (
                                                            <div className="p-4 bg-[#F1F3F5] border border-slate-200 rounded-xl text-slate-700 font-medium text-sm leading-relaxed whitespace-pre-wrap">
                                                                {ans.textAnswer}
                                                            </div>
                                                        )}

                                                        {ans.audioData && (
                                                            <div className="p-4 bg-[#F1F3F5] border border-slate-200 rounded-xl">
                                                                <audio controls src={ans.audioData} className="w-full h-9" />
                                                            </div>
                                                        )}

                                                        {ans.videoData && (
                                                            <div className="p-4 bg-[#F1F3F5] border border-slate-200 rounded-xl">
                                                                <video controls src={ans.videoData} className="w-full rounded-lg max-h-60 bg-black" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions Toolbar Dropdown Toggle */}
                                                    <div className="flex justify-start items-center mt-3 pb-1">
                                                        <button
                                                            onClick={() => setCollapsedToolbars(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all shadow-sm"
                                                        >
                                                            <span>Feedback & Reactions</span>
                                                            {!!collapsedToolbars[idx] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                        </button>
                                                    </div>

                                                    {/* Actions Toolbar */}
                                                    {!!collapsedToolbars[idx] && (
                                                        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2 flex-wrap gap-4">
                                                            <div className="flex items-center gap-3">
                                                                {/* Thumbs Up (Like) */}
                                                                <button
                                                                    onClick={() => handleToggleLike(idx, 'like')}
                                                                    className={`flex items-center justify-center p-1.5 rounded-lg transition-all ${reactions[idx] === 'like' ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                                                    title="Like"
                                                                >
                                                                    <ThumbsUp size={16} fill={reactions[idx] === 'like' ? 'currentColor' : 'none'} />
                                                                </button>

                                                                {/* Thumbs Down (Dislike) */}
                                                                <button
                                                                    onClick={() => handleToggleLike(idx, 'dislike')}
                                                                    className={`flex items-center justify-center p-1.5 rounded-lg transition-all ${reactions[idx] === 'dislike' ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                                                    title="Dislike"
                                                                >
                                                                    <ThumbsDown size={16} fill={reactions[idx] === 'dislike' ? 'currentColor' : 'none'} />
                                                                </button>

                                                                <div className="w-[1px] h-4 bg-slate-200"></div>

                                                                {/* Comment */}
                                                                <button
                                                                    onClick={() => setCollapsedFeedback(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${collapsedFeedback[idx] ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                                                                >
                                                                    <MessageSquare size={14} />
                                                                    <span>Comment</span>
                                                                </button>

                                                                {/* Share */}
                                                                <button
                                                                    onClick={() => handleShare(idx)}
                                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
                                                                >
                                                                    <Share2 size={14} />
                                                                    <span>Share</span>
                                                                </button>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                {/* Badges */}
                                                                <div className="flex items-center gap-1 px-2.5 py-1 bg-[#F8A5C2]/15 text-[#E84393] rounded-md text-[10px] font-bold border border-[#F8A5C2]/20">
                                                                    <Calendar size={11} />
                                                                    <span>Teacher</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold border border-blue-100">
                                                                    <Cpu size={11} />
                                                                    <span>AI Auto check</span>
                                                                </div>

                                                                {/* Vertical Options Menu */}
                                                                <button className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg">
                                                                    <MoreVertical size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Conversation Thread */}
                                                    {!!collapsedToolbars[idx] && isEvaluated && collapsedFeedback[idx] && (
                                                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-fade-in text-left">
                                                            {/* Conversation History */}
                                                            {(ans.conversation || []).map((msg, mi) => (
                                                                <div
                                                                    key={mi}
                                                                    className={`flex items-start gap-3 max-w-[85%] ${msg.role === 'Student' ? 'flex-row-reverse ml-auto' : ''}`}
                                                                >
                                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm ${msg.role === 'Teacher' ? 'bg-indigo-600' : 'bg-purple-600'}`}>
                                                                        {msg.role === 'Teacher' ? 'T' : (submission.studentName?.[0]?.toUpperCase() || 'S')}
                                                                    </div>
                                                                    <div className={`rounded-2xl p-3 shadow-sm ${msg.role === 'Teacher'
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
                                                                            <div className="mt-1 flex items-center gap-1.5">
                                                                                <Star size={10} className="text-amber-500" fill="currentColor" />
                                                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Initial Score: {ans.marks ?? 0}</span>
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
                                                                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm w-full relative">
                                                                    <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${isTeacher ? 'text-blue-500' : 'text-slate-400 text-right'}`}>
                                                                        {isTeacher ? 'Add further feedback' : 'Send another response'}
                                                                    </p>
                                                                    <textarea
                                                                        className={`w-full bg-slate-50 border border-slate-100 rounded-xl p-3 pr-12 text-xs focus:ring-2 transition-all outline-none resize-none min-h-[60px] ${isTeacher ? 'focus:ring-blue-400' : 'focus:ring-indigo-400'}`}
                                                                        placeholder={isTeacher ? "Type further notes..." : "Type your response here..."}
                                                                        value={studentComments[idx] || ''}
                                                                        onChange={(e) => setStudentComments(prev => ({ ...prev, [idx]: e.target.value }))}
                                                                    />
                                                                    <button
                                                                        onClick={() => saveStudentComments(idx)}
                                                                        disabled={savingComments || !studentComments[idx]?.trim()}
                                                                        className={`absolute bottom-5 right-5 p-1.5 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${isTeacher ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                                                    >
                                                                        {savingComments ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Bar */}
                {isEvaluated && !isTeacher && (
                    <div className="bg-[#111A24] border-t border-[#1C2836] py-4 flex items-center justify-center gap-8 text-white w-full">
                        <button
                            onClick={handleToggleAllComments}
                            className="flex items-center gap-2 text-sm font-semibold hover:text-[#FF80A1] transition-colors"
                        >
                            <MessageSquare size={16} />
                            <span>Comment</span>
                        </button>
                        <div className="w-[1px] h-4 bg-slate-700"></div>
                        <button
                            onClick={handleShareOverall}
                            className="flex items-center gap-2 text-sm font-semibold hover:text-[#FF80A1] transition-colors"
                        >
                            <Share2 size={16} />
                            <span>Share</span>
                        </button>
                    </div>
                )}
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
        </DashboardLayout>
    );
};

export default ViewTestResult;
