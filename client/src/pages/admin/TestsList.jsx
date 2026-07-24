import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import RecycleBinModal from '../../components/common/RecycleBinModal';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
    Search, Filter, Plus, FileText, Clock, Calendar, Wand2, Edit, Trash2, Link2, Check, QrCode, CopyPlus,
    Globe, Copy, ExternalLink, Settings, BarChart2, ShieldCheck, Download, Upload, Mail, Lock,
    CheckCircle2, X, Eye, Loader2, EyeOff, Info, ChevronLeft, ChevronRight, Printer, ArrowLeft, Trash,
    Video, MessageSquare, AlertTriangle, Folder, FolderOpen, ChevronDown, School, Book, Layers, LayoutGrid
} from 'lucide-react';
import TeacherVideoReview from '../../components/teacher/TeacherVideoReview';
import TestFolderStructure from './TestFolderStructure';
import TruncatedCell from '../../components/common/TruncatedCell';
import BulkEditModal from '../../components/common/BulkEditModal';
const TestsList = () => {
    const { user } = useAuth();
    const userInfo = user;
    const navigate = useNavigate();
    const basePath = userInfo?.role === 'Institute' ? '/institute' : (userInfo?.role === 'Editor' ? '/editor' : '/admin');
    const getEditPath = (testId) => {
        return userInfo?.role === 'Institute'
            ? `${basePath}/activities/edit/${testId}`
            : `${basePath}/activities-edit/${testId}`;
    };

    // Search and tab filters
    const isFirstRender = useRef(true);
    const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('testsList_searchTerm') || '');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);
    const [filterSubject, setFilterSubject] = useState(() => sessionStorage.getItem('testsList_filterSubject') || 'All');
    const [filterCourse, setFilterCourse] = useState(() => sessionStorage.getItem('testsList_filterCourse') || 'All');
    const [filterInbox, setFilterInbox] = useState(() => sessionStorage.getItem('testsList_filterInbox') || 'All');
    const [filterInstitute, setFilterInstitute] = useState(() => sessionStorage.getItem('testsList_filterInstitute') || 'All');
    const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('testsList_activeTab') || 'lms');
    const [currentPage, setCurrentPage] = useState(() => Number(sessionStorage.getItem('testsList_currentPage')) || 1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Bulk actions
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkAction, setBulkAction] = useState('');
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

    useEffect(() => {
        setSelectedIds(new Set());
        setBulkAction('');
    }, [activeTab]);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        setCurrentPage(1);
    }, [debouncedSearchTerm, filterSubject, filterCourse, filterInbox, filterInstitute, activeTab]);

    const editorControls = userInfo?.editorProfile?.controls;

    useEffect(() => {
        if (userInfo?.role === 'Editor' && editorControls?.activities) {
            const act = editorControls.activities;
            if ((activeTab === 'lms' || activeTab === 'lms-single' || activeTab === 'lms-selected') && act.lmsConnectedTests === false) {
                if (act.publicWebTests !== false) setActiveTab('public');
                else if (act.draftTests !== false) setActiveTab('draft');
            } else if (activeTab === 'public' && act.publicWebTests === false) {
                if (act.lmsConnectedTests !== false) setActiveTab('lms');
                else if (act.draftTests !== false) setActiveTab('draft');
            } else if (activeTab === 'draft' && act.draftTests === false) {
                if (act.lmsConnectedTests !== false) setActiveTab('lms');
                else if (act.publicWebTests !== false) setActiveTab('public');
            }
        }
    }, [userInfo, editorControls, activeTab]);

    // Folder Explorer state
    const [showFolderExplorer, setShowFolderExplorer] = useState(() => sessionStorage.getItem('testsList_showFolderExplorer') === 'true');

    useEffect(() => {
        sessionStorage.setItem('testsList_searchTerm', searchTerm);
        sessionStorage.setItem('testsList_filterSubject', filterSubject);
        sessionStorage.setItem('testsList_filterCourse', filterCourse);
        sessionStorage.setItem('testsList_filterInbox', filterInbox);
        sessionStorage.setItem('testsList_filterInstitute', filterInstitute);
        sessionStorage.setItem('testsList_activeTab', activeTab);
        sessionStorage.setItem('testsList_currentPage', String(currentPage));
        sessionStorage.setItem('testsList_showFolderExplorer', String(showFolderExplorer));
    }, [searchTerm, filterSubject, filterCourse, filterInbox, filterInstitute, activeTab, currentPage, showFolderExplorer]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const expInst = params.get('exp_inst');
        const expCourse = params.get('exp_course');
        const expSubject = params.get('exp_subject');
        const expInbox = params.get('exp_inbox');
        const highlightId = params.get('highlightTestId');

        if (expInst || expCourse || expSubject || expInbox) {
            const cleanInst = expInst ? decodeURIComponent(expInst) : '';
            const cleanCourse = expCourse ? decodeURIComponent(expCourse) : '';
            const cleanSubject = expSubject ? decodeURIComponent(expSubject) : '';
            const cleanInbox = expInbox ? decodeURIComponent(expInbox) : 'Inbox 1';
            
            const path = [];
            if (cleanInst) {
                path.push(cleanInst);
                if (cleanCourse) {
                    path.push(cleanCourse);
                    if (cleanSubject) {
                        path.push(cleanSubject);
                        if (cleanInbox) {
                            path.push(cleanInbox);
                        }
                    }
                }
            }

            if (path.length > 0) {
                sessionStorage.setItem('folderExplorer_explorerPath', JSON.stringify(path));
                if (highlightId) {
                    sessionStorage.setItem('folderExplorer_highlightTestId', highlightId);
                }
                setShowFolderExplorer(true);
            }

            // Silently clean URL
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }, []);

    // Core tests data
    const [tests, setTests] = useState([]);
    const [publicTests, setPublicTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingPublic, setLoadingPublic] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const [previewTest, setPreviewTest] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [riTest, setRiTest] = useState(null);
    const [showRiModal, setShowRiModal] = useState(false);
    const [isTrashOpen, setIsTrashOpen] = useState(false);
    const [inboxDisplayNames, setInboxDisplayNames] = useState({}); // key: "inboxId::subject" -> displayName

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
            let updatedAnswers = [];
            let newTotalScore = 0;

            setPublicSubmissions(prev => prev.map(sub => {
                if (sub._id === submissionId) {
                    updatedAnswers = sub.answers.map(a => {
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
                    newTotalScore = updatedAnswers.reduce((sum, item) => sum + (item.marks || 0), 0);
                    return {
                        ...sub,
                        answers: updatedAnswers,
                        score: newTotalScore
                    };
                }
                return sub;
            }));

            await axios.put(`/api/public-tests/admin/submissions/${submissionId}/evaluate`, {
                answers: updatedAnswers,
                score: newTotalScore
            });

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
    const [qrCodeUrl, setQrCodeUrl] = useState(null);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
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

    const fetchLmsTests = async (quiet = false) => {
        try {
            if (!quiet) setLoading(true);
            const res = await axios.get('/api/tests?limit=20&page=1');
            const filtered = Array.isArray(res.data) ? res.data.filter(t => t.publishMode !== 'public') : [];
            setTests(filtered);

            // Build display name lookup from inbox configs
            const courseSubjectPairs = [];
            const seen = new Set();
            filtered.forEach(t => {
                if (t.course && t.subject) {
                    const key = `${t.course}::${t.subject}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        courseSubjectPairs.push({ course: t.course, subject: t.subject });
                    }
                }
            });

            if (courseSubjectPairs.length > 0) {
                try {
                    const allSubjects = [...new Set(courseSubjectPairs.map(p => p.subject))];
                    const { data: configs } = await axios.get('/api/users/inbox-configs/course-subject', {
                        params: { subject: allSubjects.join(',') }
                    });
                    const map = {};
                    (configs || []).forEach(c => {
                        if (c.inboxId && c.displayName) {
                            const k = c.subject ? `${c.inboxId}::${c.subject.toLowerCase()}` : c.inboxId;
                            map[k] = c.displayName;
                            // also index by inboxId alone as fallback
                            if (!map[c.inboxId]) map[c.inboxId] = c.displayName;
                        }
                    });
                    setInboxDisplayNames(map);
                } catch (_) {
                    // silently ignore — fallback to raw index
                }
            }

            if (!quiet) setLoading(false);

            // Deferred background load for the remaining tests
            setTimeout(async () => {
                try {
                    const fullRes = await axios.get('/api/tests');
                    const fullFiltered = Array.isArray(fullRes.data) ? fullRes.data.filter(t => t.publishMode !== 'public') : [];
                    setTests(fullFiltered);
                } catch (e) {
                    console.error("Error background loading full tests data:", e);
                }
            }, 1000);
        } catch (error) {
            console.error("Error fetching tests:", error);
            if (!quiet) toast.error("Error loading tests");
        }
    };

    const fetchPublicTests = async (quiet = false) => {
        try {
            if (!quiet) setLoadingPublic(true);
            const res = await axios.get('/api/public-tests/admin/dashboard');
            setPublicTests(res.data);
        } catch (error) {
            console.error("Error fetching public tests dashboard:", error);
            if (!quiet) toast.error("Error loading public tests dashboard");
        } finally {
            if (!quiet) setLoadingPublic(false);
        }
    };

    useEffect(() => {
        if (!userInfo) {
            navigate('/');
            return;
        }

        if (activeTab === 'lms' || activeTab === 'lms-single' || activeTab === 'lms-selected' || activeTab === 'draft') {
            fetchLmsTests();
        } else {
            fetchPublicTests();
        }
    }, [navigate, activeTab]);

    const handlePreviewTest = (test) => {
        setPreviewTest(test);
        setShowPreviewModal(true);
    };

    const handleOpenRi = (test) => {
        setRiTest(test);
        setShowRiModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this test?')) return;
        try {
            await axios.delete(`/api/tests/${id}`);
            if (activeTab === 'lms' || activeTab === 'lms-single' || activeTab === 'lms-selected' || activeTab === 'draft') {
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

    const handleApplyBulkAction = async () => {
        if (selectedIds.size === 0 || !bulkAction) return;

        if (bulkAction === 'edit') {
            setIsBulkEditOpen(true);
            return;
        }

        if (bulkAction === 'delete') {
            if (window.confirm(`Are you sure you want to delete the ${selectedIds.size} selected tests?`)) {
                try {
                    await Promise.all(Array.from(selectedIds).map(id => axios.delete(`/api/tests/${id}`)));
                    toast.success('Successfully deleted selected tests');
                    setSelectedIds(new Set());
                    setBulkAction('');
                    if (activeTab === 'lms' || activeTab === 'lms-single' || activeTab === 'lms-selected' || activeTab === 'draft') {
                        fetchLmsTests();
                    } else {
                        fetchPublicTests();
                    }
                } catch (err) {
                    console.error("Bulk delete error:", err);
                    toast.error('Failed to delete some tests');
                }
            }
        }
    };

    const handleDuplicate = async (test) => {
        if (!window.confirm(`Are you sure you want to duplicate "${test.title || 'Untitled'}"?`)) return;
        const loadToast = toast.loading('Duplicating assessment...');
        try {
            await axios.post(`/api/tests/${test._id}/duplicate`);
            toast.dismiss(loadToast);
            toast.success('Test duplicated successfully');
            if (activeTab === 'lms' || activeTab === 'draft') {
                fetchLmsTests();
            } else {
                fetchPublicTests();
            }
        } catch (error) {
            toast.dismiss(loadToast);
            console.error("Error duplicating test:", error);
            toast.error(error.response?.data?.message || 'Error duplicating test');
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
        if (activeTab === 'draft') {
            if (test.publishMode !== 'draft') return false;
        } else if (activeTab === 'lms-single') {
            if (test.publishMode !== 'connected') return false;
            if (test.assignmentType !== 'particular') return false;
        } else if (activeTab === 'lms-selected') {
            if (test.publishMode !== 'connected') return false;
            if (test.assignmentType !== 'selected') return false;
        } else {
            // 'lms' tab: show all connected tests
            if (test.publishMode !== 'connected') return false;
        }

        const titleMatch = (test.title || 'Untitled').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
        const subjectMatch = filterSubject === 'All' || 
            (test.subject && test.subject.split(',').map(s => s.trim().toLowerCase()).includes(filterSubject.toLowerCase()));
        const courseMatch = filterCourse === 'All' || 
            (test.course && test.course.split(',').map(c => c.trim().toLowerCase()).includes(filterCourse.toLowerCase()));
        const instituteMatch = filterInstitute === 'All' || test.institute === filterInstitute;
        const inboxMatch = filterInbox === 'All' || test.index === filterInbox;
        return titleMatch && subjectMatch && courseMatch && instituteMatch && inboxMatch;
    }).sort((a, b) => {
        const getNum = (s) => parseInt(s?.match(/\d+/)?.[0] || 0);
        const numA = getNum(a.index);
        const numB = getNum(b.index);
        if (numA !== numB) return numA - numB;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const currentTestsList = (activeTab === 'lms' || activeTab === 'lms-single' || activeTab === 'lms-selected' || activeTab === 'draft') ? tests : publicTests;

    const filteredPublicTests = publicTests.filter(test => {
        const titleMatch = (test.title || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
        const subjectMatch = filterSubject === 'All' || 
            (test.subject && test.subject.split(',').map(s => s.trim().toLowerCase()).includes(filterSubject.toLowerCase()));
        const courseMatch = filterCourse === 'All' || 
            (test.course && test.course.split(',').map(c => c.trim().toLowerCase()).includes(filterCourse.toLowerCase()));
        const instituteMatch = filterInstitute === 'All' || test.institute === filterInstitute;
        const inboxMatch = filterInbox === 'All' || test.index === filterInbox;
        return titleMatch && subjectMatch && courseMatch && instituteMatch && inboxMatch;
    });

    const paginatedTests = filteredTests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const paginatedPublicTests = filteredPublicTests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
    const importTestsRef = useRef(null);

    const handleImportTests = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        let allParsedRows = [];
        const filePromises = Array.from(files).map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                const filename = file.name.toLowerCase();

                if (filename.endsWith('.json')) {
                    reader.onload = (evt) => {
                        try {
                            const parsed = JSON.parse(evt.target.result);
                            const arr = Array.isArray(parsed) ? parsed : [parsed];
                            allParsedRows.push(...arr);
                            resolve();
                        } catch (err) {
                            toast.error(`Failed to parse JSON file: ${file.name}`);
                            resolve();
                        }
                    };
                    reader.readAsText(file);
                } else {
                    reader.onload = (evt) => {
                        try {
                            const data = new Uint8Array(evt.target.result);
                            const workbook = XLSX.read(data, { type: 'array' });
                            const firstSheetName = workbook.SheetNames[0];
                            const worksheet = workbook.Sheets[firstSheetName];
                            const parsed = XLSX.utils.sheet_to_json(worksheet);
                            const arr = Array.isArray(parsed) ? parsed : [parsed];
                            allParsedRows.push(...arr);
                            resolve();
                        } catch (err) {
                            toast.error(`Failed to parse spreadsheet file: ${file.name}`);
                            resolve();
                        }
                    };
                    reader.readAsArrayBuffer(file);
                }
            });
        });

        const loadingToast = toast.loading(`Reading ${files.length} backup file(s)...`);
        await Promise.all(filePromises);
        toast.dismiss(loadingToast);

        if (allParsedRows.length === 0) {
            toast.error('No valid rows or tests found in uploaded file(s).');
            e.target.value = '';
            return;
        }

        const parsedMapped = allParsedRows.map(row => {
            const keys = Object.keys(row);
            const titleKey = keys.find(k => k.toLowerCase() === 'title' || k === 'Test Name');
            const instituteKey = keys.find(k => k.toLowerCase() === 'institute' || k === 'Institute Name');
            const courseKey = keys.find(k => k.toLowerCase() === 'course' || k === 'Courses Name');
            const subjectKey = keys.find(k => k.toLowerCase() === 'subject' || k === 'Subject Name');
            const indexKey = keys.find(k => k.toLowerCase() === 'index' || k === 'Inbox No.');
            const descKey = keys.find(k => ['description', 'desc'].includes(k.toLowerCase()));
            const durationKey = keys.find(k => k.toLowerCase() === 'duration');
            const publishModeKey = keys.find(k => ['publishmode', 'publish mode'].includes(k.toLowerCase()));
            const statusKey = keys.find(k => k.toLowerCase() === 'status');
            const questionsKey = keys.find(k => k.toLowerCase() === 'questions');
            const settingsKey = keys.find(k => k.toLowerCase() === 'settings' || k === 'Setting');
            const visibilityModeKey = keys.find(k => k.toLowerCase() === 'visibility mode' || k === 'visibilityMode' || k.toLowerCase() === 'visibility');
            const publicSettingsKey = keys.find(k => ['publicsettings', 'public settings', 'publish setting', 'public settings'].includes(k.toLowerCase()));

            // Parse settings / questions if they are stringified JSON (from Excel/CSV exports)
            let qList = undefined;
            if (questionsKey && row[questionsKey]) {
                try {
                    qList = typeof row[questionsKey] === 'string' ? JSON.parse(row[questionsKey]) : row[questionsKey];
                } catch {}
            }
            let settingsObj = undefined;
            if (settingsKey && row[settingsKey]) {
                try {
                    settingsObj = typeof row[settingsKey] === 'string' ? JSON.parse(row[settingsKey]) : row[settingsKey];
                } catch {}
            }
            let publicSettingsObj = undefined;
            if (publicSettingsKey && row[publicSettingsKey]) {
                try {
                    publicSettingsObj = typeof row[publicSettingsKey] === 'string' ? JSON.parse(row[publicSettingsKey]) : row[publicSettingsKey];
                } catch {}
            }

            return {
                title: titleKey ? String(row[titleKey]).trim() : '',
                institute: instituteKey ? String(row[instituteKey]).trim() : '',
                course: courseKey ? String(row[courseKey]).trim() : '',
                subject: subjectKey ? String(row[subjectKey]).trim() : '',
                index: indexKey ? String(row[indexKey]).trim() : '',
                description: descKey ? String(row[descKey]).trim() : '',
                duration: durationKey ? Number(row[durationKey]) : undefined,
                publishMode: publishModeKey ? String(row[publishModeKey]).trim() : (activeTab === 'public' ? 'public' : (activeTab === 'draft' ? 'draft' : 'connected')),
                status: statusKey ? String(row[statusKey]).trim() : 'active',
                visibilityMode: visibilityModeKey ? String(row[visibilityModeKey]).trim() : undefined,
                questions: qList,
                settings: settingsObj,
                publicSettings: publicSettingsObj
            };
        }).filter(item => item.title);

        if (parsedMapped.length === 0) {
            toast.error('No valid rows found. "Title" or "Test Name" column is required.');
            e.target.value = '';
            return;
        }

        const importToast = toast.loading(`Importing ${parsedMapped.length} assessments...`);
        try {
            const res = await axios.post('/api/tests/import', { tests: parsedMapped });
            toast.dismiss(importToast);
            const { successCount, errors } = res.data.results;
            if (errors && errors.length > 0) {
                toast.success(`Successfully imported ${successCount} assessments. ${errors.length} failed.`);
            } else {
                toast.success(`Successfully imported ${successCount} assessments!`);
            }
            if (typeof fetchLmsTests === 'function') fetchLmsTests();
            if (typeof fetchPublicTests === 'function') fetchPublicTests();
        } catch (err) {
            toast.dismiss(importToast);
            toast.error(err.response?.data?.message || 'Error importing assessments');
        }

        e.target.value = '';
    };

    const exportTests = (format) => {
        const list = (activeTab === 'lms' || activeTab === 'draft') ? filteredTests : filteredPublicTests;
        if (list.length === 0) {
            toast.error('No assessments to export');
            return;
        }

        const rows = list.map(t => ({
            'Test Name': t.title || '',
            'Institute Name': t.institute || '',
            'Courses Name': t.course || '',
            'Subject Name': t.subject || '',
            'Inbox No.': t.index || '',
            Description: t.description || '',
            Duration: t.settings?.duration || '',
            'Publish Mode': t.publishMode || '',
            Status: t.status || 'active',
            'Types of Activities': t.activity || '',
            'Visibility Mode': t.isAssigned ? 'upcoming' : 'assign',
            Questions: t.questions ? JSON.stringify(t.questions) : '[]',
            Setting: t.settings ? JSON.stringify(t.settings) : '{}',
            'Publish Setting': t.publicSettings ? JSON.stringify(t.publicSettings) : '{}',
            'Created At Date': t.createdAt ? new Date(t.createdAt).toLocaleString() : ''
        }));

        if (format === 'json') {
            const jsonContent = JSON.stringify(list.map(t => ({
                title: t.title,
                course: t.course,
                subject: t.subject,
                index: t.index,
                description: t.description,
                publishMode: t.publishMode,
                status: t.status,
                isAssigned: t.isAssigned || false,
                questions: t.questions || [],
                settings: t.settings || {},
                publicSettings: t.publicSettings || {}
            })), null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `assessment_list_${activeTab}_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${list.length} assessments to JSON`);
        } else if (format === 'csv') {
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `assessment_list_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${list.length} assessments to CSV`);
        } else if (format === 'excel') {
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Assessments');
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `assessment_list_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${list.length} assessments to Excel`);
        }
    };

    const getPageNumbers = (totalCount) => {
        const totalPages = Math.ceil(totalCount / itemsPerPage);
        const pages = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }
        return pages;
    };

    // Dynamic Filter lists:
    const uniqueInstitutes = useMemo(() => {
        return ['All', ...new Set(currentTestsList.map(t => t.institute).filter(i => i && i.trim() !== ''))];
    }, [currentTestsList]);

    const uniqueCourses = useMemo(() => {
        const testsFilteredByInst = currentTestsList.filter(t => filterInstitute === 'All' || t.institute === filterInstitute);
        const courses = new Set();
        testsFilteredByInst.forEach(t => {
            if (t.course) {
                t.course.split(',').forEach(c => {
                    const trimmed = c.trim();
                    if (trimmed) courses.add(trimmed);
                });
            }
        });
        return ['All', ...Array.from(courses)];
    }, [currentTestsList, filterInstitute]);

    const uniqueSubjects = useMemo(() => {
        const testsFilteredByInstAndCrs = currentTestsList.filter(t =>
            (filterInstitute === 'All' || t.institute === filterInstitute) &&
            (filterCourse === 'All' || (t.course && t.course.split(',').map(c => c.trim().toLowerCase()).includes(filterCourse.toLowerCase())))
        );
        const subjects = new Set();
        testsFilteredByInstAndCrs.forEach(t => {
            if (t.subject) {
                t.subject.split(',').forEach(s => {
                    const trimmed = s.trim();
                    if (trimmed) subjects.add(trimmed);
                });
            }
        });
        return ['All', ...Array.from(subjects)];
    }, [currentTestsList, filterInstitute, filterCourse]);

    const uniqueInboxes = useMemo(() => {
        const testsFilteredByInstCrsAndSub = currentTestsList.filter(t =>
            (filterInstitute === 'All' || t.institute === filterInstitute) &&
            (filterCourse === 'All' || (t.course && t.course.split(',').map(c => c.trim().toLowerCase()).includes(filterCourse.toLowerCase()))) &&
            (filterSubject === 'All' || (t.subject && t.subject.split(',').map(s => s.trim().toLowerCase()).includes(filterSubject.toLowerCase())))
        );
        const inboxes = new Set();
        testsFilteredByInstCrsAndSub.forEach(t => {
            if (t.index) {
                const trimmed = t.index.trim();
                if (trimmed) inboxes.add(trimmed);
            }
        });
        
        // Natural numeric sorting (e.g. Inbox 1, Inbox 2, ..., Inbox 10, Inbox 22)
        const sortedInboxes = Array.from(inboxes).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ''), 10);
            const numB = parseInt(b.replace(/\D/g, ''), 10);
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            return a.localeCompare(b);
        });
        
        return ['All', ...sortedInboxes];
    }, [currentTestsList, filterInstitute, filterCourse, filterSubject]);

    // Aggregated tree: Institute -> Course -> Subject -> [Tests]
    const folderTree = (() => {
        const tree = {};
        tests.forEach(test => {
            const inst = (test.institute || 'Unassigned Institute').trim();
            const crs = (test.course || 'Unassigned Course').trim();
            const subj = (test.subject || 'Unassigned Subject').trim();

            if (!tree[inst]) {
                tree[inst] = {};
            }
            if (!tree[inst][crs]) {
                tree[inst][crs] = {};
            }
            if (!tree[inst][crs][subj]) {
                tree[inst][crs][subj] = [];
            }
            tree[inst][crs][subj].push(test);
        });
        return tree;
    })();

    const getFolderStats = (path) => {
        let testCount = 0;
        let courseSet = new Set();
        let subjectSet = new Set();

        tests.forEach(t => {
            const inst = (t.institute || 'Unassigned Institute').trim();
            const crs = (t.course || 'Unassigned Course').trim();
            const subj = (t.subject || 'Unassigned Subject').trim();

            if (path.length >= 1 && inst !== path[0]) return;
            if (path.length >= 2 && crs !== path[1]) return;
            if (path.length >= 3 && subj !== path[2]) return;

            testCount++;
            courseSet.add(crs);
            subjectSet.add(subj);
        });

        return {
            testCount,
            courseCount: courseSet.size,
            subjectCount: subjectSet.size
        };
    };

    const [selectedExplorerFolderName, setSelectedExplorerFolderName] = useState(null);

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
            <DashboardLayout role={userInfo?.role || 'Admin'}>
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
                                Responses: <span className="text-[#0b1329]">{selectedPublicTest?.title}</span>
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
                                ? 'border-[#0b1329] text-[#0b1329]'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            Summary
                        </button>
                        <button
                            onClick={() => setResponsesTab('question')}
                            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${responsesTab === 'question'
                                ? 'border-[#0b1329] text-[#0b1329]'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            Question
                        </button>
                        <button
                            onClick={() => setResponsesTab('individual')}
                            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${responsesTab === 'individual'
                                ? 'border-[#0b1329] text-[#0b1329]'
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
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 transition-all font-medium text-slate-700"
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
                            <Loader2 size={36} className="text-[#0b1329] animate-spin" />
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
                                                <span className="p-1.5 bg-slate-100 text-[#0b1329] rounded-lg"><FileText size={14} /></span>
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
                                                <span className="text-2xl font-black text-[#0b1329] block mt-1">
                                                    {avgScore} <span className="text-xs text-slate-400 font-bold">/ {totalMarks} pts</span>
                                                </span>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between">
                                                <span className="text-[10px] text-slate-400 font-bold">Mean score</span>
                                                <span className="p-1.5 bg-slate-100 text-[#0b1329] rounded-lg"><ShieldCheck size={14} /></span>
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
                                        <div className="bg-gradient-to-r from-[#0b1329] to-[#1e293b] text-white rounded-3xl p-6 mb-6 shadow-xl relative overflow-hidden">
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
                                                                    <div className="bg-[#0b1329] h-full rounded-l-lg transition-all duration-500" style={{ width: `${pct}%` }} />
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
                                                            <span className="text-[#0b1329] mr-1.5 font-extrabold">Question {idx + 1}:</span> {q.text}
                                                        </h4>
                                                        <span className="inline-block mt-2 px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                            {qType}
                                                        </span>
                                                    </div>
                                                    <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-[#0b1329] text-xs font-extrabold rounded-xl">
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
                                                                        <div className={`h-full rounded-lg transition-all ${isCorrect ? 'bg-emerald-550' : 'bg-slate-400'
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
                                                    Response <span className="text-[#0b1329] font-black">{individualIndex + 1}</span> of <span className="text-slate-500 font-bold">{totalCount}</span>
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
                                                        <span className="text-sm font-black text-[#0b1329] bg-slate-100 px-4 py-2 border border-slate-200 rounded-2xl font-mono">
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
                                                                                                                ? 'bg-[#0b1329] text-white shadow-sm'
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
                                                                                                                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-300 text-[#0b1329] font-mono font-bold rounded text-[9px] transition-colors"
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
                                                                                                    className="flex-1 text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 outline-none focus:border-slate-500"
                                                                                                    onKeyDown={(e) => {
                                                                                                        if (e.key === 'Enter') handleAddComment(evalKey, { current: videoRefs.current[evalKey] });
                                                                                                    }}
                                                                                                />
                                                                                                <button
                                                                                                    onClick={() => handleAddComment(evalKey, { current: videoRefs.current[evalKey] })}
                                                                                                    className="px-3 py-1.5 bg-[#0b1329] hover:bg-[#152244] text-white text-xs font-bold rounded-lg transition-colors"
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
                                                                                                className="w-full text-xs border border-slate-200 rounded-lg p-2 outline-none focus:border-slate-500 resize-none font-semibold text-slate-700"
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

    if (userInfo?.role === 'Editor' && editorControls?.activities?.enabled === false) {
        return (
            <DashboardLayout role="Editor">
                <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                    <div className="w-16 h-16 bg-red-50 text-red-550 rounded-2xl flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-800">Section Deactivated</h3>
                    <p className="text-slate-500 font-medium max-w-sm mt-2">
                        {editorControls.activities.note || 'This page has been deactivated by your administrator. Please contact support if you require access.'}
                    </p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role={userInfo?.role || 'Admin'}>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Assessment Dashboard</h1>
                    <p className="text-slate-500 text-sm">Manage LMS tests and configure public testing web links.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsTrashOpen(true)}
                        className="flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-slate-500 hover:text-red-650 hover:bg-red-50 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm cursor-pointer"
                        title="Recycle Bin"
                    >
                        <Trash2 size={16} className="text-red-500" /> Recycle Bin
                    </button>
                    <input
                        type="file"
                        ref={importTestsRef}
                        onChange={handleImportTests}
                        accept=".json,.csv,.xlsx,.xls"
                        multiple
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => importTestsRef.current?.click()}
                        className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-sm cursor-pointer whitespace-nowrap"
                    >
                        <Upload size={16} /> Import
                    </button>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                            className="px-3.5 py-2.5 bg-[#0b1329] hover:bg-slate-800 text-white rounded-xl transition-all flex items-center gap-1.5 text-sm font-bold shadow-sm cursor-pointer whitespace-nowrap"
                        >
                            <Download size={16} /> Export
                        </button>
                        {isExportDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                                <button
                                    type="button"
                                    onClick={() => { exportTests('excel'); setIsExportDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                    Excel (.xlsx)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { exportTests('csv'); setIsExportDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                    CSV (.csv)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { exportTests('json'); setIsExportDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                    JSON (.json)
                                </button>
                            </div>
                        )}
                    </div>
                    {((userInfo?.role === 'Admin') || (userInfo?.role === 'Institute') || (userInfo?.role === 'Editor' && editorControls?.activities?.createNewAssessment !== false)) && (
                        <button
                            onClick={() => navigate(`${basePath}/activities-builder`)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#0b1329] hover:bg-[#152244] text-white rounded-xl text-sm font-bold shadow-md shadow-[#0b1329]/15 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                        >
                            <Plus size={20} /> Create New Assessment
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Selectors & Folder Explorer Trigger */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                    {((userInfo?.role !== 'Editor') || (userInfo?.role === 'Editor' && editorControls?.activities?.lmsConnectedTests !== false)) && (
                        <button
                            onClick={() => setActiveTab('lms')}
                            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'lms'
                                ? 'bg-white text-[#0b1329] shadow-sm border border-slate-200/50'
                                : 'text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            LMS Connected Tests
                        </button>
                    )}
                    {((userInfo?.role !== 'Editor') || (userInfo?.role === 'Editor' && editorControls?.activities?.lmsConnectedTests !== false)) && (
                        <button
                            onClick={() => setActiveTab('lms-single')}
                            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'lms-single'
                                ? 'bg-white text-[#0b1329] shadow-sm border border-slate-200/50'
                                : 'text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            LMS Single Student
                        </button>
                    )}
                    {((userInfo?.role !== 'Editor') || (userInfo?.role === 'Editor' && editorControls?.activities?.lmsConnectedTests !== false)) && (
                        <button
                            onClick={() => setActiveTab('lms-selected')}
                            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'lms-selected'
                                ? 'bg-white text-[#0b1329] shadow-sm border border-slate-200/50'
                                : 'text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            LMS Selected Students
                        </button>
                    )}
                    {((userInfo?.role !== 'Editor') || (userInfo?.role === 'Editor' && editorControls?.activities?.publicWebTests !== false)) && (
                        <button
                            onClick={() => setActiveTab('public')}
                            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'public'
                                ? 'bg-white text-[#0b1329] shadow-sm border border-slate-200/50'
                                : 'text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            Public Web Tests
                        </button>
                    )}
                    {((userInfo?.role !== 'Editor') || (userInfo?.role === 'Editor' && editorControls?.activities?.draftTests !== false)) && (
                        <button
                            onClick={() => setActiveTab('draft')}
                            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'draft'
                                ? 'bg-white text-[#0b1329] shadow-sm border border-slate-200/50'
                                : 'text-slate-555 hover:text-slate-800'
                                }`}
                        >
                            Draft Tests
                        </button>
                    )}
                </div>

                {(activeTab === 'lms' || activeTab === 'lms-single' || activeTab === 'lms-selected' || activeTab === 'public' || activeTab === 'draft') && (
                    <button
                        onClick={() => setShowFolderExplorer(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#0b1329] border border-slate-200 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm shadow-sm"
                    >
                        <Folder size={14} className="text-[#0b1329]" />
                        <span>Managing Folder</span>
                    </button>
                )}
            </div>

            {/* Filters (Search Box & Subject Select) */}
            <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100 flex flex-row flex-wrap items-center gap-2.5 mb-6 w-full text-xs">
                {/* Search input */}
                <div className="relative w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10 transition-all font-medium h-[32px]"
                    />
                </div>

                {/* Bulk Action */}
                <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer h-[32px] w-[110px]"
                >
                    <option value="">Bulk Action</option>
                    <option value="edit">Edit Selected</option>
                    <option value="delete">Delete Selected</option>
                </select>

                {/* Apply button */}
                <button
                    type="button"
                    onClick={handleApplyBulkAction}
                    disabled={selectedIds.size === 0 || !bulkAction}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-lg text-xs font-bold transition-all disabled:cursor-not-allowed cursor-pointer h-[32px] active:scale-95 flex items-center justify-center border border-transparent disabled:border-slate-100"
                >
                    Apply ({selectedIds.size})
                </button>

                {/* Vertical Divider */}
                <div className="w-[1px] h-6 bg-slate-200 mx-1 hidden sm:block"></div>

                {/* Entries selector */}
                <div className="flex items-center gap-1 h-[32px]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">Show</span>
                    <input
                        type="number"
                        min={5}
                        max={activeTab === 'public' ? filteredPublicTests.length : filteredTests.length}
                        value={itemsPerPage}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            const maxLen = activeTab === 'public' ? filteredPublicTests.length : filteredTests.length;
                            if (isNaN(val)) {
                                setItemsPerPage('');
                            } else {
                                const maxVal = maxLen > 5 ? maxLen : 5;
                                setItemsPerPage(Math.min(val, maxVal));
                            }
                        }}
                        onBlur={(e) => {
                            const val = parseInt(e.target.value);
                            if (isNaN(val) || val < 5) {
                                setItemsPerPage(10);
                            }
                        }}
                        className="w-14 bg-slate-55 border border-slate-200 rounded-lg py-1 px-1.5 text-center text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-slate-350 transition-all h-[26px]"
                    />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">entries</span>
                </div>

                {/* Filters */}
                {(activeTab === 'lms' || activeTab === 'lms-single' || activeTab === 'lms-selected' || activeTab === 'public' || activeTab === 'draft') && (
                    <>
                        {/* Institute Filter */}
                        {(userInfo?.role === 'Admin' || uniqueInstitutes.length > 2) && (
                            <div className="relative w-[130px] h-[32px]">
                                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={11} />
                                <select
                                    value={filterInstitute}
                                    onChange={(e) => {
                                        setFilterInstitute(e.target.value);
                                        setFilterCourse('All');
                                        setFilterSubject('All');
                                    }}
                                    className="w-full pl-7 pr-6 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none appearance-none cursor-pointer font-semibold text-slate-700 focus:bg-white focus:border-indigo-500 transition-all h-full truncate"
                                >
                                    {uniqueInstitutes.map(inst => (
                                        <option key={inst} value={inst}>{inst === 'All' ? 'All Institutes' : inst}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Course Filter */}
                        <div className="relative w-[130px] h-[32px]">
                            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={11} />
                            <select
                                value={filterCourse}
                                onChange={(e) => {
                                    setFilterCourse(e.target.value);
                                    setFilterSubject('All');
                                    setFilterInbox('All');
                                }}
                                className="w-full pl-7 pr-6 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none appearance-none cursor-pointer font-semibold text-slate-700 focus:bg-white focus:border-indigo-500 transition-all h-full truncate"
                            >
                                {uniqueCourses.map(course => (
                                    <option key={course} value={course}>{course === 'All' ? 'All Courses' : course}</option>
                                ))}
                            </select>
                        </div>

                        {/* Subject Filter */}
                        <div className="relative w-[130px] h-[32px]">
                            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={11} />
                            <select
                                value={filterSubject}
                                onChange={(e) => {
                                    setFilterSubject(e.target.value);
                                    setFilterInbox('All');
                                }}
                                className="w-full pl-7 pr-6 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none appearance-none cursor-pointer font-semibold text-slate-700 focus:bg-white focus:border-indigo-500 transition-all h-full truncate"
                            >
                                {uniqueSubjects.map(subject => (
                                    <option key={subject} value={subject}>{subject === 'All' ? 'All Subjects' : subject}</option>
                                ))}
                            </select>
                        </div>

                        {/* Inbox Filter */}
                        <div className="relative w-[130px] h-[32px]">
                            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={11} />
                            <select
                                value={filterInbox}
                                onChange={(e) => setFilterInbox(e.target.value)}
                                className="w-full pl-7 pr-6 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none appearance-none cursor-pointer font-semibold text-slate-700 focus:bg-white focus:border-indigo-500 transition-all h-full truncate"
                            >
                                {uniqueInboxes.map(inbox => (
                                    <option key={inbox} value={inbox}>{inbox === 'All' ? 'All Inboxes' : inbox}</option>
                                ))}
                            </select>
                        </div>
                    </>
                )}
            </div>

            {/* TABLE CONTAINER */}
            {activeTab === 'lms' ? (
                /* ── LMS CONNECTED TESTS TABLE ── */
                loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b1329]"></div>
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
                                        <th className="p-4 w-10">
                                            <input
                                                type="checkbox"
                                                checked={paginatedTests.length > 0 && selectedIds.size === paginatedTests.length}
                                                onChange={() => {
                                                    if (selectedIds.size === paginatedTests.length) {
                                                        setSelectedIds(new Set());
                                                    } else {
                                                        setSelectedIds(new Set(paginatedTests.map(item => item._id)));
                                                    }
                                                }}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                            />
                                        </th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Test Title</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Course</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap text-center">RI</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Subject</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Duration</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Questions</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Test Inbox</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Created By</th>
                                        <th className="p-4 font-extrabold text-center whitespace-nowrap">Responses</th>
                                        <th className="p-4 font-extrabold text-right whitespace-nowrap sticky right-0 bg-slate-50 border-l border-slate-200 z-10">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedTests.map((test) => (
                                        <tr key={test._id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-4 w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(test._id)}
                                                    onChange={() => {
                                                        setSelectedIds(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(test._id)) {
                                                                next.delete(test._id);
                                                            } else {
                                                                next.add(test._id);
                                                            }
                                                            return next;
                                                        });
                                                    }}
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500/30 cursor-pointer accent-indigo-650"
                                                />
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3 font-semibold text-slate-800">
                                                    <div className="p-2 bg-slate-100 text-[#0b1329] rounded-lg flex-shrink-0">
                                                        <FileText size={16} />
                                                    </div>
                                                    <TruncatedCell text={test.title || 'Untitled'} maxLength={20} />
                                                </div>
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className="px-2.5 py-0.5 bg-slate-100 text-[#0b1329] rounded-full text-xs font-semibold">
                                                    <TruncatedCell text={test.course || 'N/A'} maxLength={20} />
                                                </span>
                                            </td>
                                            <td className="p-4 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => handleOpenRi(test)}
                                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-850 border border-indigo-200 text-indigo-750 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1 mx-auto cursor-pointer"
                                                    title="View Relevant Information (RI)"
                                                >
                                                    <Info size={13} />
                                                    <span>RI</span>
                                                </button>
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-705 rounded-full text-xs font-semibold">
                                                    <TruncatedCell text={test.subject || 'N/A'} maxLength={20} />
                                                </span>
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className="text-slate-600 text-xs font-medium">{test.settings?.duration || 0} mins</span>
                                            </td>
                                            <td className="p-4 whitespace-nowrap text-slate-600 text-xs font-mono">
                                                {test.questions?.length || 0} Qs
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                {test.index ? (() => {
                                                    const subjectKey = `${test.index}::${(test.subject || '').toLowerCase()}`;
                                                    const displayName = inboxDisplayNames[subjectKey] || inboxDisplayNames[test.index] || test.index;
                                                    const isRenamed = displayName !== test.index;
                                                    return (
                                                        <span
                                                            className="font-bold text-[#0b1329] px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs"
                                                            title={isRenamed ? `Original: ${test.index}` : ''}
                                                        >
                                                            {displayName}
                                                        </span>
                                                    );
                                                })() : (
                                                    <span className="text-slate-400 italic text-xs">No Index</span>
                                                )}
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-700 text-xs font-bold">{test.createdBy?.name || 'N/A'}</span>
                                                    <span className="text-slate-400 text-[10px] font-semibold">{test.createdBy?.role || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => handleOpenResponses(test, 'connected')}
                                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#0b1329] text-xs font-extrabold rounded-xl transition-all active:scale-95 flex items-center gap-1.5 mx-auto"
                                                >
                                                    <span>Responses</span>
                                                </button>
                                            </td>
                                            <td className="p-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors border-l border-slate-100">
                                                {userInfo?.role === 'Admin' ? (
                                                    <>
                                                        <button
                                                            onClick={() => handlePreviewTest(test)}
                                                            className="p-1.5 text-slate-405 border border-slate-200 hover:text-[#0b1329] hover:bg-slate-100 hover:border-slate-300 rounded-lg transition-colors"
                                                            title="Preview Test"
                                                        >
                                                            <Eye size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(getEditPath(test._id))}
                                                            className="p-1.5 text-slate-405 border border-slate-200 hover:text-[#0b1329] hover:bg-slate-100 hover:border-slate-300 rounded-lg transition-colors ml-1.5"
                                                            title="Edit Test"
                                                        >
                                                            <Edit size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDuplicate(test)}
                                                            className="p-1.5 text-slate-405 border border-slate-200 hover:text-[#0b1329] hover:bg-slate-100 hover:border-slate-300 rounded-lg transition-colors ml-1.5"
                                                            title="Duplicate Test"
                                                        >
                                                            <CopyPlus size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(test._id)}
                                                            className="p-1.5 text-slate-405 border border-slate-200 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-lg transition-colors ml-1.5"
                                                            title="Delete Test"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleCopyUrl(test._id, 'connected')}
                                                            className={`p-1.5 rounded-lg border transition-all ${copiedId === test._id
                                                                ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                                                                : 'text-slate-405 border-slate-200 hover:text-[#0b1329] hover:bg-slate-100/50 hover:border-slate-300'
                                                                }`}
                                                            title="Copy shareable link"
                                                        >
                                                            {copiedId === test._id ? <Check size={15} /> : <Link2 size={15} />}
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(getEditPath(test._id))}
                                                            className="p-1.5 text-slate-405 border border-slate-200 hover:text-[#0b1329] hover:bg-slate-100 hover:border-slate-300 rounded-lg transition-colors ml-1.5"
                                                            title="Edit Test"
                                                        >
                                                            <Edit size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDuplicate(test)}
                                                            className="p-1.5 text-slate-405 border border-slate-200 hover:text-[#0b1329] hover:bg-slate-100 hover:border-slate-300 rounded-lg transition-colors ml-1.5"
                                                            title="Duplicate Test"
                                                        >
                                                            <CopyPlus size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(test._id)}
                                                            className="p-1.5 text-slate-405 border border-slate-200 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-lg transition-colors ml-1.5"
                                                            title="Delete Test"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        {filteredTests.length > 0 && (
                            <div className="flex justify-between items-center p-4 border-t border-slate-100 bg-slate-50/50">
                                <span className="text-xs font-semibold text-slate-500">
                                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTests.length)} of {filteredTests.length} Assessments
                                </span>
                                <div className="flex gap-1.5">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-650 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all cursor-pointer"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    {getPageNumbers(filteredTests.length).map((p, idx) => (
                                        <button
                                            key={idx}
                                            disabled={p === '...'}
                                            onClick={() => p !== '...' && setCurrentPage(p)}
                                            className={`w-8 h-8 text-xs font-bold rounded-xl transition-all cursor-pointer ${p === '...'
                                                ? 'text-slate-400 cursor-default bg-transparent'
                                                : currentPage === p
                                                    ? 'bg-[#0b1329] text-white shadow-md'
                                                    : 'text-slate-655 hover:bg-slate-100 bg-transparent'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                    <button
                                        disabled={currentPage === Math.ceil(filteredTests.length / itemsPerPage)}
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredTests.length / itemsPerPage)))}
                                        className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-655 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all cursor-pointer"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )
            ) : activeTab === 'lms-single' ? (
                /* ── LMS SINGLE STUDENT TABLE ── */
                loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b1329]"></div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 text-xs uppercase tracking-wider">
                                        <th className="p-4 w-10">
                                            <input
                                                type="checkbox"
                                                checked={paginatedTests.length > 0 && selectedIds.size === paginatedTests.length}
                                                onChange={() => {
                                                    if (selectedIds.size === paginatedTests.length) {
                                                        setSelectedIds(new Set());
                                                    } else {
                                                        setSelectedIds(new Set(paginatedTests.map(item => item._id)));
                                                    }
                                                }}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                            />
                                        </th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Test Title</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Assigned Student</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Course</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap text-center">RI</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Subject</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Duration</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Questions</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Test Inbox</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Created By</th>
                                        <th className="p-4 font-extrabold text-center whitespace-nowrap">Responses</th>
                                        <th className="p-4 font-extrabold text-right whitespace-nowrap sticky right-0 bg-slate-50 border-l border-slate-200 z-10">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedTests.length === 0 ? (
                                        <tr>
                                            <td colSpan="12" className="p-12 text-center">
                                                <FileText className="mx-auto text-slate-300 mb-3" size={40} />
                                                <p className="text-slate-500 text-sm font-semibold">No single-student tests found</p>
                                                <p className="text-slate-400 text-xs mt-1">Tests assigned to a particular student will appear here.</p>
                                            </td>
                                        </tr>
                                    ) : paginatedTests.map((test) => (
                                        <tr key={test._id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-4 w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(test._id)}
                                                    onChange={() => {
                                                        setSelectedIds(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(test._id)) {
                                                                next.delete(test._id);
                                                            } else {
                                                                next.add(test._id);
                                                            }
                                                            return next;
                                                        });
                                                    }}
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500/30 cursor-pointer accent-indigo-650"
                                                />
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3 font-semibold text-slate-800">
                                                    <div className="p-2 bg-slate-100 text-[#0b1329] rounded-lg flex-shrink-0">
                                                        <FileText size={16} />
                                                    </div>
                                                    <TruncatedCell text={test.title || 'Untitled'} maxLength={20} />
                                                </div>
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                {test.assignedStudents?.length > 0 ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-700 text-xs font-bold">{test.assignedStudents[0]?.name || 'Student'}</span>
                                                        <span className="text-slate-400 text-[10px]">{test.assignedStudents[0]?.email || ''}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic text-xs">N/A</span>
                                                )}
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className="px-2.5 py-0.5 bg-slate-100 text-[#0b1329] rounded-full text-xs font-semibold">
                                                    <TruncatedCell text={test.course || 'N/A'} maxLength={20} />
                                                </span>
                                            </td>
                                            <td className="p-4 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => handleOpenRi(test)}
                                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-850 border border-indigo-200 text-indigo-750 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1 mx-auto cursor-pointer"
                                                    title="View Relevant Information (RI)"
                                                >
                                                    <Info size={13} />
                                                    <span>RI</span>
                                                </button>
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-705 rounded-full text-xs font-semibold">
                                                    <TruncatedCell text={test.subject || 'N/A'} maxLength={20} />
                                                </span>
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className="text-slate-600 text-xs font-medium">{test.settings?.duration || 0} mins</span>
                                            </td>
                                            <td className="p-4 whitespace-nowrap text-slate-600 text-xs font-mono">
                                                {test.questions?.length || 0} Qs
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                {test.index ? (() => {
                                                    const subjectKey = `${test.index}::${(test.subject || '').toLowerCase()}`;
                                                    const displayName = inboxDisplayNames[subjectKey] || inboxDisplayNames[test.index] || test.index;
                                                    return (
                                                        <span className="font-bold text-[#0b1329] px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs">
                                                            {displayName}
                                                        </span>
                                                    );
                                                })() : (
                                                    <span className="text-slate-400 italic text-xs">No Index</span>
                                                )}
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-700 text-xs font-bold">{test.createdBy?.name || 'N/A'}</span>
                                                    <span className="text-slate-400 text-[10px] font-semibold">{test.createdBy?.role || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => handleOpenResponses(test, 'connected')}
                                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#0b1329] text-xs font-extrabold rounded-xl transition-all active:scale-95 flex items-center gap-1.5 mx-auto"
                                                >
                                                    <span>Responses</span>
                                                </button>
                                            </td>
                                            <td className="p-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors border-l border-slate-100">
                                                <button onClick={() => handlePreviewTest(test)} className="p-1.5 text-slate-405 border border-slate-200 hover:text-[#0b1329] hover:bg-slate-100 hover:border-slate-300 rounded-lg transition-colors" title="Preview Test"><Eye size={15} /></button>
                                                <button onClick={() => navigate(getEditPath(test._id))} className="p-1.5 text-slate-405 border border-slate-200 hover:text-[#0b1329] hover:bg-slate-100 hover:border-slate-300 rounded-lg transition-colors ml-1.5" title="Edit Test"><Edit size={15} /></button>
                                                <button onClick={() => handleDuplicate(test)} className="p-1.5 text-slate-405 border border-slate-200 hover:text-[#0b1329] hover:bg-slate-100 hover:border-slate-300 rounded-lg transition-colors ml-1.5" title="Duplicate"><CopyPlus size={15} /></button>
                                                <button onClick={() => handleDelete(test._id)} className="p-1.5 text-slate-405 border border-slate-200 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-lg transition-colors ml-1.5" title="Delete"><Trash2 size={15} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredTests.length > 0 && (
                            <div className="flex justify-between items-center p-4 border-t border-slate-100 bg-slate-50/50">
                                <span className="text-xs font-semibold text-slate-500">
                                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTests.length)} of {filteredTests.length} Assessments
                                </span>
                                <div className="flex gap-1.5">
                                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-650 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"><ChevronLeft size={16} /></button>
                                    {getPageNumbers(filteredTests.length).map((p, idx) => (
                                        <button key={idx} disabled={p === '...'} onClick={() => p !== '...' && setCurrentPage(p)} className={`w-8 h-8 text-xs font-bold rounded-xl transition-all cursor-pointer ${p === '...' ? 'text-slate-400 cursor-default bg-transparent' : currentPage === p ? 'bg-[#0b1329] text-white shadow-md' : 'text-slate-655 hover:bg-slate-100 bg-transparent'}`}>{p}</button>
                                    ))}
                                    <button disabled={currentPage === Math.ceil(filteredTests.length / itemsPerPage)} onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredTests.length / itemsPerPage)))} className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-655 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                )
            ) : activeTab === 'lms-selected' ? (
                /* ── LMS SELECTED STUDENTS TABLE ── */
                loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b1329]"></div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 text-xs uppercase tracking-wider">
                                        <th className="p-4 w-10">
                                            <input
                                                type="checkbox"
                                                checked={paginatedTests.length > 0 && selectedIds.size === paginatedTests.length}
                                                onChange={() => {
                                                    if (selectedIds.size === paginatedTests.length) {
                                                        setSelectedIds(new Set());
                                                    } else {
                                                        setSelectedIds(new Set(paginatedTests.map(item => item._id)));
                                                    }
                                                }}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                            />
                                        </th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Test Title</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Assigned Students</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Course</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap text-center">RI</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Subject</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Duration</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Questions</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Test Inbox</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Created By</th>
                                        <th className="p-4 font-extrabold text-center whitespace-nowrap">Responses</th>
                                        <th className="p-4 font-extrabold text-right whitespace-nowrap sticky right-0 bg-slate-50 border-l border-slate-200 z-10">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedTests.length === 0 ? (
                                        <tr>
                                            <td colSpan="12" className="p-12 text-center">
                                                <FileText className="mx-auto text-slate-300 mb-3" size={40} />
                                                <p className="text-slate-500 text-sm font-semibold">No selected-students tests found</p>
                                                <p className="text-slate-400 text-xs mt-1">Tests assigned to selected students will appear here.</p>
                                            </td>
                                        </tr>
                                    ) : paginatedTests.map((test) => (
                                        <tr key={test._id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-4 w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(test._id)}
                                                    onChange={() => {
                                                        setSelectedIds(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(test._id)) {
                                                                next.delete(test._id);
                                                            } else {
                                                                next.add(test._id);
                                                            }
                                                            return next;
                                                        });
                                                    }}
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500/30 cursor-pointer accent-indigo-650"
                                                />
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3 font-semibold text-slate-800">
                                                    <div className="p-2 bg-slate-100 text-[#0b1329] rounded-lg flex-shrink-0">
                                                        <FileText size={16} />
                                                    </div>
                                                    <TruncatedCell text={test.title || 'Untitled'} maxLength={20} />
                                                </div>
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                {test.assignedStudents?.length > 0 ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        {test.assignedStudents.slice(0, 2).map((s, i) => (
                                                            <span key={i} className="text-xs text-slate-700 font-semibold">{s?.name || 'Student'}</span>
                                                        ))}
                                                        {test.assignedStudents.length > 2 && (
                                                            <span className="text-[10px] text-slate-400">+{test.assignedStudents.length - 2} more</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic text-xs">N/A</span>
                                                )}
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className="px-2.5 py-0.5 bg-slate-100 text-[#0b1329] rounded-full text-xs font-semibold">
                                                    <TruncatedCell text={test.course || 'N/A'} maxLength={20} />
                                                </span>
                                            </td>
                                            <td className="p-4 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => handleOpenRi(test)}
                                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-850 border border-indigo-200 text-indigo-750 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1 mx-auto cursor-pointer"
                                                    title="View Relevant Information (RI)"
                                                >
                                                    <Info size={13} />
                                                    <span>RI</span>
                                                </button>
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-705 rounded-full text-xs font-semibold">
                                                    <TruncatedCell text={test.subject || 'N/A'} maxLength={20} />
                                                </span>
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className="text-slate-600 text-xs font-medium">{test.settings?.duration || 0} mins</span>
                                            </td>
                                            <td className="p-4 whitespace-nowrap text-slate-600 text-xs font-mono">
                                                {test.questions?.length || 0} Qs
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                {test.index ? (() => {
                                                    const subjectKey = `${test.index}::${(test.subject || '').toLowerCase()}`;
                                                    const displayName = inboxDisplayNames[subjectKey] || inboxDisplayNames[test.index] || test.index;
                                                    return (
                                                        <span className="font-bold text-[#0b1329] px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs">
                                                            {displayName}
                                                        </span>
                                                    );
                                                })() : (
                                                    <span className="text-slate-400 italic text-xs">No Index</span>
                                                )}
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-700 text-xs font-bold">{test.createdBy?.name || 'N/A'}</span>
                                                    <span className="text-slate-400 text-[10px] font-semibold">{test.createdBy?.role || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => handleOpenResponses(test, 'connected')}
                                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#0b1329] text-xs font-extrabold rounded-xl transition-all active:scale-95 flex items-center gap-1.5 mx-auto"
                                                >
                                                    <span>Responses</span>
                                                </button>
                                            </td>
                                            <td className="p-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors border-l border-slate-100">
                                                <button onClick={() => handlePreviewTest(test)} className="p-1.5 text-slate-405 border border-slate-200 hover:text-[#0b1329] hover:bg-slate-100 hover:border-slate-300 rounded-lg transition-colors" title="Preview Test"><Eye size={15} /></button>
                                                <button onClick={() => navigate(getEditPath(test._id))} className="p-1.5 text-slate-405 border border-slate-200 hover:text-[#0b1329] hover:bg-slate-100 hover:border-slate-300 rounded-lg transition-colors ml-1.5" title="Edit Test"><Edit size={15} /></button>
                                                <button onClick={() => handleDuplicate(test)} className="p-1.5 text-slate-405 border border-slate-200 hover:text-[#0b1329] hover:bg-slate-100 hover:border-slate-300 rounded-lg transition-colors ml-1.5" title="Duplicate"><CopyPlus size={15} /></button>
                                                <button onClick={() => handleDelete(test._id)} className="p-1.5 text-slate-405 border border-slate-200 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-lg transition-colors ml-1.5" title="Delete"><Trash2 size={15} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredTests.length > 0 && (
                            <div className="flex justify-between items-center p-4 border-t border-slate-100 bg-slate-50/50">
                                <span className="text-xs font-semibold text-slate-500">
                                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTests.length)} of {filteredTests.length} Assessments
                                </span>
                                <div className="flex gap-1.5">
                                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-650 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"><ChevronLeft size={16} /></button>
                                    {getPageNumbers(filteredTests.length).map((p, idx) => (
                                        <button key={idx} disabled={p === '...'} onClick={() => p !== '...' && setCurrentPage(p)} className={`w-8 h-8 text-xs font-bold rounded-xl transition-all cursor-pointer ${p === '...' ? 'text-slate-400 cursor-default bg-transparent' : currentPage === p ? 'bg-[#0b1329] text-white shadow-md' : 'text-slate-655 hover:bg-slate-100 bg-transparent'}`}>{p}</button>
                                    ))}
                                    <button disabled={currentPage === Math.ceil(filteredTests.length / itemsPerPage)} onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredTests.length / itemsPerPage)))} className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-655 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                )
            ) : activeTab === 'draft' ? (
                /* ── DRAFT TESTS TABLE ── */
                loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b1329]"></div>
                    </div>
                ) : filteredTests.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-250">
                        <FileText className="mx-auto text-slate-350 mb-4" size={48} />
                        <h3 className="text-lg font-bold text-slate-700">No draft tests found</h3>
                        <p className="text-slate-500 text-xs">Create tests in the builder and click "Save as Draft".</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 text-xs uppercase tracking-wider">
                                        <th className="p-4 w-10">
                                            <input
                                                type="checkbox"
                                                checked={paginatedTests.length > 0 && selectedIds.size === paginatedTests.length}
                                                onChange={() => {
                                                    if (selectedIds.size === paginatedTests.length) {
                                                        setSelectedIds(new Set());
                                                    } else {
                                                        setSelectedIds(new Set(paginatedTests.map(item => item._id)));
                                                    }
                                                }}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                            />
                                        </th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Draft Title</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Course</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Subject</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Questions</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Created By</th>
                                        <th className="p-4 font-extrabold text-right whitespace-nowrap sticky right-0 bg-slate-50 border-l border-slate-200 z-10">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedTests.map((test) => (
                                        <tr key={test._id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-4 w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(test._id)}
                                                    onChange={() => {
                                                        setSelectedIds(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(test._id)) {
                                                                next.delete(test._id);
                                                            } else {
                                                                next.add(test._id);
                                                            }
                                                            return next;
                                                        });
                                                    }}
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500/30 cursor-pointer accent-indigo-650"
                                                />
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-slate-100 text-slate-500 rounded-lg flex-shrink-0">
                                                        <FileText size={16} />
                                                    </div>
                                                    <div className="max-w-[200px] overflow-x-auto whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden font-semibold text-slate-800 cursor-help" title={test.title || 'Untitled'}>
                                                        {test.title || 'Untitled'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="max-w-[120px] overflow-x-auto whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" title={test.course || 'N/A'}>
                                                    <span className="px-2.5 py-0.5 bg-slate-100 text-[#0b1329] rounded-full text-xs font-semibold">
                                                        {test.course || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-705 rounded-full text-xs font-semibold">
                                                    {test.subject || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="p-4 whitespace-nowrap text-slate-600 text-xs font-mono">
                                                {test.questions?.length || 0} Qs
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-700 text-xs font-bold">{test.createdBy?.name || 'N/A'}</span>
                                                    <span className="text-slate-400 text-[10px] font-semibold">{test.createdBy?.role || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors border-l border-slate-100">
                                                <button
                                                    onClick={() => handlePreviewTest(test)}
                                                    className="p-1.5 text-slate-405 border border-slate-200 hover:text-[#0b1329] hover:bg-slate-100 hover:border-slate-300 rounded-lg transition-colors"
                                                    title="Preview Test"
                                                >
                                                    <Eye size={15} />
                                                </button>
                                                <button
                                                    onClick={() => navigate(getEditPath(test._id))}
                                                    className="p-1.5 text-slate-405 border border-slate-200 hover:text-[#0b1329] hover:bg-slate-100 hover:border-slate-300 rounded-lg transition-colors ml-1.5"
                                                    title="Edit Test"
                                                >
                                                    <Edit size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleDuplicate(test)}
                                                    className="p-1.5 text-slate-405 border border-slate-200 hover:text-[#0b1329] hover:bg-slate-100 hover:border-slate-300 rounded-lg transition-colors ml-1.5"
                                                    title="Duplicate Test"
                                                >
                                                    <CopyPlus size={15} />
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

                        {/* Pagination */}
                        {filteredTests.length > itemsPerPage && (
                            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                                <span className="text-xs text-slate-500 font-semibold">
                                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTests.length)} of {filteredTests.length} drafts
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-655 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all cursor-pointer"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    {getPageNumbers(filteredTests.length).map((pg, i) => (
                                        <button
                                            key={i}
                                            disabled={pg === '...'}
                                            onClick={() => typeof pg === 'number' && setCurrentPage(pg)}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${pg === currentPage
                                                ? 'bg-[#0b1329] text-white shadow-sm'
                                                : pg === '...'
                                                    ? 'text-slate-400 cursor-default'
                                                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer'
                                                }`}
                                        >
                                            {pg}
                                        </button>
                                    ))}
                                    <button
                                        disabled={currentPage === Math.ceil(filteredTests.length / itemsPerPage)}
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredTests.length / itemsPerPage)))}
                                        className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-655 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all cursor-pointer"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
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
                                        <th className="p-4 w-10">
                                            <input
                                                type="checkbox"
                                                checked={paginatedPublicTests.length > 0 && selectedIds.size === paginatedPublicTests.length}
                                                onChange={() => {
                                                    if (selectedIds.size === paginatedPublicTests.length) {
                                                        setSelectedIds(new Set());
                                                    } else {
                                                        setSelectedIds(new Set(paginatedPublicTests.map(item => item._id)));
                                                    }
                                                }}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-650"
                                            />
                                        </th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Test Name</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap text-center">Public Link</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap text-center">Total Views</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap text-center">Total Responses</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap text-center">Completion Rate</th>
                                        <th className="p-4 font-extrabold text-center whitespace-nowrap">Status</th>
                                        <th className="p-4 font-extrabold whitespace-nowrap">Created By</th>
                                        <th className="p-4 font-extrabold text-right whitespace-nowrap sticky right-0 bg-slate-50 border-l border-slate-200 z-10">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedPublicTests.map((test) => {
                                        const isEnabled = test.status === 'active';
                                        return (
                                            <tr key={test._id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="p-4 w-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(test._id)}
                                                        onChange={() => {
                                                            setSelectedIds(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(test._id)) {
                                                                    next.delete(test._id);
                                                                } else {
                                                                    next.add(test._id);
                                                                }
                                                                return next;
                                                            });
                                                        }}
                                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500/30 cursor-pointer accent-indigo-650"
                                                    />
                                                </td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg flex-shrink-0">
                                                            <Globe size={16} />
                                                        </div>
                                                        <div className="max-w-[200px] overflow-x-auto whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden font-semibold text-slate-800 cursor-help" title={test.title || 'Untitled'}>
                                                            {test.title || 'Untitled'}
                                                        </div>
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
                                                            title="Preview Live Test"
                                                        >
                                                            <ExternalLink size={13} />
                                                        </a>
                                                        <button
                                                            onClick={() => {
                                                                const path = `/public-test/${test._id}`;
                                                                setQrCodeUrl(`${window.location.origin}${path}`);
                                                                setIsQrModalOpen(true);
                                                            }}
                                                            className="p-1.5 rounded-lg border text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100 hover:text-slate-800 flex items-center cursor-pointer"
                                                            title="Show QR Code"
                                                        >
                                                            <QrCode size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-4 whitespace-nowrap text-center text-xs font-mono font-bold text-slate-700">
                                                    {test.publicViews}
                                                </td>
                                                <td className="p-4 whitespace-nowrap text-center">
                                                    <button
                                                        onClick={() => handleOpenResponses(test)}
                                                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[#0b1329] text-xs font-extrabold rounded-xl transition-all active:scale-95 flex items-center gap-1.5 mx-auto"
                                                    >
                                                        <span>Responses</span>
                                                        <span className="bg-slate-200 text-black px-1.5 py-0.2 rounded-full text-[10px] font-black">{test.totalResponses}</span>
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
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="flex flex-col text-left">
                                                        <span className="text-slate-700 text-xs font-bold">{test.createdBy?.name || 'N/A'}</span>
                                                        <span className="text-slate-400 text-[10px] font-semibold">{test.createdBy?.role || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors border-l border-slate-100">
                                                    {userInfo?.role === 'Admin' ? (
                                                        <>
                                                            <button
                                                                onClick={() => handlePreviewTest(test)}
                                                                className="p-1.5 text-slate-405 border border-slate-200 hover:text-[#0b1329] hover:bg-slate-100 hover:border-slate-300 rounded-lg transition-colors"
                                                                title="Preview Test"
                                                            >
                                                                <Eye size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => navigate(getEditPath(test._id))}
                                                                className="p-1.5 text-slate-405 border border-slate-200 hover:text-[#0b1329] hover:bg-slate-100 hover:border-slate-300 rounded-lg transition-colors ml-1.5"
                                                                title="Edit Test"
                                                            >
                                                                <Edit size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDuplicate(test)}
                                                                className="p-1.5 text-slate-405 border border-slate-200 hover:text-[#0b1329] hover:bg-slate-100 hover:border-slate-300 rounded-lg transition-colors ml-1.5"
                                                                title="Duplicate Test"
                                                            >
                                                                <CopyPlus size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(test._id)}
                                                                className="p-1.5 text-slate-400 border border-slate-200 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-lg transition-colors ml-1.5"
                                                                title="Delete Link"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => navigate(getEditPath(test._id))}
                                                                className="p-1.5 text-slate-405 border border-slate-200 hover:text-[#0b1329] hover:bg-slate-100 hover:border-slate-300 rounded-lg transition-colors"
                                                                title="Edit Test"
                                                            >
                                                                <Edit size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDuplicate(test)}
                                                                className="p-1.5 text-slate-405 border border-slate-200 hover:text-[#0b1329] hover:bg-slate-100 hover:border-slate-300 rounded-lg transition-colors ml-1.5"
                                                                title="Duplicate Test"
                                                            >
                                                                <CopyPlus size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenSettings(test)}
                                                                className="p-1.5 text-slate-400 border border-slate-200 hover:text-[#0b1329] hover:bg-slate-100 hover:border-slate-300 rounded-lg transition-colors ml-1.5"
                                                                title="Public Settings"
                                                            >
                                                                <Settings size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(test._id)}
                                                                className="p-1.5 text-slate-400 border border-slate-200 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-lg transition-colors ml-1.5"
                                                                title="Delete Link"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        {filteredPublicTests.length > 0 && (
                            <div className="flex justify-between items-center p-4 border-t border-slate-100 bg-slate-50/50">
                                <span className="text-xs font-semibold text-slate-500">
                                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredPublicTests.length)} of {filteredPublicTests.length} Assessments
                                </span>
                                <div className="flex gap-1.5">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-650 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all cursor-pointer"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    {getPageNumbers(filteredPublicTests.length).map((p, idx) => (
                                        <button
                                            key={idx}
                                            disabled={p === '...'}
                                            onClick={() => p !== '...' && setCurrentPage(p)}
                                            className={`w-8 h-8 text-xs font-bold rounded-xl transition-all cursor-pointer ${p === '...'
                                                ? 'text-slate-400 cursor-default bg-transparent'
                                                : currentPage === p
                                                    ? 'bg-[#0b1329] text-white shadow-md'
                                                    : 'text-slate-655 hover:bg-slate-100 bg-transparent'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                    <button
                                        disabled={currentPage === Math.ceil(filteredPublicTests.length / itemsPerPage)}
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredPublicTests.length / itemsPerPage)))}
                                        className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-655 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all cursor-pointer"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )
            )}

            {/* ── LMS CONNECTED TESTS FOLDER EXPLORER MODAL ── */}
            <TestFolderStructure
                isOpen={showFolderExplorer}
                onClose={() => setShowFolderExplorer(false)}
                tests={activeTab === 'lms' ? tests : publicTests}
                onOpenResponses={(test, type) => handleOpenResponses(test, type || 'connected')}
                onDelete={handleDelete}
                onImportSuccess={(quiet) => {
                    if (typeof fetchLmsTests === 'function') fetchLmsTests(quiet);
                    if (typeof fetchPublicTests === 'function') fetchPublicTests(quiet);
                }}
                onRenameSuccess={(testId, newTitle) => {
                    setTests(prev => prev.map(t => t._id === testId ? { ...t, title: newTitle } : t));
                    setPublicTests(prev => prev.map(t => t._id === testId ? { ...t, title: newTitle } : t));
                }}
            />

            {/* ── 1. PUBLIC TEST SETTINGS EDIT MODAL ────────────────── */}
            {showSettingsModal && createPortal(
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-fade-in">
                    <form onSubmit={handleSaveSettings} className="bg-white w-full max-w-3xl max-h-[85vh] rounded-[30px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Settings size={18} className="text-[#0b1329]" /> Edit Web Settings: <span className="text-[#0b1329] font-extrabold">{selectedPublicTest?.title}</span>
                            </h3>
                            <button type="button" onClick={() => setShowSettingsModal(false)} className="p-2 text-slate-400 hover:text-slate-650 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                            {/* Dates & Limits Row */}
                            <div className="p-4 border border-slate-200 rounded-2xl space-y-4 animate-fade-in">
                                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Calendar size={12} className="text-[#0b1329]" /> Schedule & Limits</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600">Start Date</label>
                                        <input
                                            type="date"
                                            value={editSettingsForm.startDate}
                                            onChange={(e) => setEditSettingsForm(prev => ({ ...prev, startDate: e.target.value }))}
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600">End Date</label>
                                        <input
                                            type="date"
                                            value={editSettingsForm.endDate}
                                            onChange={(e) => setEditSettingsForm(prev => ({ ...prev, endDate: e.target.value }))}
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600">Expiry Date</label>
                                        <input
                                            type="date"
                                            value={editSettingsForm.expiryDate}
                                            onChange={(e) => setEditSettingsForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600">Max Attempts (Capacity)</label>
                                        <input
                                            type="number"
                                            value={editSettingsForm.maxResponses}
                                            onChange={(e) => setEditSettingsForm(prev => ({ ...prev, maxResponses: e.target.value }))}
                                            placeholder="No capacity limit"
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">

                                {/* Security */}
                                <div className="p-4 border border-slate-200 rounded-2xl space-y-4">
                                    <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Lock size={12} className="text-[#0b1329]" /> Access Controls</h5>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600">Access Password</label>
                                        <input
                                            type="text"
                                            value={editSettingsForm.password}
                                            onChange={(e) => setEditSettingsForm(prev => ({ ...prev, password: e.target.value }))}
                                            placeholder="No password required"
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10"
                                        />
                                    </div>

                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-650 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={!editSettingsForm.allowMultiple}
                                            onChange={(e) => setEditSettingsForm(prev => ({ ...prev, allowMultiple: !e.target.checked }))}
                                            className="rounded text-[#0b1329] focus:ring-slate-500 w-4 h-4"
                                        />
                                        One Response Per Email
                                    </label>

                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-655 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={editSettingsForm.antiSpam}
                                            onChange={(e) => setEditSettingsForm(prev => ({ ...prev, antiSpam: e.target.checked }))}
                                            className="rounded text-[#0b1329] focus:ring-slate-500 w-4 h-4"
                                        />
                                        Enable reCAPTCHA & Rate Limiting
                                    </label>
                                </div>

                                {/* Timer & Flow */}
                                <div className="p-4 border border-slate-200 rounded-2xl space-y-4">
                                    <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Clock size={12} className="text-[#0b1329]" /> assessment rules</h5>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600">Time Limit (Minutes)</label>
                                        <input
                                            type="number"
                                            value={editSettingsForm.timeLimit}
                                            onChange={(e) => setEditSettingsForm(prev => ({ ...prev, timeLimit: e.target.value }))}
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-500/10"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-655 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={editSettingsForm.randomizeQuestions}
                                                onChange={(e) => setEditSettingsForm(prev => ({ ...prev, randomizeQuestions: e.target.checked }))}
                                                className="rounded text-[#0b1329] focus:ring-slate-500 w-4 h-4"
                                            />
                                            Randomize Questions
                                        </label>
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-655 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={editSettingsForm.showScoreAfterSubmission}
                                                onChange={(e) => setEditSettingsForm(prev => ({ ...prev, showScoreAfterSubmission: e.target.checked }))}
                                                className="rounded text-[#0b1329] focus:ring-slate-500 w-4 h-4"
                                            />
                                            Show Score After Submission
                                        </label>
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-655 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={editSettingsForm.showCorrectAnswers}
                                                onChange={(e) => setEditSettingsForm(prev => ({ ...prev, showCorrectAnswers: e.target.checked }))}
                                                className="rounded text-[#0b1329] focus:ring-slate-500 w-4 h-4"
                                            />
                                            Show Correct Answers
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Assistive Features Checklist */}
                            <div className="p-4 border border-slate-200 rounded-2xl space-y-4 animate-fade-in">
                                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Settings size={12} className="text-[#0b1329]" /> Assistive Accessibility Features (OFF by default)</h5>
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
                                                className="rounded text-[#0b1329] focus:ring-slate-500 w-4 h-4"
                                            />
                                            <span>{feat.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Notifications */}
                            <div className="p-4 border border-slate-200 rounded-2xl space-y-3">
                                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Mail size={12} className="text-[#0b1329]" /> Email Notifications (Simulated)</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                        <input
                                            type="checkbox"
                                            checked={editSettingsForm.emailNotification.sendConfirmationEmail}
                                            onChange={(e) => handleEmailNotificationChange('sendConfirmationEmail', e.target.checked)}
                                            className="rounded text-[#0b1329] w-4 h-4"
                                        />
                                        Confirmation Email
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                        <input
                                            type="checkbox"
                                            checked={editSettingsForm.emailNotification.sendScoreEmail}
                                            onChange={(e) => handleEmailNotificationChange('sendScoreEmail', e.target.checked)}
                                            className="rounded text-[#0b1329] w-4 h-4"
                                        />
                                        Score Report Email
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                        <input
                                            type="checkbox"
                                            checked={editSettingsForm.emailNotification.sendSubmissionNotification}
                                            onChange={(e) => handleEmailNotificationChange('sendSubmissionNotification', e.target.checked)}
                                            className="rounded text-[#0b1329] w-4 h-4"
                                        />
                                        Admin Alert Email
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                            <button type="button" onClick={() => setShowSettingsModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-605 bg-white">Cancel</button>
                            <button type="submit" disabled={savingSettings} className="px-6 py-2.5 bg-[#0b1329] hover:bg-[#152244] text-white rounded-xl text-xs font-bold shadow-md shadow-[#0b1329]/15">
                                {savingSettings ? "Saving..." : "Save Settings"}
                            </button>
                        </div>
                    </form>
                </div>,
                document.body
            )}

            {/* ── 2. PUBLIC/CONNECTED TEST PREVIEW MODAL ────────────────── */}
            {showPreviewModal && previewTest && createPortal(
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-fade-in">
                    <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-[30px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-[#0b1329] text-white">
                            <div>
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Eye size={18} className="text-emerald-450" /> Test Preview: <span className="text-emerald-450 font-extrabold">{previewTest.title}</span>
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    Course: {previewTest.course || 'N/A'} | Subject: {previewTest.subject || 'N/A'} | Duration: {previewTest.settings?.duration || 0} mins
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPreviewModal(false)}
                                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
                            {previewTest.description && (
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</h4>
                                    <p className="text-slate-700 text-sm">{previewTest.description}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Questions ({previewTest.questions?.length || 0})</h4>
                                {(!previewTest.questions || previewTest.questions.length === 0) ? (
                                    <div className="text-center py-8 bg-white rounded-xl border border-dashed border-slate-200">
                                        <p className="text-slate-500 text-sm">No questions in this test.</p>
                                    </div>
                                ) : (
                                    previewTest.questions.map((q, idx) => (
                                        <div key={q.id || idx} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                                <span className="text-sm font-black text-[#0b1329]">Question {idx + 1}</span>
                                                <div className="flex gap-2">
                                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md uppercase tracking-wider">{q.type}</span>
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">{q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}</span>
                                                </div>
                                            </div>

                                            <p className="text-slate-800 text-sm font-semibold">{q.text}</p>

                                            {q.helperText && (
                                                <p className="text-xs text-slate-550 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">{q.helperText}</p>
                                            )}

                                            {/* MCQ/Options */}
                                            {q.options && q.options.length > 0 && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                                    {q.options.map((opt, oIdx) => (
                                                        <div
                                                            key={oIdx}
                                                            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold ${opt.isCorrect
                                                                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
                                                                : 'bg-slate-50 border-slate-200 text-slate-750'
                                                                }`}
                                                        >
                                                            <span>{opt.text}</span>
                                                            {opt.isCorrect && <Check size={14} className="text-emerald-600 font-extrabold" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Matching pairs */}
                                            {q.matchingPairs && q.matchingPairs.length > 0 && (
                                                <div className="space-y-1.5 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                                                    <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block mb-1">Matching Pairs:</span>
                                                    {q.matchingPairs.map((pair, pIdx) => (
                                                        <div key={pIdx} className="flex items-center gap-3 text-xs">
                                                            <span className="bg-white px-2.5 py-1 rounded border border-slate-205 font-semibold text-slate-700">{pair.key}</span>
                                                            <span className="text-slate-400">➔</span>
                                                            <span className="bg-white px-2.5 py-1 rounded border border-slate-205 font-semibold text-slate-700">{pair.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Blank answers */}
                                            {q.blankAnswers && q.blankAnswers.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest block w-full mb-1">Correct Answers:</span>
                                                    {q.blankAnswers.map((ans, aIdx) => (
                                                        <span key={aIdx} className="bg-emerald-50 text-emerald-800 border border-emerald-250 px-2 py-0.5 rounded-md text-xs font-bold font-mono">
                                                            {ans}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
                            <button
                                type="button"
                                onClick={() => setShowPreviewModal(false)}
                                className="px-5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-black active:scale-95 transition-all"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── 3. RELEVANT INFORMATION (RI) MODAL ────────────────── */}
            {showRiModal && riTest && createPortal(
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-[30px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-[#0b1329] text-white">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <Info size={16} className="text-indigo-400" /> Relevant Information
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowRiModal(false)}
                                className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-3 bg-slate-50 text-slate-700 text-xs">
                            {/* Creator Details */}
                            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm space-y-1.5">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-sans">Created By (Teacher)</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[11px] font-black shadow-sm uppercase">
                                        {riTest.createdBy?.name ? riTest.createdBy.name.charAt(0) : 'U'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-[11px] leading-tight">{riTest.createdBy?.name || 'N/A'}</p>
                                        <p className="text-slate-500 text-[9px] leading-normal">{riTest.createdBy?.email || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Academic Context */}
                            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-sans">Assessment Details</span>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-0.5 col-span-2">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Form Name</span>
                                        <p className="font-bold text-slate-800 text-xs">{riTest.title || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Institute Name</span>
                                        <p className="font-bold text-slate-800 text-[11px]">{riTest.institute || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Courses Name</span>
                                        <p className="font-bold text-slate-800 text-[11px]">{riTest.course || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Subject Name</span>
                                        <p className="font-bold text-slate-800 text-[11px]">{riTest.subject || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Inbox No.</span>
                                        <p className="font-bold text-indigo-600 text-[11px]">{riTest.index || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Type of Activity</span>
                                        <p className="font-bold text-slate-800 text-[11px]">{riTest.activity || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Questions</span>
                                        <p className="font-bold text-slate-800 text-[11px]">{Array.isArray(riTest.questions) ? riTest.questions.length : 0}</p>
                                    </div>
                                    <div className="space-y-0.5 col-span-2">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Created Date</span>
                                        <p className="font-bold text-slate-800 text-[11px]">
                                            {riTest.createdAt ? new Date(riTest.createdAt).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="space-y-0.5 col-span-2 border-t border-slate-100 pt-2">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Description</span>
                                        <div className="font-semibold text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-200/80 text-[10px] whitespace-pre-wrap max-h-24 overflow-y-auto leading-normal">
                                            {riTest.description || 'No description provided.'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 flex justify-end bg-white">
                            <button
                                type="button"
                                onClick={() => setShowRiModal(false)}
                                className="px-5 py-2.5 bg-[#0b1329] hover:bg-[#152244] text-white rounded-xl text-xs font-black shadow-md shadow-[#0b1329]/15 active:scale-95 transition-all"
                            >
                                Close Info
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {isQrModalOpen && qrCodeUrl && createPortal(
                <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md animate-fade-in flex items-center justify-center p-4 font-sans">
                    <div className="bg-white w-full max-w-sm rounded-[30px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up p-8 text-center space-y-6">
                        <button
                            onClick={() => {
                                setIsQrModalOpen(false);
                                setQrCodeUrl(null);
                            }}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-655 hover:bg-slate-50 rounded-full transition-all cursor-pointer"
                        >
                            <X size={20} />
                        </button>

                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-slate-800">Test QR Code</h3>
                            <p className="text-xs text-slate-400">Scan this code to take the test on your device</p>
                        </div>

                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col items-center justify-center">
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrCodeUrl)}`}
                                    alt="QR Code"
                                    className="w-[160px] h-[160px] object-contain"
                                />
                            </div>
                        </div>

                        <div className="pt-2 flex gap-3">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(qrCodeUrl);
                                    toast.success("Link copied to clipboard!");
                                }}
                                className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 transition-all cursor-pointer"
                            >
                                Copy Link
                            </button>
                            <button
                                onClick={() => {
                                    setIsQrModalOpen(false);
                                    setQrCodeUrl(null);
                                }}
                                className="flex-1 py-2.5 bg-[#0b1329] hover:bg-[#152244] text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <RecycleBinModal
                isOpen={isTrashOpen}
                onClose={() => setIsTrashOpen(false)}
                title="Assessment Recycle Bin"
                trashUrl="/api/tests/trash"
                onRestoreSuccess={() => {
                    fetchLmsTests();
                    fetchPublicTests();
                }}
                restoreUrlPattern={(id) => `/api/tests/${id}/restore`}
                permanentDeleteUrlPattern={(id) => `/api/tests/${id}/permanent`}
                renderItemDetail={(item) => `Course: ${item.course} | Subject: ${item.subject}`}
            />

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

            <BulkEditModal
                isOpen={isBulkEditOpen}
                onClose={() => setIsBulkEditOpen(false)}
                type="test"
                selectedIds={Array.from(selectedIds)}
                onSuccess={() => {
                    if (activeTab === 'lms' || activeTab === 'draft') {
                        fetchLmsTests();
                    } else {
                        fetchPublicTests();
                    }
                }}
            />
        </DashboardLayout>
    );
};

export default TestsList;
