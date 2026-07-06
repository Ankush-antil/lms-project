import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
    Info, FileText, CheckCircle, Clock, ChevronLeft,
    Mic, Video, Star, MessageSquare, RefreshCw, User, Send, ChevronDown, ChevronUp, Volume2,
    MoreVertical, ThumbsUp, ThumbsDown, Eye, EyeOff, Share2, Calendar, Cpu, X
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

const ViewTestResult = ({ isSharedView = false, submissionId = null }) => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const { id: urlId } = useParams();
    const id = submissionId || urlId;
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showInfo, setShowInfo] = useState(false);
    const [studentComments, setStudentComments] = useState({}); // idx -> comment
    const [savingComments, setSavingComments] = useState(false);
    const [collapsedFeedback, setCollapsedFeedback] = useState({}); // idx -> boolean
    const [collapsedQuestions, setCollapsedQuestions] = useState({}); // idx -> boolean
    const [pageContentHidden, setPageContentHidden] = useState(false);
    const [reactions, setReactions] = useState({});
    const [chatModalOpen, setChatModalOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [loadingChat, setLoadingChat] = useState(false);
    const [sendingChat, setSendingChat] = useState(false);
    const [selectedEvalQuestion, setSelectedEvalQuestion] = useState(null);
    const [overallReaction, setOverallReaction] = useState('');
    const [overallLikesCount, setOverallLikesCount] = useState(0);
    const [overallDislikesCount, setOverallDislikesCount] = useState(0);
    const [showOverallComments, setShowOverallComments] = useState(false);
    const [totalEvalModalOpen, setTotalEvalModalOpen] = useState(false);
    // Separate state for overall public discussion comments (YouTube-style)
    const [overallComments, setOverallComments] = useState([]);
    const [overallCommentInput, setOverallCommentInput] = useState('');
    const [postingOverallComment, setPostingOverallComment] = useState(false);
    const [loadingOverallComments, setLoadingOverallComments] = useState(false);

    // Share Modal States
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [shareTitle, setShareTitle] = useState('');

    const isTeacher = userInfo?.role === 'Teacher' || userInfo?.role === 'Admin';

    // Parse URL query parameter to support direct question sharing
    const searchParams = new URLSearchParams(window.location.search);
    const questionQuery = searchParams.get('question');
    const sharedQuestionIndex = questionQuery ? parseInt(questionQuery, 10) - 1 : null;

    // Generate or retrieve Guest ID for liking and commenting when unauthenticated
    useEffect(() => {
        let gId = localStorage.getItem('lms_guest_id');
        if (!gId) {
            gId = 'guest_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('lms_guest_id', gId);
        }
    }, []);

    // Read reactions from database on mount or when submission is loaded
    useEffect(() => {
        if (submission) {
            const voterId = userInfo ? String(userInfo._id) : (localStorage.getItem('lms_guest_id') || 'guest');
            const initialReactions = {};
            submission.answers.forEach((ans, index) => {
                if (Array.isArray(ans.likes) && ans.likes.includes(voterId)) {
                    initialReactions[index] = 'like';
                } else if (Array.isArray(ans.dislikes) && ans.dislikes.includes(voterId)) {
                    initialReactions[index] = 'dislike';
                } else if (ans.reaction) {
                    initialReactions[index] = ans.reaction;
                }
            });
            setReactions(initialReactions);

            // Initialize overall reaction
            let overallReact = '';
            if (Array.isArray(submission.likes) && submission.likes.includes(voterId)) {
                overallReact = 'like';
            } else if (Array.isArray(submission.dislikes) && submission.dislikes.includes(voterId)) {
                overallReact = 'dislike';
            } else if (submission.reaction) {
                overallReact = submission.reaction;
            }
            setOverallReaction(overallReact);
            setOverallLikesCount(Array.isArray(submission.likes) ? submission.likes.length : 0);
            setOverallDislikesCount(Array.isArray(submission.dislikes) ? submission.dislikes.length : 0);
        }
    }, [submission, userInfo]);

    const handleToggleLike = async (index, type) => {
        const voterId = userInfo ? String(userInfo._id) : (localStorage.getItem('lms_guest_id') || 'guest');
        const currentReaction = reactions[index];
        const newReaction = currentReaction === type ? '' : type;

        // Update UI state optimistically
        setReactions(prev => ({ ...prev, [index]: newReaction }));

        // Optimistically update counts in submission.answers
        setSubmission(prev => {
            if (!prev) return prev;
            const newAnswers = [...prev.answers];
            if (newAnswers[index]) {
                let likes = [...(newAnswers[index].likes || [])];
                let dislikes = [...(newAnswers[index].dislikes || [])];

                // Remove voter from both arrays
                likes = likes.filter(id => id !== voterId);
                dislikes = dislikes.filter(id => id !== voterId);

                if (newReaction === 'like') {
                    likes.push(voterId);
                } else if (newReaction === 'dislike') {
                    dislikes.push(voterId);
                }

                newAnswers[index] = {
                    ...newAnswers[index],
                    reaction: newReaction,
                    likes,
                    dislikes
                };
            }
            return { ...prev, answers: newAnswers };
        });

        try {
            // Prepare payload containing the updated reaction for the target question index
            const answersPayload = submission.answers.map((ans, i) => {
                return {
                    reaction: i === index ? newReaction : (reactions[i] || ''),
                    guestId: voterId
                };
            });

            const endpoint = isSharedView
                ? `/api/submissions/shared/${id}/comment`
                : `/api/submissions/${id}/student-comment`;

            const res = await axios.put(endpoint, { answers: answersPayload });

            // Sync updated reaction inside the main submission state
            setSubmission(res.data);
        } catch (error) {
            console.error("Error saving student reaction:", error);
            toast.error('Failed to save reaction');
            // Revert state back on error
            setReactions(prev => ({ ...prev, [index]: currentReaction }));
        }
    };

    const handleToggleOverallReaction = async (type) => {
        const voterId = userInfo ? String(userInfo._id) : (localStorage.getItem('lms_guest_id') || 'guest');
        const currentReaction = overallReaction;
        const newReaction = currentReaction === type ? '' : type;

        // Update UI state optimistically
        setOverallReaction(newReaction);
        if (newReaction === 'like') {
            setOverallLikesCount(prev => prev + 1);
            if (currentReaction === 'dislike') setOverallDislikesCount(prev => Math.max(0, prev - 1));
        } else if (newReaction === 'dislike') {
            setOverallDislikesCount(prev => prev + 1);
            if (currentReaction === 'like') setOverallLikesCount(prev => Math.max(0, prev - 1));
        } else {
            if (currentReaction === 'like') setOverallLikesCount(prev => Math.max(0, prev - 1));
            if (currentReaction === 'dislike') setOverallDislikesCount(prev => Math.max(0, prev - 1));
        }

        try {
            const endpoint = isSharedView
                ? `/api/submissions/${id}/reaction` // For simplicity, overall reaction uses reaction endpoint
                : `/api/submissions/${id}/reaction`;
            await axios.put(endpoint, { reaction: newReaction, guestId: voterId });
        } catch (error) {
            console.error("Error toggling overall reaction:", error);
            // Revert state back on error
            setOverallReaction(currentReaction);
            if (currentReaction === 'like') {
                setOverallLikesCount(prev => prev + 1);
                if (newReaction === 'dislike') setOverallDislikesCount(prev => Math.max(0, prev - 1));
            } else if (currentReaction === 'dislike') {
                setOverallDislikesCount(prev => prev + 1);
                if (newReaction === 'like') setOverallLikesCount(prev => Math.max(0, prev - 1));
            } else {
                if (newReaction === 'like') setOverallLikesCount(prev => Math.max(0, prev - 1));
                if (newReaction === 'dislike') setOverallDislikesCount(prev => Math.max(0, prev - 1));
            }
        }
    };

    const handleShare = (index) => {
        const url = `${window.location.origin}/shared/test-result/${id}?question=${index + 1}`;
        setShareUrl(url);
        setShareTitle(`Question ${index + 1} of Activity: ${submission?.test?.title || 'Test Result'}`);
        setShareModalOpen(true);
    };

    const handleShareOverall = () => {
        const url = `${window.location.origin}/shared/test-result/${id}`;
        setShareUrl(url);
        setShareTitle(`Activity Result: ${submission?.test?.title || 'Test Result'}`);
        setShareModalOpen(true);
    };

    const loadChatHistory = async (submissionId) => {
        setLoadingChat(true);
        try {
            const res = await axios.get(`/api/submissions/${submissionId}/feedback`);
            setChatMessages(res.data);
        } catch (err) {
            console.error("Failed to load chat history:", err);
            toast.error("Failed to load feedback chat.");
        } finally {
            setLoadingChat(false);
        }
    };

    const handleSendFeedbackMessage = async (submissionId) => {
        if (!chatInput.trim()) return;
        setSendingChat(true);
        try {
            const res = await axios.post(`/api/submissions/${submissionId}/feedback`, { message: chatInput.trim() });
            setChatMessages(res.data);
            setChatInput('');
        } catch (err) {
            console.error("Failed to send message:", err);
            toast.error("Failed to send message.");
        } finally {
            setSendingChat(false);
        }
    };

    // Load overall public discussion comments (separate from private feedback)
    const loadOverallComments = async (submissionId) => {
        setLoadingOverallComments(true);
        try {
            const res = await axios.get(`/api/submissions/${submissionId}/comments`);
            setOverallComments(res.data || []);
        } catch (err) {
            // If endpoint doesn't exist yet, use chatMessages as fallback
            setOverallComments([]);
        } finally {
            setLoadingOverallComments(false);
        }
    };

    // Post an overall public comment
    const handlePostOverallComment = async () => {
        if (!overallCommentInput.trim()) return;
        setPostingOverallComment(true);
        const authorName = userInfo?.name || userInfo?.username || 'Guest';
        const authorRole = userInfo?.role || 'Guest';
        const newComment = {
            _id: Date.now().toString(),
            message: overallCommentInput.trim(),
            author: authorName,
            role: authorRole,
            timestamp: new Date().toISOString(),
        };
        // Optimistically add
        setOverallComments(prev => [...prev, newComment]);
        setOverallCommentInput('');
        try {
            const res = await axios.post(`/api/submissions/${id}/comments`, {
                message: overallCommentInput.trim(),
                author: authorName,
                role: authorRole,
            });
            setOverallComments(res.data || []);
        } catch (err) {
            // On failure keep optimistic comment shown
            console.error('Failed to post overall comment:', err);
        } finally {
            setPostingOverallComment(false);
        }
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
                const endpoint = isSharedView
                    ? `/api/submissions/shared/${id}`
                    : `/api/submissions/${id}`;
                const res = await axios.get(endpoint);
                setSubmission(res.data);
                setLoading(false);
            } catch (error) {
                console.error("[ViewTestResult] Error fetching submission:", error);
                setLoading(false);
            }
        };
        if (id) fetchSubmission();
    }, [id, isSharedView]);

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
                const comment = isGlobalSave ? studentComments[i] : (i === idx ? studentComments[i] : '');
                return {
                    studentComment: comment?.trim() || '',
                    guestId: userInfo ? String(userInfo._id) : (localStorage.getItem('lms_guest_id') || 'guest')
                };
            });

            // Filter to only questions that actually have a new comment to send
            const hasNewComments = answersPayload.some(a => a.studentComment);

            if (hasNewComments) {
                const endpoint = isSharedView
                    ? `/api/submissions/shared/${id}/comment`
                    : `/api/submissions/${id}/student-comment`;
                const res = await axios.put(endpoint, { answers: answersPayload });

                // Sync data
                setSubmission(res.data);
            }

            toast.success(isGlobalSave ? 'All comments saved!' : 'Response sent!');

            // Clear the relevant input boxes
            if (isGlobalSave) {
                setStudentComments({});
                setTimeout(() => navigate(isSharedView ? `/shared/test-result/${id}` : '/student/tests'), 1000);
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

    const pageContent = (
        <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-[#151719] px-4 md:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-[#24282B]">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    {!isSharedView && (
                        <button
                            onClick={() => {
                                console.log("Navigating back to tests");
                                navigate('/student/tests');
                            }}
                            className="p-1.5 hover:bg-[#25282A] rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
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

                    {isTeacher && !isSharedView && (
                        <button
                            onClick={() => navigate(isEvaluated ? `/teacher/evaluate/${id}?mode=reevaluate` : `/teacher/evaluate/${id}`)}
                            className="bg-amber-500 hover:bg-amber-600 px-4 py-1 rounded-full text-white font-black text-xs border border-amber-600 shadow-sm flex items-center gap-2 transition-all active:scale-95"
                        >
                            <RefreshCw size={12} /> {isEvaluated ? 'Re-evaluate Test' : 'Evaluate Test'}
                        </button>
                    )}
                </div>
            </div>

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
                        {sharedQuestionIndex !== null && sharedQuestionIndex >= 0 && sharedQuestionIndex < answers.length && (
                            <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between animate-fade-in text-left mb-6 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100/80 text-indigo-600 rounded-xl">
                                        <Info size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">Viewing Shared Question Only</p>
                                        <p className="text-xs text-slate-555">You are viewing Question {sharedQuestionIndex + 1} of this activity.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate(window.location.pathname)}
                                    className="px-4 py-2 bg-white hover:bg-slate-50 text-indigo-600 border border-slate-200 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 shrink-0"
                                >
                                    View Full Activity
                                </button>
                            </div>
                        )}

                        {answers.length === 0 ? (
                            <div className="p-10 text-center text-slate-400 font-medium border border-dashed border-slate-200 rounded-2xl">
                                No answers found for this submission.
                            </div>
                        ) : (
                            answers.map((ans, idx) => {
                                if (sharedQuestionIndex !== null && sharedQuestionIndex >= 0 && sharedQuestionIndex < answers.length) {
                                    if (idx !== sharedQuestionIndex) return null;
                                }
                                const type = ans.questionType?.toLowerCase();
                                const isAudio = type?.includes('voice') || type?.includes('audio') || type?.includes('mic');
                                const isVideo = type?.includes('video') || type?.includes('cam');
                                const q = test?.questions?.[idx];

                                const isImageDisplay = type === 'image displaying' || type === 'image';
                                const isVideoDisplay = type === 'video displaying' || type === 'video';
                                const isPdfDisplay = type === 'pdf displaying' || type === 'pdf';
                                const isEmbeddedVideo = type === 'embedded video displaying' || type === 'youtube';
                                const isAudioListening = type === 'audio listening displaying' || type === 'audio listening';

                                const isCollapsed = collapsedQuestions[idx] ?? false;

                                return (
                                    <div key={idx} className="flex flex-col gap-4 border-b border-slate-100 last:border-b-0 pb-6 last:pb-0">
                                        {/* Question Header Bar */}
                                        <div className="flex justify-between items-center pb-2 border-b border-slate-100 gap-4">
                                            <h3 className="text-base font-bold text-slate-800 flex-1 text-left">
                                                Q{idx + 1}: {ans.questionText || "Question"}
                                            </h3>
                                            <button
                                                onClick={() => setCollapsedQuestions(prev => ({ ...prev, [idx]: !(prev[idx] ?? false) }))}
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
                                                    <div 
                                                         className="mb-2 mx-auto flex justify-center bg-slate-900 p-2 rounded-2xl border border-slate-800 overflow-hidden"
                                                         style={{ width: `${q.videoWidth || 500}px`, maxWidth: '100%' }}
                                                     >
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
                                                    <div 
                                                        className="mb-2 mx-auto overflow-hidden rounded-2xl border border-slate-200 shadow-sm aspect-video bg-black flex items-center justify-center"
                                                        style={{ width: `${q.videoWidth || 500}px`, maxWidth: '100%' }}
                                                    >
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

                                                {/* Unified Answer Card (Answers & Media attached with Actions Toolbar) */}
                                                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                                                    {/* Top container displaying answers */}
                                                    <div className="p-4 bg-slate-50/50 text-slate-700 font-medium text-sm leading-relaxed whitespace-pre-wrap text-left flex flex-col gap-3">
                                                        {ans.textAnswer && (() => {
                                                            if (ans.questionType?.toLowerCase() === 'tabular data' || q?.type?.toLowerCase() === 'tabular data') {
                                                                try {
                                                                    const parsedRows = JSON.parse(ans.textAnswer);
                                                                    const headers = q?.tableData?.headers || [];
                                                                    const origRows = q?.tableData?.rows || [];

                                                                    return (
                                                                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white my-1">
                                                                            <table className="min-w-full divide-y divide-slate-200">
                                                                                <thead className="bg-slate-50">
                                                                                    <tr>
                                                                                        {headers.map((header, colIdx) => (
                                                                                            <th key={colIdx} className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">
                                                                                                {header}
                                                                                            </th>
                                                                                        ))}
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-slate-150 bg-white">
                                                                                    {parsedRows.map((row, rowIdx) => (
                                                                                        <tr key={rowIdx}>
                                                                                            {row.map((cell, colIdx) => {
                                                                                                const wasEmpty = !origRows[rowIdx]?.[colIdx];
                                                                                                return (
                                                                                                    <td key={colIdx} className={`px-3 py-2 text-xs ${wasEmpty ? 'bg-purple-50/30 text-purple-750 font-bold' : 'text-slate-600 font-medium'}`}>
                                                                                                        {cell || <span className="text-slate-405 italic">Empty</span>}
                                                                                                    </td>
                                                                                                );
                                                                                            })}
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    );
                                                                } catch (e) {
                                                                    console.error("Error parsing tabular answer:", e);
                                                                    return <div>{ans.textAnswer}</div>;
                                                                }
                                                            }
                                                            return <div>{ans.textAnswer}</div>;
                                                        })()}
                                                        {ans.audioData && (
                                                            <div>
                                                                <audio controls src={ans.audioData} className="w-full h-9" />
                                                            </div>
                                                        )}
                                                        {ans.videoData && (
                                                            <div>
                                                                <video controls src={ans.videoData} className="w-full rounded-lg max-h-60 bg-black" />
                                                            </div>
                                                        )}
                                                        {!ans.textAnswer && !ans.audioData && !ans.videoData && (
                                                            <span className="text-slate-400 italic">No answer provided</span>
                                                        )}
                                                    </div>

                                                    {/* Actions Toolbar at bottom */}
                                                    <div className="flex items-center justify-between bg-white px-4 py-2.5 border-t border-slate-100 flex-wrap gap-4">
                                                        <div className="flex items-center gap-3">
                                                            {/* Thumbs Up (Like) */}
                                                            <button
                                                                onClick={() => handleToggleLike(idx, 'like')}
                                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all active:scale-95 ${reactions[idx] === 'like' ? 'text-amber-600 bg-amber-50 font-bold' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                                                title="Like"
                                                            >
                                                                <ThumbsUp size={16} fill={reactions[idx] === 'like' ? 'currentColor' : 'none'} />
                                                                <span className="text-xs font-semibold">
                                                                    {Array.isArray(ans.likes) ? ans.likes.length : (ans.reaction === 'like' ? 1 : 0)}
                                                                </span>
                                                            </button>

                                                            {/* Thumbs Down (Dislike) */}
                                                            <button
                                                                onClick={() => handleToggleLike(idx, 'dislike')}
                                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all active:scale-95 ${reactions[idx] === 'dislike' ? 'text-amber-600 bg-amber-50 font-bold' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                                                title="Dislike"
                                                            >
                                                                <ThumbsDown size={16} fill={reactions[idx] === 'dislike' ? 'currentColor' : 'none'} />
                                                                <span className="text-xs font-semibold">
                                                                    {Array.isArray(ans.dislikes) ? ans.dislikes.length : (ans.reaction === 'dislike' ? 1 : 0)}
                                                                </span>
                                                            </button>

                                                            <div className="w-[1px] h-4 bg-slate-200"></div>

                                                            {/* Comment */}
                                                            <button
                                                                onClick={() => setCollapsedFeedback(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${collapsedFeedback[idx] ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                                                            >
                                                                <MessageSquare size={14} />
                                                                <span>Comment</span>
                                                            </button>

                                                            {/* Share */}
                                                            <button
                                                                onClick={() => handleShare(idx)}
                                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all active:scale-95"
                                                            >
                                                                <Share2 size={14} />
                                                                <span>Share</span>
                                                            </button>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            {/* Badges */}
                                                            {isEvaluated && (
                                                                <button
                                                                    onClick={() => setSelectedEvalQuestion(idx)}
                                                                    className="flex items-center gap-1 px-2.5 py-1 bg-[#F8A5C2]/15 hover:bg-[#F8A5C2]/25 text-[#E84393] rounded-md text-[10px] font-bold border border-[#F8A5C2]/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                                                >
                                                                    <Calendar size={11} />
                                                                    <span>Teacher Evaluation</span>
                                                                </button>
                                                            )}
                                                            <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold border border-blue-100">
                                                                <Cpu size={11} />
                                                                <span>AI Auto check</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Per-question YouTube-style Comment Thread */}
                                                {collapsedFeedback[idx] && (
                                                    <div className="border-t border-slate-100 bg-white animate-fade-in text-left">
                                                        {/* Header */}
                                                        <div className="flex items-center justify-between px-4 pt-4 pb-2">
                                                            <div className="flex items-center gap-2">
                                                                <MessageSquare size={14} className="text-indigo-500" />
                                                                <span className="text-xs font-black text-slate-700">
                                                                    {(ans.conversation || []).length} Comment{(ans.conversation || []).length !== 1 ? 's' : ''}
                                                                </span>
                                                            </div>
                                                            <button
                                                                onClick={() => setCollapsedFeedback(prev => ({ ...prev, [idx]: false }))}
                                                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>

                                                        {/* Comment Input — YouTube style */}
                                                        <div className="flex items-start gap-3 px-4 pb-3 border-b border-slate-100">
                                                            <div
                                                                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm"
                                                                style={{ background: isTeacher ? '#4f46e5' : '#a855f7' }}
                                                            >
                                                                {userInfo?.name?.[0]?.toUpperCase() || userInfo?.username?.[0]?.toUpperCase() || 'G'}
                                                            </div>
                                                            <div className="flex-1">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Add a comment..."
                                                                    value={studentComments[idx] || ''}
                                                                    onChange={(e) => setStudentComments(prev => ({ ...prev, [idx]: e.target.value }))}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter' && studentComments[idx]?.trim()) {
                                                                            saveStudentComments(idx);
                                                                        }
                                                                    }}
                                                                    className="w-full bg-transparent border-0 border-b-2 border-slate-200 focus:border-indigo-400 px-0 py-1.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400"
                                                                />
                                                                {studentComments[idx]?.trim() && (
                                                                    <div className="flex justify-end gap-2 mt-2">
                                                                        <button
                                                                            onClick={() => setStudentComments(prev => ({ ...prev, [idx]: '' }))}
                                                                            className="px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                        <button
                                                                            onClick={() => saveStudentComments(idx)}
                                                                            disabled={savingComments}
                                                                            className="px-4 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-full transition-all active:scale-95 disabled:opacity-50"
                                                                        >
                                                                            {savingComments ? 'Posting...' : 'Comment'}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Comments List — YouTube style */}
                                                        <div className="px-4 py-3 space-y-4 max-h-[280px] overflow-y-auto">
                                                            {(ans.conversation || []).length === 0 ? (
                                                                <div className="text-center py-4">
                                                                    <MessageSquare size={22} className="text-slate-300 mx-auto mb-1.5" />
                                                                    <p className="text-xs text-slate-400 font-semibold">No comments yet.</p>
                                                                </div>
                                                            ) : (
                                                                (ans.conversation || []).map((msg, mi) => {
                                                                    const isTeacherMsg = msg.role === 'Teacher';
                                                                    const isStudentMsg = msg.role === 'Student';
                                                                    const isSelf = userInfo && (
                                                                        (isTeacherMsg && isTeacher) ||
                                                                        (isStudentMsg && !isTeacher)
                                                                    );
                                                                    const avatarColor = isTeacherMsg ? '#4f46e5' : msg.role === 'Guest' ? '#64748b' : '#a855f7';
                                                                    const displayName = isTeacherMsg ? 'Teacher' : msg.role === 'Guest' ? 'Guest' : (submission.studentName || 'Student');
                                                                    const timeAgo = (() => {
                                                                        const diff = Date.now() - new Date(msg.timestamp).getTime();
                                                                        const mins = Math.floor(diff / 60000);
                                                                        const hrs = Math.floor(mins / 60);
                                                                        const days = Math.floor(hrs / 24);
                                                                        if (days > 0) return `${days}d ago`;
                                                                        if (hrs > 0) return `${hrs}h ago`;
                                                                        if (mins > 0) return `${mins}m ago`;
                                                                        return 'just now';
                                                                    })();
                                                                    return (
                                                                        <div key={mi} className="flex items-start gap-3">
                                                                            <div
                                                                                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm"
                                                                                style={{ background: avatarColor }}
                                                                            >
                                                                                {displayName[0]?.toUpperCase() || 'G'}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                                    <span className="text-xs font-black text-slate-800">{displayName}</span>
                                                                                    {isTeacherMsg && (
                                                                                        <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black rounded-full uppercase tracking-wide">Teacher</span>
                                                                                    )}
                                                                                    {isSelf && (
                                                                                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-full uppercase tracking-wide">You</span>
                                                                                    )}
                                                                                    <span className="text-[10px] text-slate-400 font-medium">{timeAgo}</span>
                                                                                </div>
                                                                                <p className="text-sm text-slate-700 leading-relaxed break-words">{msg.message}</p>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
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

            {/* Overall Public Discussion (YouTube-style) — separate from private Feedback */}
            {showOverallComments && (
                <div className="border-t border-slate-100 bg-white text-left animate-fade-in shrink-0">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pt-5 pb-3">
                        <div className="flex items-center gap-2">
                            <MessageSquare size={16} className="text-[#E84393]" />
                            <span className="text-sm font-black text-slate-800">
                                {overallComments.length} Comment{overallComments.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <button
                            onClick={() => setShowOverallComments(false)}
                            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Comment Input (YouTube-style — own avatar left, input right) */}
                    <div className="flex items-start gap-3 px-6 pb-4 border-b border-slate-100">
                        {/* Current user avatar */}
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm"
                            style={{ background: userInfo?.role === 'Teacher' ? '#4f46e5' : '#a855f7' }}>
                            {userInfo?.name?.[0]?.toUpperCase() || userInfo?.username?.[0]?.toUpperCase() || 'G'}
                        </div>
                        <div className="flex-1">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Add a public comment..."
                                    value={overallCommentInput}
                                    onChange={(e) => setOverallCommentInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && overallCommentInput.trim()) handlePostOverallComment(); }}
                                    className="w-full bg-slate-50 border-0 border-b-2 border-slate-200 focus:border-[#E84393] px-0 py-1.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 bg-transparent"
                                />
                            </div>
                            {overallCommentInput.trim() && (
                                <div className="flex justify-end gap-2 mt-2">
                                    <button
                                        onClick={() => setOverallCommentInput('')}
                                        className="px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handlePostOverallComment}
                                        disabled={postingOverallComment || !overallCommentInput.trim()}
                                        className="px-4 py-1 bg-[#E84393] hover:bg-[#d4357e] text-white text-xs font-bold rounded-full transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {postingOverallComment ? 'Posting...' : 'Comment'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Comments List — YouTube style */}
                    <div className="max-h-[360px] overflow-y-auto px-6 py-4 space-y-5">
                        {loadingOverallComments ? (
                            <p className="text-xs text-slate-400 font-semibold animate-pulse">Loading comments...</p>
                        ) : overallComments.length === 0 ? (
                            <div className="text-center py-6">
                                <MessageSquare size={28} className="text-slate-300 mx-auto mb-2" />
                                <p className="text-xs text-slate-400 font-semibold">No comments yet.</p>
                                <p className="text-[10px] text-slate-350">Be the first to share your thoughts!</p>
                            </div>
                        ) : (
                            overallComments.map((comment, ci) => {
                                const isSelf = userInfo && (comment.author === userInfo.name || comment.author === userInfo.username);
                                const isTeacherComment = comment.role === 'Teacher' || comment.role === 'Admin';
                                const avatarColor = isTeacherComment ? '#4f46e5' : '#a855f7';
                                const avatarLetter = comment.author?.[0]?.toUpperCase() || 'G';
                                const timeAgo = (() => {
                                    const diff = Date.now() - new Date(comment.timestamp).getTime();
                                    const mins = Math.floor(diff / 60000);
                                    const hrs = Math.floor(mins / 60);
                                    const days = Math.floor(hrs / 24);
                                    if (days > 0) return `${days}d ago`;
                                    if (hrs > 0) return `${hrs}h ago`;
                                    if (mins > 0) return `${mins}m ago`;
                                    return 'just now';
                                })();
                                return (
                                    <div key={comment._id || ci} className="flex items-start gap-3">
                                        {/* Avatar */}
                                        <div
                                            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm"
                                            style={{ background: avatarColor }}
                                        >
                                            {avatarLetter}
                                        </div>
                                        {/* Comment body */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-xs font-black text-slate-800">
                                                    {comment.author || 'Anonymous'}
                                                </span>
                                                {isTeacherComment && (
                                                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black rounded-full uppercase tracking-wide">Teacher</span>
                                                )}
                                                {isSelf && (
                                                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-full uppercase tracking-wide">You</span>
                                                )}
                                                <span className="text-[10px] text-slate-400 font-medium">{timeAgo}</span>
                                            </div>
                                            <p className="text-sm text-slate-700 leading-relaxed break-words">{comment.message}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Footer Bar */}
            {!isTeacher && sharedQuestionIndex === null && (
                <div className="bg-[#111A24] border-t border-[#1C2836] py-3.5 px-4 flex items-center justify-between flex-wrap gap-4 text-white w-full shrink-0">
                    {/* Left: Overall Likes & Dislikes */}
                    <div className="flex items-center gap-3">
                        {/* Overall Thumbs Up (Like) */}
                        <button
                            onClick={() => handleToggleOverallReaction('like')}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer ${overallReaction === 'like' ? 'text-amber-400 bg-amber-950/20 font-bold' : 'text-slate-400 hover:text-slate-350 hover:bg-slate-800/30'}`}
                            title="Like Test"
                        >
                            <ThumbsUp size={15} fill={overallReaction === 'like' ? 'currentColor' : 'none'} />
                            <span className="text-xs font-semibold">{overallLikesCount}</span>
                        </button>

                        {/* Overall Thumbs Down (Dislike) */}
                        <button
                            onClick={() => handleToggleOverallReaction('dislike')}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer ${overallReaction === 'dislike' ? 'text-amber-400 bg-amber-950/20 font-bold' : 'text-slate-400 hover:text-slate-350 hover:bg-slate-800/30'}`}
                            title="Dislike Test"
                        >
                            <ThumbsDown size={15} fill={overallReaction === 'dislike' ? 'currentColor' : 'none'} />
                            <span className="text-xs font-semibold">{overallDislikesCount}</span>
                        </button>
                    </div>

                    {/* Right: Actions — sequence: Comment | Share | Feedback | Total Evaluation */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Comment */}
                        <button
                            onClick={() => {
                                if (!showOverallComments) {
                                    loadOverallComments(id);
                                }
                                setShowOverallComments(!showOverallComments);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer ${showOverallComments ? 'text-[#E84393] bg-[#E84393]/10 font-bold' : 'text-slate-400 hover:text-slate-350 hover:bg-slate-800/30'}`}
                        >
                            <MessageSquare size={14} />
                            <span>Comment ({overallComments.length > 0 ? overallComments.length : ''})</span>
                        </button>

                        <div className="w-[1px] h-4 bg-slate-700"></div>

                        {/* Share */}
                        <button
                            onClick={handleShareOverall}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-350 hover:bg-slate-800/30 transition-all active:scale-95 cursor-pointer"
                        >
                            <Share2 size={14} />
                            <span>Share</span>
                        </button>

                        <div className="w-[1px] h-4 bg-slate-700"></div>

                        {/* Feedback Chat */}
                        <button
                            onClick={() => {
                                loadChatHistory(id);
                                setChatModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-350 hover:bg-slate-800/30 transition-all active:scale-95 cursor-pointer"
                        >
                            <MessageSquare size={14} />
                            <span>Feedback</span>
                        </button>

                        {isEvaluated && (
                            <>
                                <div className="w-[1px] h-4 bg-slate-700"></div>
                                {/* Total Evaluation */}
                                <button
                                    onClick={() => setTotalEvalModalOpen(true)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#F8A5C2]/15 hover:bg-[#F8A5C2]/25 text-[#E84393] rounded-lg text-xs font-bold border border-[#F8A5C2]/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                >
                                    <Star size={12} fill="currentColor" />
                                    <span>Total Evaluation</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    const shareModalComponent = shareModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-[32px] border border-slate-100 shadow-2xl p-8 relative overflow-hidden transform scale-100 transition-all text-left">
                <h3 className="text-2xl font-black text-[#0B1520] mb-1.5 tracking-tight">Share Activity</h3>
                <p className="text-xs text-[#8292A1] font-bold mb-6 leading-normal">{shareTitle}</p>

                {/* URL Box */}
                <div className="flex items-center gap-2 bg-[#F8FAFC] border border-slate-200/60 rounded-2xl p-2.5 mb-6">
                    <input
                        type="text"
                        readOnly
                        value={shareUrl}
                        className="bg-transparent text-xs font-bold text-slate-600 flex-1 outline-none px-2 select-all"
                    />
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(shareUrl);
                            toast.success('Link copied to clipboard!');
                        }}
                        className="px-5 py-2.5 bg-[#0B1520] hover:bg-[#1A2530] text-white rounded-full text-xs font-black transition-all active:scale-95 shrink-0"
                    >
                        Copy Link
                    </button>
                </div>

                {/* Platform Buttons */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareTitle + ': ' + shareUrl)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
                    >
                        <span className="w-12 h-12 bg-[#E8F8F0] text-[#10B981] rounded-full flex items-center justify-center font-black text-xs shadow-sm">WA</span>
                        <span className="text-[10px] font-bold text-slate-550">WhatsApp</span>
                    </a>
                    <a
                        href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
                    >
                        <span className="w-12 h-12 bg-[#E8F2FC] text-[#3B82F6] rounded-full flex items-center justify-center font-black text-xs shadow-sm">TG</span>
                        <span className="text-[10px] font-bold text-slate-550">Telegram</span>
                    </a>
                    <a
                        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
                    >
                        <span className="w-12 h-12 bg-[#0B1520] text-white rounded-full flex items-center justify-center font-black text-xs shadow-sm">X</span>
                        <span className="text-[10px] font-bold text-slate-550">X (Twitter)</span>
                    </a>
                    <a
                        href={`mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareUrl)}`}
                        className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
                    >
                        <span className="w-12 h-12 bg-[#FDF2F4] text-[#EF4444] rounded-full flex items-center justify-center font-black text-xs shadow-sm">ML</span>
                        <span className="text-[10px] font-bold text-slate-550">Email</span>
                    </a>
                </div>

                {/* Close button */}
                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                        onClick={() => setShareModalOpen(false)}
                        className="px-6 py-2.5 bg-[#EEF2F6] hover:bg-[#E2E8F0] text-[#4A5568] rounded-full text-xs font-black transition-all active:scale-95"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );

    const totalEvalModalComponent = totalEvalModalOpen && (() => {
        if (!submission) return null;

        // Sum total max marks of the test
        const maxMarks = test?.questions?.reduce((sum, q) => sum + (parseFloat(q.marks) || 0), 0) || 0;

        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white w-full max-w-xl rounded-[32px] border border-slate-100/80 shadow-2xl p-8 relative overflow-hidden transform scale-100 transition-all text-left flex flex-col gap-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                                <Star size={20} fill="currentColor" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-[#0B1520] tracking-tight">Total Assessment Report</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{test?.title || 'Test Summary'}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setTotalEvalModalOpen(false)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-650 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                        {/* Overall Results */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                                <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest block mb-1">Final Score</span>
                                <span className="text-lg font-black text-emerald-800">{submission.totalMarks ?? 0} / {maxMarks} Marks</span>
                            </div>
                            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                                <span className="text-[9px] font-black text-blue-700 uppercase tracking-widest block mb-1">Status</span>
                                <span className="text-lg font-black text-blue-800 uppercase text-xs tracking-wide">{submission.status}</span>
                            </div>
                        </div>

                        {/* Overall Return Note */}
                        {submission.returnNote && (
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Teacher General Remarks</span>
                                <p className="text-xs font-semibold text-slate-700 leading-relaxed">{submission.returnNote}</p>
                            </div>
                        )}

                        {/* Question-wise Summary */}
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">Question Summary</span>
                            <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100">
                                {submission.answers.map((ans, index) => (
                                    <div key={index} className="p-3 bg-white hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4 text-xs font-semibold">
                                        <div className="min-w-0">
                                            <p className="text-slate-800 font-bold truncate">Q{index + 1}: {ans.questionText || 'Question'}</p>
                                            {ans.feedback && <p className="text-[10px] text-slate-450 italic mt-0.5 truncate">{ans.feedback}</p>}
                                        </div>
                                        <span className="shrink-0 bg-slate-105 text-slate-700 px-2.5 py-1 rounded-md text-[10px] font-black">{ans.marks ?? 0} Marks</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer Close button */}
                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button
                            onClick={() => setTotalEvalModalOpen(false)}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-black transition-all active:scale-95 shadow-sm shadow-emerald-600/10"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    })();

    const evalModalComponent = selectedEvalQuestion !== null && (() => {
        const qIdx = selectedEvalQuestion;
        const ans = submission?.answers?.[qIdx];
        if (!ans) return null;

        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white w-full max-w-lg rounded-[32px] border border-slate-100/80 shadow-2xl p-8 relative overflow-hidden transform scale-100 transition-all text-left flex flex-col gap-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-[#F8A5C2]/10 flex items-center justify-center text-[#E84393]">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-[#0B1520] tracking-tight">Teacher Evaluation</h3>
                                <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Question {qIdx + 1}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedEvalQuestion(null)}
                            className="p-1.5 hover:bg-slate-150 rounded-lg text-slate-400 hover:text-slate-650 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                        {/* Question Text */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Question Text</span>
                            <p className="text-xs font-bold text-slate-800 leading-relaxed">{ans.questionText || "Question Details"}</p>
                        </div>

                        {/* Marks */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Scored Marks</span>
                            <span className="text-xs font-black text-indigo-700">{ans.marks ?? 0} Marks</span>
                        </div>

                        {/* Notes */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Teacher Notes / Remarks</span>
                            <p className="text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {ans.feedback || ans.conversation?.find(c => c.role === 'Teacher')?.message || 'No notes provided'}
                            </p>
                        </div>

                        {/* Video feedback if any */}
                        {ans.videoData && (
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Teacher Video Feedback</span>
                                <video controls src={ans.videoData} className="w-full rounded-xl max-h-48 bg-black shadow-sm" />
                            </div>
                        )}
                    </div>

                    {/* Footer Close button */}
                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button
                            onClick={() => setSelectedEvalQuestion(null)}
                            className="px-6 py-2.5 bg-[#E84393] hover:bg-[#D63031] text-white rounded-full text-xs font-black transition-all active:scale-95 shadow-sm shadow-[#E84393]/20"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    })();


    const chatModalComponent = chatModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-[2rem] border border-slate-100/80 shadow-2xl overflow-hidden flex flex-col h-[80vh] max-h-[600px] text-left">
                {/* Modal Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#3E3ADD] text-white font-extrabold flex items-center justify-center shadow-md">
                            T
                        </div>
                        <div>
                            <h3 className="font-extrabold text-slate-800 text-sm">Teacher User</h3>
                            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Teacher Feedback Chat</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setChatModalOpen(false)}
                        className="p-1.5 hover:bg-slate-200/50 text-slate-450 hover:text-slate-700 rounded-xl transition-all font-bold text-xs"
                    >
                        Close
                    </button>
                </div>

                {/* Messages Body */}
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
                                Send a message to start conversation with the teacher.
                            </p>
                        </div>
                    ) : (
                        chatMessages.map((msg, index) => {
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
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !sendingChat && chatInput.trim()) {
                                handleSendFeedbackMessage(id);
                            }
                        }}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        disabled={sendingChat}
                    />
                    <button
                        onClick={() => handleSendFeedbackMessage(id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors shrink-0 flex items-center justify-center font-bold text-xs disabled:opacity-50"
                        disabled={sendingChat || !chatInput.trim()}
                    >
                        {sendingChat ? <RefreshCw size={12} className="animate-spin" /> : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    );

    const infoModalComponent = showInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-[32px] border border-slate-100/80 shadow-2xl p-8 relative overflow-hidden transform scale-100 transition-all text-left">
                <h3 className="text-2xl font-black text-[#0B1520] mb-6 tracking-tight">Relevant Information</h3>

                <div className="grid grid-cols-2 gap-4 mb-8 max-h-[60vh] overflow-y-auto pr-1">
                    <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Institute</span>
                        <span className="font-bold text-slate-900 break-words block">{test?.institute || 'N/A'}</span>
                    </div>
                    <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Course</span>
                        <span className="font-bold text-slate-900 break-words block">{test?.course || 'N/A'}</span>
                    </div>
                    <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Subject</span>
                        <span className="font-bold text-slate-900 break-words block">{test?.subject || 'N/A'}</span>
                    </div>
                    <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Date</span>
                        <span className="font-bold text-slate-900 break-words block">{test?.date || (test?.createdAt ? new Date(test.createdAt).toLocaleDateString('en-GB') : 'N/A')}</span>
                    </div>
                    <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Test Index</span>
                        <span className="font-bold text-slate-900 break-words block">{test?.index || 'N/A'}</span>
                    </div>
                    <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Activity Type</span>
                        <span className="font-bold text-slate-900 break-words block">{test?.activity || 'N/A'}</span>
                    </div>
                    <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Created By</span>
                        <span className="font-bold text-slate-900 break-words block">{test?.createdBy?.name || 'N/A'}</span>
                    </div>
                    <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Creator Role</span>
                        <span className="font-bold text-slate-900 break-words block uppercase text-xs">{test?.createdBy?.role || 'N/A'}</span>
                    </div>
                    <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100 col-span-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Submitted At</span>
                        <span className="font-bold text-slate-900 break-words block">{formattedDate} at {formattedTime}</span>
                    </div>
                    {isEvaluated && (
                        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100/50 col-span-2">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Total Score</span>
                            <span className="font-bold text-emerald-700 text-lg flex items-center gap-2">
                                <Star size={18} fill="currentColor" className="text-emerald-500 shrink-0" />
                                {submission.totalMarks} Marks
                            </span>
                        </div>
                    )}
                </div>

                {/* Close button */}
                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                        onClick={() => setShowInfo(false)}
                        className="px-6 py-2.5 bg-[#EEF2F6] hover:bg-[#E2E8F0] text-[#4A5568] rounded-full text-xs font-black transition-all active:scale-95"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );

    if (isSharedView) {
        return (
            <>
                <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col items-center justify-start w-full">
                    <div className="max-w-5xl w-full flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-md">L</div>
                            <span className="text-lg font-black text-slate-800 tracking-tight">LMS<span className="text-slate-550 font-medium">Portal</span></span>
                        </div>
                        <span className="text-xs font-bold text-[#FF80A1] bg-[#FF80A1]/10 px-3.5 py-1.5 rounded-full uppercase tracking-wider border border-[#FF80A1]/20 shadow-sm">Shared Activity View</span>
                    </div>
                    {pageContent}
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
                {shareModalComponent}
                {infoModalComponent}
                {chatModalComponent}
                {evalModalComponent}
                {totalEvalModalComponent}
            </>
        );
    }

    return (
        <>
            <DashboardLayout role={userInfo?.role || 'Student'} fullWidth={true}>
                {pageContent}
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
            {shareModalComponent}
            {infoModalComponent}
            {chatModalComponent}
            {evalModalComponent}
            {totalEvalModalComponent}
        </>
    );
};

export default ViewTestResult;
