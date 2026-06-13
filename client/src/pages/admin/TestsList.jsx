import { useAuth } from '../../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
    Search, Filter, Plus, FileText, Clock, Calendar, Wand2, Edit, Trash2, Link2, Check,
    Globe, Copy, ExternalLink, Settings, BarChart2, ShieldCheck, Download, Mail, Lock,
    CheckCircle2, X, Eye, Loader2, EyeOff, Info, ChevronLeft, ChevronRight, Printer, ArrowLeft, Trash,
    Video, MessageSquare, AlertTriangle
} from 'lucide-react';
import TeacherVideoReview from '../../components/teacher/TeacherVideoReview';
const TestsList = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();

    // Search and tab filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSubject, setFilterSubject] = useState('All');
    const [activeTab, setActiveTab] = useState('lms'); // 'lms' | 'public'

    // Core tests data
    const [tests, setTests] = useState([]);
    const [publicTests, setPublicTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingPublic, setLoadingPublic] = useState(false);
    const [copiedId, setCopiedId] = useState(null);

    // Google Forms Style Responses States
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'responses'
    const [responsesTab, setResponsesTab] = useState('summary'); // 'summary' | 'question' | 'individual'
    const [fullTestData, setFullTestData] = useState(null);
    const [individualIndex, setIndividualIndex] = useState(0);
    const [individualSearch, setIndividualSearch] = useState('');
    const [filterDateStart, setFilterDateStart] = useState('');
    const [filterDateEnd, setFilterDateEnd] = useState('');
    const [filterScoreMin, setFilterScoreMin] = useState('');
    const [filterScoreMax, setFilterScoreMax] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    // Advanced Video Rec evaluation states
    const [playbackSpeeds, setPlaybackSpeeds] = useState({}); // key: evalKey -> speed
    const [evalState, setEvalState] = useState({}); // key: evalKey -> { comments: [], feedback: '', score: 0 }
    const [newCommentText, setNewCommentText] = useState({}); // key: evalKey -> text
    const videoRefs = useRef({}); // key: evalKey -> video DOM ref

    const handleAddComment = (evalKey, videoRef) => {
        const text = newCommentText[evalKey] || '';
        if (!text.trim()) return;

        const videoEl = videoRef.current;
        const time = videoEl ? Math.floor(videoEl.currentTime) : 0;

        const formatDuration = (sec) => {
            const m = Math.floor(sec / 60);
            const s = Math.floor(sec % 60);
            return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
        };

        const newComment = {
            time: formatDuration(time),
            timeSeconds: time,
            text: text
        };

        setEvalState(prev => {
            const current = prev[evalKey] || { comments: [], feedback: '', score: 0 };
            return {
                ...prev,
                [evalKey]: {
                    ...current,
                    comments: [...current.comments, newComment].sort((a, b) => a.timeSeconds - b.timeSeconds)
                }
            };
        });

        setNewCommentText(prev => ({ ...prev, [evalKey]: '' }));
        toast.success("Comment added at " + newComment.time);
    };

    const handleDeleteComment = (evalKey, idx) => {
        setEvalState(prev => {
            const current = prev[evalKey] || { comments: [], feedback: '', score: 0 };
            return {
                ...prev,
                [evalKey]: {
                    ...current,
                    comments: current.comments.filter((_, i) => i !== idx)
                }
            };
        });
        toast.success("Comment deleted");
    };

    const handleSaveEvaluation = async (evalKey, submissionId, qId) => {
        const data = evalState[evalKey];
        if (!data) return;

        try {
            // Update local submissions list
            setPublicSubmissions(prev => prev.map(sub => {
                if (sub._id === submissionId) {
                    const updatedAnswers = sub.answers.map(a => {
                        if (a.questionId === qId) {
                            return {
                                ...a,
                                marks: Number(data.score),
                                feedback: data.feedback,
                                comments: data.comments
                            };
                        }
                        return a;
                    });

                    // Recalculate total score
                    const newTotalScore = updatedAnswers.reduce((sum, item) => sum + (item.marks || 0), 0);
                    return {
                        ...sub,
                        answers: updatedAnswers,
                        score: newTotalScore
                    };
                }
                return sub;
            }));

            toast.success("Evaluation graded and feedback saved!");
        } catch (err) {
            console.error("Save eval error", err);
            toast.error("Failed to save evaluation");
        }
    };

    const seekVideo = (evalKey, seconds) => {
        const videoEl = videoRefs.current[evalKey];
        if (videoEl) {
            videoEl.currentTime = seconds;
            videoEl.play().catch(() => { });
        }
    };

    // Overlay & Modal states for Public assessments
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [selectedPublicTest, setSelectedPublicTest] = useState(null);
    const [publicStats, setPublicStats] = useState(null);
    const [publicSubmissions, setPublicSubmissions] = useState([]);
    const [loadingStats, setLoadingStats] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    // Public settings editing form state
    const [editSettingsForm, setEditSettingsForm] = useState({
        allowMultiple: false,
        startDate: '',
        endDate: '',
        expiryDate: '',
        maxResponses: '',
        timeLimit: 60,
        randomizeQuestions: false,
        showScoreAfterSubmission: true,
        showCorrectAnswers: false,
        allowRetake: false,
        password: '',
        antiSpam: false,
        emailNotification: {
            sendSubmissionNotification: true,
            sendScoreEmail: true,
            sendConfirmationEmail: true
        },
        assistiveFeatures: {
            relevantInformation: false,
            temporaryFill: false,
            audioAnswer: false,
            chatWithTeacher: false,
            uploadAttachment: false,
            exampleSection: false,
            calculator: false,
            aiReader: false,
            textToSpeech: false,
            speechToText: false,
            translation: false,
            accessibilityMode: false
        }
    });

    const handleCopyUrl = (testId, mode = 'connected') => {
        const path = mode === 'public' ? `/public-test/${testId}` : `/take-test/${testId}`;
        const url = `${window.location.origin}${path}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopiedId(testId);
            toast.success("URL copied to clipboard!");
            setTimeout(() => setCopiedId(null), 1500);
        }).catch(() => {
            const el = document.createElement('textarea');
            el.value = url;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopiedId(testId);
            toast.success("URL copied to clipboard!");
            setTimeout(() => setCopiedId(null), 1500);
        });
    };

    const fetchLmsTests = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/tests');
            // Filter out tests that are public
            setTests(Array.isArray(res.data) ? res.data.filter(t => t.publishMode !== 'public') : []);
        } catch (error) {
            console.error("Error fetching tests:", error);
            toast.error("Error loading tests");
        } finally {
            setLoading(false);
        }
    };

    const fetchPublicTests = async () => {
        try {
            setLoadingPublic(true);
            const res = await axios.get('/api/public-tests/admin/dashboard');
            setPublicTests(res.data);
        } catch (error) {
            console.error("Error fetching public tests dashboard:", error);
            toast.error("Error loading public tests dashboard");
        } finally {
            setLoadingPublic(false);
        }
    };

    useEffect(() => {
        if (!userInfo) {
            navigate('/');
            return;
        }

        if (activeTab === 'lms') {
            fetchLmsTests();
        } else {
            fetchPublicTests();
        }
    }, [navigate, activeTab]);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this test?')) return;
        try {
            await axios.delete(`/api/tests/${id}`);
            if (activeTab === 'lms') {
                setTests(tests.filter(t => t._id !== id));
            } else {
                setPublicTests(publicTests.filter(t => t._id !== id));
            }
            toast.success('Test deleted successfully');
        } catch (error) {
            console.error("Error deleting test:", error);
            toast.error('Error deleting test');
        }
    };

    // Toggle Active / Disabled link status
    const handleToggleStatus = async (testId, currentStatus) => {
        try {
            const res = await axios.put(`/api/public-tests/admin/${testId}/toggle-status`);
            if (res.data.success) {
                toast.success(`Public URL ${res.data.status === 'active' ? 'enabled' : 'disabled'} successfully!`);
                setPublicTests(prev => prev.map(t => t._id === testId ? { ...t, status: res.data.status } : t));
            }
        } catch (error) {
            console.error("Error toggling link status:", error);
            toast.error("Failed to update status.");
        }
    };

    // Open Settings Editor Modal
    const handleOpenSettings = (test) => {
        setSelectedPublicTest(test);
        const settings = test.publicSettings || {};
        const assist = settings.assistiveFeatures || {};
        setEditSettingsForm({
            allowMultiple: settings.allowMultiple !== false,
            startDate: settings.startDate ? new Date(settings.startDate).toISOString().split('T')[0] : '',
            endDate: settings.endDate ? new Date(settings.endDate).toISOString().split('T')[0] : '',
            expiryDate: settings.expiryDate ? new Date(settings.expiryDate).toISOString().split('T')[0] : '',
            maxResponses: settings.maxResponses || '',
            timeLimit: settings.timeLimit || 60,
            randomizeQuestions: !!settings.randomizeQuestions,
            showScoreAfterSubmission: settings.showScoreAfterSubmission !== false,
            showCorrectAnswers: !!settings.showCorrectAnswers,
            allowRetake: !!settings.allowRetake,
            password: settings.password || '',
            antiSpam: !!settings.antiSpam,
            emailNotification: {
                sendSubmissionNotification: settings.emailNotification?.sendSubmissionNotification !== false,
                sendScoreEmail: settings.emailNotification?.sendScoreEmail !== false,
                sendConfirmationEmail: settings.emailNotification?.sendConfirmationEmail !== false
            },
            assistiveFeatures: {
                relevantInformation: !!assist.relevantInformation,
                temporaryFill: !!assist.temporaryFill,
                audioAnswer: !!assist.audioAnswer,
                chatWithTeacher: !!assist.chatWithTeacher,
                uploadAttachment: !!assist.uploadAttachment,
                exampleSection: !!assist.exampleSection,
                calculator: !!assist.calculator,
                aiReader: !!assist.aiReader,
                textToSpeech: !!assist.textToSpeech,
                speechToText: !!assist.speechToText,
                translation: !!assist.translation,
                accessibilityMode: !!assist.accessibilityMode
            }
        });
        setShowSettingsModal(true);
    };

    // Save Settings
    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSavingSettings(true);
        try {
            const res = await axios.put(`/api/public-tests/admin/${selectedPublicTest._id}/settings`, {
                publicSettings: editSettingsForm
            });
            if (res.data.success) {
                toast.success("Public test settings updated successfully!");
                setShowSettingsModal(false);
                fetchPublicTests();
            }
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error("Failed to save settings.");
        } finally {
            setSavingSettings(false);
        }
    };

    const handleEmailNotificationChange = (field, checked) => {
        setEditSettingsForm(prev => ({
            ...prev,
            emailNotification: {
                ...prev.emailNotification,
                [field]: checked
            }
        }));
    };

    // Open Google Forms Style Responses Dashboard
    const handleOpenResponses = async (test, type = 'public') => {
        setSelectedPublicTest(test);
        setViewMode('responses');
        setResponsesTab('summary');
        setLoadingStats(true);
        setPublicStats(null);
        setPublicSubmissions([]);
        setFullTestData(null);
        setIndividualIndex(0);

        setIndividualSearch('');
        setFilterDateStart('');
        setFilterDateEnd('');
        setFilterScoreMin('');
        setFilterScoreMax('');
        setFilterStatus('All');

        try {
            if (type === 'public') {
                const [statsRes, subsRes, testRes] = await Promise.all([
                    axios.get(`/api/public-tests/admin/${test._id}/stats`),
                    axios.get(`/api/public-tests/admin/${test._id}/submissions`),
                    axios.get(`/api/tests/${test._id}`)
                ]);
                setPublicStats(statsRes.data);
                setPublicSubmissions(subsRes.data);
                setFullTestData(testRes.data);
            } else {
                const [subsRes, testRes] = await Promise.all([
                    axios.get(`/api/submissions/test/${test._id}`),
                    axios.get(`/api/tests/${test._id}`)
                ]);

                const formattedSubmissions = subsRes.data.map(sub => ({
                    ...sub,
                    name: sub.student?.name || sub.studentName || 'Student',
                    email: sub.student?.email || 'N/A',
                    phone: sub.phone || 'N/A',
                    organization: sub.organization || 'LMS Course: ' + (test.course || 'N/A'),
                    score: sub.totalMarks || sub.answers?.reduce((sum, a) => sum + (a.marks || 0), 0) || 0,
                    completedStatus: sub.status === 'evaluated' ? 'Completed' : 'Incomplete'
                }));

                setPublicSubmissions(formattedSubmissions);
                setFullTestData(testRes.data);
            }
        } catch (error) {
            console.error("Error fetching statistics:", error);
            toast.error("Failed to load statistics/submissions.");
        } finally {
            setLoadingStats(false);
        }
    };

    const handleDeleteSubmission = async (submissionId) => {
        if (!window.confirm("Are you sure you want to delete this response? This action cannot be undone.")) return;
        try {
            const res = await axios.delete(`/api/public-tests/admin/submissions/${submissionId}`);
            if (res.data.success) {
                toast.success("Response deleted successfully!");
                setPublicSubmissions(prev => prev.filter(s => s._id !== submissionId));
                setIndividualIndex(prev => {
                    const nextMax = publicSubmissions.length - 2;
                    if (prev > nextMax) return Math.max(0, nextMax);
                    return prev;
                });
            }
        } catch (error) {
            console.error("Error deleting submission:", error);
            toast.error(error.response?.data?.message || "Failed to delete response.");
        }
    };

    // Exports Client-side generator
    const handleExport = (format) => {
        if (!publicSubmissions.length) {
            toast.error("No responses available to export.");
            return;
        }

        const testName = selectedPublicTest?.title || 'test';

        // Build rows with question answers
        const qHeaders = fullTestData?.questions?.map((q, idx) => `Q${idx + 1}: ${q.text}`) || [];
        const headers = ['Name', 'Email', 'Phone', 'Organization', 'Score', 'IP Address', 'Device', 'Date', ...qHeaders];
        const rows = publicSubmissions.map(sub => {
            const qAnswers = fullTestData?.questions?.map(q => {
                const ans = sub.answers?.find(a => a.questionId === q.id);
                return ans?.textAnswer || (ans?.audioData ? '[Recording]' : ans?.videoData ? '[Recording 1]' : '');
            }) || [];
            return [
                sub.name,
                sub.email,
                sub.phone || 'N/A',
                sub.organization || 'N/A',
                sub.score,
                sub.ipAddress || 'N/A',
                sub.deviceInfo ? sub.deviceInfo.split(')')[0].replace('Mozilla/5.0 (', '') : 'N/A',
                new Date(sub.submittedAt).toLocaleString(),
                ...qAnswers
            ];
        });

        if (format === 'csv' || format === 'excel') {
            const csvContent = [
                headers.join(','),
                ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `${testName}_submissions.${format === 'excel' ? 'xls' : 'csv'}`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success(`Exported submissions list to ${format.toUpperCase()} successfully.`);
        } else if (format === 'pdf') {
            // High fidelity Printable page view mock
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>${testName} Submissions Export</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #1e293b; }
                        h1 { color: #4f46e5; margin-bottom: 5px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { padding: 10px; border: 1px solid #e2e8f0; text-align: left; font-size: 12px; }
                        th { background-color: #f8fafc; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h1>Assessment: ${testName}</h1>
                    <p>Generated: ${new Date().toLocaleString()}</p>
                    <p>Total Submissions: ${publicSubmissions.length}</p>
                    <table>
                        <thead>
                            <tr>
                                ${headers.map(h => `<th>${h}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.map(r => `
                                <tr>
                                    ${r.map(val => `<td>${val}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
            toast.success("Print dialog opened for PDF export.");
        }
    };

    const handlePrintIndividual = (submission) => {
        if (!submission) return;
        const testName = selectedPublicTest?.title || 'Test';
        const printWindow = window.open('', '_blank');

        const questionsHtml = fullTestData?.questions?.map((q, idx) => {
            const subAns = submission.answers?.find(a => a.questionId === q.id);
            const marksEarned = subAns?.marks || 0;
            const totalMarks = q.marks || 1;

            let answerContent = '';
            if (q.type?.toLowerCase() === 'multiple choice' || q.type?.toLowerCase() === 'dropdown' || q.type?.toLowerCase() === 'checkboxes') {
                answerContent = `
                    <ul style="list-style: none; padding-left: 0;">
                        ${q.options?.map(opt => {
                    let isSelected = false;
                    if (q.type?.toLowerCase() === 'checkboxes') {
                        let textAnswers = [];
                        if (Array.isArray(subAns?.textAnswer)) {
                            textAnswers = subAns.textAnswer;
                        } else if (typeof subAns?.textAnswer === 'string') {
                            if (subAns.textAnswer.startsWith('[')) {
                                try { textAnswers = JSON.parse(subAns.textAnswer); } catch (e) { textAnswers = subAns.textAnswer.split(','); }
                            } else {
                                textAnswers = subAns.textAnswer.split(',');
                            }
                        }
                        isSelected = textAnswers.map(t => t?.trim()?.toLowerCase()).includes(opt.text?.trim()?.toLowerCase());
                    } else {
                        isSelected = subAns?.textAnswer?.trim()?.toLowerCase() === opt.text?.trim()?.toLowerCase();
                    }
                    const isCorrect = opt.isCorrect;

                    let marker = '○';
                    if (q.type?.toLowerCase() === 'checkboxes') marker = '□';

                    let style = '';
                    if (isSelected && isCorrect) {
                        style = 'color: #16a34a; font-weight: bold;';
                        marker = q.type?.toLowerCase() === 'checkboxes' ? '☑' : '●';
                    } else if (isSelected && !isCorrect) {
                        style = 'color: #dc2626; font-style: italic;';
                        marker = q.type?.toLowerCase() === 'checkboxes' ? '☒' : '●';
                    } else if (isCorrect) {
                        style = 'color: #16a34a; font-weight: bold;';
                    }

                    return `<li style="margin-bottom: 5px; ${style}">${marker} ${opt.text} ${isSelected ? '<strong>(Selected)</strong>' : ''} ${isCorrect ? '<span style="font-size: 10px;">✓ Correct</span>' : ''}</li>`;
                }).join('')}
                    </ul>
                `;
            } else {
                if (subAns?.audioData) {
                    answerContent = `<p style="font-style: italic; color: #475569;">[Audio Recording Answered]</p>`;
                } else if (subAns?.videoData) {
                    answerContent = `<p style="font-style: italic; color: #475569;">[Video Recording Answered]</p>`;
                } else {
                    answerContent = `<p style="background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; white-space: pre-wrap;">${subAns?.textAnswer || 'No answer submitted'}</p>`;
                }
            }

            return `
                <div style="margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 8px;">
                        <span>Q${idx + 1}. ${q.text}</span>
                        <span style="font-size: 12px; color: #4f46e5;">[Score: ${marksEarned} / ${totalMarks} pts]</span>
                    </div>
                    <div>${answerContent}</div>
                </div>
            `;
        }).join('') || '';

        printWindow.document.write(`
            <html>
            <head>
                <title>${testName} - Response by ${submission.name}</title>
                <style>
                    body { font-family: sans-serif; padding: 30px; color: #1e293b; max-width: 800px; margin: 0 auto; }
                    h1 { color: #4f46e5; margin-bottom: 5px; font-size: 24px; }
                    .meta-box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin: 20px 0; background: #f8fafc; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; }
                    .meta-item { margin-bottom: 5px; }
                    .meta-label { font-weight: bold; color: #64748b; }
                    .score-badge { grid-column: span 2; background: #e0e7ff; color: #4338ca; font-weight: bold; text-align: center; padding: 8px; border-radius: 8px; font-size: 16px; margin-top: 5px; }
                </style>
            </head>
            <body>
                <h1>${testName} - Student Response</h1>
                <p style="color: #64748b; font-size: 12px;">Submitted on: ${new Date(submission.submittedAt).toLocaleString()}</p>
                
                <div class="meta-box">
                    <div class="meta-item"><span class="meta-label">Candidate Name:</span> ${submission.name}</div>
                    <div class="meta-item"><span class="meta-label">Email:</span> ${submission.email}</div>
                    <div class="meta-item"><span class="meta-label">Phone:</span> ${submission.phone || 'N/A'}</div>
                    <div class="meta-item"><span class="meta-label">Organization:</span> ${submission.organization || 'N/A'}</div>
                    <div class="meta-item"><span class="meta-label">IP Address:</span> ${submission.ipAddress || 'N/A'}</div>
                    <div class="meta-item"><span class="meta-label">Device:</span> ${submission.deviceInfo || 'N/A'}</div>
                    <div class="score-badge">Total Score: ${submission.score} pts</div>
                </div>
                
                <h2 style="font-size: 18px; margin-top: 30px; margin-bottom: 15px; color: #334155; border-bottom: 2px solid #cbd5e1; padding-bottom: 5px;">Response Details</h2>
                ${questionsHtml}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    // Filter tests
    const filteredTests = tests.filter(test => {
        const titleMatch = (test.title || 'Untitled').toLowerCase().includes(searchTerm.toLowerCase());
        const subjectMatch = filterSubject === 'All' || test.subject === filterSubject;
        return titleMatch && subjectMatch;
    }).sort((a, b) => {
        const getNum = (s) => parseInt(s?.match(/\d+/)?.[0] || 0);
        const numA = getNum(a.index);
        const numB = getNum(b.index);
        if (numA !== numB) return numA - numB;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const filteredPublicTests = publicTests.filter(test => {
        return (test.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    });

    const uniqueSubjects = ['All', ...new Set(tests.map(t => t.subject).filter(s => s && s.trim() !== ''))];

    if (viewMode === 'responses') {
        const totalMarks = fullTestData?.questions?.reduce((sum, q) => sum + (q.marks || 1), 0) || 10;
        const filteredSubmissions = publicSubmissions.filter(sub => {
            if (individualSearch) {
                const query = individualSearch.toLowerCase();
                const matchesName = (sub.name || '').toLowerCase().includes(query);
                const matchesEmail = (sub.email || '').toLowerCase().includes(query);
                const matchesPhone = (sub.phone || '').toLowerCase().includes(query);
                const matchesId = (sub._id || '').toLowerCase().includes(query);
                if (!matchesName && !matchesEmail && !matchesPhone && !matchesId) {
                    return false;
                }
            }
            if (filterDateStart) {
                const start = new Date(filterDateStart);
                start.setHours(0, 0, 0, 0);
                if (new Date(sub.submittedAt) < start) return false;
            }
            if (filterDateEnd) {
                const end = new Date(filterDateEnd);
                end.setHours(23, 59, 59, 999);
                if (new Date(sub.submittedAt) > end) return false;
            }
            if (filterScoreMin !== '') {
                if (sub.score < Number(filterScoreMin)) return false;
            }
            if (filterScoreMax !== '') {
                if (sub.score > Number(filterScoreMax)) return false;
            }
            if (filterStatus !== 'All') {
                const status = sub.completedStatus || 'Completed';
                if (status.toLowerCase() !== filterStatus.toLowerCase()) return false;
            }
            return true;
        });

        const totalCount = filteredSubmissions.length;

        const avgScore = filteredSubmissions.length > 0
            ? (filteredSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / filteredSubmissions.length).toFixed(1)
            : '0.0';

        const passingMarks = fullTestData?.settings?.passingMarks || 0;
        const passThreshold = passingMarks || Math.round(totalMarks * 0.4);
        const passCount = filteredSubmissions.filter(s => (s.score || 0) >= passThreshold).length;
        const passPercentage = filteredSubmissions.length > 0
            ? Math.round((passCount / filteredSubmissions.length) * 100)
            : 0;

        const pendingCount = filteredSubmissions.filter(s =>
            s.answers?.some(a => ['short answer', 'long answer', 'audio', 'video'].includes(a.questionType?.toLowerCase()) && a.marks === 0)
        ).length;

        const uniqueEmails = new Set(filteredSubmissions.map(s => s.email.toLowerCase()));
        const uniqueCount = uniqueEmails.size;

        const hasVideoQuestion = fullTestData?.questions?.some(q => q.type === 'Video Rec');
        let videoAnalytics = { totalRecordings: 0, avgDuration: 0, avgScore: 0, completionRate: 0 };
        if (hasVideoQuestion && filteredSubmissions.length > 0) {
            let videoAnswers = [];
            filteredSubmissions.forEach(sub => {
                const vAns = sub.answers?.find(a => a.questionType === 'Video Rec' && a.videoData);
                if (vAns) videoAnswers.push(vAns);
            });
            const totalSubs = filteredSubmissions.length;
            const totalRecs = videoAnswers.length;
            let totalDur = 0;
            let totalScore = 0;
            videoAnswers.forEach(ans => {
                let dur = 15; // fallback
                try {
                    if (ans.videoData.startsWith('{')) {
                        const parsed = JSON.parse(ans.videoData);
                        dur = parsed.duration || 15;
                    }
                } catch (e) { }
                totalDur += dur;
                totalScore += ans.marks || 0;
            });
            videoAnalytics = {
                totalRecordings: totalRecs,
                avgDuration: totalRecs > 0 ? Math.round(totalDur / totalRecs) : 0,
                avgScore: totalRecs > 0 ? (totalScore / totalRecs).toFixed(1) : '0.0',
                completionRate: totalSubs > 0 ? Math.round((totalRecs / totalSubs) * 100) : 0
            };
        }

        const submissionsByDate = {};
        filteredSubmissions.forEach(sub => {
            const d = new Date(sub.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            submissionsByDate[d] = (submissionsByDate[d] || 0) + 1;
        });
        const dateList = Object.keys(submissionsByDate).sort((a, b) => {
            const subA = filteredSubmissions.find(s => new Date(s.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === a);
            const subB = filteredSubmissions.find(s => new Date(s.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === b);
            return new Date(subA.submittedAt) - new Date(subB.submittedAt);
        });
        const maxCount = Math.max(...Object.values(submissionsByDate), 1);
        const points = dateList.map((date, index) => {
            const x = 30 + (index / Math.max(dateList.length - 1, 1)) * (500 - 60);
            const count = submissionsByDate[date];
            const y = 150 - 30 - (count / maxCount) * (150 - 60);
            return { x, y, date, count };
        });

        const bins = [
            { label: '0-20%', min: 0, max: totalMarks * 0.2, count: 0 },
            { label: '21-40%', min: totalMarks * 0.2 + 0.01, max: totalMarks * 0.4, count: 0 },
            { label: '41-60%', min: totalMarks * 0.4 + 0.01, max: totalMarks * 0.6, count: 0 },
            { label: '61-80%', min: totalMarks * 0.6 + 0.01, max: totalMarks * 0.8, count: 0 },
            { label: '81-100%', min: totalMarks * 0.8 + 0.01, max: totalMarks, count: 0 },
        ];
        filteredSubmissions.forEach(sub => {
            const score = sub.score || 0;
            for (let bin of bins) {
                if (score >= bin.min && score <= bin.max) {
                    bin.count++;
                    break;
                }
            }
        });

        const activeSubmission = filteredSubmissions[individualIndex];

        return (
            <DashboardLayout role="Admin">
                <div className="max-w-7xl mx-auto px-4 py-2 font-sans">
                    {/* Back to list */}
                    <button
                        onClick={() => setViewMode('list')}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-bold transition-all mb-4"
                    >
                        <ArrowLeft size={16} /> Back to Assessments
                    </button>

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                Responses: <span className="text-indigo-650">{selectedPublicTest?.title}</span>
                            </h1>
                            <p className="text-slate-500 text-sm font-semibold">Responses cannot be edited. Showing {filteredSubmissions.length} of {publicSubmissions.length} total submissions.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {/* View in Sheets */}
                            <button
                                onClick={() => handleExport('excel')}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-100"
                                title="View in Sheets / Export Excel"
                            >
                                <FileText size={14} className="text-emerald-100" />
                                <span>View in Sheets</span>
                            </button>

                            {/* Excel Export */}
                            <button
                                onClick={() => handleExport('excel')}
                                className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                            >
                                <Download size={13} className="text-slate-400" /> Excel
                            </button>

                            {/* CSV Export */}
                            <button
                                onClick={() => handleExport('csv')}
                                className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                            >
                                <Download size={13} className="text-slate-400" /> CSV
                            </button>

                            {/* PDF Export */}
                            <button
                                onClick={() => handleExport('pdf')}
                                className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                            >
                                <Download size={13} className="text-slate-400" /> PDF
                            </button>

                            {/* Print */}
                            <button
                                onClick={() => window.print()}
                                className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                            >
                                <Printer size={13} className="text-slate-400" /> Print
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-200 mb-6 bg-white rounded-t-2xl px-4 pt-2">
                        <button
                            onClick={() => setResponsesTab('summary')}
                            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${responsesTab === 'summary'
                                ? 'border-indigo-600 text-indigo-650'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            Summary
                        </button>
                        <button
                            onClick={() => setResponsesTab('question')}
                            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${responsesTab === 'question'
                                ? 'border-indigo-600 text-indigo-650'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            Question
                        </button>
                        <button
                            onClick={() => setResponsesTab('individual')}
                            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${responsesTab === 'individual'
                                ? 'border-indigo-600 text-indigo-650'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            Individual
                        </button>
                    </div>

                    {/* Filter Bar */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-105 flex flex-wrap gap-4 items-center justify-between mb-6">
                        <div className="flex-1 min-w-[240px] relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by candidate name, email, phone, ID..."
                                value={individualSearch}
                                onChange={(e) => {
                                    setIndividualSearch(e.target.value);
                                    setIndividualIndex(0);
                                }}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-indigo-500 transition-all font-medium text-slate-700"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                                <span className="text-[10px] font-bold text-slate-500">From</span>
                                <input
                                    type="date"
                                    value={filterDateStart}
                                    onChange={(e) => {
                                        setFilterDateStart(e.target.value);
                                        setIndividualIndex(0);
                                    }}
                                    className="bg-transparent text-xs outline-none text-slate-700 border-none font-semibold p-0 cursor-pointer w-28"
                                />
                                <span className="text-[10px] font-bold text-slate-500">To</span>
                                <input
                                    type="date"
                                    value={filterDateEnd}
                                    onChange={(e) => {
                                        setFilterDateEnd(e.target.value);
                                        setIndividualIndex(0);
                                    }}
                                    className="bg-transparent text-xs outline-none text-slate-700 border-none font-semibold p-0 cursor-pointer w-28"
                                />
                                {(filterDateStart || filterDateEnd) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFilterDateStart('');
                                            setFilterDateEnd('');
                                        }}
                                        className="text-slate-405 hover:text-slate-650"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                                <span className="text-[10px] font-bold text-slate-500">Score:</span>
                                <input
                                    type="number"
                                    placeholder="Min"
                                    value={filterScoreMin}
                                    onChange={(e) => {
                                        setFilterScoreMin(e.target.value);
                                        setIndividualIndex(0);
                                    }}
                                    className="bg-transparent text-xs outline-none text-slate-750 border-none font-semibold p-0 w-10 text-center"
                                />
                                <span className="text-slate-300">-</span>
                                <input
                                    type="number"
                                    placeholder="Max"
                                    value={filterScoreMax}
                                    onChange={(e) => {
                                        setFilterScoreMax(e.target.value);
                                        setIndividualIndex(0);
                                    }}
                                    className="bg-transparent text-xs outline-none text-slate-755 border-none font-semibold p-0 w-10 text-center"
                                />
                                {(filterScoreMin !== '' || filterScoreMax !== '') && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFilterScoreMin('');
                                            setFilterScoreMax('');
                                        }}
                                        className="text-slate-405 hover:text-slate-655"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            <div className="relative">
                                <select
                                    value={filterStatus}
                                    onChange={(e) => {
                                        setFilterStatus(e.target.value);
                                        setIndividualIndex(0);
                                    }}
                                    className="pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none appearance-none cursor-pointer font-bold text-slate-750"
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Incomplete">Incomplete</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Content display based on active tab */}
                    {loadingStats ? (
                        <div className="h-96 flex flex-col items-center justify-center gap-3">
                            <Loader2 size={36} className="text-indigo-650 animate-spin" />
                            <p className="text-slate-400 text-xs font-semibold">Loading stats & submissions...</p>
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            {/* Summary Tab */}
                            {responsesTab === 'summary' && (
                                <>
                                    {/* Metrics Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                                        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden group">
                                            <div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Responses</span>
                                                <span className="text-2xl font-black text-slate-800 block mt-1">{filteredSubmissions.length}</span>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between">
                                                <span className="text-[10px] text-slate-400 font-bold">In selected filter</span>
                                                <span className="p-1.5 bg-indigo-50 text-indigo-650 rounded-lg"><FileText size={14} /></span>
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden group">
                                            <div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Completed</span>
                                                <span className="text-2xl font-black text-emerald-600 block mt-1">
                                                    {filteredSubmissions.filter(s => s.completedStatus === 'Completed' || !s.completedStatus).length}
                                                </span>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between">
                                                <span className="text-[10px] text-slate-400 font-bold">Submissions finished</span>
                                                <span className="p-1.5 bg-emerald-50 text-emerald-605 rounded-lg"><CheckCircle2 size={14} /></span>
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden group">
                                            <div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Avg Score</span>
                                                <span className="text-2xl font-black text-indigo-650 block mt-1">
                                                    {avgScore} <span className="text-xs text-slate-400 font-bold">/ {totalMarks} pts</span>
                                                </span>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between">
                                                <span className="text-[10px] text-slate-400 font-bold">Mean score</span>
                                                <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><ShieldCheck size={14} /></span>
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden group">
                                            <div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pass %</span>
                                                <span className="text-2xl font-black text-blue-650 block mt-1">{passPercentage}%</span>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between">
                                                <span className="text-[10px] text-slate-400 font-bold">Passed (Score &ge; {passThreshold})</span>
                                                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><CheckCircle2 size={14} /></span>
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden group">
                                            <div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pending Grading</span>
                                                <span className="text-2xl font-black text-amber-600 block mt-1">{pendingCount}</span>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between">
                                                <span className="text-[10px] text-slate-400 font-bold">Subjective answers</span>
                                                <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Clock size={14} /></span>
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden group">
                                            <div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Unique Emails</span>
                                                <span className="text-2xl font-black text-violet-650 block mt-1">{uniqueCount}</span>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between">
                                                <span className="text-[10px] text-slate-400 font-bold">Distinct participants</span>
                                                <span className="p-1.5 bg-violet-50 text-violet-605 rounded-lg"><Globe size={14} /></span>
                                            </div>
                                        </div>
                                    </div>

                                    {hasVideoQuestion && (
                                        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-3xl p-6 mb-6 shadow-xl relative overflow-hidden">
                                            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-[size:16px_16px]" />
                                            <div className="relative z-10">
                                                <h3 className="text-sm font-black uppercase tracking-widest text-[#B282FF] mb-4 flex items-center gap-1.5"><Video size={16} /> Video Submission Analytics</h3>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                    <div>
                                                        <span className="text-[10px] text-slate-300 font-bold block">Total Video Clips</span>
                                                        <span className="text-3xl font-black block mt-1">{videoAnalytics.totalRecordings}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] text-slate-300 font-bold block">Average Duration</span>
                                                        <span className="text-3xl font-black block mt-1">{videoAnalytics.avgDuration}s</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] text-slate-300 font-bold block">Average Score</span>
                                                        <span className="text-3xl font-black block mt-1">{videoAnalytics.avgScore} pts</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] text-slate-300 font-bold block">Completion Rate</span>
                                                        <span className="text-3xl font-black block mt-1">{videoAnalytics.completionRate}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Charts */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-800 mb-1">Submission Trend</h4>
                                                <p className="text-xs text-slate-400 font-medium mb-4">Timeline of student submissions count per day</p>
                                            </div>

                                            {dateList.length > 0 ? (
                                                <div className="w-full">
                                                    <svg viewBox="0 0 500 150" className="w-full overflow-visible">
                                                        <defs>
                                                            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                                                                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                                                            </linearGradient>
                                                        </defs>
                                                        <line x1="30" y1="30" x2="470" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                                                        <line x1="30" y1="75" x2="470" y2="75" stroke="#f1f5f9" strokeWidth="1" />
                                                        <line x1="30" y1="120" x2="470" y2="120" stroke="#cbd5e1" strokeWidth="1.5" />

                                                        {points.length > 1 && (
                                                            <path
                                                                d={`M ${points[0].x} 120 ` + points.map(p => `L ${p.x} ${p.y}`).join(' ') + ` L ${points[points.length - 1].x} 120 Z`}
                                                                fill="url(#trendGradient)"
                                                            />
                                                        )}
                                                        <path
                                                            d={points.length === 1 ? `M 30 ${points[0].y} L 470 ${points[0].y}` : points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                                                            fill="none"
                                                            stroke="#4f46e5"
                                                            strokeWidth="2.5"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                        {points.map((p, idx) => (
                                                            <g key={idx} className="group/point cursor-pointer">
                                                                <circle cx={p.x} cy={p.y} r="4" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                                                                <circle cx={p.x} cy={p.y} r="8" fill="#4f46e5" fillOpacity="0" className="hover:fill-opacity-20 transition-all" />
                                                                <title>{`${p.date}: ${p.count} submissions`}</title>
                                                            </g>
                                                        ))}
                                                    </svg>
                                                    <div className="flex justify-between px-7 mt-2 text-[10px] font-bold text-slate-400">
                                                        <span>{dateList[0]}</span>
                                                        {dateList.length > 2 && <span>{dateList[Math.floor(dateList.length / 2)]}</span>}
                                                        {dateList.length > 1 && <span>{dateList[dateList.length - 1]}</span>}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-40 flex items-center justify-center text-slate-400 text-xs font-semibold">
                                                    No trend logs available yet.
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-800 mb-1">Score Distribution</h4>
                                                <p className="text-xs text-slate-400 font-medium mb-4">Histogram of candidate scores categorized in ranges</p>
                                            </div>

                                            {filteredSubmissions.length > 0 ? (
                                                <div className="space-y-3">
                                                    {bins.map((bin, idx) => {
                                                        const pct = Math.round((bin.count / filteredSubmissions.length) * 100);
                                                        return (
                                                            <div key={idx} className="flex items-center gap-3">
                                                                <span className="w-16 text-right text-xs font-bold text-slate-500">{bin.label}</span>
                                                                <div className="flex-1 bg-slate-50 h-5 rounded-lg overflow-hidden border border-slate-100 flex items-center relative">
                                                                    <div className="bg-indigo-600 h-full rounded-l-lg transition-all duration-500" style={{ width: `${pct}%` }} />
                                                                    <span className="absolute left-2.5 text-[10px] font-bold text-slate-705">{bin.count} ({pct}%)</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="h-40 flex items-center justify-center text-slate-400 text-xs font-semibold">
                                                    No score distribution data available.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-800 mb-1">Performance by Question</h4>
                                                <p className="text-xs text-slate-400 font-medium mb-4">Correct response rate for each question in the test</p>
                                            </div>

                                            {filteredSubmissions.length > 0 && fullTestData?.questions?.length > 0 ? (
                                                <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {fullTestData.questions.map((q, idx) => {
                                                        const correctCount = filteredSubmissions.filter(sub => {
                                                            const ans = sub.answers?.find(a => a.questionId === q.id);
                                                            return ans && ans.marks > 0;
                                                        }).length;
                                                        const successPct = Math.round((correctCount / filteredSubmissions.length) * 100);

                                                        let barColor = 'bg-emerald-500';
                                                        let textColor = 'text-emerald-700';
                                                        if (successPct < 40) {
                                                            barColor = 'bg-rose-500';
                                                            textColor = 'text-rose-700';
                                                        } else if (successPct < 70) {
                                                            barColor = 'bg-amber-500';
                                                            textColor = 'text-amber-700';
                                                        }

                                                        return (
                                                            <div key={q.id} className="space-y-1">
                                                                <div className="flex justify-between items-start text-xs font-bold">
                                                                    <span className="text-slate-700 truncate max-w-[300px]" title={q.text}>
                                                                        Q{idx + 1}. {q.text}
                                                                    </span>
                                                                    <span className={`${textColor}`}>{successPct}% Correct</span>
                                                                </div>
                                                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                                    <div className={`${barColor} h-full rounded-full transition-all`} style={{ width: `${successPct}%` }} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="h-40 flex items-center justify-center text-slate-400 text-xs font-semibold">
                                                    No question performance log available.
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-800 mb-1">Device Breakdown</h4>
                                                <p className="text-xs text-slate-400 font-medium mb-4">Platform distribution of student submissions</p>
                                            </div>

                                            {filteredSubmissions.length > 0 ? (
                                                <div className="space-y-4">
                                                    {['Desktop', 'Mobile', 'Tablet'].map(type => {
                                                        const count = filteredSubmissions.filter(s => {
                                                            let dev = 'Desktop';
                                                            if (s.deviceInfo) {
                                                                const lower = s.deviceInfo.toLowerCase();
                                                                if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) dev = 'Mobile';
                                                                else if (lower.includes('tablet') || lower.includes('ipad')) dev = 'Tablet';
                                                            }
                                                            return dev === type;
                                                        }).length;
                                                        const pct = Math.round((count / filteredSubmissions.length) * 100);

                                                        return (
                                                            <div key={type} className="space-y-1">
                                                                <div className="flex justify-between text-xs font-bold text-slate-655 font-mono">
                                                                    <span>{type}</span>
                                                                    <span>{count} attempts ({pct}%)</span>
                                                                </div>
                                                                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                                                    <div className="bg-violet-600 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="h-40 flex items-center justify-center text-slate-400 text-xs font-semibold">
                                                    No device breakdown data available.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Question Tab */}
                            {responsesTab === 'question' && (
                                <div className="space-y-6">
                                    {fullTestData?.questions?.map((q, idx) => {
                                        const qType = q.type || 'Multiple Choice';
                                        const isChoice = ['multiple choice', 'dropdown', 'checkboxes'].includes(qType.toLowerCase());

                                        const answersForQ = filteredSubmissions.map(sub => {
                                            const ans = sub.answers?.find(a => a.questionId === q.id);
                                            return {
                                                name: sub.name,
                                                email: sub.email,
                                                date: sub.submittedAt,
                                                textAnswer: ans?.textAnswer || '',
                                                audioData: ans?.audioData || '',
                                                videoData: ans?.videoData || '',
                                                marks: ans?.marks || 0
                                            };
                                        }).filter(a => a.textAnswer || a.audioData || a.videoData);

                                        return (
                                            <div key={q.id} className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm space-y-4">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-800">
                                                            <span className="text-indigo-650 mr-1.5 font-extrabold">Question {idx + 1}:</span> {q.text}
                                                        </h4>
                                                        <span className="inline-block mt-2 px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                            {qType}
                                                        </span>
                                                    </div>
                                                    <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-extrabold rounded-xl">
                                                        {q.marks || 1} pts
                                                    </span>
                                                </div>

                                                {isChoice ? (
                                                    <div className="space-y-3 pt-2">
                                                        {q.options?.map((opt, oIdx) => {
                                                            const chosenCount = filteredSubmissions.filter(sub => {
                                                                const ans = sub.answers?.find(a => a.questionId === q.id);
                                                                if (!ans) return false;
                                                                if (qType.toLowerCase() === 'checkboxes') {
                                                                    let textAnswers = [];
                                                                    if (Array.isArray(ans.textAnswer)) {
                                                                        textAnswers = ans.textAnswer;
                                                                    } else if (typeof ans.textAnswer === 'string') {
                                                                        if (ans.textAnswer.startsWith('[')) {
                                                                            try { textAnswers = JSON.parse(ans.textAnswer); } catch (e) { textAnswers = ans.textAnswer.split(','); }
                                                                        } else {
                                                                            textAnswers = ans.textAnswer.split(',');
                                                                        }
                                                                    }
                                                                    return textAnswers.map(t => t?.trim()?.toLowerCase()).includes(opt.text?.trim()?.toLowerCase());
                                                                } else {
                                                                    return ans.textAnswer?.trim()?.toLowerCase() === opt.text?.trim()?.toLowerCase();
                                                                }
                                                            }).length;
                                                            const pct = filteredSubmissions.length > 0 ? Math.round((chosenCount / filteredSubmissions.length) * 100) : 0;
                                                            const isCorrect = opt.isCorrect;

                                                            return (
                                                                <div key={oIdx} className="space-y-1">
                                                                    <div className="flex justify-between text-xs items-center font-semibold text-slate-700">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-655'
                                                                                }`}>
                                                                                {isCorrect ? '✓' : oIdx + 1}
                                                                            </span>
                                                                            <span className={isCorrect ? 'text-emerald-705 font-bold' : 'text-slate-700'}>
                                                                                {opt.text}
                                                                            </span>
                                                                            {isCorrect && (
                                                                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">Correct</span>
                                                                            )}
                                                                        </div>
                                                                        <span className="text-slate-500 font-bold">{chosenCount} responses ({pct}%)</span>
                                                                    </div>
                                                                    <div className="w-full bg-slate-50 h-3 rounded-lg overflow-hidden border border-slate-100">
                                                                        <div className={`h-full rounded-lg transition-all ${isCorrect ? 'bg-emerald-550' : 'bg-indigo-455'
                                                                            }`} style={{ width: `${pct}%` }} />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2.5 pt-2">
                                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Student Answers ({answersForQ.length})</span>
                                                        <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                                            {answersForQ.map((ans, aIdx) => (
                                                                <div key={aIdx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                                                                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                                                        <span>{ans.name} ({ans.email})</span>
                                                                        <span>{new Date(ans.date).toLocaleString()}</span>
                                                                    </div>
                                                                    {ans.audioData ? (
                                                                        <div className="pt-1">
                                                                            <audio src={ans.audioData} controls className="h-8 max-w-full" />
                                                                        </div>
                                                                    ) : ans.videoData ? (
                                                                        <div className="pt-1">
                                                                            <video src={ans.videoData} controls className="max-w-[240px] rounded-lg border border-slate-200" />
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-slate-700 font-medium whitespace-pre-wrap">{ans.textAnswer}</p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {answersForQ.length === 0 && (
                                                                <p className="text-xs text-slate-450 italic py-2">No answers submitted for this question yet.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Individual Tab */}
                            {responsesTab === 'individual' && (
                                <>
                                    {totalCount === 0 ? (
                                        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-250">
                                            <FileText className="mx-auto text-slate-300 mb-4" size={48} />
                                            <h3 className="text-lg font-bold text-slate-700">No responses found</h3>
                                            <p className="text-slate-500 text-xs">Try adjusting your search query or filters.</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="bg-white p-4 border border-slate-200 rounded-2xl flex items-center justify-between gap-4 mb-6 shadow-sm">
                                                <button
                                                    disabled={individualIndex === 0}
                                                    onClick={() => setIndividualIndex(prev => Math.max(0, prev - 1))}
                                                    className="p-2 border border-slate-205 hover:bg-slate-50 text-slate-605 rounded-xl disabled:opacity-40 disabled:hover:bg-transparent transition-all flex items-center gap-1 text-xs font-bold"
                                                >
                                                    <ChevronLeft size={16} /> Previous
                                                </button>

                                                <span className="text-xs font-bold text-slate-705">
                                                    Response <span className="text-indigo-650 font-black">{individualIndex + 1}</span> of <span className="text-slate-500 font-bold">{totalCount}</span>
                                                </span>

                                                <button
                                                    disabled={individualIndex === totalCount - 1}
                                                    onClick={() => setIndividualIndex(prev => Math.min(totalCount - 1, prev + 1))}
                                                    className="p-2 border border-slate-205 hover:bg-slate-50 text-slate-655 rounded-xl disabled:opacity-40 disabled:hover:bg-transparent transition-all flex items-center gap-1 text-xs font-bold"
                                                >
                                                    Next <ChevronRight size={16} />
                                                </button>
                                            </div>

                                            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6 space-y-6">
                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-slate-800">{activeSubmission?.name}</h3>
                                                        <p className="text-slate-400 text-xs font-semibold mt-1">Submitted on {new Date(activeSubmission?.submittedAt).toLocaleString()}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-black text-indigo-655 bg-indigo-50 px-4 py-2 border border-indigo-100 rounded-2xl font-mono">
                                                            Score: {activeSubmission?.score} / {totalMarks} pts
                                                        </span>
                                                        <button
                                                            onClick={() => handlePrintIndividual(activeSubmission)}
                                                            className="p-2 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                                                            title="Print Response"
                                                        >
                                                            <Printer size={16} />
                                                        </button>
                                                        {selectedPublicTest?.publishMode === 'public' && (
                                                            <button
                                                                onClick={() => handleDeleteSubmission(activeSubmission?._id)}
                                                                className="p-2 text-rose-500 hover:text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-50 transition-colors"
                                                                title="Delete Response"
                                                            >
                                                                <Trash size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-semibold text-slate-600">
                                                    <div>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Email Address</span>
                                                        <span className="text-slate-800 font-mono">{activeSubmission?.email}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Phone Number</span>
                                                        <span className="text-slate-800">{activeSubmission?.phone || 'N/A'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Organization</span>
                                                        <span className="text-slate-800">{activeSubmission?.organization || 'N/A'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">IP & Device</span>
                                                        <span className="text-slate-800 truncate block" title={activeSubmission?.deviceInfo}>
                                                            {activeSubmission?.ipAddress} ({activeSubmission?.deviceInfo ? activeSubmission.deviceInfo.split()[0].replace('Mozilla/5.0 (', '') : 'N/A'})
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                {fullTestData?.questions?.map((q, idx) => {
                                                    const qType = q.type || 'Multiple Choice';
                                                    const isChoice = ['multiple choice', 'dropdown', 'checkboxes'].includes(qType.toLowerCase());
                                                    const ans = activeSubmission?.answers?.find(a => a.questionId === q.id);
                                                    const marksEarned = ans?.marks || 0;
                                                    const totalMarks = q.marks || 1;
                                                    const isCorrect = marksEarned > 0;

                                                    return (
                                                        <div key={q.id} className={`bg-white p-6 border rounded-2xl shadow-sm space-y-4 transition-all ${isChoice
                                                            ? isCorrect
                                                                ? 'border-emerald-200 bg-emerald-50/10'
                                                                : 'border-rose-200 bg-rose-50/10'
                                                            : 'border-slate-200'
                                                            }`}>
                                                            <div className="flex justify-between items-start gap-4">
                                                                <div>
                                                                    <h4 className="text-sm font-bold text-slate-800">
                                                                        <span className="text-slate-555 mr-1 font-extrabold">Q{idx + 1}.</span> {q.text}
                                                                    </h4>
                                                                    <span className="inline-block mt-2 px-2.5 py-0.5 bg-slate-100 text-slate-605 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                                        {qType}
                                                                    </span>
                                                                </div>

                                                                <div className="text-right">
                                                                    <span className={`px-2.5 py-1 rounded text-xs font-black border ${isCorrect
                                                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                                        : 'bg-rose-50 border-rose-200 text-rose-700'
                                                                        }`}>
                                                                        {marksEarned} / {totalMarks} pts
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {isChoice ? (
                                                                <div className="space-y-2 pt-2">
                                                                    {q.options?.map((opt, oIdx) => {
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

                                                                        let containerClass = 'border-slate-200 bg-slate-50 text-slate-700';
                                                                        let icon = <div className="w-4 h-4 rounded-full border border-slate-350" />;

                                                                        if (isSelected && optCorrect) {
                                                                            containerClass = 'border-emerald-300 bg-emerald-50 text-emerald-955';
                                                                            icon = (
                                                                                <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                                                                                    ✓
                                                                                </div>
                                                                            );
                                                                        } else if (isSelected && !optCorrect) {
                                                                            containerClass = 'border-rose-300 bg-rose-50 text-rose-955';
                                                                            icon = (
                                                                                <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">
                                                                                    ✗
                                                                                </div>
                                                                            );
                                                                        } else if (optCorrect) {
                                                                            containerClass = 'border-emerald-200 bg-emerald-50/40 text-emerald-800';
                                                                            icon = (
                                                                                <div className="w-4 h-4 rounded-full border border-emerald-400 flex items-center justify-center text-[10px] text-emerald-600 font-bold">
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
                                                                <div className="pt-2">
                                                                    {ans?.audioData ? (
                                                                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Voice Recording Response</span>
                                                                            <audio src={ans.audioData} controls className="w-full max-w-md h-8" />
                                                                        </div>
                                                                    ) : ans?.videoData ? (
                                                                        (() => {
                                                                            let videoDataObj = null;
                                                                            try {
                                                                                videoDataObj = typeof ans.videoData === 'string' && ans.videoData.startsWith('{')
                                                                                    ? JSON.parse(ans.videoData)
                                                                                    : { url: ans.videoData };
                                                                            } catch (e) {
                                                                                videoDataObj = { url: ans.videoData };
                                                                            }

                                                                            const evalKey = `${activeSubmission?._id}_${q.id}`;
                                                                            const currentEval = evalState[evalKey] || {
                                                                                comments: videoDataObj.captions || [],
                                                                                feedback: ans?.feedback || '',
                                                                                score: ans?.marks !== undefined ? ans.marks : 0
                                                                            };

                                                                            const comments = currentEval.comments || [];
                                                                            const feedback = currentEval.feedback || '';
                                                                            const score = currentEval.score;

                                                                            return (
                                                                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                                                                                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Video size={14} /> Redesigned Loom Review workspace</span>
                                                                                        {videoDataObj.proctoring?.violations?.length > 0 && (
                                                                                            <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 rounded-lg text-[9px] font-black text-rose-600 uppercase tracking-wider">
                                                                                                {videoDataObj.proctoring.violations.length} Proctoring Violations Logged
                                                                                            </span>
                                                                                        )}
                                                                                    </div>

                                                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                                                        {/* Video Player Column */}
                                                                                        <div className="space-y-2">
                                                                                            <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-slate-300 shadow-inner">
                                                                                                <video
                                                                                                    ref={el => videoRefs.current[evalKey] = el}
                                                                                                    src={videoDataObj.url}
                                                                                                    controls
                                                                                                    className="w-full h-full object-contain"
                                                                                                    onLoadedMetadata={(e) => {
                                                                                                        e.target.playbackRate = playbackSpeeds[evalKey] || 1;
                                                                                                    }}
                                                                                                />
                                                                                            </div>

                                                                                            {/* Playback speed controls */}
                                                                                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                                                                                <span>Playback Speed</span>
                                                                                                <div className="flex items-center gap-1">
                                                                                                    {[0.5, 1, 1.25, 1.5, 2].map(speed => (
                                                                                                        <button
                                                                                                            key={speed}
                                                                                                            onClick={() => {
                                                                                                                const videoEl = videoRefs.current[evalKey];
                                                                                                                if (videoEl) {
                                                                                                                    videoEl.playbackRate = speed;
                                                                                                                    setPlaybackSpeeds(prev => ({ ...prev, [evalKey]: speed }));
                                                                                                                }
                                                                                                            }}
                                                                                                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${(playbackSpeeds[evalKey] || 1) === speed
                                                                                                                ? 'bg-purple-600 text-white shadow-sm'
                                                                                                                : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-600'
                                                                                                                }`}
                                                                                                        >
                                                                                                            {speed}x
                                                                                                        </button>
                                                                                                    ))}
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Timeline Comments Column */}
                                                                                        <div className="flex flex-col h-[230px] border border-slate-200 rounded-xl bg-white overflow-hidden">
                                                                                            <div className="bg-slate-50 px-3 py-2 border-b border-slate-150 flex items-center justify-between">
                                                                                                <span className="text-[10px] font-black text-slate-550 uppercase tracking-wider font-bold">Timeline Comments</span>
                                                                                                <span className="text-[9px] bg-slate-200 px-1.5 py-0.5 rounded font-black">{comments.length} Comments</span>
                                                                                            </div>

                                                                                            {/* Comments List */}
                                                                                            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
                                                                                                {comments.length === 0 ? (
                                                                                                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 gap-1">
                                                                                                        <MessageSquare size={20} className="text-slate-350" />
                                                                                                        <span className="text-[10px]">No timestamped feedback added.</span>
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    comments.map((comment, cIdx) => (
                                                                                                        <div key={cIdx} className="flex gap-2 items-start bg-slate-50 p-2 rounded-lg border border-slate-150 text-[11px]">
                                                                                                            <button
                                                                                                                onClick={() => seekVideo(evalKey, comment.timeSeconds || 0)}
                                                                                                                className="px-1.5 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-750 font-mono font-bold rounded text-[9px] transition-colors"
                                                                                                            >
                                                                                                                {comment.time}
                                                                                                            </button>
                                                                                                            <span className="flex-1 text-slate-705 font-bold leading-normal">{comment.text}</span>
                                                                                                            <button
                                                                                                                onClick={() => handleDeleteComment(evalKey, cIdx)}
                                                                                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                                                                                            >
                                                                                                                ✕
                                                                                                            </button>
                                                                                                        </div>
                                                                                                    ))
                                                                                                )}
                                                                                            </div>

                                                                                            {/* Add Comment Input */}
                                                                                            <div className="bg-slate-50 p-2 border-t border-slate-150 flex gap-1.5">
                                                                                                <input
                                                                                                    type="text"
                                                                                                    value={newCommentText[evalKey] || ''}
                                                                                                    onChange={(e) => setNewCommentText(prev => ({ ...prev, [evalKey]: e.target.value }))}
                                                                                                    placeholder="Type feedback at current video playhead..."
                                                                                                    className="flex-1 text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 outline-none focus:border-purple-500"
                                                                                                    onKeyDown={(e) => {
                                                                                                        if (e.key === 'Enter') handleAddComment(evalKey, { current: videoRefs.current[evalKey] });
                                                                                                    }}
                                                                                                />
                                                                                                <button
                                                                                                    onClick={() => handleAddComment(evalKey, { current: videoRefs.current[evalKey] })}
                                                                                                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-750 text-white text-xs font-bold rounded-lg transition-colors"
                                                                                                >
                                                                                                    Add
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Grading & Feedback notes */}
                                                                                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-end lg:col-span-2">
                                                                                        <div className="md:col-span-2 space-y-1">
                                                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Instructor Feedback Notes</span>
                                                                                            <textarea
                                                                                                value={feedback}
                                                                                                onChange={(e) => {
                                                                                                    const val = e.target.value;
                                                                                                    setEvalState(prev => {
                                                                                                        const current = prev[evalKey] || { comments: [], feedback: '', score: 0 };
                                                                                                        return { ...prev, [evalKey]: { ...current, feedback: val } };
                                                                                                    });
                                                                                                }}
                                                                                                placeholder="Write evaluation review details here..."
                                                                                                rows={2}
                                                                                                className="w-full text-xs border border-slate-200 rounded-lg p-2 outline-none focus:border-purple-500 resize-none font-semibold text-slate-700"
                                                                                            />
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className="space-y-1 flex-1">
                                                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Score (Max: {totalMarks})</span>
                                                                                                <input
                                                                                                    type="number"
                                                                                                    min={0}
                                                                                                    max={totalMarks}
                                                                                                    value={score}
                                                                                                    onChange={(e) => {
                                                                                                        const val = e.target.value;
                                                                                                        setEvalState(prev => {
                                                                                                            const current = prev[evalKey] || { comments: [], feedback: '', score: 0 };
                                                                                                            return { ...prev, [evalKey]: { ...current, score: val } };
                                                                                                        });
                                                                                                    }}
                                                                                                    className="w-full text-xs border border-slate-200 rounded-lg p-2 text-center font-bold"
                                                                                                />
                                                                                            </div>
                                                                                            <button
                                                                                                onClick={() => handleSaveEvaluation(evalKey, activeSubmission?._id, q.id)}
                                                                                                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1 shadow-sm"
                                                                                            >
                                                                                                <Check size={14} /> Grade
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Proctoring Log lists details */}
                                                                                    {videoDataObj.proctoring?.violations?.length > 0 && (
                                                                                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs space-y-1 text-rose-955 lg:col-span-2">
                                                                                            <span className="font-bold flex items-center gap-1"><AlertTriangle size={13} className="text-rose-600" /> Proctoring Log Details</span>
                                                                                            <div className="grid grid-cols-2 gap-4 text-[10px] text-rose-500 font-semibold pt-1">
                                                                                                <span>Tab Switches: {videoDataObj.proctoring.tabSwitchViolations || 0}</span>
                                                                                                <span>Exited Full Screen: {videoDataObj.proctoring.fullScreenViolations || 0}</span>
                                                                                            </div>
                                                                                            <ul className="list-disc list-inside text-[10px] text-rose-700 pt-1.5 space-y-0.5">
                                                                                                {videoDataObj.proctoring.violations.map((v, vIdx) => (
                                                                                                    <li key={vIdx}>{v}</li>
                                                                                                ))}
                                                                                            </ul>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })()
                                                                    ) : (
                                                                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Written Response</span>
                                                                            <p className="text-xs font-semibold text-slate-700 whitespace-pre-wrap leading-relaxed">
                                                                                {ans?.textAnswer || <span className="text-slate-400 italic">No answer submitted</span>}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="Admin">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Assessment Dashboard</h1>
                    <p className="text-slate-500 text-sm">Manage LMS tests and configure public testing web links.</p>
                </div>
                <button
                    onClick={() => navigate('/admin/tests/builder')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-150 transition-all active:scale-95"
                >
                    <Plus size={20} /> Create New Assessment
                </button>
            </div>

            {/* Tab Selectors */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
                <button
                    onClick={() => setActiveTab('lms')}
                    className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'lms'
                        ? 'bg-white text-indigo-650 shadow-sm border border-slate-200/50'
                        : 'text-slate-500 hover:text-slate-800'
                        }`}
                >
                    LMS Connected Tests
                </button>
                <button
                    onClick={() => setActiveTab('public')}
                    className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'public'
                        ? 'bg-white text-indigo-650 shadow-sm border border-slate-200/50'
                        : 'text-slate-500 hover:text-slate-800'
                        }`}
                >
                    Public Web Tests
                </button>
            </div>

            {/* Filters (Search Box & Subject Select) */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by test name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all font-medium"
                    />
                </div>

                {activeTab === 'lms' && (
                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="relative min-w-[200px]">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select
                                value={filterSubject}
                                onChange={(e) => setFilterSubject(e.target.value)}
                                className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none appearance-none cursor-pointer font-semibold"
                            >
                                {uniqueSubjects.map(subject => (
                                    <option key={subject} value={subject}>{subject === 'All' ? 'All Subjects' : subject}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* TABLE CONTAINER */}
            {activeTab === 'lms' ? (
                /* ── LMS CONNECTED TESTS TABLE ── */
                loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : filteredTests.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-250">
                        <FileText className="mx-auto text-slate-300 mb-4" size={48} />
                        <h3 className="text-lg font-bold text-slate-700">No LMS tests found</h3>
                        <p className="text-slate-500 text-xs">Create tests in the builder and click "Connect It".</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 text-xs uppercase tracking-wider">
                                        <th className="p-4 font-extrabold whitespace-nowrap">Test Title</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Course</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Subject</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Duration</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Questions</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Test Index</th>
                                        <th className="p-4 font-extrabold text-center whitespace-nowrap">Responses</th>
                                        <th className="p-4 font-extrabold text-right whitespace-nowrap sticky right-0 bg-slate-50 border-l border-slate-200 z-10">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredTests.map((test) => (
                                        <tr key={test._id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-indigo-50 text-indigo-605 rounded-lg flex-shrink-0">
                                                        <FileText size={16} />
                                                    </div>
                                                    <span className="font-semibold text-slate-800">{test.title || 'Untitled'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold">
                                                    {test.course || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-705 rounded-full text-xs font-semibold">
                                                    {test.subject || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className="text-slate-600 text-xs font-medium">{test.settings?.duration || 0} mins</span>
                                            </td>
                                            <td className="p-4 whitespace-nowrap text-slate-600 text-xs font-mono">
                                                {test.questions?.length || 0} Qs
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                {test.index ? (
                                                    <span className="font-bold text-indigo-600 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-xs">{test.index}</span>
                                                ) : (
                                                    <span className="text-slate-400 italic text-xs">No Index</span>
                                                )}
                                            </td>
                                            <td className="p-4 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => handleOpenResponses(test, 'connected')}
                                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-755 text-xs font-extrabold rounded-xl transition-all active:scale-95 flex items-center gap-1.5 mx-auto"
                                                >
                                                    <span>Responses</span>
                                                </button>
                                            </td>
                                            <td className="p-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors border-l border-slate-100">
                                                <button
                                                    onClick={() => handleCopyUrl(test._id, 'connected')}
                                                    className={`p-1.5 rounded-lg border transition-all ${copiedId === test._id
                                                        ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                                                        : 'text-slate-405 border-slate-200 hover:text-indigo-600 hover:bg-indigo-50/50 hover:border-indigo-200'
                                                        }`}
                                                    title="Copy shareable link"
                                                >
                                                    {copiedId === test._id ? <Check size={15} /> : <Link2 size={15} />}
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/admin/tests/edit/${test._id}`)}
                                                    className="p-1.5 text-slate-405 border border-slate-200 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 rounded-lg transition-colors ml-1.5"
                                                    title="Edit Test"
                                                >
                                                    <Edit size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(test._id)}
                                                    className="p-1.5 text-slate-405 border border-slate-200 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-lg transition-colors ml-1.5"
                                                    title="Delete Test"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            ) : (
                /* ── PUBLIC WEB TESTS TABLE ── */
                loadingPublic ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                    </div>
                ) : filteredPublicTests.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-250">
                        <Globe className="mx-auto text-slate-350 mb-4" size={48} />
                        <h3 className="text-lg font-bold text-slate-700">No public web tests found</h3>
                        <p className="text-slate-500 text-xs">Create tests in the builder and select "Publish to Web".</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-555 text-xs uppercase tracking-wider">
                                        <th className="p-4 font-extrabold whitespace-nowrap">Test Name</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap text-center">Public Link</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap text-center">Total Views</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap text-center">Total Responses</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap text-center">Completion Rate</th>
                                        <th className="p-4 font-extrabold text-center whitespace-nowrap">Status</th>
                                        <th className="p-4 font-extrabold text-right whitespace-nowrap sticky right-0 bg-slate-50 border-l border-slate-200 z-10">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredPublicTests.map((test) => {
                                        const isEnabled = test.status === 'active';
                                        return (
                                            <tr key={test._id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg flex-shrink-0">
                                                            <Globe size={16} />
                                                        </div>
                                                        <span className="font-semibold text-slate-800">{test.title || 'Untitled'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 whitespace-nowrap text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            onClick={() => handleCopyUrl(test._id, 'public')}
                                                            className={`p-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 ${copiedId === test._id
                                                                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                                                : 'text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                                                                }`}
                                                        >
                                                            {copiedId === test._id ? <Check size={14} /> : <Copy size={13} />}
                                                            <span>Copy</span>
                                                        </button>
                                                        <a
                                                            href={`/public-test/${test._id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1.5 rounded-lg border text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100 hover:text-slate-800 flex items-center"
                                                        >
                                                            <ExternalLink size={13} />
                                                        </a>
                                                    </div>
                                                </td>
                                                <td className="p-4 whitespace-nowrap text-center text-xs font-mono font-bold text-slate-700">
                                                    {test.publicViews}
                                                </td>
                                                <td className="p-4 whitespace-nowrap text-center">
                                                    <button
                                                        onClick={() => handleOpenResponses(test)}
                                                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-755 text-xs font-extrabold rounded-xl transition-all active:scale-95 flex items-center gap-1.5 mx-auto"
                                                    >
                                                        <span>Responses</span>
                                                        <span className="bg-indigo-650 text-black px-1.5 py-0.2 rounded-full text-[10px] font-black">{test.totalResponses}</span>
                                                    </button>
                                                </td>
                                                <td className="p-4 whitespace-nowrap text-center">
                                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                                                        {test.completionRate}%
                                                    </span>
                                                </td>
                                                <td className="p-4 whitespace-nowrap text-center">
                                                    <button
                                                        onClick={() => handleToggleStatus(test._id, test.status)}
                                                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${isEnabled
                                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                            : 'bg-rose-50 border-rose-200 text-rose-700'
                                                            }`}
                                                    >
                                                        {isEnabled ? 'Enabled' : 'Disabled'}
                                                    </button>
                                                </td>
                                                <td className="p-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors border-l border-slate-100">
                                                    <button
                                                        onClick={() => navigate(`/admin/tests/edit/${test._id}`)}
                                                        className="p-1.5 text-slate-405 border border-slate-200 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 rounded-lg transition-colors"
                                                        title="Edit Test"
                                                    >
                                                        <Edit size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenSettings(test)}
                                                        className="p-1.5 text-slate-405 border border-slate-200 hover:text-indigo-655 hover:bg-indigo-50 hover:border-indigo-250 rounded-lg transition-colors ml-1.5"
                                                        title="Public Settings"
                                                    >
                                                        <Settings size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(test._id)}
                                                        className="p-1.5 text-slate-405 border border-slate-200 hover:text-red-650 hover:bg-red-50 hover:border-red-250 rounded-lg transition-colors ml-1.5"
                                                        title="Delete Link"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}

            {/* ── 1. PUBLIC TEST SETTINGS EDIT MODAL ────────────────── */}
            {showSettingsModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-fade-in">
                    <form onSubmit={handleSaveSettings} className="bg-white w-full max-w-3xl max-h-[85vh] rounded-[30px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Settings size={18} className="text-indigo-600" /> Edit Web Settings: <span className="text-indigo-650 font-extrabold">{selectedPublicTest?.title}</span>
                            </h3>
                            <button type="button" onClick={() => setShowSettingsModal(false)} className="p-2 text-slate-400 hover:text-slate-650 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                            {/* Dates & Limits Row */}
                            <div className="p-4 border border-slate-200 rounded-2xl space-y-4 animate-fade-in">
                                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Calendar size={12} className="text-indigo-650" /> Schedule & Limits</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600">Start Date</label>
                                        <input
                                            type="date"
                                            value={editSettingsForm.startDate}
                                            onChange={(e) => setEditSettingsForm(prev => ({ ...prev, startDate: e.target.value }))}
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:bg-white focus:border-indigo-500"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600">End Date</label>
                                        <input
                                            type="date"
                                            value={editSettingsForm.endDate}
                                            onChange={(e) => setEditSettingsForm(prev => ({ ...prev, endDate: e.target.value }))}
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:bg-white focus:border-indigo-500"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600">Expiry Date</label>
                                        <input
                                            type="date"
                                            value={editSettingsForm.expiryDate}
                                            onChange={(e) => setEditSettingsForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:bg-white focus:border-indigo-500"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600">Max Attempts (Capacity)</label>
                                        <input
                                            type="number"
                                            value={editSettingsForm.maxResponses}
                                            onChange={(e) => setEditSettingsForm(prev => ({ ...prev, maxResponses: e.target.value }))}
                                            placeholder="No capacity limit"
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:bg-white focus:border-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">

                                {/* Security */}
                                <div className="p-4 border border-slate-200 rounded-2xl space-y-4">
                                    <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Lock size={12} className="text-indigo-650" /> Access Controls</h5>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600">Access Password</label>
                                        <input
                                            type="text"
                                            value={editSettingsForm.password}
                                            onChange={(e) => setEditSettingsForm(prev => ({ ...prev, password: e.target.value }))}
                                            placeholder="No password required"
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:bg-white focus:border-indigo-500"
                                        />
                                    </div>

                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-650 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={!editSettingsForm.allowMultiple}
                                            onChange={(e) => setEditSettingsForm(prev => ({ ...prev, allowMultiple: !e.target.checked }))}
                                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        />
                                        One Response Per Email
                                    </label>

                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-655 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={editSettingsForm.antiSpam}
                                            onChange={(e) => setEditSettingsForm(prev => ({ ...prev, antiSpam: e.target.checked }))}
                                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        />
                                        Enable reCAPTCHA & Rate Limiting
                                    </label>
                                </div>

                                {/* Timer & Flow */}
                                <div className="p-4 border border-slate-200 rounded-2xl space-y-4">
                                    <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Clock size={12} className="text-indigo-650" /> assessment rules</h5>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600">Time Limit (Minutes)</label>
                                        <input
                                            type="number"
                                            value={editSettingsForm.timeLimit}
                                            onChange={(e) => setEditSettingsForm(prev => ({ ...prev, timeLimit: e.target.value }))}
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:bg-white focus:border-indigo-500"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-655 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={editSettingsForm.randomizeQuestions}
                                                onChange={(e) => setEditSettingsForm(prev => ({ ...prev, randomizeQuestions: e.target.checked }))}
                                                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                            />
                                            Randomize Questions
                                        </label>
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-655 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={editSettingsForm.showScoreAfterSubmission}
                                                onChange={(e) => setEditSettingsForm(prev => ({ ...prev, showScoreAfterSubmission: e.target.checked }))}
                                                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                            />
                                            Show Score After Submission
                                        </label>
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-655 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={editSettingsForm.showCorrectAnswers}
                                                onChange={(e) => setEditSettingsForm(prev => ({ ...prev, showCorrectAnswers: e.target.checked }))}
                                                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                            />
                                            Show Correct Answers
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Assistive Features Checklist */}
                            <div className="p-4 border border-slate-200 rounded-2xl space-y-4 animate-fade-in">
                                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Settings size={12} className="text-indigo-650" /> Assistive Accessibility Features (OFF by default)</h5>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        { key: 'relevantInformation', label: 'Relevant Information' },
                                        { key: 'temporaryFill', label: 'Temporary Fill' },
                                        { key: 'audioAnswer', label: 'Recording' },
                                        { key: 'chatWithTeacher', label: 'Chat with Teacher' },
                                        { key: 'uploadAttachment', label: 'Upload Attachment' },
                                        { key: 'exampleSection', label: 'Example Section' },
                                        { key: 'calculator', label: 'Calculator' },
                                        { key: 'aiReader', label: 'AI Reader' },
                                        { key: 'textToSpeech', label: 'Text To Speech' },
                                        { key: 'speechToText', label: 'Speech To Text' },
                                        { key: 'translation', label: 'Translation' },
                                        { key: 'accessibilityMode', label: 'Accessibility Mode' }
                                    ].map((feat) => (
                                        <label key={feat.key} className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-xs font-bold text-slate-700 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={editSettingsForm.assistiveFeatures[feat.key]}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setEditSettingsForm(prev => ({
                                                        ...prev,
                                                        assistiveFeatures: {
                                                            ...prev.assistiveFeatures,
                                                            [feat.key]: checked
                                                        }
                                                    }));
                                                }}
                                                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                            />
                                            <span>{feat.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Notifications */}
                            <div className="p-4 border border-slate-200 rounded-2xl space-y-3">
                                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Mail size={12} className="text-indigo-650" /> Email Notifications (Simulated)</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                        <input
                                            type="checkbox"
                                            checked={editSettingsForm.emailNotification.sendConfirmationEmail}
                                            onChange={(e) => handleEmailNotificationChange('sendConfirmationEmail', e.target.checked)}
                                            className="rounded text-indigo-600 w-4 h-4"
                                        />
                                        Confirmation Email
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                        <input
                                            type="checkbox"
                                            checked={editSettingsForm.emailNotification.sendScoreEmail}
                                            onChange={(e) => handleEmailNotificationChange('sendScoreEmail', e.target.checked)}
                                            className="rounded text-indigo-600 w-4 h-4"
                                        />
                                        Score Report Email
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                        <input
                                            type="checkbox"
                                            checked={editSettingsForm.emailNotification.sendSubmissionNotification}
                                            onChange={(e) => handleEmailNotificationChange('sendSubmissionNotification', e.target.checked)}
                                            className="rounded text-indigo-600 w-4 h-4"
                                        />
                                        Admin Alert Email
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                            <button type="button" onClick={() => setShowSettingsModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-605 bg-white">Cancel</button>
                            <button type="submit" disabled={savingSettings} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-150">
                                {savingSettings ? "Saving..." : "Save Settings"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <style>{`
                .animate-fade-in { animation: fadeIn 0.25s ease-out forwards; }
                .animate-slide-up { animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-slide-left { animation: slideLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(15px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes slideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }

                .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            `}</style>

        </DashboardLayout>
    );
};

export default TestsList;
