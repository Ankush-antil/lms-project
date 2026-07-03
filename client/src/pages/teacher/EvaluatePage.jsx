import React, { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, ChevronLeft, ChevronDown, ChevronUp, User, BookOpen,
    CheckCircle2, Clock, Mic, Video, FileText, Star, MessageSquare, Info, RefreshCw, Send,
    ThumbsUp, ThumbsDown, Eye, EyeOff, Share2, MoreVertical, Calendar, Cpu, Volume2, RotateCcw, Filter, Search, Loader2
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
    const [expandedSections, setExpandedSections] = useState({});
    const [marks, setMarks] = useState({});     // submissionId -> { qIdx -> marks }
    const [feedback, setFeedback] = useState({}); // submissionId -> { qIdx -> feedback }
    const [updatedVideoData, setUpdatedVideoData] = useState({}); // submissionId -> { qIdx -> videoDataJSON }
    const [saving, setSaving] = useState(null);
    const [returning, setReturning] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [collapsedFeedback, setCollapsedFeedback] = useState({}); // subId-qi -> boolean
    const { openProfile } = useUserProfile();
    const [pageContentHidden, setPageContentHidden] = useState(false);
    const [collapsedQuestions, setCollapsedQuestions] = useState({});
    const [collapsedToolbars, setCollapsedToolbars] = useState({});
    const [activeSection, setActiveSection] = useState('All'); // Section filter for teacher view
    const [searchQuery, setSearchQuery] = useState('');
    const [activeDayFilter, setActiveDayFilter] = useState('All');

    // Share Modal States
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [shareTitle, setShareTitle] = useState('');
    const [chatModalOpen, setChatModalOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [loadingChat, setLoadingChat] = useState(false);
    const [sendingChat, setSendingChat] = useState(false);
    const [activeChatSub, setActiveChatSub] = useState(null);

    const handleShare = (subId, index, testTitle) => {
        const url = `${window.location.origin}/shared/test-result/${subId}?question=${index + 1}`;
        setShareUrl(url);
        setShareTitle(`Question ${index + 1} of Activity: ${testTitle || 'Test Result'}`);
        setShareModalOpen(true);
    };

    const handleShareOverall = (subId, testTitle) => {
        const url = `${window.location.origin}/shared/test-result/${subId}`;
        setShareUrl(url);
        setShareTitle(`Activity Result: ${testTitle || 'Test Result'}`);
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

    const returnToStudent = async (submission) => {
        if (!window.confirm('Are you sure you want to return this test to the student? They will need to redo it.')) return;
        try {
            setReturning(true);
            await axios.put(`/api/submissions/${submission._id}/return`);
            toast.success('Test returned to student for redo!');
            setTimeout(() => {
                navigate('/teacher/activities');
            }, 1000);
        } catch (err) {
            console.error('Return error:', err);
            toast.error('Error returning submission.');
        } finally {
            setReturning(false);
        }
    };

    // Group all submissions by student for Step 1
    const studentGroups = {};
    submissions.forEach(sub => {
        const student = sub.student;
        if (!student) return;
        const sId = student._id || student;
        const section = student.studentProfile?.section || sub.studentSection || 'A';
        const name = sub.studentName || student.name || 'Unknown Student';
        const email = student.email || '';
        if (!studentGroups[sId]) {
            studentGroups[sId] = {
                _id: sId,
                name: name,
                avatar: student.avatar || null,
                section: section,
                email: email,
                submissionCount: 0,
                submissions: []
            };
        }
        studentGroups[sId].submissionCount += 1;
        studentGroups[sId].submissions.push(sub);
    });

    const studentsList = Object.values(studentGroups);
    const filteredStudents = studentsList.filter(student => {
        const matchesSection = activeSection === 'All' || student.section === activeSection;

        const nameLower = student.name.toLowerCase();
        const sectionLower = String(student.section).toLowerCase();
        const queryLower = searchQuery.toLowerCase();

        const matchesSearch = nameLower.includes(queryLower) ||
            sectionLower.includes(queryLower) ||
            ('section ' + sectionLower).includes(queryLower);

        return matchesSection && matchesSearch;
    });

    const showSectionsGrouped = useMemo(() => {
        const mode = user?.teacherProfile?.studentAssignmentMode;
        const sections = user?.teacherProfile?.assignedSections || [];
        return mode === 'section' && sections.length > 1;
    }, [user]);

    const studentsBySection = useMemo(() => {
        if (!showSectionsGrouped) return {};
        const groups = {};
        filteredStudents.forEach(student => {
            const sec = student.section || 'No Section';
            if (!groups[sec]) groups[sec] = [];
            groups[sec].push(student);
        });
        return groups;
    }, [filteredStudents, showSectionsGrouped]);

    const chatModalComponent = chatModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-[2rem] border border-slate-100/80 shadow-2xl overflow-hidden flex flex-col h-[80vh] max-h-[600px] text-left">
                {/* Modal Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#3E3ADD] text-white font-extrabold flex items-center justify-center shadow-md">
                            {activeChatSub?.studentName?.[0]?.toUpperCase() || 'S'}
                        </div>
                        <div>
                            <h3 className="font-extrabold text-slate-800 text-sm">{activeChatSub?.studentName || 'Student'}</h3>
                            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Student Feedback Chat</p>
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
                                Send a message to start conversation with the student.
                            </p>
                        </div>
                    ) : (
                        chatMessages.map((msg, index) => {
                            const isSelf = msg.role === 'Teacher' || msg.role === 'Admin';
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
                                handleSendFeedbackMessage(activeChatSub?._id);
                            }
                        }}
                        placeholder="Type your reply..."
                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        disabled={sendingChat}
                    />
                    <button
                        onClick={() => handleSendFeedbackMessage(activeChatSub?._id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors shrink-0 flex items-center justify-center font-bold text-xs disabled:opacity-50"
                        disabled={sendingChat || !chatInput.trim()}
                    >
                        {sendingChat ? <Loader2 size={12} className="animate-spin" /> : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    );

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

    if (id) {
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
                            <span className="text-[10px] font-bold text-slate-555">X (Twitter)</span>
                        </a>
                        <a
                            href={`mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareUrl)}`}
                            className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
                        >
                            <span className="w-12 h-12 bg-[#FDF2F4] text-[#EF4444] rounded-full flex items-center justify-center font-black text-xs shadow-sm">ML</span>
                            <span className="text-[10px] font-bold text-slate-555">Email</span>
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
                        {submission && submission.status === 'evaluated' && (
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

        return (
            <>
                <DashboardLayout role={role} fullWidth={true}>
                    {/* Single cohesive outer container */}
                    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
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
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Created By</span>
                                        <span className="font-bold text-slate-900">{test?.createdBy?.name || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Creator Role</span>
                                        <span className="font-bold text-slate-900 uppercase text-xs">{test?.createdBy?.role || 'N/A'}</span>
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
                                            const isCollapsed = collapsedQuestions[`${submission._id}-${idx}`] ?? false;

                                            return (
                                                <div key={idx} className="flex flex-col gap-4 border-b border-slate-100 last:border-b-0 pb-6 last:pb-0">
                                                    {/* Question Header Bar */}
                                                    <div className="flex justify-between items-center pb-2 border-b border-slate-100 gap-4">
                                                        <h3 className="text-base font-bold text-slate-800 flex-1 text-left">
                                                            Q{idx + 1}: {ans.questionText || "Question"}
                                                        </h3>
                                                        <button
                                                            onClick={() => setCollapsedQuestions(prev => ({ ...prev, [`${submission._id}-${idx}`]: !prev[`${submission._id}-${idx}`] }))}
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
                                                                        <div className="space-y-3">
                                                                            {!isFeedbackMode ? (
                                                                                (() => {
                                                                                    const maxMarks = q.marks || 10;
                                                                                    return (
                                                                                        <TeacherVideoReview
                                                                                            videoData={updatedVideoData[submission._id]?.[idx] ?? ans.videoData}
                                                                                            maxMarks={maxMarks}
                                                                                            initialMarks={marks[submission._id]?.[idx] ?? ans.marks ?? 0}
                                                                                            initialFeedback={feedback[submission._id]?.[idx] ?? ans.feedback ?? ''}
                                                                                            onEvaluationChange={(newMarks, newFeedback, newVideoData) =>
                                                                                                handleVideoReviewChange(submission._id, idx, newMarks, newFeedback, newVideoData)
                                                                                            }
                                                                                        />
                                                                                    );
                                                                                })()
                                                                            ) : (
                                                                                <video controls src={ans.videoData} className="w-full rounded-lg max-h-60 bg-black" />
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    {!ans.textAnswer && !ans.audioData && !ans.videoData && (
                                                                        <span className="text-slate-400 italic">No answer provided</span>
                                                                    )}
                                                                </div>

                                                                {/* Actions Toolbar at bottom */}
                                                                <div className="flex items-center justify-between bg-white px-4 py-2.5 border-t border-slate-100 flex-wrap gap-4">
                                                                    <div className="flex items-center gap-3">
                                                                        {/* Comment Toggle */}
                                                                        <button
                                                                            onClick={() => {
                                                                                setActiveChatSub(submission);
                                                                                loadChatHistory(submission._id);
                                                                                setChatModalOpen(true);
                                                                            }}
                                                                            className="flex items-center gap-2 text-sm font-semibold hover:text-[#FF80A1] transition-colors font-bold"
                                                                        >
                                                                            <MessageSquare size={16} />
                                                                            <span>Student Feedback</span>
                                                                        </button>
                                                                    </div>

                                                                    <div className="flex items-center gap-3">
                                                                        {/* Badges */}
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

                                                            {/* Conversation Thread / Feedback / Grading Section */}
                                                            {(submission.status === 'evaluated' || ans.reaction || marks[submission._id]?.[idx] || feedback[submission._id]?.[idx] || (ans.conversation && ans.conversation.length > 0)) ? (
                                                                collapsedFeedback[`${submission._id}-${idx}`] && (
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

                                                                        {/* Teacher's Current Input Area */}
                                                                        <div className="flex items-start gap-2 max-w-[95%] pt-2 text-left">
                                                                            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm">
                                                                                T
                                                                            </div>
                                                                            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm w-full relative">
                                                                                <p className="text-[9px] font-black uppercase tracking-widest mb-1.5 text-blue-500 text-left font-bold">
                                                                                    {isFeedbackMode ? 'Reply to Student Feedback' : 'Add Note / Adjust Marks'}
                                                                                </p>
                                                                                {isFeedbackMode ? (
                                                                                    <div className="space-y-1 w-full text-left">
                                                                                        <label className="text-[8px] font-bold text-slate-400 uppercase">Send Reply to Student</label>
                                                                                        <div className="relative">
                                                                                            <input
                                                                                                type="text"
                                                                                                value={feedback[submission._id]?.[idx] ?? ''}
                                                                                                onChange={e => setFeedbackText(submission._id, idx, e.target.value)}
                                                                                                className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 pr-10"
                                                                                                placeholder="Type your reply..."
                                                                                            />
                                                                                            <button
                                                                                                onClick={() => saveSingleFeedback(submission, idx)}
                                                                                                disabled={saving === `${submission._id}-${idx}` || !feedback[submission._id]?.[idx]?.trim()}
                                                                                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
                                                                                            >
                                                                                                {saving === `${submission._id}-${idx}` ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
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
                                                                                                value={marks[submission._id]?.[idx] ?? ans.marks ?? ''}
                                                                                                onChange={e => setMark(submission._id, idx, e.target.value)}
                                                                                                className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                                                                placeholder="Marks"
                                                                                            />
                                                                                        </div>
                                                                                        <div className="md:col-span-3 space-y-0.5 text-left">
                                                                                            <label className="text-[7.5px] font-bold text-slate-400 uppercase">Next Feedback Note</label>
                                                                                            <div className="relative">
                                                                                                <input
                                                                                                    type="text"
                                                                                                    value={feedback[submission._id]?.[idx] ?? ''}
                                                                                                    onChange={e => setFeedbackText(submission._id, idx, e.target.value)}
                                                                                                    className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 pr-10"
                                                                                                    placeholder="Type notes for student..."
                                                                                                />
                                                                                                <button
                                                                                                    onClick={() => saveSingleFeedback(submission, idx)}
                                                                                                    disabled={saving === `${submission._id}-${idx}` || (!feedback[submission._id]?.[idx]?.trim() && marks[submission._id]?.[idx] === undefined)}
                                                                                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
                                                                                                >
                                                                                                    {saving === `${submission._id}-${idx}` ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            ) : (
                                                                /* Initial Evaluation Input if nothing exists yet */
                                                                !isFeedbackMode && (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-50">
                                                                        <div className="space-y-2">
                                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                                                                <Star size={12} className="text-amber-400" /> Score (Weightage)
                                                                            </label>
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                value={marks[submission._id]?.[idx] ?? ans.marks ?? ''}
                                                                                onChange={e => setMark(submission._id, idx, e.target.value)}
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
                                                                                value={feedback[submission._id]?.[idx] ?? ans.feedback ?? ''}
                                                                                onChange={e => setFeedbackText(submission._id, idx, e.target.value)}
                                                                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all"
                                                                                placeholder="Type notes for student..."
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )
                                                            )}
                                                            {isFeedbackMode && !(submission.status === 'evaluated' || ans.reaction || marks[submission._id]?.[idx] || feedback[submission._id]?.[idx] || (ans.conversation && ans.conversation.length > 0)) && (
                                                                <div className="py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Awaiting Student Feedback</p>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}

                                    {/* Save Evaluation Button */}
                                    {!isFeedbackMode && (
                                        <div className="flex justify-end pt-4">
                                            <button
                                                onClick={() => submitEvaluation(submission)}
                                                disabled={saving === submission._id}
                                                className={`px-6 py-2.5 font-bold rounded-xl transition-all shadow-md hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 flex items-center gap-2 text-xs uppercase ${submission.status === 'evaluated'
                                                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200/50'
                                                    : 'bg-[#0B1520] hover:bg-[#1A2530] text-white shadow-slate-900/10'
                                                    }`}
                                            >
                                                {saving === submission._id ? (
                                                    <RefreshCw size={14} className="animate-spin" />
                                                ) : (
                                                    <>
                                                        <CheckCircle2 size={14} />
                                                        {submission.status === 'evaluated' ? 'UPDATE ASSESSMENT' : 'FINALIZE EVALUATION'}
                                                    </>
                                                )}
                                            </button>
                                        </div>
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
                                className="flex items-center gap-2 text-sm font-semibold hover:text-[#FF80A1] transition-colors font-bold"
                            >
                                <MessageSquare size={16} />
                                <span>Checking</span>
                            </button>
                            <div className="w-[1px] h-4 bg-slate-700"></div>
                            <button
                                onClick={() => returnToStudent(submission)}
                                disabled={returning}
                                className="flex items-center gap-2 text-sm font-semibold hover:text-orange-400 transition-colors font-bold disabled:opacity-50"
                                title="Return this test to student for redo"
                            >
                                <RotateCcw size={16} className={returning ? 'animate-spin' : ''} />
                                <span>{returning ? 'Returning...' : 'Return It'}</span>
                            </button>
                            <div className="w-[1px] h-4 bg-slate-700"></div>
                            <button
                                onClick={() => handleShareOverall(submission._id, test?.title)}
                                className="flex items-center gap-2 text-sm font-semibold hover:text-[#FF80A1] transition-colors font-bold"
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


                {shareModalComponent}
                {chatModalComponent}
                {infoModalComponent}
            </>
        );
    }

    const studentIdParam = queryParams.get('studentId');
    const studentSubmissions = studentIdParam ? submissions.filter(sub => {
        const sId = sub.student?._id || sub.student;
        return sId === studentIdParam;
    }) : [];
    const selectedStudentName = studentSubmissions[0]?.studentName || studentSubmissions[0]?.student?.name || 'Student';

    const filteredStudentSubmissions = studentSubmissions.filter(sub => {
        if (activeDayFilter === 'All') return true;
        const subDate = new Date(sub.submittedAt).toLocaleDateString();
        return subDate === activeDayFilter;
    });

    return (
        <DashboardLayout role={role} fullWidth={true}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            if (studentIdParam) {
                                navigate('/teacher/evaluate');
                            } else {
                                navigate(-1);
                            }
                        }}
                        className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 transition-all text-slate-500 hover:text-indigo-600 hover:shadow-md"
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            {studentIdParam ? 'Student Submissions' : 'Test Evaluations'}
                        </h1>
                        <p className="text-slate-500 text-sm font-medium">
                            {studentIdParam
                                ? (activeDayFilter !== 'All'
                                    ? filteredStudentSubmissions.length + ' matching submission' + (filteredStudentSubmissions.length !== 1 ? 's' : '') + ' by ' + selectedStudentName
                                    : studentSubmissions.length + ' test submission' + (studentSubmissions.length !== 1 ? 's' : '') + ' by ' + selectedStudentName)
                                : (searchQuery.trim() || activeSection !== 'All'
                                    ? filteredStudents.length + ' matching student' + (filteredStudents.length !== 1 ? 's' : '')
                                    : studentsList.length + ' student' + (studentsList.length !== 1 ? 's' : '') + ' with submissions')
                            }
                        </p>
                    </div>
                </div>

                {!studentIdParam && (
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setShowInfo(!showInfo)}
                            className={'flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ' + (showInfo ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-md' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50')}
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
                )}
            </div>

            {/* Search and Dropdown Filter Row */}
            {!studentIdParam && (
                <div className="flex flex-col md:flex-row gap-4 items-center mb-6 w-full">
                    {/* Search Bar */}
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by student name or section..."
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-700 text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all shadow-sm"
                        />
                    </div>

                    {/* Section Dropdown Filter */}
                    {submissions.length > 0 && (() => {
                        const allSections = [...new Set(
                            submissions
                                .map(sub => sub.student?.studentProfile?.section || sub.studentSection)
                                .filter(Boolean)
                        )].sort();
                        if (allSections.length === 0) return null;
                        return (
                            <div className="relative min-w-[160px] w-full md:w-auto">
                                <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <select
                                    value={activeSection}
                                    onChange={(e) => setActiveSection(e.target.value)}
                                    className="w-full pl-10 pr-8 py-3 bg-white border border-slate-200 rounded-2xl text-slate-700 text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all shadow-sm appearance-none cursor-pointer"
                                >
                                    <option value="All">All Sections</option>
                                    {allSections.map(sec => (
                                        <option key={sec} value={sec}>Section {sec}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            </div>
                        );
                    })()}
                </div>
            )}

            <div className="w-full space-y-3.5">
                {showInfo && submissions.length > 0 && !studentIdParam && (
                    <div className="bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 p-6 animate-fade-in relative overflow-hidden mb-4">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 -mr-16 -mt-16 rounded-full"></div>
                        <div className="relative z-10">
                            <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest block mb-1 opacity-70">Activity Identity</span>
                            <span className="text-white font-black text-lg">
                                {submissions[0].test?.index || 'No Index'}
                            </span>
                        </div>
                    </div>
                )}

                {/* If studentIdParam is set: Step 2 (tests list of the selected student) */}
                {studentIdParam ? (
                    <div className="space-y-6">
                        {/* Days Filter Dropdown */}
                        {(() => {
                            const uniqueDays = [...new Set(
                                studentSubmissions.map(sub => new Date(sub.submittedAt).toLocaleDateString())
                            )].sort((a, b) => new Date(b) - new Date(a));

                            if (uniqueDays.length === 0) return null;

                            return (
                                <div className="flex justify-start">
                                    <div className="relative min-w-[160px]">
                                        <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <select
                                            value={activeDayFilter}
                                            onChange={(e) => setActiveDayFilter(e.target.value)}
                                            className="w-full pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-2xl text-slate-700 text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 outline-none transition-all shadow-sm appearance-none cursor-pointer"
                                        >
                                            <option value="All">All Days</option>
                                            {uniqueDays.map(day => (
                                                <option key={day} value={day}>{day}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                    </div>
                                </div>
                            );
                        })()}

                        {filteredStudentSubmissions.length === 0 ? (
                            <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-100">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <FileText size={32} className="text-slate-300" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">No Submissions</h3>
                                <p className="text-slate-500 font-medium max-w-xs mx-auto text-sm">No test submissions found matching your filters.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredStudentSubmissions.map(sub => {
                                    const statusDotColor = sub.status === 'evaluated' ? 'bg-emerald-500' : 'bg-blue-600';
                                    return (
                                        <div
                                            key={sub._id}
                                            onClick={() => navigate('/teacher/evaluate/' + sub._id + (isFeedbackMode ? '?mode=feedback' : ''))}
                                            className="bg-white rounded-3xl border border-slate-200/85 p-6 hover:shadow-lg hover:border-indigo-150 transition-all duration-300 flex flex-col justify-between gap-5 relative group cursor-pointer"
                                        >
                                            <div>
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        {/* Status Dot */}
                                                        <span className={'w-3.5 h-3.5 rounded-full shrink-0 ' + statusDotColor}></span>
                                                        <h4 className="font-extrabold text-slate-800 text-base md:text-lg tracking-tight uppercase truncate">
                                                            {sub.test?.title || 'TEST'}
                                                        </h4>
                                                    </div>
                                                    <button className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                                                        <MoreVertical size={16} />
                                                    </button>
                                                </div>

                                                <div className="mt-2.5 flex items-center gap-2">
                                                    <span className={'px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ' + (sub.status === 'evaluated' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' : 'bg-blue-50 text-blue-700 border border-blue-150')}>
                                                        {sub.status === 'evaluated' ? 'Evaluated' : 'Pending'}
                                                    </span>
                                                    {(sub.student?.studentProfile?.section || sub.studentSection) && (
                                                        <span className="px-2 py-0.5 bg-violet-55 text-violet-750 border border-violet-100 rounded-md text-[9px] font-black uppercase tracking-tighter">
                                                            Section {sub.student?.studentProfile?.section || sub.studentSection}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs font-semibold mt-2">
                                                <span className="font-mono text-slate-400">
                                                    Submitted: {new Date(sub.submittedAt).toLocaleDateString()}
                                                </span>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate('/teacher/evaluate/' + sub._id + (isFeedbackMode ? '?mode=feedback' : ''));
                                                    }}
                                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-150/10 group-hover:-translate-y-0.5 active:scale-95"
                                                >
                                                    Evaluate Test
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>) : (
                    /* Step 1: Students list */
                    filteredStudents.length === 0 ? (
                        <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-100">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <User size={32} className="text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">No Students Found</h3>
                            <p className="text-slate-500 font-medium max-w-xs mx-auto text-sm">No students have submitted tests in this section.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden w-full">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50/50">
                                        <tr>
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-left">Student Name</th>
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-left">ID</th>
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-left">Institute</th>
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-left">Course</th>
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-left">Section</th>
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-left">Mobile</th>
                                            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-left">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {showSectionsGrouped ? (
                                            Object.keys(studentsBySection).sort().flatMap(secName => {
                                                const secStudents = studentsBySection[secName];
                                                const isExpanded = !!expandedSections[secName];
                                                return [
                                                    <tr
                                                        key={`header-${secName}`}
                                                        onClick={() => setExpandedSections(prev => ({ ...prev, [secName]: !prev[secName] }))}
                                                        className="bg-slate-50 hover:bg-slate-100/80 cursor-pointer select-none transition-all"
                                                    >
                                                        <td colSpan="7" className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                                            <div className="flex items-center justify-between w-full">
                                                                <div className="flex items-center space-x-2">
                                                                    <span>Section {secName}</span>
                                                                    <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
                                                                        {secStudents.length} Students
                                                                    </span>
                                                                </div>
                                                                <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                                </svg>
                                                            </div>
                                                        </td>
                                                    </tr>,
                                                    ...(isExpanded ? secStudents.map(student => {
                                                        const latestSub = student.submissions[0] || {};
                                                        const courseName = latestSub.test?.course || latestSub.student?.studentProfile?.course?.name || latestSub.student?.studentProfile?.course || 'N/A';
                                                        const mobile = latestSub.student?.mobileNumber || 'N/A';
                                                        const instituteName = latestSub.test?.institute || latestSub.student?.institute?.name || latestSub.student?.institute || 'N/A';

                                                        return (
                                                            <tr key={student._id} className="hover:bg-slate-50/60 transition-colors">
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center gap-3 pl-2">
                                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-extrabold text-xs uppercase">
                                                                            {student.name[0]}
                                                                        </div>
                                                                        <span className="font-bold text-slate-800 text-sm">{student.name}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <span className="text-xs font-mono font-bold text-slate-500">#{student._id.slice(-6).toUpperCase()}</span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-600">
                                                                    {instituteName}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <span className="px-2.5 py-1 bg-indigo-50/70 border border-indigo-100 text-indigo-700 rounded-xl text-[10px] font-extrabold uppercase tracking-wide">
                                                                        {courseName}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <span className="px-2.5 py-1 bg-violet-50 border border-violet-100 text-violet-750 rounded-xl text-[10px] font-black uppercase tracking-wide">
                                                                        Section {student.section}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-600">
                                                                    {mobile}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <button
                                                                        onClick={() => navigate('/teacher/evaluate?studentId=' + student._id)}
                                                                        className="px-4 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-100 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                                                    >
                                                                        View Tests ({student.submissionCount})
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    }) : [])
                                                ];
                                            })
                                        ) : (
                                            filteredStudents.map(student => {
                                                const latestSub = student.submissions[0] || {};
                                                const courseName = latestSub.test?.course || latestSub.student?.studentProfile?.course?.name || latestSub.student?.studentProfile?.course || 'N/A';
                                                const mobile = latestSub.student?.mobileNumber || 'N/A';
                                                const instituteName = latestSub.test?.institute || latestSub.student?.institute?.name || latestSub.student?.institute || 'N/A';

                                                return (
                                                    <tr key={student._id} className="hover:bg-slate-50/60 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-extrabold text-sm uppercase">
                                                                    {student.name[0]}
                                                                </div>
                                                                <span className="font-bold text-slate-800 text-sm">{student.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="text-xs font-mono font-bold text-slate-500">#{student._id.slice(-6).toUpperCase()}</span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-600">
                                                            {instituteName}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="px-2.5 py-1 bg-indigo-50/70 border border-indigo-100 text-indigo-700 rounded-xl text-[10px] font-extrabold uppercase tracking-wide">
                                                                {courseName}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="px-2.5 py-1 bg-violet-50 border border-violet-100 text-violet-750 rounded-xl text-[10px] font-black uppercase tracking-wide">
                                                                Section {student.section}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-600">
                                                            {mobile}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <button
                                                                onClick={() => navigate('/teacher/evaluate?studentId=' + student._id)}
                                                                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-100 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                                            >
                                                                View Tests ({student.submissionCount})
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
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
            {chatModalComponent}
        </DashboardLayout>
    );
};

export default EvaluatePage;
