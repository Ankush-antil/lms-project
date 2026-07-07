import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAudioUrl } from '../../api/audioApi';
import { Plyr } from "plyr-react";
import toast from 'react-hot-toast';
import {
    GraduationCap, Mail, Lock, Eye, EyeOff, ShieldCheck,
    AlertTriangle, Loader2, FileText, ArrowRight, CheckCircle,
    Clock, Info, BookOpen, User, Phone, Building, CheckCircle2,
    RotateCcw, Sparkles, CheckSquare, List, AlertCircle, Play, Mic, Video, Square,
    MoreVertical, ChevronUp, ChevronDown, Volume2, Pause, Sliders, Globe, Settings,
    Send, Paperclip, MessageSquare, Trash2, X, ClipboardList,
    Bot, Star, Upload, Headphones, Files, Camera, Monitor, Share2, Plus
} from 'lucide-react';
import AdvancedVideoRecorder from '../../components/builder/AdvancedVideoRecorder';
import { useSocket } from '../../context/SocketContext';
import { motion } from 'framer-motion';
import loginIllustration from '../login-illustration.png';


const validateLanguage = (text, lang) => {
    if (!text || !lang) return true;
    const plainText = text.replace(/<[^>]*>/g, '').trim();
    if (!plainText) return true;
    const cleanLang = lang.trim().toLowerCase();
    if (cleanLang === 'english') {
        return /^[a-zA-Z0-9\s.,!?'"()\-:;]*$/.test(plainText);
    }
    if (cleanLang === 'hindi') {
        return /[\u0900-\u097F]/.test(plainText);
    }
    if (cleanLang === 'spanish') {
        return /^[a-zA-Z0-9\s.,!?'"()\-:;ñáéíóúüÑÁÉÍÓÚÜ¿¡]*$/.test(plainText);
    }
    return true;
};

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

const PublicTestPage = () => {
    const { id: testId } = useParams();
    const navigate = useNavigate();
    const videoRef = useRef(null);

    const { callUser, callState, onlineUsers, registerGuest } = useSocket();
    const [teachersList, setTeachersList] = useState([]);
    const [selectedTeachers, setSelectedTeachers] = useState({});
    const [teachers, setTeachers] = useState([]);
    const [showTeachers, setShowTeachers] = useState(false);


    // Loading & state
    const [loading, setLoading] = useState(true);
    const [test, setTest] = useState(null);
    const [viewState, setViewState] = useState('register'); // 'password' | 'register' | 'test' | 'success' | 'error'
    const [errorMsg, setErrorMsg] = useState('');
    const [existingSubmission, setExistingSubmission] = useState(null);
    const [isAlreadySubmittedView, setIsAlreadySubmittedView] = useState(false);

    // Password Protection
    const [password, setPassword] = useState('');
    const [verifyingPassword, setVerifyingPassword] = useState(false);

    // Registration Form
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    const [guestOrg, setGuestOrg] = useState('');
    const [recaptchaChecked, setRecaptchaChecked] = useState(false);
    const [recaptchaVerifying, setRecaptchaVerifying] = useState(false);
    const [recaptchaDone, setRecaptchaDone] = useState(false);
    const [duplicateChecking, setDuplicateChecking] = useState(false);


    // Test Taking states
    const [answers, setAnswers] = useState({});
    const [lightboxImage, setLightboxImage] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [scoreInfo, setScoreInfo] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);
    const timerRef = useRef(null);

    // Media Recorders state (copied from ShortAnswerTest)
    const [isListening, setIsListening] = useState(null);
    const [recordingStatus, setRecordingStatus] = useState({});
    const [recordedURLs, setRecordedURLs] = useState({});
    const [submittedAnswers, setSubmittedAnswers] = useState({}); // idx -> { text, audioData, videoData }
    const mediaRecorderRef = useRef({});
    const mediaStreamRef = useRef({});
    const chunksRef = useRef({});
    const videoPreviewRef = useRef({});
    const blobsRef = useRef({});
    const recognitionRef = useRef(null);

    // New states for Short Answer advanced tools
    const [showAudioRecorder, setShowAudioRecorder] = useState({});
    const [showVideoRecorder, setShowVideoRecorder] = useState({});
    const [audioTimer, setAudioTimer] = useState({});
    const [audioTimerId, setAudioTimerId] = useState({});
    const [countdownVal, setCountdownVal] = useState({});
    const [countdownConfig, setCountdownConfig] = useState({});
    const [uploadProgress, setUploadProgress] = useState({});
    const [isUploading, setIsUploading] = useState({});
    const [saveStatus, setSaveStatus] = useState("Saved");
    const [questionTimes, setQuestionTimes] = useState({});
    const [showUploadMenu, setShowUploadMenu] = useState({});
    const [previewFile, setPreviewFile] = useState(null);

    // Collapsed questions tracker (index -> boolean)
    const [collapsedQuestions, setCollapsedQuestions] = useState({});
    // Collapsed extras (tab grid + tab panels) per question
    const [collapsedExtras, setCollapsedExtras] = useState({});

    // Assistive features sub-features active states
    const [activeQuestionTab, setActiveQuestionTab] = useState({}); // qIdx -> 'example' | 'assistive' | null
    const [calculatorVal, setCalculatorVal] = useState('');
    const [chatMessages, setChatMessages] = useState({}); // qIdx -> array of messages
    const [chatInput, setChatInput] = useState({}); // qIdx -> input text
    const [showGlobalChat, setShowGlobalChat] = useState(null); // qIdx or null
    const [translateLang, setTranslateLang] = useState({}); // qIdx -> lang string
    const [isAccessibilityActive, setIsAccessibilityActive] = useState(false); // High Contrast / Large Text
    const [offlineWriting, setOfflineWriting] = useState(false);

    // Simulated file attachment state
    const [attachedFiles, setAttachedFiles] = useState({}); // idx -> array of files

    // Game states
    const [showGameModal, setShowGameModal] = useState(false);
    const [board, setBoard] = useState(Array(9).fill(''));
    const [xIsNext, setXIsNext] = useState(true);



    // Load test
    const fetchTestDetails = async (passVal = '') => {
        setLoading(true);
        setErrorMsg('');
        try {
            const headers = passVal ? { 'x-test-password': passVal } : {};
            const res = await axios.get(`/api/public-tests/${testId}`, { headers });

            if (res.data.isPasswordProtected) {
                setViewState('password');
            } else {
                setTest(res.data);
                setViewState('register');

                // Initialize answers dictionary
                const initialAnswers = {};
                res.data.questions.forEach((q, idx) => {
                    if (q.type?.toLowerCase() === 'tabular data') {
                        initialAnswers[idx] = q.tableData?.rows ? JSON.parse(JSON.stringify(q.tableData.rows)) : [];
                    } else {
                        initialAnswers[idx] = q.type?.toLowerCase() === 'checkboxes' ? [] : '';
                    }
                });
                setAnswers(initialAnswers);

                // Track views (once)
                axios.post(`/api/public-tests/${testId}/view`).catch(err => console.log('Err tracking views:', err));
            }
        } catch (err) {
            console.error('Error loading public test:', err);
            setErrorMsg(err.response?.data?.message || 'Error loading test details. Please try again.');
            setViewState('error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (testId) {
            fetchTestDetails();
        }
        // Cleanup timer
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [testId]);

    useEffect(() => {
        if (viewState === 'test') {
            const fetchTeachers = async () => {
                try {
                    const res = await axios.get('/api/public-tests/teachers/all');
                    setTeachersList(res.data);
                } catch (err) {
                    console.error("Failed to load teachers for call list:", err);
                }
            };
            fetchTeachers();
        }
    }, [viewState]);

    // Cleanup audio timers on unmount
    useEffect(() => {
        return () => {
            Object.values(audioTimerId).forEach(clearInterval);
        };
    }, [audioTimerId]);

    // Timer effect
    useEffect(() => {
        if (viewState === 'test' && test?.publicSettings?.timeLimit > 0 && !isAlreadySubmittedView) {
            setTimeLeft(test.publicSettings.timeLimit * 60);

            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        // Time out -> Auto submit test!
                        toast.error("Time is up! Submitting your responses automatically...");
                        autoSubmitTest();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [viewState, test]);

    // Load drafts from local storage on test start
    useEffect(() => {
        if (viewState === 'test' && test) {
            const initialAnswers = {};
            test.questions.forEach((q, idx) => {
                if (q.type?.toLowerCase() === 'tabular data') {
                    initialAnswers[idx] = q.tableData?.rows ? JSON.parse(JSON.stringify(q.tableData.rows)) : [];
                } else {
                    initialAnswers[idx] = q.type?.toLowerCase() === 'checkboxes' ? [] : "";
                }
            });
            const savedDrafts = localStorage.getItem(`public_draft_${testId}`);
            if (savedDrafts) {
                try {
                    const parsed = JSON.parse(savedDrafts);
                    setAnswers({ ...initialAnswers, ...parsed });
                    toast.success("Loaded drafts from local storage!");
                } catch (e) {
                    console.error("Error loading drafts:", e);
                    setAnswers(initialAnswers);
                }
            } else {
                setAnswers(initialAnswers);
            }
        }
    }, [viewState, test, testId]);

    const loadTeachers = async () => {
        try {
            const res = await axios.get("/api/teachers");

            setTeachers(res.data);
            setShowTeachers(true);

        } catch (error) {
            console.error(error);
            toast.error("Unable to load teachers");
        }
    };

    // Save draft to local storage and sync with backend when answers change
    useEffect(() => {
        if (viewState === 'test' && test && Object.keys(answers).length > 0 && !isAlreadySubmittedView) {
            const filteredAnswers = {};
            Object.keys(answers).forEach(key => {
                const idx = Number(key);
                const q = test.questions[idx];
                const qParticulars = q?.particulars || {};
                if (qParticulars.autoSave !== false) {
                    filteredAnswers[key] = answers[key];
                }
            });
            localStorage.setItem(`public_draft_${testId}`, JSON.stringify(filteredAnswers));
            setSaveStatus("Saved locally");

            if (!offlineWriting && guestEmail) {
                setSaveStatus("Saving...");
                const delayDebounceFn = setTimeout(async () => {
                    try {
                        const formattedAnswers = test.questions.map((q, idx) => {
                            return {
                                questionId: q.id || `q${idx}`,
                                questionText: q.text || `Question ${idx + 1}`,
                                questionType: q.type,
                                textAnswer: typeof answers[idx] === 'object' ? JSON.stringify(answers[idx]) : (answers[idx] || ''),
                                audioData: '',
                                videoData: ''
                            };
                        });

                        await axios.post(`/api/public-tests/${testId}/save-draft`, {
                            name: guestName,
                            email: guestEmail,
                            phone: guestPhone,
                            organization: guestOrg,
                            answers: formattedAnswers
                        });
                        setSaveStatus("Saved to Cloud");
                    } catch (err) {
                        console.error("Cloud save error:", err);
                        setSaveStatus("Saved locally");
                    }
                }, 2000); // 2s debounce

                return () => clearTimeout(delayDebounceFn);
            }
        }
    }, [answers, viewState, test, testId, offlineWriting, guestEmail, guestName, guestPhone, guestOrg]);

    // Per-question timer effect
    useEffect(() => {
        if (!test || !test.questions || viewState !== 'test') return;
        const initialTimes = {};
        test.questions.forEach((q, idx) => {
            const qParticulars = q.particulars || {};
            if (qParticulars.timeLimit > 0) {
                initialTimes[idx] = Number(qParticulars.timeLimit);
            }
        });
        setQuestionTimes(initialTimes);
    }, [test, viewState]);

    useEffect(() => {
        if (viewState !== 'test') return;
        const activeTimerKeys = Object.keys(questionTimes).filter(idx => questionTimes[idx] > 0);
        if (activeTimerKeys.length === 0) return;

        const interval = setInterval(() => {
            setQuestionTimes(prev => {
                const updated = { ...prev };
                let changed = false;
                Object.keys(updated).forEach(idx => {
                    if (updated[idx] > 0) {
                        updated[idx] -= 1;
                        changed = true;
                        if (updated[idx] === 0) {
                            toast.error(`Time limit reached for Question ${Number(idx) + 1}! Input locked.`);
                        }
                    }
                });
                return changed ? updated : prev;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [questionTimes, viewState]);

    const handleVerifyPassword = async (e) => {
        e.preventDefault();
        setVerifyingPassword(true);
        try {
            const res = await axios.post(`/api/public-tests/${testId}/verify-password`, { password });
            if (res.data.success) {
                toast.success('Password verified!');
                fetchTestDetails(password);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Incorrect password. Please try again.');
        } finally {
            setVerifyingPassword(false);
        }
    };

    const togglePauseRecording = (idx) => {
        const recorder = mediaRecorderRef.current[idx];

        if (!recorder) return;

        if (recorder.state === "recording") {
            recorder.pause();

            setRecordingStatus(prev => ({
                ...prev,
                [idx]: "paused"
            }));
        } else if (recorder.state === "paused") {
            recorder.resume();

            setRecordingStatus(prev => ({
                ...prev,
                [idx]: "recording"
            }));
        }
    };

    const handleMockRecaptcha = () => {
        if (recaptchaDone) return;
        setRecaptchaVerifying(true);
        setTimeout(() => {
            setRecaptchaVerifying(false);
            setRecaptchaDone(true);
            setRecaptchaChecked(true);
            toast.success("Anti-spam security verification completed.");
        }, 1200);
    };

    const handleRegisterStart = async (e) => {
        e.preventDefault();
        if (!guestName || !guestEmail) {
            toast.error("Full Name and Email Address are required.");
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(guestEmail)) {
            toast.error("Please enter a valid email address.");
            return;
        }

        if (test?.publicSettings?.antiSpam && !recaptchaDone) {
            toast.error("Please verify that you are not a robot.");
            return;
        }

        // Check for duplicate response or existing draft
        setDuplicateChecking(true);
        try {
            const res = await axios.post(`/api/public-tests/${testId}/check-email`, { email: guestEmail });
            if (res.data.exists) {
                const subId = res.data.submissionId;
                const subRes = await axios.get(`/api/submissions/shared/${subId}`);
                const submissionData = subRes.data;
                
                const loadedAnswers = {};
                const loadedSubmittedAnswers = {};
                
                test.questions.forEach((q, idx) => {
                    const ans = submissionData.answers.find(item => item.questionId === (q.id || `q${idx}`));
                    if (ans) {
                        let textVal = ans.textAnswer || '';
                        try {
                            if ((textVal.startsWith('{') && textVal.endsWith('}')) || (textVal.startsWith('[') && textVal.endsWith(']'))) {
                                textVal = JSON.parse(textVal);
                            }
                        } catch (e) {}

                        loadedSubmittedAnswers[idx] = {
                            text: textVal,
                            audioData: ans.audioData || '',
                            videoData: ans.videoData || '',
                            marks: ans.marks || 0,
                            feedback: ans.feedback || '',
                            conversation: ans.conversation || []
                        };
                        loadedAnswers[idx] = textVal;
                    }
                });

                setAnswers(loadedAnswers);
                setSubmittedAnswers(loadedSubmittedAnswers);
                setExistingSubmission(submissionData);
                setIsAlreadySubmittedView(true);
                setViewState('test');
                toast.success("Loaded your previous responses!");
            } else {
                if (res.data.isDraft && res.data.draftAnswers) {
                    const loadedAnswers = {};
                    const loadedSubmittedAnswers = {};

                    test.questions.forEach((q, idx) => {
                        const da = res.data.draftAnswers.find(item => item.questionId === (q.id || `q${idx}`));
                        if (da) {
                            let textVal = da.textAnswer || '';
                            try {
                                if ((textVal.startsWith('{') && textVal.endsWith('}')) || (textVal.startsWith('[') && textVal.endsWith(']'))) {
                                    textVal = JSON.parse(textVal);
                                }
                            } catch (e) {
                                // Keep string
                            }
                            loadedAnswers[idx] = textVal;

                            if (da.audioData || da.videoData) {
                                loadedSubmittedAnswers[idx] = {
                                    questionId: da.questionId,
                                    questionText: da.questionText || q.text || `Question ${idx + 1}`,
                                    questionType: da.questionType || q.type,
                                    textAnswer: textVal,
                                    audioData: da.audioData || '',
                                    videoData: da.videoData || ''
                                };
                            }
                        }
                    });

                    setAnswers(prev => ({ ...prev, ...loadedAnswers }));
                    if (Object.keys(loadedSubmittedAnswers).length > 0) {
                        setSubmittedAnswers(prev => ({ ...prev, ...loadedSubmittedAnswers }));
                    }

                    if (res.data.draftName) setGuestName(res.data.draftName);
                    if (res.data.draftPhone) setGuestPhone(res.data.draftPhone);
                    if (res.data.draftOrg) setGuestOrg(res.data.draftOrg);

                    toast.success("Loaded draft from server!");
                }
                registerGuest(guestName || res.data.draftName, guestEmail);
                setViewState('test');
            }
        } catch (err) {
            console.error('Check email error:', err);
            toast.error("Could not verify email state. Try again.");
        } finally {
            setDuplicateChecking(false);
        }
    };

    // Text field input change
    const handleTextChange = (idx, val) => {
        setSaveStatus("Saving...");
        setAnswers(prev => ({ ...prev, [idx]: val }));
    };

    const handleCopyPasteBlock = (e, q) => {
        if (q.validationSettings?.copyPasteDisabled) {
            e.preventDefault();
            toast.error("Copy and paste is disabled for this question!");
        }
    };

    const validateQuestionInput = (idx, q) => {
        const qValSettings = q.validationSettings || {};
        const textAnswer = (answers[idx] || '').replace(/<[^>]*>/g, '').trim();

        if (qValSettings.answerNotEmpty && !textAnswer) {
            toast.error(`Question ${idx + 1} cannot be left empty.`);
            return false;
        }

        if (textAnswer) {
            if (qValSettings.minWords && Number(qValSettings.minWords) > 0) {
                const wordCount = textAnswer.split(/\s+/).filter(Boolean).length;
                if (wordCount < Number(qValSettings.minWords)) {
                    toast.error(`Question ${idx + 1} requires a minimum of ${qValSettings.minWords} words.`);
                    return false;
                }
            }

            if (qValSettings.maxWords && Number(qValSettings.maxWords) > 0) {
                const wordCount = textAnswer.split(/\s+/).filter(Boolean).length;
                if (wordCount > Number(qValSettings.maxWords)) {
                    toast.error(`Question ${idx + 1} can have a maximum of ${qValSettings.maxWords} words.`);
                    return false;
                }
            }

            if (qValSettings.specialChars === false) {
                const specialCharsRegex = /[^a-zA-Z0-9\s]/;
                if (specialCharsRegex.test(textAnswer)) {
                    toast.error(`Question ${idx + 1} cannot contain special characters.`);
                    return false;
                }
            }

            if (qValSettings.numericValues === false) {
                const numericRegex = /[0-9]/;
                if (numericRegex.test(textAnswer)) {
                    toast.error(`Question ${idx + 1} cannot contain numeric values.`);
                    return false;
                }
            }

            if (qValSettings.keywordPresence && qValSettings.keywordPresence.trim()) {
                const keywords = qValSettings.keywordPresence.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
                const missingKeywords = keywords.filter(k => !textAnswer.toLowerCase().includes(k));
                if (missingKeywords.length > 0) {
                    toast.error(`Question ${idx + 1} must contain the following keywords: ${missingKeywords.join(', ')}.`);
                    return false;
                }
            }
        }

        return true;
    };

    useEffect(() => {
        if (!test || !test.questions || viewState !== 'test') return;
        const hasTabRestriction = test.questions.some(q => q.validationSettings?.chromeNewTabDisabled);
        if (!hasTabRestriction) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                toast.error("Warning: Tab switching is disabled! This event has been logged.");
            }
        };

        const handleWindowBlur = () => {
            toast.error("Warning: Please stay on the test window!");
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleWindowBlur);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleWindowBlur);
        };
    }, [test, viewState]);

    // Checkboxes change
    const handleCheckboxChange = (idx, optText, checked) => {
        setAnswers(prev => {
            const current = Array.isArray(prev[idx]) ? prev[idx] : [];
            let updated = [...current];
            if (checked) {
                if (!updated.includes(optText)) updated.push(optText);
            } else {
                updated = updated.filter(item => item !== optText);
            }
            return { ...prev, [idx]: updated };
        });
    };

    // Voice typing & recording utilities (ShortAnswerTest mappings)
    const toggleVoiceTyping = (idx) => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error("Speech recognition is not supported in this browser.");
            return;
        }

        if (isListening === idx) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            setIsListening(null);
        } else {
            if (isListening !== null && recognitionRef.current) {
                recognitionRef.current.stop();
            }

            setIsListening(idx);

            const rec = new SpeechRecognition();
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = 'en-US';

            const baseText = (answers[idx] || "").trim();

            rec.onresult = (event) => {
                let sessionTranscript = '';
                for (let i = 0; i < event.results.length; i++) {
                    sessionTranscript += event.results[i][0].transcript;
                }
                const combined = baseText ? (baseText + " " + sessionTranscript.trim()) : sessionTranscript.trim();
                setAnswers(prev => ({
                    ...prev,
                    [idx]: combined
                }));
            };

            rec.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                rec.stop();
                setIsListening(null);
            };

            rec.onend = () => {
                setIsListening(null);
            };

            recognitionRef.current = rec;
            rec.start();
        }
    };;

    const startRecording = async (idx, type) => {
        try {
            const constraints = type === 'video' ? { video: true, audio: true } : { audio: true };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            mediaStreamRef.current[idx] = stream;

            if (type === 'video' && videoPreviewRef.current[idx]) {
                videoPreviewRef.current[idx].srcObject = stream;
                videoPreviewRef.current[idx].play();
            }

            chunksRef.current[idx] = [];
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current[idx] = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current[idx].push(e.data);
            };

            recorder.onstop = () => {
                const mimeType = type === 'video' ? 'video/webm' : 'audio/webm';
                const blob = new Blob(chunksRef.current[idx], { type: mimeType });
                blobsRef.current[idx] = { blob, type };
                const url = URL.createObjectURL(blob);
                setRecordedURLs(prev => ({ ...prev, [idx]: [...(prev[idx] || []), { url, type }] }));

                stream.getTracks().forEach(t => t.stop());
                if (type === 'video' && videoPreviewRef.current[idx]) {
                    videoPreviewRef.current[idx].srcObject = null;
                }
            };

            recorder.start();
            setRecordingStatus(prev => ({ ...prev, [idx]: 'recording' }));
        } catch (err) {
            console.error('Media recording error:', err);
            toast.error('Could not activate camera or microphone.');
        }
    };

    const stopRecording = (idx) => {
        const recorder = mediaRecorderRef.current[idx];
        if (recorder && recorder.state !== 'inactive') {
            recorder.stop();
        }
        setRecordingStatus(prev => ({ ...prev, [idx]: 'stopped' }));
    };

    const deleteRecording = (idx) => {
        if (recordedURLs[idx]) URL.revokeObjectURL(recordedURLs[idx].url);
        setRecordedURLs(prev => { const n = { ...prev }; delete n[idx]; return n; });
        setRecordingStatus(prev => { const n = { ...prev }; delete n[idx]; return n; });
        delete blobsRef.current[idx];
    };

    const startAudioRecordingCountdown = (idx) => {
        const seconds = countdownConfig[idx] || 0;
        if (seconds === 0) {
            startAudioRecording(idx);
            return;
        }

        setCountdownVal(prev => ({ ...prev, [idx]: seconds }));
        setRecordingStatus(prev => ({ ...prev, [idx]: 'countdown' }));

        let currentVal = seconds;
        const interval = setInterval(() => {
            currentVal -= 1;
            setCountdownVal(prev => ({ ...prev, [idx]: currentVal }));

            if (currentVal <= 0) {
                clearInterval(interval);
                setCountdownVal(prev => {
                    const n = { ...prev };
                    delete n[idx];
                    return n;
                });
                startAudioRecording(idx);
            }
        }, 1000);
    };

    const startAudioRecording = async (idx) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current[idx] = stream;

            chunksRef.current[idx] = [];
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current[idx] = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current[idx].push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current[idx], { type: 'audio/webm' });
                blobsRef.current[idx] = { blob, type: 'audio' };
                const url = URL.createObjectURL(blob);
                setRecordedURLs(prev => ({ ...prev, [idx]: { url, type: 'audio' } }));

                // Stop all tracks
                stream.getTracks().forEach(t => t.stop());
            };

            recorder.start();
            setRecordingStatus(prev => ({ ...prev, [idx]: 'recording' }));

            // Start timer
            setAudioTimer(prev => ({ ...prev, [idx]: 0 }));
            const timerId = setInterval(() => {
                setAudioTimer(prev => ({ ...prev, [idx]: (prev[idx] || 0) + 1 }));
            }, 1000);
            setAudioTimerId(prev => ({ ...prev, [idx]: timerId }));
        } catch (err) {
            console.error('Audio recording access error:', err);
            toast.error("Could not access microphone. Please allow permissions and try again.");
            setRecordingStatus(prev => {
                const n = { ...prev };
                delete n[idx];
                return n;
            });
        }
    };

    const pauseAudioRecording = (idx) => {
        const recorder = mediaRecorderRef.current[idx];
        if (recorder && recorder.state === 'recording') {
            recorder.pause();
            if (audioTimerId[idx]) {
                clearInterval(audioTimerId[idx]);
            }
            setRecordingStatus(prev => ({ ...prev, [idx]: 'paused' }));
        }
    };

    const resumeAudioRecording = (idx) => {
        const recorder = mediaRecorderRef.current[idx];
        if (recorder && recorder.state === 'paused') {
            recorder.resume();
            const timerId = setInterval(() => {
                setAudioTimer(prev => ({ ...prev, [idx]: (prev[idx] || 0) + 1 }));
            }, 1000);
            setAudioTimerId(prev => ({ ...prev, [idx]: timerId }));
            setRecordingStatus(prev => ({ ...prev, [idx]: 'recording' }));
        }
    };

    const stopAudioRecording = (idx) => {
        const recorder = mediaRecorderRef.current[idx];
        if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
            recorder.stop();
            if (audioTimerId[idx]) {
                clearInterval(audioTimerId[idx]);
            }
            setRecordingStatus(prev => ({ ...prev, [idx]: 'stopped' }));
        }
    };

    const deleteAudioRecording = (idx) => {
        deleteRecording(idx);
        if (audioTimerId[idx]) {
            clearInterval(audioTimerId[idx]);
        }
        setAudioTimer(prev => {
            const n = { ...prev };
            delete n[idx];
            return n;
        });
        setRecordingStatus(prev => {
            const n = { ...prev };
            delete n[idx];
            return n;
        });
    };

    const blobToBase64 = (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    const submitQuestion = async (idx, question) => {
        try {
            const qParticulars = question.particulars || {};
            if (qParticulars.languageRestriction && !validateLanguage(answers[idx] || '', qParticulars.languageRestriction)) {
                toast.error(`Please write your answer in ${qParticulars.languageRestriction}!`);
                return;
            }

            if (!validateQuestionInput(idx, question)) {
                return;
            }

            const type = question.type?.toLowerCase();
            const isAudio = type?.includes('voice') || type?.includes('audio') || type?.includes('mic');
            const isVideo = type?.includes('video') || type?.includes('cam');

            let audioData = '';
            let videoData = '';

            if (isAudio && blobsRef.current[idx]) {
                audioData = await blobToBase64(blobsRef.current[idx].blob);
            }
            if (isVideo && blobsRef.current[idx]) {
                videoData = await blobToBase64(blobsRef.current[idx].blob);
            }

            setSubmittedAnswers(prev => ({
                ...prev,
                [idx]: {
                    questionId: question.id || `q${idx}`,
                    questionText: question.text || `Question ${idx + 1}`,
                    questionType: question.type,
                    textAnswer: typeof answers[idx] === 'object' ? JSON.stringify(answers[idx]) : (answers[idx] || ''),
                    audioData,
                    videoData
                }
            }));
            toast.success('Answer saved!');
        } catch (err) {
            console.error('Error saving answer:', err);
            toast.error('Failed to save answer.');
        }
    };

    // Submitting test
    const autoSubmitTest = () => {
        submitAllResponses(true);
    };

    const submitAllResponses = async (isAuto = false) => {
        if (!test) return;

        // Check language restriction for all questions
        if (!isAuto) {
            for (let idx = 0; idx < test.questions.length; idx++) {
                const q = test.questions[idx];
                const qParticulars = q.particulars || {};
                if (qParticulars.languageRestriction && !validateLanguage(answers[idx] || '', qParticulars.languageRestriction)) {
                    toast.error(`Please write your answer for Question ${idx + 1} in ${qParticulars.languageRestriction}!`);
                    return;
                }
                if (!validateQuestionInput(idx, q)) {
                    return;
                }
            }
        }

        setSubmitting(true);

        try {
            // Build answers array
            const finalAnswers = await Promise.all(
                test.questions.map(async (q, idx) => {
                    if (submittedAnswers[idx]) return submittedAnswers[idx];

                    // Process media if not submitted
                    const type = q.type?.toLowerCase();
                    const isAudio = type?.includes('voice') || type?.includes('audio') || type?.includes('mic');
                    const isVideo = type?.includes('video') || type?.includes('cam');

                    let audioData = '';
                    let videoData = '';

                    if (isAudio && blobsRef.current[idx]) {
                        audioData = await blobToBase64(blobsRef.current[idx].blob);
                    }
                    if (isVideo && blobsRef.current[idx]) {
                        videoData = await blobToBase64(blobsRef.current[idx].blob);
                    }

                    return {
                        questionId: q.id || `q${idx}`,
                        questionText: q.text || `Question ${idx + 1}`,
                        questionType: q.type,
                        textAnswer: typeof answers[idx] === 'object' ? JSON.stringify(answers[idx]) : (answers[idx] || ''),
                        audioData,
                        videoData
                    };
                })
            );

            // User Agent / device detection
            const deviceInfo = navigator.userAgent || 'Unknown browser';

            const payload = {
                name: guestName,
                email: guestEmail,
                phone: guestPhone,
                organization: guestOrg,
                answers: finalAnswers,
                deviceInfo
            };

            const res = await axios.post(`/api/public-tests/${testId}/submit`, payload);
            if (res.data.success) {
                setScoreInfo({
                    score: res.data.score,
                    total: test.questions.length,
                    showScore: res.data.showScore,
                    answers: finalAnswers,
                    submissionId: res.data.submissionId
                });
                setViewState('success');
                toast.success('Test submitted successfully!');
            }
        } catch (err) {
            console.error('Submission error:', err);
            toast.error(err.response?.data?.message || 'Error submitting test responses.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    };

    // Calculator function
    const pressCalc = (char) => {
        if (char === 'C') {
            setCalculatorVal('');
        } else if (char === '=') {
            try {
                const evalFn = new Function(`return ${calculatorVal}`);
                setCalculatorVal(String(evalFn()));
            } catch (e) {
                setCalculatorVal('Error');
            }
        } else {
            setCalculatorVal(prev => prev + char);
        }
    };

    // Chat with Teacher function
    const sendChatMessage = (idx) => {
        const input = chatInput[idx] || '';
        if (!input.trim()) return;

        const userMsg = { sender: 'student', text: input };
        setChatMessages(prev => ({
            ...prev,
            [idx]: [...(prev[idx] || []), userMsg]
        }));
        setChatInput(prev => ({ ...prev, [idx]: '' }));

        // Teacher response simulation
        setTimeout(() => {
            const replies = [
                "A computer is composed of both hardware (physical parts) and software (instructions). Think about how they work together.",
                "Let's focus on the inputs and outputs. An input would be a keyboard, whereas an output is a monitor.",
                "Make sure you define the processing unit (CPU) as the brain of the computer.",
                "Remember, short answer questions require concise responses. Focus on the core meaning!"
            ];
            const teacherMsg = { sender: 'teacher', text: replies[Math.floor(Math.random() * replies.length)] };
            setChatMessages(prev => ({
                ...prev,
                [idx]: [...(prev[idx] || []), teacherMsg]
            }));
        }, 1000);
    };

    // Text to Speech
    const handleTTS = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
            toast.success("Reading question aloud...");
        } else {
            toast.error("Text to speech is not supported in this browser.");
        }
    };

    // Mock Translation
    const handleTranslate = (idx, lang, origText) => {
        setTranslateLang(prev => ({ ...prev, [idx]: lang }));
        toast.success(`Translated to ${lang === 'es' ? 'Spanish' : lang === 'fr' ? 'French' : 'Hindi'}`);
    };

    // Temporary Fill Assist
    const handleTemporaryFill = (idx, type) => {
        const lowerType = type?.toLowerCase() || '';
        if (lowerType.includes('choice') || lowerType.includes('mcq')) {
            const q = test.questions[idx];
            if (q.options && q.options.length > 0) {
                handleTextChange(idx, q.options[0].text);
                toast.success("Filled choice option.");
            }
        } else if (lowerType.includes('checkbox')) {
            const q = test.questions[idx];
            if (q.options && q.options.length > 0) {
                setAnswers(prev => ({ ...prev, [idx]: [q.options[0].text] }));
                toast.success("Filled checkbox option.");
            }
        } else if (lowerType.includes('true') || lowerType.includes('false')) {
            handleTextChange(idx, 'True');
            toast.success("Selected True.");
        } else if (lowerType === 'short answer') {
            const q = test.questions[idx];
            const qParticulars = q.particulars || {};
            const val = qParticulars.defaultValue || "A computer is an electronic device that manipulates information, or data. It has the ability to store, retrieve, and process data.";
            handleTextChange(idx, val);
            toast.success("Short answer filled with temporary response.");
        } else {
            handleTextChange(idx, "A computer is an electronic device that manipulates information, or data. It has the ability to store, retrieve, and process data.");
            toast.success("Question filled with draft text.");
        }
    };

    // File Upload simulated with 1s progress animation
    const handleFileUploadSimulated = (idx, files) => {
        if (!files || files.length === 0) return;

        setIsUploading(prev => ({ ...prev, [idx]: true }));
        setUploadProgress(prev => ({ ...prev, [idx]: 0 }));

        let progress = 0;
        const interval = setInterval(() => {
            progress += 20;
            setUploadProgress(prev => ({ ...prev, [idx]: progress }));

            if (progress >= 100) {
                clearInterval(interval);
                setIsUploading(prev => ({ ...prev, [idx]: false }));
                const fileList = Array.from(files).map(f => ({
                    name: f.name,
                    size: f.size,
                    type: f.type,
                    url: URL.createObjectURL(f)
                }));
                setAttachedFiles(prev => ({ ...prev, [idx]: fileList }));
                toast.success(`Attached ${files.length} file(s) successfully.`);
            }
        }, 200);
    };

    // Tic-Tac-Toe Game simulation to play till start
    const clickCell = (cIdx) => {
        if (board[cIdx] || checkWinner(board)) return;
        const newBoard = [...board];
        newBoard[cIdx] = 'X';
        setBoard(newBoard);

        // AI makes move
        const winnerObj = checkWinner(newBoard);
        if (!winnerObj && newBoard.includes('')) {
            setTimeout(() => {
                const emptyCells = newBoard.map((c, i) => c === '' ? i : null).filter(c => c !== null);
                const aiChoice = emptyCells[Math.floor(Math.random() * emptyCells.length)];
                newBoard[aiChoice] = 'O';
                setBoard([...newBoard]);
            }, 300);
        }
    };

    const checkWinner = (squares) => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        for (let i = 0; i < lines.length; i++) {
            const [a, b, c] = lines[i];
            if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
                return squares[a];
            }
        }
        return null;
    };

    // ── RENDER STATES ────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={40} className="text-indigo-600 animate-spin" />
                    <p className="text-slate-500 font-medium text-sm">Loading test details...</p>
                </div>
            </div>
        );
    }

    if (viewState === 'password') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-[32px] p-8 md:p-10 max-w-md w-full shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -z-10 opacity-30" />

                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Lock size={32} />
                    </div>

                    <h2 className="text-2xl font-black text-center text-slate-800 tracking-tight">Password Protected</h2>
                    <p className="text-slate-500 text-xs text-center mt-2 px-2 leading-relaxed">
                        This public test requires an access password to view and attempt questions.
                    </p>

                    <form onSubmit={handleVerifyPassword} className="space-y-4 mt-8">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Access Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter test password..."
                                required
                                className="w-full border border-slate-200 rounded-2xl px-4 py-3 bg-slate-50 outline-none text-slate-800 text-sm focus:bg-white focus:border-indigo-500 transition-all font-semibold"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={verifyingPassword}
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2"
                        >
                            {verifyingPassword ? <Loader2 size={18} className="animate-spin" /> : "Verify Access"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (viewState === 'error') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-[32px] p-10 max-w-md w-full shadow-xl border border-slate-100 text-center">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Access Denied</h2>
                    <p className="text-slate-500 text-xs mt-3 leading-relaxed px-2">{errorMsg || 'This link has expired or is invalid.'}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="mt-8 px-6 py-3 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md"
                    >
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    if (viewState === 'register') {
        return (
            <div className="h-screen w-screen overflow-hidden flex items-center justify-center bg-gradient-to-r from-[#fafafa] from-35% via-[#b8c5d6] to-[#0b1329] to-65% p-4 md:p-8 font-sans">
                <div className="flex w-full max-w-5xl h-[85vh] max-h-[580px] bg-transparent rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-200/50 relative">
                    {/* Left Side - Form (Off-White Theme) */}
                    <motion.div 
                        initial={{ opacity: 0, x: -40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between h-full bg-[#fafafa] overflow-hidden"
                    >
                        <div>
                            {/* Title Section */}
                            <motion.div 
                                initial={{ opacity: 0, y: -15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15, duration: 0.4 }}
                                className="mb-4 mt-0"
                            >
                                <div className="flex items-center gap-1.5 mb-1">
                                    <GraduationCap size={16} className="text-[#0b1329]" />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">LMS Portal</span>
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Access Information</h2>
                                <p className="text-slate-500 mt-0.5 text-xs">Please enter your credentials to attempt this assessment.</p>
                            </motion.div>

                            <form onSubmit={handleRegisterStart} className="space-y-3">
                                {/* Full Name field */}
                                <motion.div 
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2, duration: 0.4 }}
                                    className="relative border-b border-slate-200 focus-within:border-[#0b1329] transition-all py-0.5"
                                >
                                    <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Full Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={guestName}
                                        onChange={e => setGuestName(e.target.value)}
                                        className="w-full bg-transparent text-slate-800 focus:outline-none text-sm py-0.5 placeholder-slate-350"
                                        placeholder="Enter your full name"
                                        required
                                    />
                                </motion.div>

                                {/* Email Address field */}
                                <motion.div 
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25, duration: 0.4 }}
                                    className="relative border-b border-slate-200 focus-within:border-[#0b1329] transition-all py-0.5"
                                >
                                    <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Email Address <span className="text-red-500">*</span></label>
                                    <input
                                        type="email"
                                        value={guestEmail}
                                        onChange={e => setGuestEmail(e.target.value)}
                                        className="w-full bg-transparent text-slate-800 focus:outline-none text-sm py-0.5 placeholder-slate-350"
                                        placeholder="Enter your email"
                                        required
                                    />
                                </motion.div>

                                {/* Mobile Number field */}
                                <motion.div 
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3, duration: 0.4 }}
                                    className="relative border-b border-slate-200 focus-within:border-[#0b1329] transition-all py-0.5"
                                >
                                    <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Mobile Number <span className="text-slate-450 font-normal">(Optional)</span></label>
                                    <input
                                        type="tel"
                                        value={guestPhone}
                                        onChange={e => setGuestPhone(e.target.value)}
                                        className="w-full bg-transparent text-slate-800 focus:outline-none text-sm py-0.5 placeholder-slate-350"
                                        placeholder="Enter phone number"
                                    />
                                </motion.div>

                                {/* Institute/Organization field */}
                                <motion.div 
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.35, duration: 0.4 }}
                                    className="relative border-b border-slate-200 focus-within:border-[#0b1329] transition-all py-0.5"
                                >
                                    <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Institute/Organization <span className="text-slate-450 font-normal">(Optional)</span></label>
                                    <input
                                        type="text"
                                        value={guestOrg}
                                        onChange={e => setGuestOrg(e.target.value)}
                                        className="w-full bg-transparent text-slate-800 focus:outline-none text-sm py-0.5 placeholder-slate-350"
                                        placeholder="Enter institute name"
                                    />
                                </motion.div>

                                {/* reCAPTCHA Anti-Spam simulation */}
                                {test?.publicSettings?.antiSpam && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.4, duration: 0.3 }}
                                        className="bg-slate-50 p-2 border border-slate-100 rounded-xl flex items-center justify-between mt-2"
                                    >
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleMockRecaptcha}
                                                disabled={recaptchaVerifying || recaptchaDone}
                                                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${recaptchaDone
                                                    ? 'bg-emerald-500 border-emerald-600 text-white'
                                                    : 'bg-white border-slate-300 hover:border-slate-400'
                                                    }`}
                                            >
                                                {recaptchaVerifying && <Loader2 size={8} className="animate-spin text-slate-550" />}
                                                {recaptchaDone && <CheckCircle size={10} className="text-white" />}
                                            </button>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-700 leading-none">I'm not a robot</span>
                                                <span className="text-[7px] text-slate-400 font-semibold mt-0.5">reCAPTCHA Anti-Spam Protection</span>
                                            </div>
                                        </div>
                                        <ShieldCheck size={20} className="text-[#0b1329]/25" />
                                    </motion.div>
                                )}

                                {/* Submit Button */}
                                <motion.button
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.45, duration: 0.4, type: 'spring', stiffness: 90 }}
                                    type="submit"
                                    disabled={duplicateChecking}
                                    className="w-full bg-[#0b1329] hover:bg-[#152244] text-white font-medium py-2.5 px-6 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10 flex justify-center items-center gap-2 mt-4 text-sm"
                                >
                                    {duplicateChecking ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <>Start Assessment <ArrowRight size={16} /></>
                                    )}
                                </motion.button>
                            </form>
                        </div>

                        {/* Footer / Empty area to align with LoginPage */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.4 }}
                            className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100"
                        >
                            <span className="text-slate-400 text-[10px]">Need help? Contact the test administrator.</span>
                        </motion.div>
                    </motion.div>

                    {/* Right Side - Brand/Illustration (Navy Blue Theme) */}
                    <div className="hidden md:flex flex-col justify-between items-center w-1/2 bg-[#0b1329] p-8 md:p-10 h-full relative overflow-hidden">
                        {/* Soft transition border at the left edge to blend with the form side */}
                        <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-transparent via-slate-500/10 to-transparent"></div>

                        {/* Visual waves / decoration circles */}
                        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5 blur-2xl"></div>
                        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/5 blur-3xl"></div>

                        {/* Text Section */}
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.5, type: 'spring', stiffness: 90 }}
                            className="relative z-10 text-center w-full mt-2"
                        >
                            <span className="text-[9px] font-bold uppercase bg-white/10 text-slate-200 px-3 py-1 rounded-full tracking-widest inline-block mb-3">
                                Web Assessment
                            </span>
                            <h1 className="text-2xl font-extrabold text-white tracking-tight mb-2 leading-tight drop-shadow-sm px-2">
                                {test?.title || 'Assessment'}
                            </h1>
                            <p className="text-slate-300 text-xs font-medium opacity-90 px-4 leading-relaxed max-h-[60px] overflow-hidden text-ellipsis line-clamp-2">
                                {test?.description || 'Complete the short assessment shared with you.'}
                            </p>

                            <div className="mt-4 pt-4 border-t border-white/10 flex justify-center gap-6 text-[10px] text-slate-300 font-medium">
                                <div className="flex items-center gap-1.5">
                                    <Clock size={12} className="text-slate-300" />
                                    <span>{test?.publicSettings?.timeLimit || 60} mins limit</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <BookOpen size={12} className="text-slate-300" />
                                    <span>{test?.questions?.length || 0} questions</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Custom Illustration Image */}
                        <div className="w-full max-w-[280px] z-10 my-auto flex justify-center">
                            <motion.img 
                                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: 0.4, duration: 0.6, type: 'spring', stiffness: 80 }}
                                src={loginIllustration}
                                alt="Student Portal Illustration"
                                className="w-full h-auto max-h-[220px] object-contain select-none pointer-events-none"
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (viewState === 'test') {
        const autoSaveStatus = saveStatus;

        return (
            <div className={`min-h-screen bg-[#e9ecef] flex flex-col font-sans transition-all duration-300 ${isAccessibilityActive ? 'text-lg contrast-125' : ''}`}>
                {/* White Test Page Header */}
                <div
                    className="bg-white border-b border-slate-300 px-4 py-2.5 z-10 sticky top-0 text-slate-700 select-none text-xs transition-all duration-500 ease-[cubic-bezier(0.25,1,0.35,1)] shadow-sm"
                    style={{ marginRight: showGlobalChat !== null ? '340px' : '0px' }}
                >
                    <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 w-full">
                        <div className="flex items-center gap-2">
                            <div>
                                <h2 className="text-slate-800 font-black text-xs sm:text-sm tracking-wide truncate max-w-xs sm:max-w-md">{test.title}</h2>
                                {autoSaveStatus && (
                                    <span className="text-[9px] text-emerald-600 font-bold block leading-none mt-0.5">
                                        ✓ {autoSaveStatus}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Countdown Timer */}
                            {timeLeft !== null && (
                                <div className={`px-2.5 py-1 border rounded-lg flex items-center gap-1.5 text-[11px] font-bold transition-colors shadow-inner ${timeLeft < 60
                                    ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse'
                                    : 'bg-slate-100 border-slate-200 text-slate-700'
                                    }`}>
                                    <Clock size={12} />
                                    <span>{formatTime(timeLeft)}</span>
                                </div>
                            )}

                            {/* My Drafts Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    toast(`Draft status: Saved. Last updated at: ${new Date().toLocaleTimeString()}`, { icon: '📝', style: { fontSize: '11px' } });
                                }}
                                className="flex items-center gap-1.5 px-3 py-1 bg-[#28a745] hover:bg-[#218838] text-white text-[11px] font-bold rounded-full transition-all shadow-sm shrink-0"
                            >
                                <FileText size={11} /> My Drafts
                            </button>

                            {/* More Menu */}
                            <div className="relative group/menu shrink-0">
                                <button type="button" className="w-7 h-7 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-800 hover:bg-slate-100 transition-colors">
                                    <MoreVertical size={14} />
                                </button>
                                <div className="absolute right-0 top-8 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-35 hidden group-hover/menu:block text-slate-700 text-[11px]">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            test.questions?.forEach((_, qIdx) => handleTextChange(qIdx, ''));
                                            toast.success("All answers cleared.");
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-55 font-semibold"
                                    >
                                        Clear All Answers
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            test.questions?.forEach((q, qIdx) => handleTemporaryFill(qIdx, q.type));
                                            toast.success("All placeholders filled.");
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-55 font-semibold"
                                    >
                                        Fill All Placeholders
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toast.success("Issue reported to host.")}
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 font-semibold text-red-600"
                                    >
                                        Report Issue
                                    </button>
                                </div>
                            </div>

                            {/* Guest Profile avatar */}
                            <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold border-2 border-slate-200 shadow-sm cursor-pointer text-[11px] shrink-0">
                                {guestName ? guestName.slice(0, 2).toUpperCase() : 'GT'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Test Canvas */}
                <div className={`flex-1 p-6 space-y-8 pb-28 w-full transition-[padding,max-width,margin] duration-500 ease-[cubic-bezier(0.25,1,0.35,1)] ${showGlobalChat !== null ? 'pr-[356px]' : 'max-w-4xl mx-auto'}`}>
                    {test.questions.map((q, idx) => {
                        const type = q.type?.toLowerCase();
                        const isShortAnswer = type === 'short answer';
                        const isTextType = type === 'paragraph answer' || type === 'paragraph' || type === 'text';
                        const isMcq = type === 'multiple choice' || type === 'multiple choices' || type === 'mcq';
                        const isDropdown = type === 'dropdown';
                        const isCheckboxes = type === 'checkboxes' || type === 'checkbox';
                        const isTrueFalse = type?.includes('true') || type?.includes('false') || type === 'true false';
                        const isFillBlanks = type?.includes('blank') || type === 'fill in the blanks';
                        const isMatching = type?.includes('match') || type === 'matching';
                        const isTabularData = type === 'tabular data';
                        const isAudio = type === 'audio' || type === 'voice recording' || type === 'voice rec';
                        const isVideo = type === 'video' || type === 'video recording' || type === 'video rec';
                        const isUpload = type === 'upload' || type === 'file upload';
                        const isAssignment = type === 'assignment' || type?.includes('assign');
                        const isActivity = type === 'activity' || type?.includes('activ');

                        // New element types mapping
                        const isRating = type === 'rating';
                        const isDateTime = type === 'date & time' || type === 'date/time';
                        const isImageDisplay = type === 'image displaying' || type === 'image';
                        const isVideoDisplay = type === 'video displaying' || type === 'video';
                        const isPdfDisplay = type === 'pdf displaying' || type === 'pdf';
                        const isWebpageDisplay = type === 'webpage displaying';
                        const isEmbeddedVideo = type === 'embedded video displaying' || type === 'youtube';
                        const isEmbeddedSM = type === 'embedded sm content displaying';
                        const isAudioListening = type === 'audio listening displaying' || type === 'audio listening';
                        const isMultiFile = type === 'multi file displaying';
                        const isScreenshot = type === 'screenshot taking' || type === 'screen shot';
                        const isScreenRec = type === 'screen recording' || type === 'screen rec';
                        const isAudioCall = type === 'web based audio calling' || type === 'call rec';
                        const isVideoCall = type === 'web based video calling';
                        const isTextAI = type === 'text based ai agent' || type === 'text chat ai';
                        const isVoiceAI = type === 'voice based ai agent' || type === 'voice chat ai';

                        const isCollapsed = collapsedQuestions[idx];

                        // Read question-level config or default to test-level publicSettings
                        const qAssistiveBase = q.assistive || test?.publicSettings?.assistiveFeatures || {
                            relevantInformation: true,
                            myDrafts: true,
                            temporaryFill: true,
                            audioAnswer: true,
                            chatWithTeacher: true,
                            uploadAttachment: true,
                            exampleSection: true,
                            offlineWriting: true,
                            calculator: true,
                            textToSpeech: true,
                            speechToText: true,
                            translation: true,
                            accessibilityMode: true
                        };

                        const questionAddons = q.addons || [];
                        const globalAppliedAddons = q.appliedToAllAddons || [];
                        const hasAddon = (label) => questionAddons.includes(label) || globalAppliedAddons.includes(label);

                        const qAssistive = {
                            ...qAssistiveBase,
                            translation: q.addons ? hasAddon('Translator it') : qAssistiveBase.translation,
                            speechToText: q.addons ? hasAddon('Voice typing') : qAssistiveBase.speechToText,
                            calculator: q.addons ? hasAddon('Timer') : qAssistiveBase.calculator,
                            relevantInformation: q.addons ? (hasAddon('Help with AI') || qAssistiveBase.relevantInformation) : qAssistiveBase.relevantInformation,
                            temporaryFill: q.addons ? (hasAddon('Help with AI') || qAssistiveBase.temporaryFill) : qAssistiveBase.temporaryFill
                        };

                        const qParticulars = q.particulars || {
                            required: false,
                            singleLineMode: false,
                            minChars: '',
                            maxChars: '',
                            minWords: '',
                            maxWords: '',
                            placeholderText: 'Your answer',
                            defaultValue: '',
                            inputWidth: '100%',
                            validationRules: '',
                            answerMode: 'Text + Upload + Audio',
                            enableTextStyle: false,
                            style: {
                                fontSize: '14px',
                                fontWeight: 'normal',
                                textColor: '#334155',
                                bgColor: '#F8FAFC',
                                borderRadius: '16px',
                                borderStyle: 'solid',
                                borderColor: '#E2E8F0'
                            },
                            supportingResources: []
                        };
                        const isEditable = !isAlreadySubmittedView && questionTimes[idx] !== 0 && !(submittedAnswers[idx] && !qParticulars.allowEditing);
                        const hasAnyAction = !!(
                            q.moreSettings?.allowUpload === true ||
                            q.moreSettings?.allowAudioAnswer === true ||
                            q.moreSettings?.allowVideo === true ||
                            q.moreSettings?.allowChat === true ||
                            q.moreSettings?.allowSubmitFinish === true ||
                            (submittedAnswers[idx] && qParticulars.allowEditing && questionTimes[idx] !== 0)
                        );

                        return (
                            <div key={idx} className="rounded-2xl shadow-md bg-white">

                                {/* ⚪ QUESTION CARD BODY */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6">

                                    {/* Inserted Images Thumbnails */}
                                    {(() => {
                                        const imagesToRender = [
                                            ...(q.insertedImage?.url ? [q.insertedImage.url] : []),
                                            ...(q.insertedImages || [])
                                        ];
                                        if (imagesToRender.length === 0) return null;
                                        return (
                                            <div className="flex flex-wrap gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                                                {imagesToRender.map((imgUrl, imgIdx) => (
                                                    <div
                                                        key={imgIdx}
                                                        className="relative group/thumb w-14 h-14 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm flex items-center justify-center cursor-pointer hover:border-indigo-500 transition-all"
                                                        onClick={() => setLightboxImage(imgUrl)}
                                                    >
                                                        <img
                                                            src={imgUrl}
                                                            alt={`Inserted preview ${imgIdx + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}

                                    {/* Question Title Row */}
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="space-y-1">
                                            <h3 className={`font-extrabold text-slate-800 tracking-tight ${isAccessibilityActive ? 'text-2xl' : 'text-lg'}`}>
                                                Q{idx + 1}. {q.text || 'What is a computer?'}
                                            </h3>
                                            <p className="text-xs text-slate-500 font-medium italic">
                                                "{q.description || q.instructions || 'This is a question that requires only a one-line answer.'}"
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setCollapsedQuestions(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                            className="p-1.5 bg-[#4e6178] hover:bg-[#3d4d5e] rounded-lg text-white transition-colors"
                                        >
                                            <ChevronUp size={18} className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                                        </button>
                                    </div>

                                    {!isCollapsed && (
                                        <div className="space-y-6">
                                            {/* Question Media Elements */}
                                            {q.imageUrl && !isImageDisplay && (
                                                <div className="mt-2 flex justify-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                    <img
                                                        src={q.imageUrl}
                                                        alt={q.altText || 'Question Image'}
                                                        className={`max-w-full max-h-60 rounded-xl object-contain shadow-sm ${q.align === 'left' ? 'mr-auto' : q.align === 'right' ? 'ml-auto' : 'mx-auto'}`}
                                                    />
                                                </div>
                                            )}

                                            {q.videoUrl && (
                                                <div className="space-y-4">
                                                    <Plyr
                                                        source={{
                                                            type: "video",
                                                            sources: [
                                                                {
                                                                    src: `http://localhost:5000${q.videoUrl}`,
                                                                    type: "video/mp4",
                                                                },
                                                            ],
                                                        }}
                                                        options={{
                                                            controls: [
                                                                "play-large",
                                                                "restart",
                                                                "rewind",
                                                                "play",
                                                                "fast-forward",
                                                                "progress",
                                                                "current-time",
                                                                "duration",
                                                                "mute",
                                                                "volume",
                                                                "settings",
                                                                "pip",
                                                                "airplay",
                                                                "fullscreen",
                                                            ],

                                                            settings: ["speed"],

                                                            speed: {
                                                                selected: 1,
                                                                options: [0.5, 0.75, 1, 1.25, 1.5, 2],
                                                            },

                                                            disableContextMenu: true,
                                                        }}
                                                    />

                                                    {q.particulars?.enableAnswerBox !== false && (
                                                        <textarea
                                                            value={answers[idx] || ""}
                                                            onChange={(e) =>
                                                                handleTextChange(idx, e.target.value)
                                                            }
                                                            placeholder="Type your answer here..."
                                                            rows={1}
                                                            className="w-full h-10 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-500 resize-none overflow-hidden"
                                                        />
                                                    )}
                                                </div>
                                            )}

                                            {q.pdfUrl && !isPdfDisplay && (
                                                <div className="mt-2 flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
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

                                            {(q.youtubeUrl || q.embeddedVideoUrl) && !isEmbeddedVideo && (
                                                <div 
                                                    className="mt-2 mx-auto overflow-hidden rounded-2xl border border-slate-200 shadow-sm aspect-video bg-black flex items-center justify-center"
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

                                            {/* Answer Inputs based on Question Type */}
                                            <div className="answer-input-zone">
                                                {/* MCQ Options */}
                                                {isMcq && q.options && (
                                                    <div className="space-y-2.5">
                                                        {q.options.map((opt, optIdx) => (
                                                            <label
                                                                key={optIdx}
                                                                className={`flex items-center gap-3 p-3.5 border rounded-2xl transition-all ${answers[idx] === opt.text
                                                                    ? 'border-[#6F42C1] bg-[#6F42C1]/5'
                                                                    : 'border-slate-200 bg-white'
                                                                    } ${!isEditable ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'hover:bg-slate-50 cursor-pointer'}`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name={`q-${idx}`}
                                                                    disabled={!isEditable}
                                                                    checked={answers[idx] === opt.text}
                                                                    onChange={() => handleTextChange(idx, opt.text)}
                                                                    className="text-[#6F42C1] focus:ring-[#6F42C1] w-4 h-4 border-slate-300 disabled:opacity-50"
                                                                />
                                                                <span className="text-sm font-semibold text-slate-700">{opt.text}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Dropdown Options */}
                                                {isDropdown && q.options && (
                                                    <select
                                                        disabled={!isEditable}
                                                        value={answers[idx] || ""}
                                                        onChange={(e) => handleTextChange(idx, e.target.value)}
                                                        className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-[#6F42C1] outline-none text-sm shadow-sm transition-all ${!isEditable ? 'opacity-60 cursor-not-allowed bg-slate-50/50' : ''}`}
                                                    >
                                                        <option value="">Select option...</option>
                                                        {q.options.map((opt, oIdx) => (
                                                            <option key={oIdx} value={opt.text}>{opt.text}</option>
                                                        ))}
                                                    </select>
                                                )}

                                                {/* Checkboxes Options */}
                                                {isCheckboxes && q.options && (
                                                    <div className="space-y-2.5">
                                                        {q.options.map((opt, optIdx) => {
                                                            const isChecked = Array.isArray(answers[idx]) && answers[idx].includes(opt.text);
                                                            return (
                                                                <label
                                                                    key={optIdx}
                                                                    className={`flex items-center gap-3 p-3.5 border rounded-2xl transition-all ${isChecked
                                                                        ? 'border-[#6F42C1] bg-[#6F42C1]/5'
                                                                        : 'border-slate-200 bg-white'
                                                                        } ${!isEditable ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'hover:bg-slate-55 cursor-pointer'}`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        disabled={!isEditable}
                                                                        checked={isChecked}
                                                                        onChange={(e) => {
                                                                            const optText = opt.text;
                                                                            const isCheckedNow = e.target.checked;
                                                                            setAnswers(prev => {
                                                                                const current = Array.isArray(prev[idx]) ? prev[idx] : [];
                                                                                if (isCheckedNow) {
                                                                                    return { ...prev, [idx]: [...current, optText] };
                                                                                } else {
                                                                                    return { ...prev, [idx]: current.filter(x => x !== optText) };
                                                                                }
                                                                            });
                                                                        }}
                                                                        className="rounded text-[#6F42C1] focus:ring-[#6F42C1] w-4 h-4 border-slate-300 disabled:opacity-50"
                                                                    />
                                                                    <span className="text-sm font-semibold text-slate-700">{opt.text}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* True False Options */}
                                                {isTrueFalse && (
                                                    <div className="flex gap-4">
                                                        {['True', 'False'].map((val) => (
                                                            <label
                                                                key={val}
                                                                className={`flex-1 flex items-center gap-3 p-3.5 border rounded-2xl transition-all justify-center ${answers[idx] === val
                                                                    ? 'border-[#6F42C1] bg-[#6F42C1]/5'
                                                                    : 'border-slate-200 bg-white'
                                                                    } ${!isEditable ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'hover:bg-slate-50 cursor-pointer'}`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name={`q-${idx}`}
                                                                    disabled={!isEditable}
                                                                    checked={answers[idx] === val}
                                                                    onChange={() => handleTextChange(idx, val)}
                                                                    className="text-[#6F42C1] focus:ring-[#6F42C1] w-4 h-4 border-slate-300 disabled:opacity-50"
                                                                />
                                                                <span className="text-sm font-bold text-slate-700">{val}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Fill in the Blanks */}
                                                {isFillBlanks && (
                                                    <div className="space-y-3 text-left">
                                                        <span className="text-xs text-slate-400 font-bold block">Fill in the blank fields below:</span>
                                                        <input
                                                            type="text"
                                                            disabled={!isEditable}
                                                            value={answers[idx] || ''}
                                                            onChange={(e) => handleTextChange(idx, e.target.value)}
                                                            placeholder="Type blank answer response..."
                                                            className={`w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 outline-none text-slate-800 text-sm focus:bg-white focus:border-[#6F42C1] ${!isEditable ? 'opacity-60 cursor-not-allowed bg-slate-50/50' : ''}`}
                                                        />
                                                    </div>
                                                )}

                                                {/* Matching */}
                                                {isMatching && (
                                                    <div className="space-y-3 text-left">
                                                        <span className="text-xs text-slate-400 font-bold block">Match the pairs correctly:</span>
                                                        {(q.matchingPairs || [{ key: 'Computer', value: 'Machine' }, { key: 'Software', value: 'Instructions' }]).map((pair, pIdx) => {
                                                            const val = answers[idx]?.[pair.key] || "";
                                                            return (
                                                                <div key={pIdx} className="flex items-center justify-between gap-4 p-3.5 bg-slate-55 border border-slate-200 rounded-2xl">
                                                                    <span className="font-bold text-slate-750 text-sm">{pair.key}</span>
                                                                    <select
                                                                        value={val}
                                                                        disabled={!isEditable}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            setAnswers(prev => ({
                                                                                ...prev,
                                                                                [idx]: { ...(prev[idx] || {}), [pair.key]: val }
                                                                            }));
                                                                        }}
                                                                        className={`border border-slate-200 rounded-lg p-1.5 text-xs outline-none focus:border-[#6F42C1] ${!isEditable ? 'opacity-60 cursor-not-allowed bg-slate-50/50' : ''}`}
                                                                    >
                                                                        <option value="">Select Match...</option>
                                                                        {(q.matchingPairs || [{ key: 'Computer', value: 'Machine' }, { key: 'Software', value: 'Instructions' }]).map((item, iIdx) => (
                                                                            <option key={iIdx} value={item.value}>{item.value}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Tabular Data */}
                                                {isTabularData && (
                                                    <div className="space-y-3 text-left">
                                                        <span className="text-xs text-slate-400 font-bold block">Fill in the table:</span>
                                                        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                                                            <table className="min-w-full divide-y divide-slate-200">
                                                                <thead className="bg-slate-50">
                                                                    <tr>
                                                                        {(q.tableData?.headers || []).map((header, colIdx) => (
                                                                            <th key={colIdx} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">
                                                                                {header}
                                                                            </th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-150 bg-white">
                                                                    {(q.tableData?.rows || []).map((row, rowIdx) => (
                                                                        <tr key={rowIdx}>
                                                                            {row.map((cell, colIdx) => {
                                                                                const isPreFilled = cell !== '';
                                                                                const currentVal = (answers[idx]?.[rowIdx]?.[colIdx] !== undefined)
                                                                                    ? answers[idx][rowIdx][colIdx]
                                                                                    : '';
                                                                                return (
                                                                                    <td key={colIdx} className="px-4 py-3 text-sm text-slate-700">
                                                                                        {isPreFilled ? (
                                                                                            <span className="font-semibold text-slate-800">{cell}</span>
                                                                                        ) : (
                                                                                            <input
                                                                                                type="text"
                                                                                                value={currentVal}
                                                                                                disabled={!isEditable}
                                                                                                onChange={(e) => {
                                                                                                    const val = e.target.value;
                                                                                                    setAnswers(prev => {
                                                                                                        const copy = prev[idx] ? JSON.parse(JSON.stringify(prev[idx])) : [];
                                                                                                        while (copy.length <= rowIdx) {
                                                                                                            copy.push(Array(row.length).fill(''));
                                                                                                        }
                                                                                                        copy[rowIdx][colIdx] = val;
                                                                                                        return {
                                                                                                            ...prev,
                                                                                                            [idx]: copy
                                                                                                        };
                                                                                                    });
                                                                                                }}
                                                                                                placeholder="Type answer..."
                                                                                                className={`w-full text-xs font-medium text-slate-650 bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-500 rounded px-2.5 py-1.5 outline-none transition-all ${!isEditable ? 'opacity-60 cursor-not-allowed bg-slate-50/50' : ''}`}
                                                                                            />
                                                                                        )}
                                                                                    </td>
                                                                                );
                                                                            })}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Date & Time */}
                                                {isDateTime && (
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <input
                                                            type="date"
                                                            disabled={!isEditable}
                                                            value={(answers[idx] || '').split('T')[0] || ''}
                                                            onChange={(e) => {
                                                                const timePart = (answers[idx] || '').split('T')[1] || '';
                                                                handleTextChange(idx, e.target.value + (timePart ? 'T' + timePart : ''));
                                                            }}
                                                            className={`w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#6F42C1] shadow-sm ${!isEditable ? 'opacity-60 cursor-not-allowed bg-slate-50/50' : ''}`}
                                                        />
                                                        <input
                                                            type="time"
                                                            disabled={!isEditable}
                                                            value={(answers[idx] || '').split('T')[1] || ''}
                                                            onChange={(e) => {
                                                                const datePart = (answers[idx] || '').split('T')[0] || '';
                                                                handleTextChange(idx, (datePart ? datePart : new Date().toISOString().split('T')[0]) + 'T' + e.target.value);
                                                            }}
                                                            className={`w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#6F42C1] shadow-sm ${!isEditable ? 'opacity-60 cursor-not-allowed bg-slate-50/50' : ''}`}
                                                        />
                                                    </div>
                                                )}

                                                {/* Rating */}
                                                {isRating && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {[1, 2, 3, 4, 5].map((star) => {
                                                            const currentRating = Number(answers[idx]) || 0;
                                                            return (
                                                                <button
                                                                    key={star}
                                                                    type="button"
                                                                    disabled={!isEditable}
                                                                    onClick={() => handleTextChange(idx, String(star))}
                                                                    className="transition-transform active:scale-90"
                                                                >
                                                                    <Star
                                                                        size={24}
                                                                        className={`cursor-pointer transition-colors ${star <= currentRating
                                                                            ? 'text-amber-400 fill-amber-400'
                                                                            : 'text-slate-300 fill-transparent hover:text-amber-400'
                                                                            }`}
                                                                    />
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* File upload */}
                                                {isUpload && (
                                                    <div className="space-y-3">
                                                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    type="button"
                                                                    disabled={!isEditable}
                                                                    onClick={() => {
                                                                        const input = document.createElement('input');
                                                                        input.type = 'file';
                                                                        input.onchange = (e) => {
                                                                            if (e.target.files) handleFileUploadSimulated(idx, e.target.files);
                                                                        };
                                                                        input.click();
                                                                    }}
                                                                    className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-[#6F42C1] text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 border border-purple-150"
                                                                >
                                                                    <Upload size={14} />
                                                                    Choose File
                                                                </button>
                                                                <span className="text-xs text-slate-400 font-semibold">
                                                                    {attachedFiles[idx] ? attachedFiles[idx].map(f => f.name).join(', ') : 'No file selected'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {isUploading[idx] && (
                                                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                <div className="bg-[#6F42C1] h-1.5 rounded-full transition-all duration-200" style={{ width: `${uploadProgress[idx] || 0}%` }}></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Image Displaying */}
                                                {isImageDisplay && (
                                                    <div className="mt-2 flex justify-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                        <img
                                                            src={q.imageUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80'}
                                                            alt={q.altText || 'Display Image'}
                                                            className={`max-w-full max-h-60 rounded-xl object-contain shadow-sm ${q.align === 'left' ? 'mr-auto' : q.align === 'right' ? 'ml-auto' : 'mx-auto'}`}
                                                        />
                                                    </div>
                                                )}

                                                {/* PDF Displaying */}
                                                {isPdfDisplay && (
                                                    <div className="mt-2 flex items-center justify-between p-4 bg-slate-55 border border-slate-200 rounded-2xl">
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
                                                            href={q.pdfUrl || '#'}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/10"
                                                        >
                                                            View Document
                                                        </a>
                                                    </div>
                                                )}

                                                {/* Webpage Displaying */}
                                                {isWebpageDisplay && (
                                                    <div className="mt-2 rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white text-left">
                                                        {(q.webpageUrl || q.htmlContent) ? (
                                                            <div className="flex flex-col">

                                                                {/* Header */}
                                                                <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 border-b border-slate-200">
                                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                                        <Globe
                                                                            size={10}
                                                                            className="text-purple-500 shrink-0"
                                                                        />

                                                                        <span className="text-[10px] font-bold text-slate-500 truncate">
                                                                            {q.webpageUrl || "Custom HTML Content"}
                                                                        </span>
                                                                    </div>

                                                                    {q.webpageUrl && (
                                                                        <a
                                                                            href={q.webpageUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-[10px] font-bold text-purple-600 hover:text-purple-700 shrink-0"
                                                                        >
                                                                            Open
                                                                        </a>
                                                                    )}
                                                                </div>

                                                                {/* Content */}
                                                                {q.htmlContent ? (
                                                                    <iframe
                                                                        title="HTML Content"
                                                                        srcDoc={q.htmlContent}
                                                                        className="w-full border-0 bg-white"
                                                                        style={{
                                                                            height: `${q.webpageHeight || 600}px`
                                                                        }}
                                                                        sandbox="allow-scripts"
                                                                    />
                                                                ) : (
                                                                    <iframe
                                                                        src={q.webpageUrl}
                                                                        title="Webpage Display"
                                                                        className="w-full border-0 bg-white"
                                                                        style={{
                                                                            height: `${q.webpageHeight || 600}px`
                                                                        }}
                                                                        scrolling={q.webpageScroll || "yes"}
                                                                        sandbox="allow-scripts allow-same-origin allow-forms"
                                                                        loading="lazy"
                                                                        referrerPolicy="no-referrer"
                                                                    />
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center text-slate-400 p-4 bg-slate-50">
                                                                <Globe
                                                                    size={32}
                                                                    className="mx-auto mb-2 text-purple-400"
                                                                />
                                                                <p className="text-xs font-semibold">
                                                                    No webpage URL or HTML content provided
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {/* Embedded Video Displaying */}
                                                {isEmbeddedVideo && (
                                                    <div 
                                                        className="mt-2 mx-auto overflow-hidden rounded-2xl border border-slate-200 shadow-sm aspect-video bg-black flex items-center justify-center"
                                                        style={{ width: `${q.videoWidth || 500}px`, maxWidth: '100%' }}
                                                    >
                                                        {(q.youtubeUrl || q.embeddedVideoUrl) ? (
                                                            <iframe
                                                                src={getEmbedUrl(q.embeddedVideoUrl || q.youtubeUrl)}
                                                                title="YouTube Video"
                                                                className="w-full h-full border-0"
                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                allowFullScreen
                                                            ></iframe>
                                                        ) : (
                                                            <div className="text-center text-slate-400 p-4">
                                                                <Play size={32} className="mx-auto mb-2 text-red-500" />
                                                                <p className="text-xs font-semibold">No video URL provided</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Embedded SM Content Displaying */}
                                                {isEmbeddedSM && (
                                                    <div className="mt-2 border border-slate-200 rounded-2xl p-4 bg-slate-50 flex items-center gap-3 text-left">
                                                        <div className="p-3 bg-sky-50 text-sky-600 rounded-xl border border-sky-100 shadow-sm">
                                                            <Share2 size={20} />
                                                        </div>
                                                        <div>
                                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">{q.smPlatform || 'Social Media'} Post</span>
                                                            <span className="text-sm font-semibold text-slate-700 block truncate max-w-xs">{q.smPostUrl || 'No social media link provided'}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Audio listening Displaying */}
                                                {isAudioListening && (
                                                    <div className="mt-2 border border-slate-200 rounded-2xl p-6 bg-slate-50 flex flex-col gap-4 text-left">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                                                                <Headphones size={22} />
                                                            </div>

                                                            <div className="flex-1">
                                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                                                                    Comprehension Track
                                                                </span>

                                                                <audio
                                                                    src={getAudioUrl(q.audioUrl)}
                                                                    controls
                                                                    controlsList="nodownload"
                                                                    className="w-full mt-1.5 h-9"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Answer Box */}
                                                        {q.particulars?.enableAnswerBox !== false && (
                                                            <textarea
                                                                value={answers[idx] || ""}
                                                                onChange={(e) =>
                                                                    handleTextChange(idx, e.target.value)
                                                                }
                                                                placeholder="Type your answer here..."
                                                                rows={1}
                                                                className="w-full h-10 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-500 resize-none overflow-hidden bg-white"
                                                            />
                                                        )}

                                                        {/* MCQ Options */}
                                                        {q.options && q.options.length > 0 && (
                                                            <div className="space-y-2">
                                                                {q.options.map((opt, optIdx) => (
                                                                    <label
                                                                        key={optIdx}
                                                                        className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50"
                                                                    >
                                                                        <input
                                                                            type="radio"
                                                                            name={`audio-${idx}`}
                                                                            checked={answers[idx] === opt.text}
                                                                            onChange={() =>
                                                                                handleTextChange(idx, opt.text)
                                                                            }
                                                                            className="text-purple-600"
                                                                        />
                                                                        <span className="text-sm text-slate-700">
                                                                            {opt.text}
                                                                        </span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {/* Multi file Displaying */}
                                                {isMultiFile && (
                                                    <div className="space-y-3">
                                                        <div className="border-2 border-dashed border-purple-200 rounded-2xl p-6 bg-purple-50/20 text-center space-y-2">
                                                            <div className="p-3 bg-white text-purple-600 rounded-full border border-purple-150 inline-block">
                                                                <Files size={20} />
                                                            </div>
                                                            <div>
                                                                <button
                                                                    type="button"
                                                                    disabled={!isEditable}
                                                                    onClick={() => {
                                                                        const input = document.createElement('input');
                                                                        input.type = 'file';
                                                                        input.multiple = true;
                                                                        input.onchange = (e) => {
                                                                            if (e.target.files) handleFileUploadSimulated(idx, e.target.files);
                                                                        };
                                                                        input.click();
                                                                    }}
                                                                    className="px-4 py-2 bg-[#6F42C1] hover:bg-[#5a32a3] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 mx-auto"
                                                                >
                                                                    Choose Multiple Files
                                                                </button>
                                                                <span className="text-xs text-slate-400 mt-2 block">
                                                                    {attachedFiles[idx] ? `${attachedFiles[idx].length} files selected` : `Maximum of ${q.multiMaxFiles || 5} files`}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {attachedFiles[idx] && (
                                                            <div className="flex flex-col gap-2 text-left">
                                                                {attachedFiles[idx].map((file, fIdx) => (
                                                                    <div key={fIdx} className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 text-xs">
                                                                        <span className="text-slate-700 font-semibold">{file.name}</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setAttachedFiles(prev => ({
                                                                                    ...prev,
                                                                                    [idx]: prev[idx].filter((_, i) => i !== fIdx)
                                                                                }));
                                                                            }}
                                                                            className="text-red-500 hover:text-red-700"
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Screenshot taking */}
                                                {isScreenshot && (
                                                    <div className="mt-2 border border-slate-200 rounded-2xl p-6 bg-slate-50 flex flex-col items-center justify-center gap-4 text-center">
                                                        <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                                                            <Camera size={28} />
                                                        </div>
                                                        <div>
                                                            <span className="text-sm font-bold text-slate-700 block">Capture Screenshot ({q.screenshotScope || 'Entire Screen'})</span>
                                                            <span className="text-xs text-slate-400 mt-1 block">Take a screenshot of the specified frame and upload</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            disabled={!isEditable}
                                                            onClick={() => {
                                                                handleTextChange(idx, "screenshot_taken_" + Date.now() + ".png");
                                                                toast.success("Screenshot saved successfully!", { icon: '📸' });
                                                            }}
                                                            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                                                        >
                                                            <Camera size={14} /> {answers[idx] ? "Capture Again" : "Capture Screenshot"}
                                                        </button>
                                                        {answers[idx] && (
                                                            <span className="text-xs text-emerald-600 font-bold">✓ Saved: {answers[idx]}</span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Screen recording */}
                                                {isScreenRec && (
                                                    <div className="mt-2 border border-slate-200 rounded-2xl p-6 bg-slate-50 flex flex-col items-center justify-center gap-4 text-center">
                                                        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center animate-pulse">
                                                            <Monitor size={28} />
                                                        </div>
                                                        <div>
                                                            <span className="text-sm font-bold text-slate-700 block">Screen Recorder Ready ({q.quality || '1080p'})</span>
                                                            <span className="text-xs text-slate-400 mt-1 block">Permission will be requested to record your screen {q.includeMic ? 'and voice audio' : ''}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            disabled={!isEditable}
                                                            onClick={() => {
                                                                handleTextChange(idx, "screen_recording_" + Date.now() + ".webm");
                                                                toast.success("Screen recording simulation started...", { icon: '📹' });
                                                            }}
                                                            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                                                        >
                                                            <Monitor size={14} /> {answers[idx] ? "Record Again" : "Start Screen Share"}
                                                        </button>
                                                        {answers[idx] && (
                                                            <span className="text-xs text-emerald-600 font-bold">✓ Saved: {answers[idx]}</span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Web based Audio calling */}
                                                {isAudioCall && (() => {
                                                    const allowedIds = q.particulars?.allowedTeachers || [];
                                                    const questionTeachers = teachersList.filter(t => allowedIds.includes(t._id));
                                                    const elementTeachers = questionTeachers.length > 0 ? questionTeachers : teachersList;
                                                    const singleTeacher = elementTeachers.length === 1 ? elementTeachers[0] : null;

                                                    const handleCallTeacher = () => {
                                                        const targetId = singleTeacher ? singleTeacher._id : (selectedTeachers[idx] || '');
                                                        const target = elementTeachers.find(t => t._id === targetId);
                                                        if (!target) {
                                                            toast.error("Please select a teacher to call");
                                                            return;
                                                        }
                                                        callUser(target._id, target.name, 'Teacher');
                                                        handleTextChange(idx, `Voice Call Session with ${target.name} on ${new Date().toLocaleString()}`);
                                                    };

                                                    return (
                                                        <div className="mt-2 border border-slate-200 rounded-2xl p-6 bg-slate-50 flex flex-col gap-4 text-left">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                                                                    <Phone size={22} />
                                                                </div>
                                                                <div>
                                                                    <span className="text-sm font-bold text-slate-700 block">Dialer Voice Connection</span>
                                                                    <span className="text-xs text-slate-400">Establish a live audio call with your instructor</span>
                                                                </div>
                                                            </div>

                                                            {q.scriptScenario && (
                                                                <div className="bg-white p-3 rounded-xl border border-slate-100 text-xs font-medium text-slate-650 leading-relaxed max-h-24 overflow-y-auto">
                                                                    <strong className="text-slate-700 uppercase tracking-wider block mb-1 text-[10px]">Roleplay Scenario:</strong>
                                                                    {q.scriptScenario}
                                                                </div>
                                                            )}

                                                            {!singleTeacher && elementTeachers.length > 0 && (
                                                                <div className="space-y-1.5">
                                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Choose Teacher to Call</label>
                                                                    <select
                                                                        value={selectedTeachers[idx] || ''}
                                                                        onChange={(e) => setSelectedTeachers(prev => ({ ...prev, [idx]: e.target.value }))}
                                                                        disabled={!isEditable}
                                                                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-[#6F42C1] bg-white text-slate-700"
                                                                    >
                                                                        <option value="">-- Select Teacher --</option>
                                                                        {elementTeachers.map(t => {
                                                                            const isOnline = onlineUsers.includes(t._id);
                                                                            return (
                                                                                <option key={t._id} value={t._id}>
                                                                                    {t.name} ({isOnline ? 'Online' : 'Offline'})
                                                                                </option>
                                                                            );
                                                                        })}
                                                                    </select>
                                                                </div>
                                                            )}

                                                            <button
                                                                type="button"
                                                                disabled={!isEditable || (!singleTeacher && !selectedTeachers[idx])}
                                                                onClick={handleCallTeacher}
                                                                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                                                            >
                                                                <Phone size={14} /> 
                                                                {singleTeacher 
                                                                    ? `Call ${singleTeacher.name} (${onlineUsers.includes(singleTeacher._id) ? 'Online' : 'Offline'})` 
                                                                    : 'Establish Voice Connection'
                                                                }
                                                            </button>

                                                            {answers[idx] && (
                                                                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                    {answers[idx]}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                {/* Web based Video calling */}
{isVideoCall && (() => {
    const allowedIds = q.particulars?.allowedTeachers || [];
    const questionTeachers = teachersList.filter(t => allowedIds.includes(t._id));
    const elementTeachers = questionTeachers.length > 0 ? questionTeachers : teachersList;
    const singleTeacher = elementTeachers.length === 1 ? elementTeachers[0] : null;

    const handleCallTeacher = () => {
        const targetId = singleTeacher ? singleTeacher._id : (selectedTeachers[idx] || '');
        const target = elementTeachers.find(t => t._id === targetId);
        if (!target) {
            toast.error("Please select a teacher to call");
            return;
        }
        callUser(target._id, target.name, 'Teacher', 'video');
        handleTextChange(idx, `Video Call Session with ${target.name} on ${new Date().toLocaleString()}`);
    };

    return (
        <div className="mt-2 border border-slate-200 rounded-2xl p-6 bg-slate-900 text-white flex flex-col gap-4 text-left">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-xl">
                    <Video size={22} />
                </div>
                <div>
                    <span className="text-sm font-bold block">Web Video Call Meeting</span>
                    <span className="text-xs text-slate-400">Establish a live video call with your instructor</span>
                </div>
            </div>

            {q.videoCallScenario && (
                <div className="bg-white/10 p-3 rounded-xl border border-white/5 text-xs font-medium text-slate-300 leading-relaxed max-h-24 overflow-y-auto">
                    <strong className="text-white uppercase tracking-wider block mb-1 text-[10px]">Meeting Topic:</strong>
                    {q.videoCallScenario}
                </div>
            )}

            {!singleTeacher && elementTeachers.length > 0 && (
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Choose Teacher to Call</label>
                    <select
                        value={selectedTeachers[idx] || ''}
                        onChange={(e) => setSelectedTeachers(prev => ({ ...prev, [idx]: e.target.value }))}
                        disabled={!isEditable}
                        className="w-full border border-white/10 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-purple-500 bg-white/5 text-white"
                    >
                        <option value="" className="text-slate-900">-- Select Teacher --</option>
                        {elementTeachers.map(t => {
                            const isOnline = onlineUsers.includes(t._id);
                            return (
                                <option key={t._id} value={t._id} className="text-slate-900">
                                    {t.name} ({isOnline ? 'Online' : 'Offline'})
                                </option>
                            );
                        })}
                    </select>
                </div>
            )}

            <button
                type="button"
                disabled={!isEditable || (!singleTeacher && !selectedTeachers[idx])}
                onClick={handleCallTeacher}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
                <Video size={14} />
                {singleTeacher
                    ? `Call ${singleTeacher.name} (${onlineUsers.includes(singleTeacher._id) ? 'Online' : 'Offline'})`
                    : 'Establish Video Connection'
                }
            </button>

            {answers[idx] && (
                <span className="text-xs text-emerald-450 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {answers[idx]}
                </span>
            )}
        </div>
    );
})()}

                                                {/* Text based AI agent */}
                                                {isTextAI && (
                                                    <div className="mt-2 border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm flex flex-col h-80 text-left">
                                                        <div className="bg-[#6F42C1] p-4 flex items-center justify-between text-white">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                                                    <Bot size={18} />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-extrabold">{q.agentName || 'AI Assistant'}</span>
                                                                    <span className="text-[10px] text-purple-100 flex items-center gap-1 font-semibold">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Online
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <span className="text-[10px] uppercase font-bold bg-white/10 px-2 py-0.5 rounded-full">AI Roleplay</span>
                                                        </div>
                                                        <div className="flex-1 p-4 bg-slate-50/50 overflow-y-auto space-y-3 text-xs custom-scrollbar">
                                                            <div className="flex gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 font-bold text-[10px]">AI</div>
                                                                <div className="bg-white p-2.5 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm max-w-[80%] font-medium text-slate-700">
                                                                    {q.greetingMessage || 'Hello! Let\'s begin our roleplay session.'}
                                                                </div>
                                                            </div>
                                                            {(chatMessages[idx] || []).map((msg, mIdx) => (
                                                                <div key={mIdx} className={`flex gap-2 ${msg.sender === 'student' ? 'flex-row-reverse' : ''}`}>
                                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] ${msg.sender === 'student' ? 'bg-indigo-105 text-indigo-600' : 'bg-purple-100 text-purple-600'}`}>
                                                                        {msg.sender === 'student' ? 'ST' : 'AI'}
                                                                    </div>
                                                                    <div className={`p-2.5 rounded-2xl border shadow-sm max-w-[80%] font-medium ${msg.sender === 'student' ? 'bg-[#6F42C1] text-white border-purple-700 rounded-tr-none' : 'bg-white text-slate-700 border-slate-100 rounded-tl-none'}`}>
                                                                        {msg.text}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="p-3 border-t border-slate-100 bg-white flex gap-2">
                                                            <input
                                                                type="text"
                                                                disabled={!isEditable}
                                                                placeholder="Type message to chat..."
                                                                value={chatInput[idx] || ''}
                                                                onChange={(e) => setChatInput(prev => ({ ...prev, [idx]: e.target.value }))}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        const val = e.target.value;
                                                                        if (!val.trim()) return;
                                                                        const newMessages = [...(chatMessages[idx] || []), { sender: 'student', text: val }];
                                                                        setChatMessages(prev => ({ ...prev, [idx]: newMessages }));
                                                                        setChatInput(prev => ({ ...prev, [idx]: '' }));
                                                                        handleTextChange(idx, JSON.stringify(newMessages));
                                                                        setTimeout(() => {
                                                                            const aiReply = { sender: 'ai', text: `Got your message. This is a simulation response from ${q.agentName || 'AI Assistant'}.` };
                                                                            const updatedMessages = [...newMessages, aiReply];
                                                                            setChatMessages(prev => ({ ...prev, [idx]: updatedMessages }));
                                                                            handleTextChange(idx, JSON.stringify(updatedMessages));
                                                                        }, 1000);
                                                                    }
                                                                }}
                                                                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#6F42C1]"
                                                            />
                                                            <button
                                                                type="button"
                                                                disabled={!isEditable}
                                                                onClick={() => {
                                                                    const val = chatInput[idx] || '';
                                                                    if (!val.trim()) return;
                                                                    const newMessages = [...(chatMessages[idx] || []), { sender: 'student', text: val }];
                                                                    setChatMessages(prev => ({ ...prev, [idx]: newMessages }));
                                                                    setChatInput(prev => ({ ...prev, [idx]: '' }));
                                                                    handleTextChange(idx, JSON.stringify(newMessages));
                                                                    setTimeout(() => {
                                                                        const aiReply = { sender: 'ai', text: `Got your message. This is a simulation response from ${q.agentName || 'AI Assistant'}.` };
                                                                        const updatedMessages = [...newMessages, aiReply];
                                                                        setChatMessages(prev => ({ ...prev, [idx]: updatedMessages }));
                                                                        handleTextChange(idx, JSON.stringify(updatedMessages));
                                                                    }, 1000);
                                                                }}
                                                                className="px-4 bg-[#6F42C1] hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                                                            >
                                                                Send
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Voice based AI Agent */}
                                                {isVoiceAI && (
                                                    <div className="mt-2 border border-slate-200 rounded-3xl p-6 bg-slate-900 text-white flex flex-col items-center justify-center gap-6 min-h-60 relative overflow-hidden text-center">
                                                        <div className="absolute top-4 right-4 bg-white/10 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase">Voice Call Sim</div>
                                                        <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-full flex items-center justify-center animate-pulse">
                                                            <Bot size={32} />
                                                        </div>
                                                        <div>
                                                            <span className="font-extrabold text-sm block">{q.agentName || 'AI Voice Assistant'}</span>
                                                            <span className="text-xs text-slate-400 mt-1 block">Voice Persona: {q.voicePersona || 'Alloy'}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            disabled={!isEditable}
                                                            onClick={() => {
                                                                handleTextChange(idx, "voice_call_established_" + Date.now());
                                                                toast.success("Voice channel connected successfully!", { icon: '🎙️' });
                                                            }}
                                                            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2"
                                                        >
                                                            <Mic size={14} /> {answers[idx] ? "Re-establish Voice Channel" : "Establish Voice Channel"}
                                                        </button>
                                                        {answers[idx] && (
                                                            <span className="text-xs text-emerald-400 font-bold">✓ Connected: {answers[idx]}</span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Text/Short Answer input */}
                                                {(isShortAnswer || isEmbeddedVideo) ? (
                                                    <div className="space-y-4">
                                                        {/* Supporting resources */}
                                                        {qParticulars.supportingResources && qParticulars.supportingResources.length > 0 && (
                                                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                                                                <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                                                    <Paperclip size={13} className="text-[#6F42C1]" /> Supporting Resources ({qParticulars.supportingResources.length})
                                                                </span>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                                                    {qParticulars.supportingResources.map((res, rIdx) => (
                                                                        <div key={rIdx} className="p-3 bg-white border border-slate-150 rounded-xl flex flex-col gap-1 shadow-sm">
                                                                            <span className="font-extrabold text-slate-800">{res.name || `Resource ${rIdx + 1}`}</span>
                                                                            {res.note && <span className="text-slate-500 italic font-semibold">{res.note}</span>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Text field if Text Mode is allowed */}
                                                        {(!qParticulars.answerMode || qParticulars.answerMode.includes('Text')) && qParticulars.enableAnswerBox !== false && (() => {
                                                            return (
                                                                <div className="relative group">
                                                                    {qParticulars.richTextEditor ? (
                                                                        <div className="space-y-1">
                                                                            <div className="flex gap-1.5 p-1.5 bg-slate-100 border border-slate-200 border-b-0 rounded-t-2xl">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        document.execCommand('bold', false, null);
                                                                                    }}
                                                                                    className="p-1 hover:bg-slate-200 rounded transition-all text-xs font-bold w-6 h-6 flex items-center justify-center text-slate-700"
                                                                                    title="Bold"
                                                                                >
                                                                                    B
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        document.execCommand('italic', false, null);
                                                                                    }}
                                                                                    className="p-1 hover:bg-slate-200 rounded transition-all text-xs italic w-6 h-6 flex items-center justify-center text-slate-700"
                                                                                    title="Italic"
                                                                                >
                                                                                    I
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        document.execCommand('underline', false, null);
                                                                                    }}
                                                                                    className="p-1 hover:bg-slate-200 rounded transition-all text-xs underline w-6 h-6 flex items-center justify-center text-slate-700"
                                                                                    title="Underline"
                                                                                >
                                                                                    U
                                                                                </button>
                                                                            </div>
                                                                            <div
                                                                                contentEditable={isEditable}
                                                                                suppressContentEditableWarning
                                                                                onBlur={(e) => handleTextChange(idx, e.currentTarget.innerHTML)}
                                                                                onInput={(e) => handleTextChange(idx, e.currentTarget.innerHTML)}
                                                                                onCopy={(e) => handleCopyPasteBlock(e, q)}
                                                                                onCut={(e) => handleCopyPasteBlock(e, q)}
                                                                                onPaste={(e) => handleCopyPasteBlock(e, q)}
                                                                                dangerouslySetInnerHTML={{ __html: answers[idx] || '' }}
                                                                                className={`w-full p-4 border border-slate-200 rounded-b-2xl bg-white focus:ring-4 focus:ring-purple-100 focus:border-[#6F42C1] outline-none transition-all font-medium text-slate-700 min-h-[120px] text-left ${!isEditable ? 'opacity-60 cursor-not-allowed bg-slate-50/50' : ''}`}
                                                                                placeholder={qParticulars.placeholderText || "Your answer..."}
                                                                                style={qParticulars.enableTextStyle && qParticulars.style ? {
                                                                                    fontSize: qParticulars.style.fontSize,
                                                                                    fontWeight: qParticulars.style.fontWeight,
                                                                                    color: qParticulars.style.textColor,
                                                                                    backgroundColor: qParticulars.style.bgColor,
                                                                                    borderStyle: qParticulars.style.borderStyle,
                                                                                    borderColor: qParticulars.style.borderColor,
                                                                                    borderWidth: '2px',
                                                                                    width: qParticulars.inputWidth || '100%',
                                                                                } : {}}
                                                                            />
                                                                        </div>
                                                                    ) : qParticulars.singleLineMode ? (
                                                                        <input
                                                                            type="text"
                                                                            disabled={!isEditable}
                                                                            value={answers[idx] || ""}
                                                                            onChange={(e) => handleTextChange(idx, e.target.value)}
                                                                            onCopy={(e) => handleCopyPasteBlock(e, q)}
                                                                            onCut={(e) => handleCopyPasteBlock(e, q)}
                                                                            onPaste={(e) => handleCopyPasteBlock(e, q)}
                                                                            style={qParticulars.enableTextStyle && qParticulars.style ? {
                                                                                fontSize: qParticulars.style.fontSize,
                                                                                fontWeight: qParticulars.style.fontWeight,
                                                                                color: qParticulars.style.textColor,
                                                                                backgroundColor: qParticulars.style.bgColor,
                                                                                borderRadius: qParticulars.style.borderRadius,
                                                                                borderStyle: qParticulars.style.borderStyle,
                                                                                borderColor: qParticulars.style.borderColor,
                                                                                borderWidth: '2px',
                                                                                width: qParticulars.inputWidth || '100%',
                                                                                padding: '12px 16px'
                                                                            } : {}}
                                                                            className={`w-full py-3 px-4 border border-slate-200 rounded-2xl bg-slate-50/50 focus:ring-4 focus:ring-purple-100 focus:border-[#6F42C1] transition-all font-medium text-slate-700 ${!isEditable ? 'opacity-60 cursor-not-allowed bg-slate-50/50' : ''}`}
                                                                            placeholder={qParticulars.placeholderText || "Your answer"}
                                                                        />
                                                                    ) : (
                                                                        <textarea rows={1}
                                                                            disabled={!isEditable}
                                                                            value={answers[idx] || ""}
                                                                            onChange={(e) => {
                                                                                handleTextChange(idx, e.target.value);
                                                                                e.target.style.height = 'auto';
                                                                                e.target.style.height = `${e.target.scrollHeight}px`;
                                                                            }}
                                                                            ref={(el) => {
                                                                                if (el) {
                                                                                    el.style.height = 'auto';
                                                                                    el.style.height = `${el.scrollHeight}px`;
                                                                                }
                                                                            }}
                                                                            onCopy={(e) => handleCopyPasteBlock(e, q)}
                                                                            onCut={(e) => handleCopyPasteBlock(e, q)}
                                                                            onPaste={(e) => handleCopyPasteBlock(e, q)}
                                                                            style={qParticulars.enableTextStyle && qParticulars.style ? {
                                                                                fontSize: qParticulars.style.fontSize,
                                                                                fontWeight: qParticulars.style.fontWeight,
                                                                                color: qParticulars.style.textColor,
                                                                                backgroundColor: qParticulars.style.bgColor,
                                                                                borderRadius: qParticulars.style.borderRadius,
                                                                                borderStyle: qParticulars.style.borderStyle,
                                                                                borderColor: qParticulars.style.borderColor,
                                                                                borderWidth: '2px',
                                                                                width: qParticulars.inputWidth || '100%',
                                                                                padding: '16px'
                                                                            } : {}}
                                                                            className={`w-full py-3 px-4 border border-slate-200 rounded-2xl bg-slate-50/50 focus:ring-4 focus:ring-purple-100 focus:border-[#6F42C1] transition-all font-medium text-slate-700 resize-none overflow-hidden min-h-[46px] ${!isEditable ? 'opacity-60 cursor-not-allowed bg-slate-50/50' : ''}`}
                                                                            placeholder={qParticulars.placeholderText || "Your answer"}
                                                                        />
                                                                    )}

                                                                    {qParticulars.languageRestriction && !validateLanguage(answers[idx] || '', qParticulars.languageRestriction) && (
                                                                        <span className="text-[10px] text-red-500 font-bold block mt-1 text-left">
                                                                            ⚠ Answer must be in {qParticulars.languageRestriction}
                                                                        </span>
                                                                    )}

                                                                    {/* Live character, word counters and text logic validation status */}
                                                                    <div className="flex flex-wrap items-center justify-between gap-2 mt-2 px-1 text-[11px] font-bold text-slate-500">
                                                                        {qParticulars.showWordCounter !== false && (
                                                                            <div className="flex gap-4">
                                                                                <span>Chars: {(answers[idx] || '').replace(/<[^>]*>/g, '').length} {qParticulars.maxChars && `/ ${qParticulars.maxChars}`}</span>
                                                                                <span>Words: {(answers[idx] || '').replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length} {qParticulars.maxWords && `/ ${qParticulars.maxWords}`}</span>
                                                                            </div>
                                                                        )}

                                                                        {/* Real-time Text Logic Indicators */}
                                                                        {(() => {
                                                                            const textVal = answers[idx] || '';
                                                                            const logicMatches = [];
                                                                            const tLogic = q.textLogic || {};

                                                                            if (tLogic.contains && tLogic.contains.trim()) {
                                                                                const ok = textVal.includes(tLogic.contains.trim());
                                                                                logicMatches.push(
                                                                                    <span key="contains" className={ok ? "text-emerald-600" : "text-amber-500"}>
                                                                                        {ok ? "✓" : "✗"} Contains "{tLogic.contains}"
                                                                                    </span>
                                                                                );
                                                                            }
                                                                            if (tLogic.doesNotContain && tLogic.doesNotContain.trim()) {
                                                                                const ok = !textVal.includes(tLogic.doesNotContain.trim());
                                                                                logicMatches.push(
                                                                                    <span key="notcontain" className={ok ? "text-emerald-600" : "text-amber-500"}>
                                                                                        {ok ? "✓" : "✗"} No "{tLogic.doesNotContain}"
                                                                                    </span>
                                                                                );
                                                                            }
                                                                            if (tLogic.startsWith && tLogic.startsWith.trim()) {
                                                                                const ok = textVal.startsWith(tLogic.startsWith.trim());
                                                                                logicMatches.push(
                                                                                    <span key="starts" className={ok ? "text-emerald-600" : "text-amber-500"}>
                                                                                        {ok ? "✓" : "✗"} Starts with "{tLogic.startsWith}"
                                                                                    </span>
                                                                                );
                                                                            }
                                                                            if (tLogic.endsWith && tLogic.endsWith.trim()) {
                                                                                const ok = textVal.endsWith(tLogic.endsWith.trim());
                                                                                logicMatches.push(
                                                                                    <span key="ends" className={ok ? "text-emerald-600" : "text-amber-500"}>
                                                                                        {ok ? "✓" : "✗"} Ends with "{tLogic.endsWith}"
                                                                                    </span>
                                                                                );
                                                                            }
                                                                            if (tLogic.regexValidation && tLogic.regexValidation.trim()) {
                                                                                let ok = false;
                                                                                try {
                                                                                    const reg = new RegExp(tLogic.regexValidation);
                                                                                    ok = reg.test(textVal);
                                                                                } catch (e) { }
                                                                                logicMatches.push(
                                                                                    <span key="regex" className={ok ? "text-emerald-600" : "text-amber-500"}>
                                                                                        {ok ? "✓" : "✗"} Regex Match
                                                                                    </span>
                                                                                );
                                                                            }

                                                                            if (logicMatches.length === 0) return null;
                                                                            return <div className="flex gap-3 flex-wrap">{logicMatches}</div>;
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Professional Audio Recording Panel */}
                                                        {showAudioRecorder[idx] && (
                                                            <div className="p-5 border-2 border-[#6F42C1] rounded-2xl bg-[#6F42C1]/5 space-y-4 animate-fade-in">
                                                                <div className="flex items-center justify-between border-b border-purple-150 pb-2">
                                                                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                                                        <Mic size={14} className="text-[#6F42C1]" /> Audio Recording
                                                                    </span>
                                                                    <div className="flex items-center gap-2 text-xs">
                                                                        <span className="font-bold text-slate-500">Countdown:</span>
                                                                        <select
                                                                            value={countdownConfig[idx] || 0}
                                                                            onChange={(e) => {
                                                                                const val = parseInt(e.target.value);
                                                                                setCountdownConfig(prev => ({ ...prev, [idx]: val }));
                                                                            }}
                                                                            disabled={recordingStatus[idx] === 'recording' || recordingStatus[idx] === 'paused'}
                                                                            className="border border-purple-200 rounded-lg p-1 bg-white font-bold outline-none text-slate-700"
                                                                        >
                                                                            <option value={0}>None</option>
                                                                            <option value={3}>3 Seconds</option>
                                                                            <option value={5}>5 Seconds</option>
                                                                            <option value={10}>10 Seconds</option>
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                {/* Countdown Display */}
                                                                {countdownVal[idx] !== undefined && countdownVal[idx] > 0 ? (
                                                                    <div className="flex flex-col items-center justify-center py-6 space-y-2">
                                                                        <div className="w-16 h-16 rounded-full bg-[#6F42C1] text-white flex items-center justify-center text-3xl font-black animate-ping">
                                                                            {countdownVal[idx]}
                                                                        </div>
                                                                        <span className="text-xs font-extrabold text-[#6F42C1] uppercase tracking-wider animate-pulse">Starting recording...</span>
                                                                    </div>
                                                                ) : (
                                                                    /* Main Recorder Body */
                                                                    <div className="flex flex-col items-center justify-center py-3 space-y-4">
                                                                        <div className="flex items-center gap-3">
                                                                            {/* Status & Flashing REC Indicator */}
                                                                            {recordingStatus[idx] === 'recording' && (
                                                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-600 rounded-full font-bold text-[10px] uppercase tracking-widest animate-pulse border border-red-200">
                                                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span> Live REC
                                                                                </div>
                                                                            )}
                                                                            {recordingStatus[idx] === 'paused' && (
                                                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-600 rounded-full font-bold text-[10px] uppercase tracking-widest border border-amber-200">
                                                                                    PAUSED
                                                                                </div>
                                                                            )}

                                                                            {/* Timer display */}
                                                                            {(recordingStatus[idx] === 'recording' || recordingStatus[idx] === 'paused') && (
                                                                                <span className="font-mono text-base font-black text-slate-800 tracking-wide">
                                                                                    {(() => {
                                                                                        const t = audioTimer[idx] || 0;
                                                                                        const mins = String(Math.floor(t / 60)).padStart(2, '0');
                                                                                        const secs = String(t % 60).padStart(2, '0');
                                                                                        return `${mins}:${secs}`;
                                                                                    })()}
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {/* Simulated Waveform Visualization */}
                                                                        {recordingStatus[idx] === 'recording' && (
                                                                            <div className="flex items-center gap-1 h-8">
                                                                                {[1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1].map((bar, bIdx) => {
                                                                                    const randHeight = Math.floor(Math.random() * 24) + 6;
                                                                                    return (
                                                                                        <span
                                                                                            key={bIdx}
                                                                                            style={{ height: `${randHeight}px` }}
                                                                                            className="w-1 bg-[#6F42C1] rounded-full transition-all duration-150 animate-bounce"
                                                                                        ></span>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}

                                                                        {/* Playback Preview */}
                                                                        {recordedURLs[idx]?.type === 'audio' && (
                                                                            <div className="w-full max-w-md bg-white rounded-xl p-3 border border-purple-100 shadow-sm flex flex-col gap-2">
                                                                                <audio controls src={recordedURLs[idx].url} className="w-full h-8" />
                                                                            </div>
                                                                        )}

                                                                        {/* Professional Controls Row */}
                                                                        <div className="flex flex-wrap items-center gap-2 justify-center">
                                                                            {(!recordingStatus[idx] || recordingStatus[idx] === 'idle' || recordingStatus[idx] === 'stopped') ? (
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={!!submittedAnswers[idx]}
                                                                                    onClick={() => startAudioRecordingCountdown(idx)}
                                                                                    className="px-5 py-2.5 bg-[#6F42C1] hover:bg-[#5a32a3] text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-colors"
                                                                                >
                                                                                    <Mic size={14} /> Start Recording
                                                                                </button>
                                                                            ) : null}

                                                                            {recordingStatus[idx] === 'recording' && (
                                                                                <>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => pauseAudioRecording(idx)}
                                                                                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-colors"
                                                                                    >
                                                                                        <Pause size={14} /> Pause
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => stopAudioRecording(idx)}
                                                                                        className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-colors"
                                                                                    >
                                                                                        <Square size={14} fill="currentColor" /> Stop
                                                                                    </button>
                                                                                </>
                                                                            )}

                                                                            {recordingStatus[idx] === 'paused' && (
                                                                                <>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => resumeAudioRecording(idx)}
                                                                                        className="px-4 py-2.5 bg-[#6F42C1] hover:bg-[#5a32a3] text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-colors"
                                                                                    >
                                                                                        <Play size={14} fill="currentColor" /> Resume
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => stopAudioRecording(idx)}
                                                                                        className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-colors"
                                                                                    >
                                                                                        <Square size={14} fill="currentColor" /> Stop
                                                                                    </button>
                                                                                </>
                                                                            )}

                                                                            {recordedURLs[idx]?.type === 'audio' && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => deleteAudioRecording(idx)}
                                                                                    className="px-4 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-colors"
                                                                                >
                                                                                    <RotateCcw size={14} /> Re-record / Delete
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    /* Textarea answer input for other standard types (assignment, activity, fallback) */
                                                    (isTextType || isAssignment || isActivity || (!isMcq && !isCheckboxes && !isTrueFalse && !isFillBlanks && !isMatching && !isAudio && !isVideo && !isDropdown && !isDateTime && !isRating && !isUpload && !isImageDisplay && !isVideoDisplay && !isPdfDisplay && !isWebpageDisplay && !isEmbeddedVideo && !isEmbeddedSM && !isAudioListening && !isMultiFile && !isScreenshot && !isScreenRec && !isAudioCall && !isVoiceAI && !isTextAI && !isVideoCall && !isTabularData)) && (
                                                        <div className="relative group">
                                                            <textarea
                                                                disabled={!isEditable}
                                                                value={answers[idx] || ""}
                                                                onChange={(e) => {
                                                                    handleTextChange(idx, e.target.value);
                                                                    e.target.style.height = 'auto';
                                                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                                                }}
                                                                ref={(el) => {
                                                                    if (el) {
                                                                        el.style.height = 'auto';
                                                                        el.style.height = `${el.scrollHeight}px`;
                                                                    }
                                                                }}
                                                                rows={1}
                                                                className={`w-full py-3 px-4 border border-slate-200 rounded-2xl bg-slate-50/50 focus:ring-4 focus:ring-purple-100 focus:border-[#6F42C1] transition-all font-medium text-slate-700 resize-none overflow-hidden min-h-[46px] ${!isEditable ? 'opacity-60 cursor-not-allowed bg-slate-50/50' : ''}`}
                                                                placeholder="Your answer"
                                                            />
                                                        </div>
                                                    )
                                                )}

                                                {/* Recording zone */}
                                                {isAudio && (
                                                    <div className="border-2 border-dashed border-purple-100 rounded-2xl bg-purple-50/20 p-6 flex flex-col items-center gap-3">

                                                        {/* Recording Controls */}
                                                        <div className="flex items-center justify-center gap-2 w-full">
                                                            <div
                                                                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${recordingStatus[idx] === "recording"
                                                                    ? "bg-red-100 text-red-600 animate-pulse ring-4 ring-red-150"
                                                                    : "bg-purple-100 text-[#6F42C1]"
                                                                    }`}
                                                            >
                                                                <Mic size={24} />
                                                            </div>
                                                            {recordingStatus[idx] === "recording" ||
                                                                recordingStatus[idx] === "paused" ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => stopRecording(idx)}
                                                                        className="h-10 px-4 bg-red-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-red-700 transition-all"
                                                                    >
                                                                        <Square size={14} fill="currentColor" />
                                                                        Stop
                                                                    </button>

                                                                    <button
                                                                        onClick={() => togglePauseRecording(idx)}
                                                                        className="h-10 px-4 bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-amber-600 transition-all"
                                                                    >
                                                                        {recordingStatus[idx] === "paused" ? (
                                                                            <>
                                                                                <Play size={14} />
                                                                                Resume
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Pause size={14} />
                                                                                Pause
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {(!recordedURLs[idx] ||
                                                                        recordedURLs[idx].length === 0) && (
                                                                            <button
                                                                                disabled={!!submittedAnswers[idx]}
                                                                                onClick={() => startRecording(idx, "audio")}
                                                                                className={`h-10 px-4 bg-[#6F42C1] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-[#5a32a3] ${submittedAnswers[idx]
                                                                                    ? "opacity-50 cursor-not-allowed"
                                                                                    : ""
                                                                                    }`}
                                                                            >
                                                                                <Mic size={14} />
                                                                                Start Recording
                                                                            </button>
                                                                        )}

                                                                    {recordedURLs[idx]?.length > 0 && (
                                                                        <button
                                                                            type="button"
                                                                            disabled={
                                                                                submittedAnswers[idx] ||
                                                                                (recordedURLs[idx]?.length || 0) >= 5
                                                                            }
                                                                            onClick={() => startRecording(idx, "audio")}
                                                                            className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md ${(recordedURLs[idx]?.length || 0) >= 5
                                                                                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                                                                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                                                                                }`}
                                                                        >
                                                                            <Plus size={14} />
                                                                            Add More
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>

                                                        {(recordedURLs[idx]?.length || 0) >= 5 && (
                                                            <p className="text-xs text-red-500 font-semibold text-center">
                                                                Maximum 5 recordings allowed
                                                            </p>
                                                        )}


                                                        {/* Recording List */}
                                                        {recordedURLs[idx]?.length > 0 && (
                                                            <div className="w-full mt-2 space-y-2">
                                                                {recordedURLs[idx].map((audio, audioIdx) => (
                                                                    <div
                                                                        key={audioIdx}
                                                                        className="bg-white rounded-xl p-3 border border-purple-100 shadow-sm flex flex-col gap-2"
                                                                    >
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-xs font-semibold text-slate-600">
                                                                                Recording {audioIdx + 1}
                                                                            </span>

                                                                            {!submittedAnswers[idx] && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => deleteRecording(idx, audioIdx)}
                                                                                    className="
                                                                                            px-3 py-1
                                                                                            bg-red-50
                                                                                            border border-red-200
                                                                                            text-red-600
                                                                                            rounded-lg
                                                                                            text-xs
                                                                                            font-semibold
                                                                                            hover:bg-red-100
                                                                                            hover:border-red-300
                                                                                            transition-all
                                                                                        "
                                                                                >
                                                                                    Delete
                                                                                </button>
                                                                            )}
                                                                        </div>

                                                                        <audio
                                                                            controls
                                                                            src={audio.url}
                                                                            className="w-full h-8"
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <p className="text-xs font-bold text-slate-700">
                                                            {recordingStatus[idx] === "recording"
                                                                ? " Recording..."
                                                                : recordedURLs[idx]?.length > 0
                                                                    ? ` ${recordedURLs[idx].length}/5 Recording Saved`
                                                                    : "Voice Answer (Minimum 1 Required)"}
                                                        </p>

                                                    </div>
                                                )}

                                                {/* Video recording block */}
                                                {(isVideo || showVideoRecorder[idx]) && (
                                                    <AdvancedVideoRecorder
                                                        question={q}
                                                        submittedAnswer={submittedAnswers[idx]}
                                                        onSubmitAnswer={(structuredData) => {
                                                            setSubmittedAnswers(prev => ({
                                                                ...prev,
                                                                [idx]: {
                                                                    questionId: q.id || `q${idx}`,
                                                                    questionText: q.text,
                                                                    questionType: q.type,
                                                                    textAnswer: typeof answers[idx] === 'object' ? JSON.stringify(answers[idx]) : (answers[idx] || ''),
                                                                    audioData: '',
                                                                    videoData: JSON.stringify(structuredData)
                                                                }
                                                            }));
                                                        }}
                                                        onReattempt={() => {
                                                            setSubmittedAnswers(prev => {
                                                                const n = { ...prev };
                                                                delete n[idx];
                                                                return n;
                                                            });
                                                        }}
                                                    />
                                                )}
                                            </div>

                                            {/* 🔲 ACTION ROW + DOUBLE PANE */}
                                            <div className="space-y-2">

                                                {/* 🔲 FOUR-PART REFERENCE & ASSISTIVE BAR (single line) */}
                                                {(() => {
                                                    const hasAddon = qAssistive.translation || qAssistive.relevantInformation || qAssistive.temporaryFill || qAssistive.textToSpeech || qAssistive.speechToText || qAssistive.calculator;
                                                    const hasWidget = q.moreSettings?.allowUpload || q.moreSettings?.allowAudioAnswer || q.moreSettings?.allowVideo || q.moreSettings?.allowChat || q.moreSettings?.allowSubmitFinish || (submittedAnswers[idx] && qParticulars.allowEditing && questionTimes[idx] !== 0);
                                                    return (
                                                        <div className="flex items-center border border-slate-200 rounded-xl bg-white text-xs select-none h-9 relative">
                                                            {collapsedExtras[idx] === false ? (
                                                                <div className="flex-1 flex items-center h-full">
                                                                    {/* ── EXAMPLE (15%) ── */}
                                                                    <div className="flex items-center gap-1.5 px-3 h-full border-r border-slate-200 bg-indigo-50/60 shrink-0 rounded-l-xl" style={{ width: '15%' }}>
                                                                        {q.uploadedResource ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    if (q.uploadedResource?.url) {
                                                                                        const dataUrl = q.uploadedResource.url;
                                                                                        if (dataUrl.startsWith('data:')) {
                                                                                            try {
                                                                                                const parts = dataUrl.split(',');
                                                                                                const mime = parts[0].match(/:(.*?);/)[1];
                                                                                                const bstr = atob(parts[1]);
                                                                                                let n = bstr.length;
                                                                                                const u8arr = new Uint8Array(n);
                                                                                                while (n--) {
                                                                                                    u8arr[n] = bstr.charCodeAt(n);
                                                                                                }
                                                                                                const blob = new Blob([u8arr], { type: mime });
                                                                                                const blobUrl = URL.createObjectURL(blob);
                                                                                                window.open(blobUrl, '_blank');
                                                                                            } catch (e) {
                                                                                                const newWindow = window.open();
                                                                                                if (newWindow) {
                                                                                                    newWindow.document.write(`<iframe src="${dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                                                                                }
                                                                                            }
                                                                                        } else {
                                                                                            window.open(dataUrl, '_blank');
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="px-2 py-0.5 rounded-md transition-all text-[10px] font-extrabold whitespace-nowrap shrink-0 bg-[#6F42C1]/15 hover:bg-[#6F42C1]/30 text-[#6F42C1]"
                                                                                title={q.uploadedResource?.name || 'Uploaded File'}
                                                                            >
                                                                                File 1 ↗
                                                                            </button>
                                                                        ) : (
                                                                            <span className="text-[9px] text-slate-400 italic truncate font-bold">No file</span>
                                                                        )}
                                                                    </div>

                                                                    {/* ── NOTE (15%) ── */}
                                                                    <div className="flex items-center gap-1.5 px-3 h-full border-r border-slate-200 bg-amber-50/60 shrink-0" style={{ width: '15%' }}>
                                                                        {q.helperText ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const win = window.open('', '_blank');
                                                                                    win.document.write(`
                                                                                        <!DOCTYPE html>
                                                                                        <html>
                                                                                        <head>
                                                                                            <title>Note Preview - ${q.helperText.replace(/<[^>]*>/g, '').slice(0, 30) || 'Untitled'}</title>
                                                                                            <style>
                                                                                                body {
                                                                                                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                                                                                                    background-color: #f0f2f5;
                                                                                                    margin: 0;
                                                                                                    padding: 40px 20px;
                                                                                                    display: flex;
                                                                                                    justify-content: center;
                                                                                                    }
                                                                                                .document-container {
                                                                                                    background-color: #ffffff;
                                                                                                    box-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05);
                                                                                                    border: 1px solid #e2e8f0;
                                                                                                    border-radius: 8px;
                                                                                                    width: 100%;
                                                                                                    max-width: 800px;
                                                                                                    min-height: 29.7cm;
                                                                                                    padding: 60px 80px;
                                                                                                    box-sizing: border-box;
                                                                                                }
                                                                                                .content {
                                                                                                    font-size: 15px;
                                                                                                    line-height: 1.6;
                                                                                                    color: #1a202c;
                                                                                                }
                                                                                                p { margin-top: 0; margin-bottom: 1em; }
                                                                                            </style>
                                                                                        </head>
                                                                                        <body>
                                                                                            <div class="document-container">
                                                                                                <div class="content">
                                                                                                    ${q.helperText}
                                                                                                </div>
                                                                                            </div>
                                                                                        </body>
                                                                                        </html>
                                                                                    `);
                                                                                    win.document.close();
                                                                                }}
                                                                                className="px-2 py-0.5 rounded-md transition-all text-[10px] font-extrabold whitespace-nowrap shrink-0 bg-amber-100 hover:bg-amber-200 text-amber-600"
                                                                                title="Helping Notes Section"
                                                                            >
                                                                                Note 1 ↗
                                                                            </button>
                                                                        ) : (
                                                                            <span className="text-[9px] text-slate-400 italic truncate font-bold">No notes</span>
                                                                        )}
                                                                    </div>

                                                                    {/* ── WIDGET ASSIGNED (15%) ── */}
                                                                    <div className="flex items-center gap-1.5 justify-center px-3 h-full border-r border-slate-200 bg-sky-50/60 shrink-0" style={{ width: '15%' }}>
                                                                        {hasWidget ? (
                                                                            <div className="flex items-center gap-1.5">
                                                                                {/* Upload Button */}
                                                                                {q.moreSettings?.allowUpload === true && (() => {
                                                                                    const uploadEnabled = q.moreSettings?.allowUpload === true;
                                                                                    const hasFiles = attachedFiles[idx] && attachedFiles[idx].length > 0;
                                                                                    if (hasFiles) {
                                                                                        return (
                                                                                            <div className="relative">
                                                                                                <button
                                                                                                    type="button"
                                                                                                    disabled={!isEditable}
                                                                                                    onClick={() => setShowUploadMenu(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                                                                                    className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all text-xs"
                                                                                                    title="Uploaded file(s). Click to manage."
                                                                                                >
                                                                                                    <Paperclip size={12} />
                                                                                                </button>
                                                                                                {showUploadMenu[idx] && (
                                                                                                    <div className="absolute left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-[100] flex flex-col min-w-[150px] text-xs font-semibold text-slate-700">
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={() => {
                                                                                                                setShowUploadMenu(prev => ({ ...prev, [idx]: false }));
                                                                                                                const file = attachedFiles[idx] && attachedFiles[idx][0];
                                                                                                                if (file && file.url) {
                                                                                                                    const dataUrl = file.url;
                                                                                                                    if (dataUrl.startsWith('data:')) {
                                                                                                                        try {
                                                                                                                            const parts = dataUrl.split(',');
                                                                                                                            const mime = parts[0].match(/:(.*?);/)[1];
                                                                                                                            const bstr = atob(parts[1]);
                                                                                                                            let n = bstr.length;
                                                                                                                            const u8arr = new Uint8Array(n);
                                                                                                                            while (n--) {
                                                                                                                                u8arr[n] = bstr.charCodeAt(n);
                                                                                                                            }
                                                                                                                            const blob = new Blob([u8arr], { type: mime });
                                                                                                                            const blobUrl = URL.createObjectURL(blob);
                                                                                                                            window.open(blobUrl, '_blank');
                                                                                                                        } catch (e) {
                                                                                                                            const newWindow = window.open();
                                                                                                                            if (newWindow) {
                                                                                                                                newWindow.document.write(`<iframe src="${dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                                                                                                            }
                                                                                                                        }
                                                                                                                    } else {
                                                                                                                        window.open(dataUrl, '_blank');
                                                                                                                    }
                                                                                                                }
                                                                                                            }}
                                                                                                            className="px-4 py-2 hover:bg-slate-50 text-left transition-colors flex items-center gap-2 font-bold"
                                                                                                        >
                                                                                                            <span>Preview File</span>
                                                                                                        </button>
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={() => {
                                                                                                                setShowUploadMenu(prev => ({ ...prev, [idx]: false }));
                                                                                                                document.getElementById(`file-replace-main-public-${idx}`).click();
                                                                                                            }}
                                                                                                            className="px-4 py-2 hover:bg-slate-50 text-left transition-colors flex items-center gap-2 font-bold"
                                                                                                        >
                                                                                                            <span>Replace File</span>
                                                                                                        </button>
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={() => {
                                                                                                                setShowUploadMenu(prev => ({ ...prev, [idx]: false }));
                                                                                                                setAttachedFiles(prev => ({ ...prev, [idx]: [] }));
                                                                                                                toast.success("Attachment removed");
                                                                                                            }}
                                                                                                            className="px-4 py-2 hover:bg-slate-50 text-left text-red-600 transition-colors flex items-center gap-2 font-bold"
                                                                                                        >
                                                                                                            <span>Remove File</span>
                                                                                                        </button>
                                                                                                    </div>
                                                                                                )}
                                                                                                <input
                                                                                                    type="file"
                                                                                                    id={`file-replace-main-public-${idx}`}
                                                                                                    multiple
                                                                                                    className="hidden"
                                                                                                    onChange={(e) => handleFileUploadSimulated(idx, e.target.files)}
                                                                                                />
                                                                                            </div>
                                                                                        );
                                                                                    }
                                                                                    return (
                                                                                        <div className="relative">
                                                                                            <button
                                                                                                type="button"
                                                                                                disabled={!isEditable}
                                                                                                onClick={() => {
                                                                                                    if (!isEditable) {
                                                                                                        if (questionTimes[idx] === 0) {
                                                                                                            toast.error("⛔ Time is up for this question", { duration: 3000 });
                                                                                                        } else {
                                                                                                            toast.error("⛔ Cannot edit response after submit", { duration: 3000 });
                                                                                                        }
                                                                                                        return;
                                                                                                    }
                                                                                                    document.getElementById(`file-upload-main-public-${idx}`).click();
                                                                                                }}
                                                                                                className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${!isEditable
                                                                                                    ? 'bg-blue-100/40 text-blue-400/70 cursor-not-allowed'
                                                                                                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                                                                                    }`}
                                                                                                title="Upload File"
                                                                                            >
                                                                                                <Paperclip size={12} />
                                                                                            </button>
                                                                                            <input
                                                                                                type="file"
                                                                                                id={`file-upload-main-public-${idx}`}
                                                                                                multiple
                                                                                                className="hidden"
                                                                                                onChange={(e) => handleFileUploadSimulated(idx, e.target.files)}
                                                                                            />
                                                                                        </div>
                                                                                    );
                                                                                })()}

                                                                                {/* Audio Recording Mic Button */}
                                                                                {q.moreSettings?.allowAudioAnswer === true && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            if (!isEditable) {
                                                                                                if (questionTimes[idx] === 0) {
                                                                                                    toast.error("⛔ Time is up for this question", { duration: 3000 });
                                                                                                } else {
                                                                                                    toast.error("⛔ Cannot edit response after submit", { duration: 3000 });
                                                                                                }
                                                                                                return;
                                                                                            }
                                                                                            setShowAudioRecorder(prev => ({ ...prev, [idx]: !prev[idx] }));
                                                                                        }}
                                                                                        className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${!isEditable
                                                                                            ? 'bg-purple-100/40 text-[#6F42C1]/50 cursor-not-allowed'
                                                                                            : (showAudioRecorder[idx]
                                                                                                ? 'bg-[#6F42C1] text-white'
                                                                                                : 'bg-purple-100 text-[#6F42C1] hover:bg-purple-200')
                                                                                            }`}
                                                                                        title="Audio Response"
                                                                                    >
                                                                                        <Mic size={12} />
                                                                                    </button>
                                                                                )}

                                                                                {/* Video Recording Button */}
                                                                                {q.moreSettings?.allowVideo === true && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            if (!isEditable) {
                                                                                                if (questionTimes[idx] === 0) {
                                                                                                    toast.error("⛔ Time is up for this question", { duration: 3000 });
                                                                                                } else {
                                                                                                    toast.error("⛔ Cannot edit response after submit", { duration: 3000 });
                                                                                                }
                                                                                                return;
                                                                                            }
                                                                                            setShowVideoRecorder(prev => ({ ...prev, [idx]: !prev[idx] }));
                                                                                        }}
                                                                                        className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${!isEditable
                                                                                            ? 'bg-pink-100/40 text-pink-400/50 cursor-not-allowed'
                                                                                            : (showVideoRecorder[idx]
                                                                                                ? 'bg-pink-600 text-white'
                                                                                                : 'bg-pink-100 text-pink-600 hover:bg-pink-200')
                                                                                            }`}
                                                                                        title="Video Response"
                                                                                    >
                                                                                        <Video size={12} />
                                                                                    </button>
                                                                                )}

                                                                                {/* Chat Button */}
                                                                                {q.moreSettings?.allowChat === true && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            const willOpen = showGlobalChat !== idx;
                                                                                            setShowGlobalChat(willOpen ? idx : null);
                                                                                            if (willOpen) {
                                                                                                const qText = q.text ? q.text.replace(/<[^>]*>/g, '').trim() : '';
                                                                                                if (qText && !(chatInput[idx])) {
                                                                                                    setChatInput(prev => ({ ...prev, [idx]: `Q: ${qText}` }));
                                                                                                }
                                                                                            }
                                                                                        }}
                                                                                        className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${showGlobalChat === idx
                                                                                            ? 'bg-emerald-600 text-white'
                                                                                            : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                                                                            }`}
                                                                                        title="Chat with Teacher"
                                                                                    >
                                                                                        <MessageSquare size={12} />
                                                                                    </button>
                                                                                )}

                                                                                {/* Submit & Finish Button */}
                                                                                {q.moreSettings?.allowSubmitFinish === true && (
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={submitting}
                                                                                        onClick={() => submitAllResponses(false)}
                                                                                        className="w-6 h-6 flex items-center justify-center rounded-md bg-red-100 text-red-600 hover:bg-red-200 transition-all"
                                                                                        title="Submit & Finish"
                                                                                    >
                                                                                        <CheckCircle2 size={12} />
                                                                                    </button>
                                                                                )}

                                                                                {/* Reattempt Button */}
                                                                                {submittedAnswers[idx] && qParticulars.allowEditing && questionTimes[idx] !== 0 && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setSubmittedAnswers(prev => {
                                                                                                const n = { ...prev };
                                                                                                delete n[idx];
                                                                                                return n;
                                                                                            });
                                                                                            toast.success("Reattempting question...");
                                                                                        }}
                                                                                        className="w-6 h-6 flex items-center justify-center rounded-md bg-green-100 text-[#28A745] hover:bg-green-200 transition-all animate-bounce"
                                                                                        title="Reattempt Question"
                                                                                    >
                                                                                        <RotateCcw size={12} />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-[9px] text-slate-400 italic truncate font-bold">No widget</span>
                                                                        )}
                                                                    </div>

                                                                    {/* ── ADDON (55%, right-aligned) ── */}
                                                                    <div className="flex items-center px-2 h-full bg-slate-50/60 shrink-0" style={{ width: '55%' }}>
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-0.5 shrink-0">
                                                                            <Sliders size={12} /> Addon
                                                                        </span>
                                                                        <div className="flex items-center gap-1 ml-auto">
                                                                            {hasAddon ? (
                                                                                <>
                                                                                    {qAssistive.translation && (
                                                                                        <button type="button" onClick={() => setActiveQuestionTab(prev => ({ ...prev, [idx]: prev[idx] === 'translation' ? null : 'translation' }))} className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-bold font-sans transition-all border ${activeQuestionTab[idx] === 'translation' ? 'bg-[#007BFF] text-white border-[#007BFF]' : 'bg-white hover:bg-slate-100 text-[#007BFF] border-slate-200'}`} title="Translate">अ</button>
                                                                                    )}
                                                                                    {(qAssistive.relevantInformation || qAssistive.temporaryFill) && (
                                                                                        <button type="button" onClick={() => setActiveQuestionTab(prev => ({ ...prev, [idx]: prev[idx] === 'relevantInfo' ? null : 'relevantInfo' }))} className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${activeQuestionTab[idx] === 'relevantInfo' ? 'bg-[#0056b3] text-white' : 'bg-[#007BFF] text-white hover:bg-[#0056b3]'}`} title="Relevant Info"><ClipboardList size={11} /></button>
                                                                                    )}
                                                                                    {qAssistive.textToSpeech && (
                                                                                        <button type="button" onClick={() => handleTTS(q.text)} className="w-6 h-6 flex items-center justify-center rounded-md bg-[#6F42C1] hover:bg-[#5a32a3] text-white transition-all text-[10px]" title="Read Aloud">🔤</button>
                                                                                    )}
                                                                                    {qAssistive.speechToText && (
                                                                                        <button type="button" onClick={() => toggleVoiceTyping(idx)} className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${isListening === idx ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`} title={isListening === idx ? 'Listening...' : 'Dictate'}><Mic size={11} /></button>
                                                                                    )}
                                                                                    {qAssistive.calculator && (
                                                                                        <button type="button" onClick={() => setActiveQuestionTab(prev => ({ ...prev, [idx]: prev[idx] === 'calculator' ? null : 'calculator' }))} className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${activeQuestionTab[idx] === 'calculator' ? 'bg-[#138496] text-white' : 'bg-[#17A2B8] hover:bg-[#138496] text-white'}`} title="Calculator"><Sliders size={11} /></button>
                                                                                    )}
                                                                                </>
                                                                            ) : (
                                                                                <span className="text-[9px] text-slate-400 italic">No addon</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                /* Centered placeholder when collapsed */
                                                                <div className="flex-1 flex items-center justify-center text-slate-400 font-semibold gap-1.5 px-3 italic">
                                                                    <Sliders size={12} className="animate-pulse text-slate-350" />
                                                                    <span>Click on collapse button to see Assistive features</span>
                                                                </div>
                                                            )}

                                                            {/* Collapse/Expand button right next to it inside the bar */}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const isCollapsed = collapsedExtras[idx] !== false;
                                                                    setCollapsedExtras(prev => ({ ...prev, [idx]: !isCollapsed }));
                                                                    if (isCollapsed) {
                                                                        const defaultTab = null;
                                                                        setActiveQuestionTab(prev => ({ ...prev, [idx]: defaultTab }));
                                                                    }
                                                                }}
                                                                className="h-full w-10 bg-white hover:bg-slate-50 text-slate-500 border-l border-slate-200 transition-all flex items-center justify-center shrink-0 rounded-r-xl"
                                                                title={collapsedExtras[idx] === false ? "Collapse" : "Expand"}
                                                            >
                                                                {collapsedExtras[idx] === false ? (
                                                                    <ChevronUp size={16} className="stroke-[2.5]" />
                                                                ) : (
                                                                    <ChevronDown size={16} className="stroke-[2.5]" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Expandable Tabs details */}




                                            {collapsedExtras[idx] === false && activeQuestionTab[idx] === 'translation' && (
                                                <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl text-xs space-y-2 animate-fade-in text-slate-700">
                                                    <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                                                        <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-widest text-[#6F42C1]">Translation Assistant</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveQuestionTab(prev => ({ ...prev, [idx]: null }))}
                                                            className="text-slate-400 hover:text-slate-600 font-bold flex items-center gap-1 transition-colors text-[10px] uppercase tracking-wider"
                                                        >
                                                            Collapse ✕
                                                        </button>
                                                    </div>
                                                    <div className="flex gap-2.5">
                                                        <button type="button" onClick={() => handleTranslate(idx, 'es', q.text)} className="px-3 py-1.5 bg-white border border-slate-200 hover:border-[#6F42C1] rounded-lg font-bold">Spanish</button>
                                                        <button type="button" onClick={() => handleTranslate(idx, 'fr', q.text)} className="px-3 py-1.5 bg-white border border-slate-200 hover:border-[#6F42C1] rounded-lg font-bold">French</button>
                                                        <button type="button" onClick={() => handleTranslate(idx, 'hi', q.text)} className="px-3 py-1.5 bg-white border border-slate-200 hover:border-[#6F42C1] rounded-lg font-bold">Hindi</button>
                                                    </div>
                                                    {translateLang[idx] && (
                                                        <div className="border border-[#6F42C1]/20 bg-[#6F42C1]/5 p-3.5 rounded-xl mt-2">
                                                            <span className="font-bold text-[9px] uppercase tracking-wider text-[#6F42C1] block mb-1">Translated Question text ({translateLang[idx].toUpperCase()})</span>
                                                            <p className="font-bold text-slate-800 leading-snug">
                                                                {translateLang[idx] === 'es' ? '¿Qué es una computadora?' : translateLang[idx] === 'fr' ? "Qu'est-ce qu'un ordinateur?" : 'कंप्यूटर क्या है?'}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {collapsedExtras[idx] === false && activeQuestionTab[idx] === 'relevantInfo' && (
                                                <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl text-xs space-y-2 animate-fade-in text-slate-700">
                                                    <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                                                        <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-widest text-[#6F42C1]">Relevant Info / Template</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveQuestionTab(prev => ({ ...prev, [idx]: null }))}
                                                            className="text-slate-400 hover:text-slate-600 font-bold flex items-center gap-1 transition-colors text-[10px] uppercase tracking-wider"
                                                        >
                                                            Collapse ✕
                                                        </button>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {qAssistive.relevantInformation && (
                                                            <div>
                                                                <span className="font-bold text-[9px] uppercase tracking-wider text-slate-400 block">Relevant Information</span>
                                                                <p className="leading-relaxed font-semibold italic text-slate-700">
                                                                    {q.helperText || "Provide a clear and concise response."}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {qAssistive.temporaryFill && (
                                                            <div>
                                                                <span className="font-bold text-[9px] uppercase tracking-wider text-slate-400 block">Template Fill Tool</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleTemporaryFill(idx, q.type)}
                                                                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[10px] mt-1 transition-colors shadow-xs"
                                                                >
                                                                    Apply Template / Answer Placeholder
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {collapsedExtras[idx] === false && activeQuestionTab[idx] === 'calculator' && (
                                                <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl text-xs space-y-2 animate-fade-in text-slate-700">
                                                    <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                                                        <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-widest text-[#6F42C1]">Calculator</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveQuestionTab(prev => ({ ...prev, [idx]: null }))}
                                                            className="text-slate-400 hover:text-slate-600 font-bold flex items-center gap-1 transition-colors text-[10px] uppercase tracking-wider"
                                                        >
                                                            Collapse ✕
                                                        </button>
                                                    </div>
                                                    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm w-48 mx-auto text-center space-y-2">
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value={calculatorVal}
                                                            className="w-full border border-slate-200 rounded-lg p-1.5 text-right font-mono font-bold text-slate-800"
                                                        />
                                                        <div className="grid grid-cols-4 gap-1.5">
                                                            {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', 'C', '+'].map(c => (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => pressCalc(c)}
                                                                    key={c}
                                                                    className="p-1.5 bg-slate-50 border hover:bg-slate-100 rounded text-xs font-bold"
                                                                >
                                                                    {c}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => pressCalc('=')}
                                                            className="w-full py-1.5 bg-[#6F42C1] text-white rounded-lg font-bold text-xs"
                                                        >
                                                            =
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {collapsedExtras[idx] === false && activeQuestionTab[idx] === 'chat' && (
                                                <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl text-xs space-y-2 animate-fade-in text-slate-700">
                                                    <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                                                        <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-widest text-[#6F42C1]">Chat with Teacher</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveQuestionTab(prev => ({ ...prev, [idx]: null }))}
                                                            className="text-slate-400 hover:text-slate-600 font-bold flex items-center gap-1 transition-colors text-[10px] uppercase tracking-wider"
                                                        >
                                                            Collapse ✕
                                                        </button>
                                                    </div>
                                                    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-3 max-w-lg mx-auto">
                                                        <div className="h-40 overflow-y-auto space-y-2.5 pr-1 text-xs text-left">
                                                            {(chatMessages[idx] || []).length === 0 && (
                                                                <span className="text-slate-400 italic font-medium block text-center pt-8">No messages yet. Ask for help!</span>
                                                            )}
                                                            {(chatMessages[idx] || []).map((msg, mIdx) => (
                                                                <div key={mIdx} className={`p-2 rounded-xl max-w-[85%] font-medium ${msg.sender === 'student' ? 'bg-[#6F42C1]/10 text-slate-800 ml-auto' : 'bg-slate-100 text-slate-700 mr-auto'}`}>
                                                                    {msg.text}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="flex gap-1 border-t pt-2">
                                                            <input
                                                                type="text"
                                                                value={chatInput[idx] || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setChatInput(prev => ({ ...prev, [idx]: val }));
                                                                }}
                                                                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage(idx)}
                                                                placeholder="Ask a question..."
                                                                className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#6F42C1] font-semibold text-slate-750"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => sendChatMessage(idx)}
                                                                className="px-3 py-1.5 bg-[#6F42C1] hover:bg-[#5a32a3] text-white font-bold rounded-lg transition-colors"
                                                            >
                                                                Send
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Uploading Progress Bar */}
                                            {isUploading[idx] && (
                                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fade-in">
                                                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                                                        <span>Uploading attachment...</span>
                                                        <span>{uploadProgress[idx]}%</span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                                        <div
                                                            style={{ width: `${uploadProgress[idx]}%` }}
                                                            className="bg-[#007bff] h-2 rounded-full transition-all duration-100"
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── 💬 GLOBAL MESSENGER CHAT SIDEBAR ── */}
                {showGlobalChat !== null && (() => {
                    const cIdx = showGlobalChat;
                    const cQuestion = test?.questions?.[cIdx];
                    const qTitle = cQuestion?.text ? cQuestion.text.replace(/<[^>]*>/g, '').trim() : `Question ${cIdx + 1}`;
                    const msgs = chatMessages[cIdx] || [];
                    return (
                        <div className="fixed top-0 right-0 h-full w-[340px] bg-white shadow-2xl z-[200] flex flex-col border-l border-slate-200 animate-slide-in-right">
                            {/* Chat Header */}
                            <div className="bg-[#6F42C1] px-4 py-3 flex items-center gap-3 shrink-0">
                                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                    <MessageSquare size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-black text-sm leading-tight truncate">Teacher Chat</p>
                                    <p className="text-purple-200 text-[10px] font-semibold truncate">Q{cIdx + 1}: {qTitle.slice(0, 40)}{qTitle.length > 40 ? '...' : ''}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowGlobalChat(null)}
                                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors shrink-0"
                                >
                                    <X size={15} />
                                </button>
                            </div>

                            {/* Question context pill */}
                            <div className="px-3 py-2 bg-purple-50 border-b border-purple-100 shrink-0">
                                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-0.5">Asking about</p>
                                <p className="text-xs text-slate-700 font-semibold line-clamp-2">{qTitle}</p>
                            </div>

                            {/* Messages area */}
                            <div
                                className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-slate-50"
                                ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}
                            >
                                {msgs.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-center py-10 space-y-2">
                                        <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center">
                                            <MessageSquare size={26} className="text-[#6F42C1]" />
                                        </div>
                                        <p className="text-slate-500 text-xs font-semibold">No messages yet</p>
                                        <p className="text-slate-400 text-[10px]">Ask your teacher for help!</p>
                                    </div>
                                )}
                                {msgs.map((msg, mIdx) => (
                                    <div key={mIdx} className={`flex gap-2 ${msg.sender === 'student' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${msg.sender === 'student' ? 'bg-orange-500' : 'bg-[#6F42C1]'}`}>
                                            {msg.sender === 'student' ? (guestName?.slice(0, 2).toUpperCase() || 'ST') : 'T'}
                                        </div>
                                        <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${msg.sender === 'student'
                                            ? 'bg-[#6F42C1] text-white rounded-tr-sm'
                                            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
                                            }`}>
                                            {msg.text}
                                            <div className={`text-[9px] mt-0.5 ${msg.sender === 'student' ? 'text-purple-200 text-right' : 'text-slate-400'}`}>
                                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Input area */}
                            <div className="border-t border-slate-200 bg-white px-3 py-3 shrink-0">
                                <div className="flex items-end gap-2">
                                    <textarea
                                        rows={2}
                                        value={chatInput[cIdx] || ''}
                                        onChange={(e) => setChatInput(prev => ({ ...prev, [cIdx]: e.target.value }))}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                sendChatMessage(cIdx);
                                            }
                                        }}
                                        placeholder="Type your message..."
                                        className="flex-1 resize-none border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#6F42C1] focus:ring-2 focus:ring-[#6F42C1]/20 transition-all leading-relaxed"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => sendChatMessage(cIdx)}
                                        className="w-9 h-9 rounded-full bg-[#6F42C1] hover:bg-[#5a32a3] flex items-center justify-center text-white transition-all shadow-md active:scale-90 shrink-0"
                                    >
                                        <Send size={14} />
                                    </button>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-1.5 font-medium">Enter to send · Shift+Enter for new line</p>
                            </div>
                        </div>
                    );
                })()}

                {/* 🔳 FIXED BOTTOM ACTION BAR */}
                <div
                    className="fixed bottom-0 left-0 bg-white border-t border-slate-300 px-4 py-2.5 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] transition-all duration-500 ease-[cubic-bezier(0.25,1,0.35,1)]"
                    style={{ right: showGlobalChat !== null ? '340px' : '0px' }}
                >
                    <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2">

                        {/* Activity & Offline Toggle */}
                        <div className="border-2 border-slate-200 px-3 py-1.5 flex items-center gap-3 bg-slate-50 rounded-xl select-none flex-wrap">
                            {test?.discussionActivity?.activityName && test?.discussionActivity?.activityLink ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        window.open(test.discussionActivity.activityLink, '_blank');
                                    }}
                                    className="px-3 py-1.5 bg-black hover:bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-lg transition-colors"
                                >
                                    {test.discussionActivity.activityName}
                                </button>
                            ) : null}

                            <div className="flex items-center gap-2 font-bold text-[11px] text-slate-700">
                                <span>Offline Writing</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={offlineWriting}
                                        onChange={(e) => {
                                            setOfflineWriting(e.target.checked);
                                            if (e.target.checked) {
                                                toast.success("Offline writing mode enabled. Answers will be saved locally.");
                                            } else {
                                                toast.success("Online writing mode active. Drafts syncing with backend.");
                                            }
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div className="relative w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                            </div>
                        </div>

                        {/* Action Buttons (Right) */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {isAlreadySubmittedView ? (
                                <>
                                    <span className="text-xs font-bold text-slate-500 mr-2 bg-slate-200 px-3 py-1.5 rounded-lg select-none">
                                        Already Submitted (Read-only)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (existingSubmission && existingSubmission.status === 'evaluated') {
                                                window.open(`/shared/test-result/${existingSubmission._id}`, '_blank');
                                            } else {
                                                toast.error("Your response has not been evaluated by the teacher yet.");
                                            }
                                        }}
                                        className="px-6 py-2 bg-[#007BFF] hover:bg-[#0056b3] text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                                    >
                                        Result
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => submitAllResponses(false)}
                                        disabled={submitting}
                                        className="px-6 py-2 bg-[#DC3545] hover:bg-[#c82333] text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                    >
                                        {submitting ? <Loader2 size={13} className="animate-spin" /> : "Submit"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setSaveStatus("Saving...");
                                            try {
                                                const formattedAnswers = test.questions.map((q, idx) => {
                                                    return {
                                                        questionId: q.id || `q${idx}`,
                                                        questionText: q.text || `Question ${idx + 1}`,
                                                        questionType: q.type,
                                                        textAnswer: typeof answers[idx] === 'object' ? JSON.stringify(answers[idx]) : (answers[idx] || ''),
                                                        audioData: '',
                                                        videoData: ''
                                                    };
                                                });

                                                await axios.post(`/api/public-tests/${testId}/save-draft`, {
                                                    name: guestName,
                                                    email: guestEmail,
                                                    phone: guestPhone,
                                                    organization: guestOrg,
                                                    answers: formattedAnswers
                                                });
                                                setSaveStatus("Saved to Cloud");
                                                toast.success("Draft saved to cloud successfully!");
                                            } catch (err) {
                                                console.error("Manual cloud save error:", err);
                                                toast.error("Failed to save draft to cloud. Saved locally.");
                                            }
                                        }}
                                        className="px-5 py-2 bg-[#28A745] hover:bg-[#218838] text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
                                    >
                                        Save as Draft
                                    </button>
                                </>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    toast("If you're facing technical difficulties, contact support@lmsassessments.com", {
                                        icon: '⚠️',
                                        duration: 4000
                                    });
                                }}
                                className="px-4 py-2 bg-[#6F42C1] hover:bg-[#5a32a3] text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
                            >
                                Report
                            </button>
                        </div>
                    </div>
                </div>

                {/* 🎮 Tic-Tac-Toe Popup Game Modal */}
                {showGameModal && (
                    <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 border border-slate-100">
                            <h4 className="font-extrabold text-base text-slate-800 flex items-center gap-1.5 justify-center">
                                🎮 Tic-Tac-Toe Game
                            </h4>
                            <p className="text-xs text-slate-400 font-semibold">Play a quick game while waiting for the test window to start!</p>

                            <div className="grid grid-cols-3 gap-2 w-48 h-48 mx-auto">
                                {board.map((cell, cIdx) => (
                                    <button
                                        type="button"
                                        key={cIdx}
                                        onClick={() => clickCell(cIdx)}
                                        className="bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 font-mono font-black text-xl flex items-center justify-center transition-all text-slate-700"
                                    >
                                        {cell}
                                    </button>
                                ))}
                            </div>

                            <div className="font-bold text-xs text-slate-700 mt-2">
                                {winnerObj ? `Winner: ${winnerObj}!` : board.includes('') ? "Your Turn (X)" : "It's a Draw!"}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setBoard(Array(9).fill(''));
                                        setXIsNext(true);
                                    }}
                                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase"
                                >
                                    Restart
                                </button>
                                <button
                                    onClick={() => setShowGameModal(false)}
                                    className="flex-1 py-2 bg-[#6F42C1] hover:bg-[#5a32a3] text-white font-bold rounded-xl text-xs uppercase"
                                >
                                    Close Game
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {lightboxImage && (
                    <div
                        className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 cursor-zoom-out"
                        onClick={() => setLightboxImage(null)}
                    >
                        <div className="relative max-w-4xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2 border border-white/20 animate-scale-up" onClick={(e) => e.stopPropagation()}>
                            <img src={lightboxImage} alt="Enlarged view" className="max-w-full max-h-[80vh] object-contain rounded-lg" />
                            <button
                                type="button"
                                onClick={() => setLightboxImage(null)}
                                className="absolute top-4 right-4 bg-slate-900/60 hover:bg-slate-950/80 text-white p-2 rounded-full transition-all shadow-md z-[110]"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {previewFile && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-indigo-50 text-[#6F42C1] rounded-lg">
                                        <FileText size={16} />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-sm font-black text-slate-800 truncate max-w-[400px]">
                                            {previewFile.name}
                                        </h3>
                                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                            ${(previewFile.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPreviewFile(null)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-50/30 min-h-[300px]">
                                {(() => {
                                    const type = previewFile.type?.toUpperCase() || '';
                                    const url = previewFile.url;

                                    if (type.includes('IMAGE') || ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF'].some(ext => previewFile.name.toUpperCase().endsWith(ext))) {
                                        return (
                                            <img
                                                src={url}
                                                alt={previewFile.name}
                                                className="max-w-full max-h-[55vh] object-contain rounded-xl shadow-md border border-slate-200"
                                            />
                                        );
                                    }

                                    if (type.includes('PDF') || previewFile.name.toUpperCase().endsWith('PDF')) {
                                        return (
                                            <iframe
                                                src={url}
                                                className="w-full h-[55vh] rounded-xl border border-slate-200"
                                                title="PDF Preview"
                                            />
                                        );
                                    }

                                    // Default fallback for other file types
                                    return (
                                        <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                                            <div className="p-4 bg-indigo-50 text-[#6F42C1] rounded-2xl">
                                                <FileText size={40} />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-slate-800">Preview not available</p>
                                                <p className="text-xs text-slate-500 font-semibold">Inline preview is not supported for this file type.</p>
                                            </div>
                                            <a
                                                href={url}
                                                download={previewFile.name}
                                                className="px-4 py-2 bg-[#6F42C1] hover:bg-[#5a32a3] text-white font-bold rounded-xl text-xs shadow-md transition-colors flex items-center gap-1.5"
                                            >
                                                <span>Download File</span>
                                            </a>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setPreviewFile(null)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-colors"
                                >
                                    Close Preview
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (viewState === 'success') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-[32px] p-8 md:p-12 max-w-xl w-full shadow-xl border border-slate-100 text-center space-y-6">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-100">
                        <CheckCircle2 size={44} />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Assessment Completed!</h2>
                        <p className="text-slate-500 text-sm leading-relaxed max-w-md mx-auto">
                            Thank you for submitting your responses. Your test answers have been successfully stored in the LMS database.
                        </p>
                    </div>

                    {scoreInfo && scoreInfo.showScore && (
                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-6 max-w-md mx-auto space-y-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Auto-Graded MCQ Score</span>
                            <span className="text-4xl font-black text-indigo-600 block">{scoreInfo.score} <span className="text-slate-400 text-xl">/ {scoreInfo.total} pts</span></span>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${(scoreInfo.score / scoreInfo.total) * 100}%` }} />
                            </div>
                        </div>
                    )}

                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-left max-w-md mx-auto space-y-1">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block">Notification Logs</span>
                        <p className="text-[11px] text-indigo-750 font-medium leading-relaxed">
                            Simulated emails (submission alert, scoring email, confirmation confirmation) have been successfully generated and logged to the backend console.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        {scoreInfo && scoreInfo.submissionId && (
                            <button
                                onClick={() => navigate(`/public-test/response/${scoreInfo.submissionId}`)}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                            >
                                <Eye size={15} />
                                <span>See Your Response</span>
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/')}
                            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer active:scale-95"
                        >
                            Return to Homepage
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default PublicTestPage;
