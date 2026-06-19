import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, ChevronLeft, ChevronDown, ChevronUp, User, BookOpen,
    CheckCircle2, Clock, Mic, Video, FileText, Star, MessageSquare, Info, RefreshCw, Send,
    ThumbsUp, ThumbsDown, Eye, EyeOff, Share2, MoreVertical, Calendar, Cpu, Volume2
} from 'lucide-react';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import { useUserProfile } from '../../components/common/UserProfileContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import TeacherVideoReview from '../../components/teacher/TeacherVideoReview';

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
    const loomMatch = url.match(/loom\.com\/share\/([a-f0-9]+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
    if (url.includes('embed') || url.includes('player')) return url;
    return url;
};

const EvaluatePage = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const { id } = useParams();
    const queryParams = new URLSearchParams(window.location.search);
    const isFeedbackMode = queryParams.get('mode') === 'feedback';

    const role = userInfo?.role || 'Teacher';
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(id || null);
    const [marks, setMarks] = useState({});     // submissionId -> { qIdx -> marks }
    const [feedback, setFeedback] = useState({}); // submissionId -> { qIdx -> feedback }
    const [updatedVideoData, setUpdatedVideoData] = useState({}); // submissionId -> { qIdx -> videoDataJSON }
    const [saving, setSaving] = useState(null);
    const [showInfo, setShowInfo] = useState(false);
    const [collapsedFeedback, setCollapsedFeedback] = useState({}); // subId-qi -> boolean
    const { openProfile } = useUserProfile();
    const [pageContentHidden, setPageContentHidden] = useState(false);
    const [collapsedQuestions, setCollapsedQuestions] = useState({});
    const [collapsedToolbars, setCollapsedToolbars] = useState({});

    const handleVideoReviewChange = (subId, qIdx, newMarks, newFeedback, newVideoData) => {
        setMarks(prev => ({
            ...prev,
            [subId]: { ...(prev[subId] || {}), [qIdx]: newMarks }
        }));
        setFeedback(prev => ({
            ...prev,
            [subId]: { ...(prev[subId] || {}), [qIdx]: newFeedback }
        }));
        setUpdatedVideoData(prev => ({
            ...prev,
            [subId]: { ...(prev[subId] || {}), [qIdx]: newVideoData }
        }));
    };

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
                feedback: i === qIdx ? (feedback[submission._id]?.[i] ?? '') : '',
                videoData: i === qIdx ? (updatedVideoData[submission._id]?.[i] ?? a.videoData) : a.videoData
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
                feedback: feedback[submission._id]?.[i] ?? a.feedback ?? '',
                videoData: updatedVideoData[submission._id]?.[i] ?? a.videoData
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
        <DashboardLayout role={role} fullWidth={true}>
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-white rounded-xl shadow-sm border border-slate-100 transition-all text-slate-500 hover:text-indigo-600">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Test Evaluations</h1>
            </div>
            <LoadingPlaceholder type="test" />
        </DashboardLayout>
    );

    if (isFeedbackMode) {
        const submission = submissions[0];
        if (!submission) return <div className="p-10 text-center">Submission not found.</div>;
        const test = submission.test;
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
            <DashboardLayout role={role} fullWidth={true}>
                {/* Single cohesive outer container */}
                <div className="max-w-5xl mx-auto w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="bg-[#151719] px-4 md:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-[#24282B]">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <button
                                onClick={() => navigate('/teacher/activities')}
                                className="p-1.5 hover:bg-[#25282A] rounded-lg text-slate-400 hover:text-white transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div className="flex items-center gap-2">
                                <span className="text-white font-semibold text-sm md:text-base">Activity Name: {test?.title || 'Feedback'}</span>
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
                                                                     <div
                                                                         className={`flex items-center justify-center p-1.5 rounded-lg transition-all ${ans.reaction === 'like' ? 'text-amber-600 bg-amber-50' : 'text-slate-350'}`}
                                                                         title="Like"
                                                                     >
                                                                         <ThumbsUp size={16} fill={ans.reaction === 'like' ? 'currentColor' : 'none'} />
                                                                     </div>

                                                                     {/* Thumbs Down (Dislike) */}
                                                                     <div
                                                                         className={`flex items-center justify-center p-1.5 rounded-lg transition-all ${ans.reaction === 'dislike' ? 'text-amber-600 bg-amber-50' : 'text-slate-350'}`}
                                                                         title="Dislike"
                                                                     >
                                                                         <ThumbsDown size={16} fill={ans.reaction === 'dislike' ? 'currentColor' : 'none'} />
                                                                     </div>

                                                                     <div className="w-[1px] h-4 bg-slate-200"></div>

                                                                     {/* Comment Toggle */}
                                                                     <button
                                                                         onClick={() => setCollapsedFeedback(prev => ({ ...prev, [`${submission._id}-${idx}`]: !prev[`${submission._id}-${idx}`] }))}
                                                                         className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${collapsedFeedback[`${submission._id}-${idx}`] ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                                                                     >
                                                                         <MessageSquare size={14} />
                                                                         <span>Comment</span>
                                                                     </button>

                                                                     {/* Share */}
                                                                     <button
                                                                         onClick={() => {
                                                                             const textObj = `Question ${idx + 1}: ${ans.questionText || 'Feedback'} - Answer: ${ans.textAnswer || ''}`;
                                                                             navigator.clipboard.writeText(textObj);
                                                                             toast.success(`Copied question ${idx + 1} feedback details to clipboard!`);
                                                                         }}
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
                                                         {!!collapsedToolbars[idx] && collapsedFeedback[`${submission._id}-${idx}`] && (
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
                                                                         </div>
                                                                     </div>
                                                                 ))}

                                                                 {/* Dynamic Chat Input Box */}
                                                                 <div className="flex items-start gap-3 max-w-[85%]">
                                                                     <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm">
                                                                         T
                                                                     </div>
                                                                     <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm w-full relative">
                                                                         <p className="text-[9px] font-black uppercase tracking-widest mb-1.5 text-blue-500">
                                                                             Reply to Student Feedback
                                                                         </p>
                                                                         <textarea
                                                                             className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 pr-12 text-xs focus:ring-2 transition-all outline-none resize-none min-h-[60px] focus:ring-blue-400"
                                                                             placeholder="Type your reply..."
                                                                             value={feedback[submission._id]?.[idx] || ''}
                                                                             onChange={(e) => setFeedbackText(submission._id, idx, e.target.value)}
                                                                         />
                                                                         <button
                                                                             onClick={() => saveSingleFeedback(submission, idx)}
                                                                             disabled={saving === `${submission._id}-${idx}` || !feedback[submission._id]?.[idx]?.trim()}
                                                                             className="absolute bottom-5 right-5 p-1.5 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm bg-indigo-600 hover:bg-indigo-700"
                                                                         >
                                                                             {saving === `${submission._id}-${idx}` ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
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
                    <div className="bg-[#111A24] border-t border-[#1C2836] py-4 flex items-center justify-center gap-8 text-white w-full">
                        <button
                            onClick={() => {
                                setCollapsedFeedback(prev => {
                                    const anyOpen = answers.some((_, i) => prev[`${submission._id}-${i}`]);
                                    const newState = {};
                                    answers.forEach((_, i) => {
                                        newState[`${submission._id}-${i}`] = !anyOpen;
                                    });
                                    return newState;
                                });
                            }}
                            className="flex items-center gap-2 text-sm font-semibold hover:text-[#FF80A1] transition-colors"
                        >
                            <MessageSquare size={16} />
                            <span>Comment</span>
                        </button>
                        <div className="w-[1px] h-4 bg-slate-700"></div>
                        <button
                            onClick={() => {
                                const url = `${window.location.origin}/student/test-result/${submission._id}`;
                                navigator.clipboard.writeText(url);
                                toast.success('Shareable test result URL copied to clipboard!');
                            }}
                            className="flex items-center gap-2 text-sm font-semibold hover:text-[#FF80A1] transition-colors"
                        >
                            <Share2 size={16} />
                            <span>Share</span>
                        </button>
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
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role={role} fullWidth={true}>
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

            <div className="w-full space-y-3.5">
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
                        <div key={sub._id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 ${sub.status === 'evaluated' ? 'border-emerald-100 hover:border-emerald-200' : 'border-slate-100 hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/5'}`}>
                            {/* Submission Header */}
                            <div
                                className="p-3 px-5 flex items-center justify-between cursor-pointer group"
                                onClick={() => setExpandedId(expandedId === sub._id ? null : sub._id)}
                            >
                                <div className="flex items-center gap-3.5">
                                    <div
                                        className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-base shadow group-hover:scale-105 transition-transform duration-300"
                                        onClick={(e) => { e.stopPropagation(); openProfile(sub.student?._id || sub.student); }}
                                    >
                                        {sub.studentName?.[0] || sub.student?.name?.[0] || 'S'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p
                                                className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors"
                                                onClick={(e) => { e.stopPropagation(); openProfile(sub.student?._id || sub.student); }}
                                            >
                                                {sub.studentName || sub.student?.name}
                                            </p>
                                            {sub.answers.some(a => (a.conversation && a.conversation.some(msg => msg.role === 'Student')) || a.reaction) && (
                                                <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[9px] font-black uppercase tracking-tighter animate-pulse">
                                                    <MessageSquare size={10} fill="currentColor" /> Student Feedback
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
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
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                        {expandedId === sub._id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Answers */}
                            {expandedId === sub._id && (
                                <div className={`border-t border-slate-50 ${isFeedbackMode ? 'p-3 space-y-3' : 'p-4 space-y-4'} bg-slate-50/30`}>
                                    {sub.answers.map((ans, qi) => (
                                        <div key={qi} className={`bg-white rounded-2xl border border-slate-100 ${isFeedbackMode ? 'p-3.5' : 'p-4'} shadow-sm relative group overflow-hidden`}>
                                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <div className={`flex items-start justify-between ${isFeedbackMode ? 'mb-2' : 'mb-3.5'}`}>
                                                <div className="flex-1 pr-4">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="w-6 h-6 bg-slate-900 text-white rounded-md flex items-center justify-center text-[10px] font-bold">Q{qi + 1}</span>
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[9px] font-bold uppercase tracking-widest border border-slate-200">{ans.questionType}</span>
                                                    </div>
                                                    <h4 className="font-bold text-slate-800 text-base leading-snug">{ans.questionText}</h4>
                                                </div>
                                            </div>

                                            <div className={`space-y-3.5 ${isFeedbackMode ? 'mb-3' : 'mb-4'}`}>
                                                {/* Text Answer */}
                                                {ans.textAnswer && (
                                                    <div className="p-4 bg-white rounded-xl border border-slate-100 ring-1 ring-slate-50">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <FileText size={14} className="text-indigo-500" />
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Student Response</span>
                                                        </div>
                                                        <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">{ans.textAnswer}</div>
                                                    </div>
                                                )}

                                                {/* Recording */}
                                                {ans.audioData && (
                                                    <div className="p-4 bg-indigo-50/30 rounded-xl border border-indigo-100/50">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Mic size={14} className="text-indigo-600" />
                                                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em]">Voice Feedback</span>
                                                        </div>
                                                        <audio controls src={ans.audioData} className="w-full h-10" />
                                                    </div>
                                                )}

                                                {/* Recording 1 */}
                                                {ans.videoData && (
                                                    <div className="space-y-3">
                                                        {(() => {
                                                            const q = sub.test?.questions?.find(item => item.id === ans.questionId) || {};
                                                            const maxMarks = q.marks || 10;
                                                            return (
                                                                <TeacherVideoReview
                                                                    videoData={updatedVideoData[sub._id]?.[qi] ?? ans.videoData}
                                                                    maxMarks={maxMarks}
                                                                    initialMarks={marks[sub._id]?.[qi] ?? ans.marks ?? 0}
                                                                    initialFeedback={feedback[sub._id]?.[qi] ?? ans.feedback ?? ''}
                                                                    onEvaluationChange={(newMarks, newFeedback, newVideoData) =>
                                                                        handleVideoReviewChange(sub._id, qi, newMarks, newFeedback, newVideoData)
                                                                    }
                                                                />
                                                            );
                                                        })()}
                                                    </div>
                                                )}

                                                {!ans.textAnswer && !ans.audioData && !ans.videoData && (
                                                    <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No Response Provided</p>
                                                    </div>
                                                )}

                                                {/* Student Reaction Feedback */}
                                                {ans.reaction && (
                                                    <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2 text-left">
                                                        <span className="text-xs font-bold text-slate-500">Student Reaction:</span>
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${ans.reaction === 'like' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-750'}`}>
                                                            {ans.reaction === 'like' ? '👍 Liked feedback' : '👎 Disliked feedback'}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Conversation Thread Display */}
                                                {(sub.status === 'evaluated' || ans.reaction || marks[sub._id]?.[qi] || feedback[sub._id]?.[qi] || (ans.conversation && ans.conversation.length > 0)) ? (
                                                    <div className="mt-4 space-y-3">
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
                                                                        className={`flex items-start gap-1.5 max-w-[90%] ${msg.role === 'Student' ? 'flex-row-reverse ml-auto' : ''}`}
                                                                    >
                                                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-white font-bold text-[9px] shrink-0 shadow-sm ${msg.role === 'Teacher' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                                                                            {msg.role === 'Teacher' ? 'T' : (sub.studentName?.[0]?.toUpperCase() || 'S')}
                                                                        </div>
                                                                        <div className={`py-1.5 px-3 rounded-lg shadow-sm border ${msg.role === 'Teacher'
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
                                                                            <p className={`text-[11px] text-slate-700 leading-relaxed font-medium ${msg.role === 'Student' ? 'text-right' : ''}`}>
                                                                                {msg.message}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ))}

                                                                {/* Teacher's Current Input Area */}
                                                                <div className="flex items-start gap-2 max-w-[95%] pt-2 text-left">
                                                                    <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-[9px] shrink-0 shadow-sm">
                                                                        T
                                                                    </div>
                                                                    <div className="bg-white border border-slate-200 rounded-xl p-2 px-3 w-full shadow-sm">
                                                                        <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                                                            {isFeedbackMode ? 'Reply to Student Feedback' : 'Add Note / Adjust Marks'}
                                                                        </p>
                                                                        {isFeedbackMode ? (
                                                                            <div className="space-y-1 w-full text-left">
                                                                                <label className="text-[8px] font-bold text-slate-400 uppercase">Send Reply to Student</label>
                                                                                <div className="relative">
                                                                                    <input
                                                                                        type="text"
                                                                                        value={feedback[sub._id]?.[qi] ?? ''}
                                                                                        onChange={e => setFeedbackText(sub._id, qi, e.target.value)}
                                                                                        className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 pr-10"
                                                                                        placeholder="Type your reply..."
                                                                                    />
                                                                                    <button
                                                                                        onClick={() => saveSingleFeedback(sub, qi)}
                                                                                        disabled={saving === `${sub._id}-${qi}` || !feedback[sub._id]?.[qi]?.trim()}
                                                                                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
                                                                                    >
                                                                                        {saving === `${sub._id}-${qi}` ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                                                <div className="md:col-span-1 space-y-0.5 text-left">
                                                                                    <label className="text-[7.5px] font-bold text-slate-400 uppercase">Score</label>
                                                                                    <input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        value={marks[sub._id]?.[qi] ?? ans.marks ?? ''}
                                                                                        onChange={e => setMark(sub._id, qi, e.target.value)}
                                                                                        className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                                                        placeholder="Marks"
                                                                                    />
                                                                                </div>
                                                                                <div className="md:col-span-3 space-y-0.5 text-left">
                                                                                    <label className="text-[7.5px] font-bold text-slate-400 uppercase">Next Feedback Note</label>
                                                                                    <div className="relative">
                                                                                        <input
                                                                                            type="text"
                                                                                            value={feedback[sub._id]?.[qi] ?? ''}
                                                                                            onChange={e => setFeedbackText(sub._id, qi, e.target.value)}
                                                                                            className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 pr-10"
                                                                                            placeholder="Type notes for student..."
                                                                                        />
                                                                                        <button
                                                                                            onClick={() => saveSingleFeedback(sub, qi)}
                                                                                            disabled={saving === `${sub._id}-${qi}` || (!feedback[sub._id]?.[qi]?.trim() && marks[sub._id]?.[qi] === undefined)}
                                                                                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
                                                                                        >
                                                                                            {saving === `${sub._id}-${qi}` ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    /* Initial Evaluation Input if nothing exists yet */
                                                    isFeedbackMode ? (
                                                        <div className="py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Awaiting Student Feedback</p>
                                                        </div>
                                                    ) : (
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
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Save Evaluation Button */}
                                    {!isFeedbackMode && (
                                        <div className="flex justify-end pt-2">
                                            <button
                                                onClick={() => submitEvaluation(sub)}
                                                disabled={saving === sub._id}
                                                className={`px-4 py-1.5 font-bold rounded-lg transition-all shadow-sm hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 flex items-center gap-1.5 tracking-wider text-[11px] uppercase ${sub.status === 'evaluated'
                                                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200/50'
                                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200/50'
                                                    }`}
                                            >
                                                {saving === sub._id ? (
                                                    <RefreshCw size={14} className="animate-spin" />
                                                ) : (
                                                    <>
                                                        <CheckCircle2 size={14} />
                                                        {sub.status === 'evaluated' ? 'UPDATE ASSESSMENT' : 'FINALIZE EVALUATION'}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
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
