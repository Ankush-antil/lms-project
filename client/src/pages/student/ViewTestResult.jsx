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

const ViewTestResult = ({ isSharedView = false }) => {
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
    const [pageContentHidden, setPageContentHidden] = useState(false);
    const [reactions, setReactions] = useState({});

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
        <div className="max-w-5xl mx-auto w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
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
                    
                    {!isSharedView && (
                        <button className="text-slate-400 hover:text-white transition-colors">
                            <MoreVertical size={16} />
                        </button>
                    )}
                    
                    {isTeacher && !isSharedView && (
                        <button
                            onClick={() => navigate(`/teacher/evaluate/${id}`)}
                            className="bg-amber-500 hover:bg-amber-600 px-4 py-1 rounded-full text-white font-black text-xs border border-amber-600 shadow-sm flex items-center gap-2 transition-all active:scale-95"
                        >
                            <RefreshCw size={12} /> {isEvaluated ? 'Re-evaluate Test' : 'Evaluate Test'}
                        </button>
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
                                                            <div className="flex items-center gap-1 px-2.5 py-1 bg-[#F8A5C2]/15 text-[#E84393] rounded-md text-[10px] font-bold border border-[#F8A5C2]/20">
                                                                <Calendar size={11} />
                                                                <span>Teacher Evaluation</span>
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
                                                </div>

                                                {/* Conversation Thread */}
                                                {isEvaluated && collapsedFeedback[idx] && (
                                                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-fade-in text-left">
                                                        {/* Conversation History */}
                                                        {(ans.conversation || []).map((msg, mi) => (
                                                            <div
                                                                key={mi}
                                                                className={`flex items-start gap-3 max-w-[85%] ${msg.role === 'Student' ? 'flex-row-reverse ml-auto' : ''}`}
                                                            >
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm ${msg.role === 'Teacher' ? 'bg-indigo-600' : msg.role === 'Guest' ? 'bg-slate-500' : 'bg-purple-600'}`}>
                                                                    {msg.role === 'Teacher' ? 'T' : msg.role === 'Guest' ? 'G' : (submission.studentName?.[0]?.toUpperCase() || 'S')}
                                                                </div>
                                                                <div className={`rounded-2xl p-3 shadow-sm ${msg.role === 'Teacher'
                                                                    ? 'bg-blue-50 border border-blue-100 rounded-tl-none'
                                                                    : msg.role === 'Guest'
                                                                    ? 'bg-slate-50 border border-slate-200 rounded-tr-none'
                                                                    : 'bg-purple-50 border border-purple-100 rounded-tr-none'
                                                                    }`}>
                                                                    <div className={`flex items-center gap-2 mb-1 ${msg.role === 'Student' ? 'justify-end' : ''}`}>
                                                                        <p className={`text-[8px] font-black uppercase tracking-widest ${msg.role === 'Teacher' ? 'text-indigo-600' : msg.role === 'Guest' ? 'text-slate-500' : 'text-emerald-600'}`}>
                                                                            {msg.role === 'Teacher' ? 'Teacher' : msg.role === 'Guest' ? 'Guest' : (submission.studentName || 'Student')}
                                                                        </p>
                                                                        <span className="text-[8px] text-slate-400 font-bold italic">
                                                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                    <p className={`text-sm text-slate-700 leading-relaxed font-medium ${msg.role === 'Student' ? 'text-right' : ''}`}>
                                                                        {msg.message}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {/* Dynamic Chat Input Box */}
                                                        <div className={`flex items-start gap-3 max-w-[85%] ${(!isTeacher && userInfo) ? 'flex-row-reverse ml-auto' : ''}`}>
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 shadow-sm ${isTeacher ? 'bg-indigo-600 text-white' : userInfo ? 'bg-purple-600 text-white' : 'bg-slate-500 text-white'}`}>
                                                                {isTeacher ? 'T' : userInfo ? (submission.studentName?.[0]?.toUpperCase() || 'S') : 'G'}
                                                            </div>
                                                            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm w-full relative">
                                                                <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${isTeacher ? 'text-blue-500' : (userInfo ? 'text-slate-400 text-right' : 'text-slate-500')}`}>
                                                                    {isTeacher ? 'Add further feedback' : 'Send response'}
                                                                </p>
                                                                <textarea
                                                                    className={`w-full bg-slate-50 border border-slate-100 rounded-xl p-3 pr-12 text-xs focus:ring-2 transition-all outline-none resize-none min-h-[60px] ${isTeacher ? 'focus:ring-blue-400' : 'focus:ring-indigo-400'}`}
                                                                    placeholder={isTeacher ? "Type further notes..." : "Type response here..."}
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
            {isEvaluated && !isTeacher && sharedQuestionIndex === null && (
                <div className="bg-[#111A24] border-t border-[#1C2836] py-4 flex items-center justify-center gap-8 text-white w-full">
                    <button
                        onClick={handleToggleAllComments}
                        className="flex items-center gap-2 text-sm font-semibold hover:text-[#FF80A1] transition-colors font-bold"
                    >
                        <MessageSquare size={16} />
                        <span>Comment</span>
                    </button>
                    <div className="w-[1px] h-4 bg-slate-700"></div>
                    <button
                        onClick={handleShareOverall}
                        className="flex items-center gap-2 text-sm font-semibold hover:text-[#FF80A1] transition-colors font-bold"
                    >
                        <Share2 size={16} />
                        <span>Share</span>
                    </button>
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
        </>
    );
};

export default ViewTestResult;
