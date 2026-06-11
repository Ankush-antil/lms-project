import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
    Info, ClipboardList, Clock, MoreVertical,
    ChevronUp, Mic, Languages, Bot, Volume2, ToggleLeft, ChevronDown, Video, Square, Play,
    FileText, Sliders, Globe, Settings, Send, Paperclip, MessageSquare, Sparkles, Loader2, CheckCircle2,
    Pause, RotateCcw, Trash2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import { useAuth } from '../../context/AuthContext';
import AdvancedVideoRecorder from '../../components/builder/AdvancedVideoRecorder';

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

const ShortAnswerTest = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useAuth();
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState({});
    const [lightboxImage, setLightboxImage] = useState(null);
    const [isListening, setIsListening] = useState(null);
    const [recordingStatus, setRecordingStatus] = useState({});
    const [recordedURLs, setRecordedURLs] = useState({});
    const [submittedAnswers, setSubmittedAnswers] = useState({}); // idx -> { text, audioData, videoData }
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);
    const timerRef = useRef(null);

    // Refs for MediaRecorder instances and streams per question
    const mediaRecorderRef = useRef({});
    const mediaStreamRef = useRef({});
    const chunksRef = useRef({});
    const videoPreviewRef = useRef({});
    const blobsRef = useRef({}); // idx -> Blob (for base64 conversion on submit)

    // New states for Short Answer advanced tools
    const [showAudioRecorder, setShowAudioRecorder] = useState({});
    const [audioTimer, setAudioTimer] = useState({});
    const [audioTimerId, setAudioTimerId] = useState({});
    const [countdownVal, setCountdownVal] = useState({});
    const [countdownConfig, setCountdownConfig] = useState({});
    const [uploadProgress, setUploadProgress] = useState({});
    const [isUploading, setIsUploading] = useState({});
    const [autoSaveStatus, setAutoSaveStatus] = useState("Saved");
    const [questionTimes, setQuestionTimes] = useState({});

    // Collapsed questions tracker (index -> boolean)
    const [collapsedQuestions, setCollapsedQuestions] = useState({});
    // Collapsed extras (tab grid + tab panels) per question
    const [collapsedExtras, setCollapsedExtras] = useState({});

    // Assistive features sub-features active states
    const [activeQuestionTab, setActiveQuestionTab] = useState({}); // qIdx -> 'example' | 'assistive' | null
    const [calculatorVal, setCalculatorVal] = useState('');
    const [chatMessages, setChatMessages] = useState({}); // qIdx -> array of messages
    const [chatInput, setChatInput] = useState({}); // qIdx -> input text
    const [translateLang, setTranslateLang] = useState({}); // qIdx -> lang string
    const [isAccessibilityActive, setIsAccessibilityActive] = useState(false); // High Contrast / Large Text
    const [offlineWriting, setOfflineWriting] = useState(false);

    // Simulated file attachment state
    const [attachedFiles, setAttachedFiles] = useState({}); // idx -> array of files

    // Game states
    const [showGameModal, setShowGameModal] = useState(false);
    const [board, setBoard] = useState(Array(9).fill(''));
    const [xIsNext, setXIsNext] = useState(true);

    // Speech Recognition setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = SpeechRecognition ? new SpeechRecognition() : null;

    if (recognition) {
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
    }

    useEffect(() => {
        const fetchTest = async () => {
            try {
                if (!user) return;
                const res = await axios.get(`/api/tests/${id}`);
                setTest(res.data);
                const initialAnswers = {};
                res.data.questions.forEach((q, idx) => {
                    initialAnswers[idx] = q.type?.toLowerCase() === 'checkboxes' ? [] : "";
                });

                // Load drafts from local storage
                const savedDrafts = localStorage.getItem(`draft_${id}`);
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
                setLoading(false);
            } catch (error) {
                console.error("[TakeTest] Error fetching test:", error);
                setLoading(false);
            }
        };
        if (id && user) fetchTest();
    }, [id, user]);

    // Cleanup audio timers on unmount
    useEffect(() => {
        return () => {
            Object.values(audioTimerId).forEach(clearInterval);
        };
    }, [audioTimerId]);

    // Timer effect
    useEffect(() => {
        if (test && test.publicSettings?.timeLimit > 0) {
            setTimeLeft(test.publicSettings.timeLimit * 60);
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        toast.error("Time is up! Submitting your responses automatically...");
                        submitAll();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [test]);

    // Per-question timer effect
    useEffect(() => {
        if (!test || !test.questions) return;
        const initialTimes = {};
        test.questions.forEach((q, idx) => {
            const qParticulars = q.particulars || {};
            if (qParticulars.timeLimit > 0) {
                initialTimes[idx] = Number(qParticulars.timeLimit);
            }
        });
        setQuestionTimes(initialTimes);
    }, [test]);

    useEffect(() => {
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
    }, [questionTimes]);

    // Save draft to local storage when answers change
    useEffect(() => {
        if (test && Object.keys(answers).length > 0) {
            const filteredAnswers = {};
            Object.keys(answers).forEach(key => {
                const idx = Number(key);
                const q = test.questions[idx];
                const qParticulars = q?.particulars || {};
                if (qParticulars.autoSave !== false) {
                    filteredAnswers[key] = answers[key];
                }
            });
            localStorage.setItem(`draft_${id}`, JSON.stringify(filteredAnswers));
            setAutoSaveStatus("Saved");
        }
    }, [answers, id, test]);

    const handleTextChange = (idx, val) => {
        setAnswers(prev => ({ ...prev, [idx]: val }));
    };

    const toggleVoiceTyping = (idx) => {
        if (!recognition) {
            toast.error("Speech recognition is not supported in this browser.");
            return;
        }

        if (isListening === idx) {
            recognition.stop();
            setIsListening(null);
        } else {
            if (isListening !== null) recognition.stop();

            setIsListening(idx);
            recognition.start();

            recognition.onresult = (event) => {
                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                setAnswers(prev => ({
                    ...prev,
                    [idx]: (prev[idx] || "") + " " + transcript
                }));
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                recognition.stop();
                setIsListening(null);
            };

            recognition.onend = () => {
                setIsListening(null);
            };
        }
    };

    // ─── MediaRecorder Recording ─────────────────────────────────────
    const startRecording = async (idx, type) => {
        try {
            const constraints = type === 'video'
                ? { video: true, audio: true }
                : { audio: true };

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
                setRecordedURLs(prev => ({ ...prev, [idx]: { url, type } }));

                stream.getTracks().forEach(t => t.stop());
                if (type === 'video' && videoPreviewRef.current[idx]) {
                    videoPreviewRef.current[idx].srcObject = null;
                }
            };

            recorder.start();
            setRecordingStatus(prev => ({ ...prev, [idx]: 'recording' }));
        } catch (err) {
            console.error('Media access error:', err);
            toast.error(`Could not access ${type === 'video' ? 'camera/microphone' : 'microphone'}. Please allow permissions and try again.`);
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

                stream.getTracks().forEach(t => t.stop());
            };

            recorder.start();
            setRecordingStatus(prev => ({ ...prev, [idx]: 'recording' }));

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

    const sendChatMessage = (idx) => {
        const input = chatInput[idx] || '';
        if (!input.trim()) return;

        const userMsg = { sender: 'student', text: input };
        setChatMessages(prev => ({
            ...prev,
            [idx]: [...(prev[idx] || []), userMsg]
        }));
        setChatInput(prev => ({ ...prev, [idx]: '' }));

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

    const handleTranslate = (idx, lang, origText) => {
        setTranslateLang(prev => ({ ...prev, [idx]: lang }));
        toast.success(`Translated to ${lang === 'es' ? 'Spanish' : lang === 'fr' ? 'French' : 'Hindi'}`);
    };

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
                const fileList = Array.from(files).map(f => ({ name: f.name, size: f.size }));
                setAttachedFiles(prev => ({ ...prev, [idx]: fileList }));
                toast.success(`Attached ${files.length} file(s) successfully.`);
            }
        }, 200);
    };

    const clickCell = (cIdx) => {
        if (board[cIdx] || checkWinner(board)) return;
        const newBoard = [...board];
        newBoard[cIdx] = 'X';
        setBoard(newBoard);

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

    const submitQuestion = async (idx, question) => {
        try {
            const qParticulars = question.particulars || {};
            if (qParticulars.languageRestriction && !validateLanguage(answers[idx] || '', qParticulars.languageRestriction)) {
                toast.error(`Please write your answer in ${qParticulars.languageRestriction}!`);
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
                    questionText: question.text || question.questionText || `Question ${idx + 1}`,
                    questionType: question.type,
                    textAnswer: answers[idx] || '',
                    audioData,
                    videoData
                }
            }));
            toast.success('Answer saved!');
        } catch (err) {
            console.error('Error submitting question:', err);
            toast.error('Failed to submit question. Please try again.');
        }
    };

    const submitAll = async () => {
        if (!test) return;

        // Check language restriction for all questions
        for (let idx = 0; idx < test.questions.length; idx++) {
            const q = test.questions[idx];
            const qParticulars = q.particulars || {};
            if (qParticulars.languageRestriction && !validateLanguage(answers[idx] || '', qParticulars.languageRestriction)) {
                toast.error(`Please write your answer for Question ${idx + 1} in ${qParticulars.languageRestriction}!`);
                return;
            }
        }

        setSubmitting(true);

        try {
            // Build final answers array
            const finalAnswers = await Promise.all(
                test.questions.map(async (q, idx) => {
                    if (submittedAnswers[idx]) return submittedAnswers[idx];

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
                        questionText: q.text || q.questionText || `Question ${idx + 1}`,
                        questionType: q.type,
                        textAnswer: typeof answers[idx] === 'object' ? JSON.stringify(answers[idx]) : (answers[idx] || ''),
                        audioData,
                        videoData
                    };
                })
            );

            await axios.post('/api/submissions', { testId: id, answers: finalAnswers });
            setSubmitted(true);
            toast.success('Test submitted successfully!');
        } catch (err) {
            console.error('Submit error:', err);
            toast.error(err.response?.data?.message || 'Error submitting test. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <LoadingPlaceholder type="test" />
    );

    if (!test) return <div className="p-10 text-center">Test not found.</div>;

    // Success screen
    if (submitted) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="bg-white rounded-3xl shadow-xl p-12 max-w-md w-full text-center border border-slate-100">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl">✅</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Test Submitted!</h2>
                <p className="text-slate-500 mb-8">Your answers have been submitted successfully. Your teacher will evaluate and share the results soon.</p>
                <button
                    onClick={() => navigate('/student/tests')}
                    className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md"
                >
                    Back to My Tests
                </button>
            </div>
        </div>
    );

    const winnerObj = checkWinner(board);

    return (
        <div className={`min-h-screen bg-[#e9ecef] flex flex-col font-sans transition-all duration-300 ${isAccessibilityActive ? 'text-lg contrast-125' : ''}`}>
            {/* Timer & Meta Header */}
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shadow-md z-10 sticky top-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-black">P</div>
                    <h2 className="text-white font-bold text-base truncate max-w-md">{test.title}</h2>
                </div>

                {timeLeft !== null && (
                    <div className={`px-4 py-2 border rounded-xl flex items-center gap-2 text-sm font-bold transition-colors shadow-inner ${
                        timeLeft < 60
                            ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse'
                            : 'bg-slate-800 border-slate-700 text-slate-200'
                    }`}>
                        <Clock size={16} />
                        <span>{(() => {
                            const h = Math.floor(timeLeft / 3600);
                            const m = Math.floor((timeLeft % 3600) / 60);
                            const s = timeLeft % 60;
                            return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
                        })()}</span>
                    </div>
                )}
            </div>

            {/* Test Canvas */}
            <div className="flex-1 p-6 space-y-8 pb-28 max-w-4xl mx-auto w-full">
                {test.questions.map((q, idx) => {
                    const type = q.type?.toLowerCase();
                    const isShortAnswer = type === 'short answer';
                    const isTextType = type?.includes('answer') || type?.includes('para') || type === 'text';
                    const isMcq = type === 'multiple choice' || type === 'mcq' || type === 'dropdown';
                    const isCheckboxes = type === 'checkboxes' || type === 'checkbox';
                    const isTrueFalse = type?.includes('true') || type?.includes('false') || type === 'true false';
                    const isFillBlanks = type?.includes('blank') || type === 'fill in the blanks';
                    const isMatching = type?.includes('match') || type === 'matching';
                    const isAudio = type === 'audio' || type?.includes('voice') || type?.includes('mic');
                    const isVideo = type === 'video' || type?.includes('cam');
                    const isUpload = type === 'upload' || type === 'file upload';
                    const isAssignment = type === 'assignment' || type?.includes('assign');
                    const isActivity = type === 'activity' || type?.includes('activ');

                    const isCollapsed = collapsedQuestions[idx];

                    // Read question-level config or default to test-level publicSettings
                    const qAssistive = q.assistive || test?.publicSettings?.assistiveFeatures || {
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

                    const isEditable = questionTimes[idx] !== 0 && !(submittedAnswers[idx] && !qParticulars.allowEditing);

                    return (
                        <div key={idx} className="space-y-0.5 rounded-2xl overflow-hidden shadow-md">
                            
                            {/* 🟣 PURPLE QUESTION HEADER */}
                            <div className="bg-[#6F42C1] px-4 py-3 flex flex-wrap items-center justify-between text-white gap-3 select-none">
                                <div className="flex items-center gap-3">
                                    <span className="font-extrabold text-sm">{idx + 1}. {q.type || 'Short Answer Question'}</span>
                                    {autoSaveStatus && qParticulars.autoSave !== false && (
                                        <span className="text-[10px] bg-emerald-600 px-2 py-0.5 rounded-full font-bold text-white flex items-center gap-1">
                                            ✓ {autoSaveStatus}
                                        </span>
                                    )}
                                    {questionTimes[idx] !== undefined && (
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold text-white flex items-center gap-1 ${questionTimes[idx] > 0 ? 'bg-amber-600 animate-pulse' : 'bg-red-600'}`}>
                                            <Clock size={10} />
                                            {questionTimes[idx] > 0 ? `${questionTimes[idx]}s left` : 'Time Up'}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Relevant Information Button */}
                                    {qAssistive.relevantInformation && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                toast(q.helperText || "Provide a clear and concise response.", {
                                                    icon: 'ℹ️',
                                                    style: { background: '#334155', color: '#fff' }
                                                });
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1 bg-[#007bff] hover:bg-[#0069d9] text-white text-[11px] font-bold rounded-full transition-all shadow-sm"
                                        >
                                            <Info size={11} /> Relevant Information
                                        </button>
                                    )}

                                    {/* My Drafts Button */}
                                    {(qParticulars.enableDraftMode || qAssistive.myDrafts) && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                toast(`Draft status: Saved. Last updated at: ${new Date().toLocaleTimeString()}`, { icon: '📝' });
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1 bg-[#28a745] hover:bg-[#218838] text-white text-[11px] font-bold rounded-full transition-all shadow-sm"
                                        >
                                            <FileText size={11} /> My Drafts
                                        </button>
                                    )}

                                    {/* Temporary Fill Button */}
                                    {qAssistive.temporaryFill && (
                                        <button
                                            type="button"
                                            onClick={() => handleTemporaryFill(idx, q.type)}
                                            className="flex items-center gap-1.5 px-3 py-1 bg-[#ffc107] hover:bg-[#e0a800] text-slate-900 text-[11px] font-bold rounded-full transition-all shadow-sm"
                                        >
                                            <Clock size={11} /> Temporary Fill
                                        </button>
                                    )}

                                    {/* More Menu */}
                                    <div className="relative group/menu">
                                        <button type="button" className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-800 hover:bg-slate-100 transition-colors">
                                            <MoreVertical size={16} />
                                        </button>
                                        <div className="absolute right-0 top-9 w-40 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-35 hidden group-hover/menu:block text-slate-700 text-xs">
                                            <button
                                                type="button"
                                                onClick={() => handleTextChange(idx, '')}
                                                className="w-full text-left px-4 py-2 hover:bg-slate-55 font-semibold"
                                            >
                                                Clear Answer
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleTemporaryFill(idx, q.type)}
                                                className="w-full text-left px-4 py-2 hover:bg-slate-55 font-semibold"
                                            >
                                                Fill Placeholders
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => toast.success("Issue reported to host.")}
                                                className="w-full text-left px-4 py-2 hover:bg-slate-55 font-semibold text-red-600"
                                            >
                                                Report Issue
                                            </button>
                                        </div>
                                    </div>

                                    {/* Student Avatar */}
                                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-sm cursor-pointer">
                                        {test.studentName?.[0] || 'S'}
                                    </div>
                                </div>
                            </div>

                            {/* ⚪ QUESTION CARD BODY */}
                            <div className="bg-white p-6 border-x border-b border-slate-200 space-y-6">
                                
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
                                        {/* Answer Inputs based on Question Type */}
                                        <div className="answer-input-zone">
                                            
                                            {/* MCQ Options */}
                                            {isMcq && q.options && (
                                                <div className="space-y-2.5">
                                                    {q.options.map((opt, optIdx) => (
                                                        <label
                                                            key={optIdx}
                                                            className={`flex items-center gap-3 p-3.5 border rounded-2xl transition-all ${
                                                                answers[idx] === opt.text
                                                                    ? 'border-[#6F42C1] bg-[#6F42C1]/5'
                                                                    : 'border-slate-200 bg-white'
                                                            } ${!isEditable ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'hover:bg-slate-55 cursor-pointer'}`}
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

                                            {/* Checkboxes Options */}
                                            {isCheckboxes && q.options && (
                                                <div className="space-y-2.5">
                                                    {q.options.map((opt, optIdx) => {
                                                        const isChecked = Array.isArray(answers[idx]) && answers[idx].includes(opt.text);
                                                        return (
                                                            <label
                                                                key={optIdx}
                                                                className={`flex items-center gap-3 p-3.5 border rounded-2xl transition-all ${
                                                                    isChecked
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
                                                            className={`flex-1 flex items-center gap-3 p-3.5 border rounded-2xl transition-all justify-center ${
                                                                answers[idx] === val
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
                                                <div className="space-y-3">
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
                                                <div className="space-y-3">
                                                    <span className="text-xs text-slate-400 font-bold block">Match the pairs correctly:</span>
                                                    {(q.matchingPairs || [{key: 'Computer', value: 'Machine'}, {key: 'Software', value: 'Instructions'}]).map((pair, pIdx) => {
                                                        const val = answers[idx]?.[pair.key] || "";
                                                        return (
                                                            <div key={pIdx} className="flex items-center justify-between gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
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
                                                                    {(q.matchingPairs || [{key: 'Computer', value: 'Machine'}, {key: 'Software', value: 'Instructions'}]).map((item, iIdx) => (
                                                                        <option key={iIdx} value={item.value}>{item.value}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Text/Short Answer input */}
                                            {isShortAnswer ? (
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
                                                                         className={`w-full p-4 border border-slate-200 rounded-2xl bg-slate-50/50 focus:ring-4 focus:ring-purple-100 focus:border-[#6F42C1] transition-all font-medium text-slate-700 ${!isEditable ? 'opacity-60 cursor-not-allowed bg-slate-50/50' : ''}`}
                                                                         placeholder={qParticulars.placeholderText || "Your answer"}
                                                                     />
                                                                 ) : (
                                                                     <textarea
                                                                         disabled={!isEditable}
                                                                         value={answers[idx] || ""}
                                                                         onChange={(e) => handleTextChange(idx, e.target.value)}
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
                                                                         className={`w-full p-4 border border-slate-200 rounded-2xl bg-slate-50/50 focus:ring-4 focus:ring-purple-100 focus:border-[#6F42C1] transition-all font-medium text-slate-700 h-20 ${!isEditable ? 'opacity-60 cursor-not-allowed bg-slate-50/50' : ''}`}
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
                                                                        } catch(e) {}
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
                                                                    <Mic size={14} className="text-[#6F42C1]" /> Audio Answer Recorder
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
                                                                                    className="px-4 py-2.5 bg-red-650 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-colors"
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
                                                                                    className="px-4 py-2.5 bg-red-650 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-colors"
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
                                                /* Textarea answer input for other standard types */
                                                (isTextType || isUpload || isAssignment || isActivity || (!isMcq && !isCheckboxes && !isTrueFalse && !isFillBlanks && !isMatching && !isAudio && !isVideo)) && (
                                                    <div className="relative group">
                                                        <textarea
                                                            disabled={!isEditable}
                                                            value={answers[idx] || ""}
                                                            onChange={(e) => handleTextChange(idx, e.target.value)}
                                                            className={`w-full p-4 border border-slate-200 rounded-2xl bg-slate-50/50 focus:ring-4 focus:ring-purple-100 focus:border-[#6F42C1] transition-all font-medium text-slate-700 h-20 ${!isEditable ? 'opacity-60 cursor-not-allowed bg-slate-50/50' : ''}`}
                                                            placeholder="Your answer"
                                                        />
                                                    </div>
                                                )
                                            )}

                                            {/* Audio answer zone */}
                                            {isAudio && (
                                                <div className="border-2 border-dashed border-purple-100 rounded-2xl bg-purple-50/20 p-6 flex flex-col items-center gap-3">
                                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${recordingStatus[idx] === 'recording' ? 'bg-red-100 text-red-600 animate-pulse ring-4 ring-red-150' : 'bg-purple-100 text-[#6F42C1]'}`}>
                                                        <Mic size={24} />
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-700">{recordingStatus[idx] === 'recording' ? '🔴 Recording...' : recordedURLs[idx] ? '✅ Response Saved' : 'Voice Answer'}</p>
                                                    
                                                    {recordingStatus[idx] === 'recording' ? (
                                                        <button onClick={() => stopRecording(idx)} className="px-6 py-2 bg-red-650 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md">
                                                            <Square size={14} fill="currentColor" /> Stop Recording
                                                        </button>
                                                    ) : (
                                                        <button
                                                            disabled={!!submittedAnswers[idx]}
                                                            onClick={() => startRecording(idx, 'audio')}
                                                            className={`px-6 py-2 bg-[#6F42C1] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-[#5a32a3] ${submittedAnswers[idx] ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <Mic size={14} /> Start Voice Capture
                                                        </button>
                                                    )}

                                                    {recordedURLs[idx]?.type === 'audio' && (
                                                        <div className="w-full mt-2 bg-white rounded-xl p-3 border border-purple-100 shadow-sm flex flex-col gap-2">
                                                            <audio controls src={recordedURLs[idx].url} className="w-full h-8" />
                                                            {!submittedAnswers[idx] && (
                                                                <button onClick={() => deleteRecording(idx)} className="text-[10px] text-red-400 hover:text-red-600 font-semibold self-start">✕ Delete & Re-record</button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Video recording block */}
                                            {isVideo && (
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

                                        {/* 🔲 DOUBLE PANE + ACTION ROW — collapsible extras */}
                                        {!collapsedExtras[idx] ? (
                                        <div className="space-y-2">

                                        {/* 🔲 DOUBLE PANE EXAMPLES & ASSISTIVE GRID */}
                                        <div className="border border-slate-900 rounded-xl overflow-hidden grid grid-cols-2 text-center text-xs text-slate-500 font-bold select-none">
                                            <button
                                                type="button"
                                                onClick={() => setActiveQuestionTab(prev => ({ ...prev, [idx]: prev[idx] === 'example' ? null : 'example' }))}
                                                className={`py-3.5 transition-colors ${activeQuestionTab[idx] === 'example' ? 'bg-slate-100 text-slate-800' : 'bg-white hover:bg-slate-50'} border-r border-slate-900`}
                                            >
                                                Example Section
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActiveQuestionTab(prev => ({ ...prev, [idx]: prev[idx] === 'assistive' ? null : 'assistive' }))}
                                                className={`py-3.5 transition-colors ${activeQuestionTab[idx] === 'assistive' ? 'bg-slate-100 text-slate-800' : 'bg-white hover:bg-slate-50'}`}
                                            >
                                                Assistive feather Section
                                            </button>
                                        </div>

                                        {/* 🔵 ACTION BUTTONS ROW (Upload, Audio Answer, Chat, Submit & Finish, Reattempt) */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 border border-slate-200 rounded-xl bg-white px-3 py-2.5 shadow-sm">
                                            <div className="flex flex-wrap items-center gap-2">

                                                {/* Upload Button */}
                                                {(() => {
                                                    const uploadEnabled = q.moreSettings?.allowUpload !== false && q.moreSettings?.allowUpload === true;
                                                    return (
                                                        <label
                                                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all select-none ${
                                                                !isEditable
                                                                    ? 'bg-[#0d6efd]/40 text-white/70 cursor-not-allowed'
                                                                    : (uploadEnabled
                                                                        ? 'bg-[#0d6efd] hover:bg-[#0b5ed7] text-white shadow-sm cursor-pointer'
                                                                        : 'bg-[#0d6efd]/60 text-white cursor-pointer')
                                                            }`}
                                                            onClick={(e) => {
                                                                if (!isEditable) {
                                                                    e.preventDefault();
                                                                    if (questionTimes[idx] === 0) {
                                                                        toast.error("⛔ Time is up for this question", { duration: 3000 });
                                                                    } else {
                                                                        toast.error("⛔ Cannot edit response after submit", { duration: 3000 });
                                                                    }
                                                                } else if (!uploadEnabled) {
                                                                    e.preventDefault();
                                                                    toast.error("⛔ This feature is disabled by teacher", { duration: 3000 });
                                                                }
                                                            }}
                                                        >
                                                            {uploadEnabled && isEditable && (
                                                                <input
                                                                    type="file"
                                                                    multiple
                                                                    className="hidden"
                                                                    onChange={(e) => handleFileUploadSimulated(idx, e.target.files)}
                                                                />
                                                            )}
                                                            <Paperclip size={12} /> Upload
                                                        </label>
                                                    );
                                                })()}

                                                {/* Audio Answer Button */}
                                                {(() => {
                                                    const audioEnabled = q.moreSettings?.allowAudioAnswer === true;
                                                    return (
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
                                                                if (!audioEnabled) {
                                                                    toast.error("⛔ This feature is disabled by teacher", { duration: 3000 });
                                                                    return;
                                                                }
                                                                setShowAudioRecorder(prev => ({ ...prev, [idx]: !prev[idx] }));
                                                            }}
                                                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all select-none ${
                                                                !isEditable
                                                                    ? 'bg-slate-800/40 text-white/70 cursor-not-allowed'
                                                                    : (audioEnabled
                                                                        ? (showAudioRecorder[idx]
                                                                            ? 'bg-[#6F42C1] text-white shadow-sm'
                                                                            : 'bg-slate-800 hover:bg-slate-700 text-white shadow-sm')
                                                                        : 'bg-slate-800/60 text-white cursor-pointer')
                                                            }`}
                                                        >
                                                            <Mic size={12} /> Audio Answer
                                                        </button>
                                                    );
                                                })()}

                                                {/* Chat with Teacher Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveQuestionTab(prev => ({ ...prev, [idx]: prev[idx] === 'chat' ? null : 'chat' }))}
                                                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all shadow-sm select-none ${activeQuestionTab[idx] === 'chat'
                                                        ? 'bg-[#6F42C1] text-white'
                                                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                                                    }`}
                                                >
                                                    <MessageSquare size={12} /> Chat with teacher
                                                </button>

                                                {/* Submit & Finish Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => submitQuestion(idx, q)}
                                                    disabled={!isEditable}
                                                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#DC3545] hover:bg-[#c82333] text-white rounded-lg text-xs font-black transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed select-none"
                                                >
                                                    <Send size={12} /> Submit &amp; Finish
                                                </button>
                                            </div>

                                            {/* Right: Reattempt + Collapse (collapses extras) */}
                                            <div className="flex items-center gap-2 ml-auto">
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
                                                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#28A745] hover:bg-[#218838] text-white rounded-lg text-xs font-black transition-all shadow-sm select-none"
                                                    >
                                                        <RotateCcw size={12} /> Reattempt
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setCollapsedExtras(prev => ({ ...prev, [idx]: true }))}
                                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                                                    title="Collapse extra sections"
                                                >
                                                    <ChevronUp size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        </div>
                                        ) : (
                                        /* When extras collapsed — show a small expand strip */
                                        <div className="flex items-center justify-between gap-2 border border-slate-200 rounded-xl bg-white px-3 py-2 shadow-sm">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sections hidden</span>
                                            <div className="flex items-center gap-2 ml-auto">
                                                {submittedAnswers[idx] && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSubmittedAnswers(prev => { const n = { ...prev }; delete n[idx]; return n; });
                                                            toast.success("Reattempting question...");
                                                        }}
                                                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#28A745] hover:bg-[#218838] text-white rounded-lg text-xs font-black transition-all shadow-sm select-none"
                                                    >
                                                        <RotateCcw size={12} /> Reattempt
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setCollapsedExtras(prev => ({ ...prev, [idx]: false }))}
                                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                                                    title="Expand sections"
                                                >
                                                    <ChevronUp size={14} className="rotate-180" />
                                                </button>
                                            </div>
                                        </div>
                                        )}



                                        {/* Expandable Tabs details — hidden when extras collapsed */}
                                        {!collapsedExtras[idx] && activeQuestionTab[idx] === 'example' && (
                                            <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl text-xs space-y-2 animate-fade-in text-slate-700">
                                                 <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-widest text-[#6F42C1]">Example Response Guide</span>
                                                 <p className="leading-relaxed font-semibold italic">
                                                     {q.helperText || "A complete computer explanation details that hardware runs program operations and OS acts as system interfaces for standard processes."}
                                                 </p>
                                             </div>
                                        )}

                                        {!collapsedExtras[idx] && activeQuestionTab[idx] === 'assistive' && (
                                            <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl text-xs space-y-4 animate-fade-in text-slate-700">
                                                <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-widest text-[#6F42C1]">Student Assistive Utilities</span>
                                                
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                    {/* Text to speech */}
                                                    {qAssistive.textToSpeech && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTTS(q.text)}
                                                            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:border-[#6F42C1] transition-all flex items-center gap-1.5 font-bold"
                                                        >
                                                            <Volume2 size={13} className="text-[#6F42C1]" />
                                                            <span>Read Aloud</span>
                                                        </button>
                                                    )}

                                                    {/* Speech to text */}
                                                    {qAssistive.speechToText && (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleVoiceTyping(idx)}
                                                            className={`p-2.5 bg-white border rounded-xl hover:border-[#6F42C1] transition-all flex items-center gap-1.5 font-bold ${isListening === idx ? 'border-red-500 bg-red-50/20 text-red-650' : 'border-slate-200'}`}
                                                        >
                                                            <Mic size={13} className={isListening === idx ? 'text-red-500 animate-pulse' : 'text-[#6F42C1]'} />
                                                            <span>{isListening === idx ? 'Listening...' : 'Dictate'}</span>
                                                        </button>
                                                    )}

                                                    {/* Calculator */}
                                                    {qAssistive.calculator && (
                                                        <div className="relative group/calc">
                                                            <button
                                                                type="button"
                                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl hover:border-[#6F42C1] transition-all flex items-center gap-1.5 font-bold"
                                                            >
                                                                <Sliders size={13} className="text-[#6F42C1]" />
                                                                <span>Calculator</span>
                                                            </button>
                                                            <div className="absolute left-0 bottom-11 bg-white border border-slate-200 rounded-xl p-3 shadow-xl z-20 hidden group-hover/calc:block w-48 text-center space-y-2">
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
                                                                            className="p-1 bg-slate-50 border hover:bg-slate-100 rounded text-xs font-bold"
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

                                                    {/* Translation */}
                                                    {qAssistive.translation && (
                                                        <div className="relative group/trans">
                                                            <button
                                                                type="button"
                                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl hover:border-[#6F42C1] transition-all flex items-center gap-1.5 font-bold"
                                                            >
                                                                <Globe size={13} className="text-[#6F42C1]" />
                                                                <span>Translate</span>
                                                            </button>
                                                            <div className="absolute left-0 bottom-11 bg-white border border-slate-200 rounded-xl shadow-xl z-20 hidden group-hover/trans:block w-36 text-left py-1 text-xs">
                                                                <button onClick={() => handleTranslate(idx, 'es', q.text)} className="w-full px-4 py-2 hover:bg-slate-50 text-left font-semibold">Spanish</button>
                                                                <button onClick={() => handleTranslate(idx, 'fr', q.text)} className="w-full px-4 py-2 hover:bg-slate-50 text-left font-semibold">French</button>
                                                                <button onClick={() => handleTranslate(idx, 'hi', q.text)} className="w-full px-4 py-2 hover:bg-slate-50 text-left font-semibold">Hindi</button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Accessibility Mode */}
                                                    {qAssistive.accessibilityMode && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsAccessibilityActive(!isAccessibilityActive)}
                                                            className={`p-2.5 bg-white border rounded-xl hover:border-[#6F42C1] transition-all flex items-center gap-1.5 font-bold ${isAccessibilityActive ? 'border-amber-500 bg-amber-50/10' : 'border-slate-200'}`}
                                                        >
                                                            <Settings size={13} className="text-[#6F42C1]" />
                                                            <span>Accessibility</span>
                                                        </button>
                                                    )}

                                                    {/* Chat with Teacher */}
                                                    {qAssistive.chatWithTeacher && (
                                                        <div className="relative group/chat">
                                                            <button
                                                                type="button"
                                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl hover:border-[#6F42C1] transition-all flex items-center gap-1.5 font-bold"
                                                            >
                                                                <MessageSquare size={13} className="text-[#6F42C1]" />
                                                                <span>Chat Support</span>
                                                            </button>
                                                            <div className="absolute right-0 bottom-11 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-40 hidden group-hover/chat:block w-72 text-left space-y-3">
                                                                <span className="font-bold text-slate-800 text-[10px] uppercase tracking-widest block border-b pb-1.5">Chat with Teacher</span>
                                                                <div className="h-40 overflow-y-auto space-y-2.5 pr-1 text-xs">
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
                                                                        className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#6F42C1]"
                                                                    />
                                                                    <button onClick={() => sendChatMessage(idx)} className="p-1 bg-[#6F42C1] text-white rounded-lg hover:bg-[#5a32a3]">
                                                                        <Send size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Upload Attachment */}
                                                    {qAssistive.uploadAttachment && (
                                                        <div className="relative">
                                                            <input
                                                                type="file"
                                                                id={`file-upload-${idx}`}
                                                                disabled={!!submittedAnswers[idx] || isUploading[idx]}
                                                                multiple
                                                                onChange={(e) => handleFileUploadSimulated(idx, e.target.files)}
                                                                className="hidden"
                                                            />
                                                            <label
                                                                htmlFor={`file-upload-${idx}`}
                                                                className={`w-full p-2.5 bg-white border border-slate-200 rounded-xl hover:border-[#6F42C1] transition-all flex items-center justify-center gap-1.5 font-bold cursor-pointer ${(submittedAnswers[idx] || isUploading[idx]) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            >
                                                                {isUploading[idx] ? (
                                                                    <>
                                                                        <Loader2 size={13} className="text-[#6F42C1] animate-spin" />
                                                                        <span>Uploading ({uploadProgress[idx]}%)</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Paperclip size={13} className="text-[#6F42C1]" />
                                                                        <span>Add Files</span>
                                                                    </>
                                                                )}
                                                            </label>
                                                        </div>
                                                    )}

                                                    {/* Audio Answer toggle */}
                                                    {qAssistive.audioAnswer && (
                                                        <button
                                                            type="button"
                                                            disabled={!!submittedAnswers[idx]}
                                                            onClick={() => setShowAudioRecorder(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                                            className={`p-2.5 bg-white border rounded-xl hover:border-[#6F42C1] transition-all flex items-center gap-1.5 font-bold ${showAudioRecorder[idx] ? 'border-[#6F42C1] bg-[#6F42C1]/5 text-[#6F42C1]' : 'border-slate-200'}`}
                                                        >
                                                            <Mic size={13} className="text-[#6F42C1]" />
                                                            <span>Audio Answer</span>
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Translate Mode translated text preview */}
                                                {translateLang[idx] && (
                                                    <div className="border border-[#6F42C1]/20 bg-[#6F42C1]/5 p-3.5 rounded-xl space-y-1">
                                                        <span className="font-bold text-[9px] uppercase tracking-wider text-[#6F42C1]">Translated Question text ({translateLang[idx].toUpperCase()})</span>
                                                        <p className="font-bold text-slate-800 leading-snug">
                                                            {translateLang[idx] === 'es' ? '¿Qué es una computadora?' : translateLang[idx] === 'fr' ? "Qu'est-ce qu'un ordinateur?" : 'कंप्यूटर क्या है?'}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Upload list preview */}
                                                {attachedFiles[idx] && attachedFiles[idx].length > 0 && (
                                                    <div className="space-y-1.5 mt-2 bg-white p-3 border border-slate-200 rounded-xl">
                                                        <span className="font-bold text-[10px] text-slate-400 uppercase tracking-widest block">Attached Documents</span>
                                                        {attachedFiles[idx].map((file, fIdx) => (
                                                            <div key={fIdx} className="flex items-center justify-between text-xs py-1 border-b last:border-b-0 font-semibold text-slate-700">
                                                                <span className="truncate max-w-[80%]">{file.name} ({(file.size/1024).toFixed(1)} KB)</span>
                                                                {!submittedAnswers[idx] && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setAttachedFiles(prev => {
                                                                                const n = { ...prev };
                                                                                n[idx] = n[idx].filter((_, i) => i !== fIdx);
                                                                                return n;
                                                                            });
                                                                        }}
                                                                        className="text-red-500 hover:text-red-700 font-bold"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom sticky control bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#e9ecef] border-t border-slate-350 p-4 shadow-2xl z-50 transition-all select-none">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    
                    {/* Play Game & Offline Toggle */}
                    <div className="border-2 border-black p-1.5 flex items-center gap-4 bg-white rounded-xl select-none flex-wrap w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => {
                                setBoard(Array(9).fill(''));
                                setXIsNext(true);
                                setShowGameModal(true);
                            }}
                            className="px-4 py-2 bg-black hover:bg-slate-900 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg transition-colors"
                        >
                            Play game till start
                        </button>

                        <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
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
                                <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>
                    </div>

                    {/* Action Buttons (Right) */}
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={submitAll}
                            disabled={submitting}
                            className="flex-1 sm:flex-none px-8 py-3 bg-[#DC3545] hover:bg-[#c82333] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                            {submitting ? <Loader2 size={14} className="animate-spin" /> : "Submit"}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                toast.success("Draft saved successfully!");
                            }}
                            className="flex-1 sm:flex-none px-6 py-3 bg-[#28A745] hover:bg-[#218838] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
                        >
                            Save as Draft
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                toast("If you're facing technical difficulties, contact support@lmsassessments.com", {
                                    icon: '⚠️',
                                    duration: 4000
                                });
                            }}
                            className="px-5 py-3 bg-[#6F42C1] hover:bg-[#5a32a3] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
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
        </div>
    );
};

export default ShortAnswerTest;
