import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    GraduationCap, Mail, Lock, Eye, EyeOff, ShieldCheck,
    AlertTriangle, Loader2, FileText, ArrowRight, CheckCircle,
    Clock, Info, BookOpen, User, Phone, Building, CheckCircle2,
    RotateCcw, Sparkles, CheckSquare, List, AlertCircle, Play, Mic, Video, Square
} from 'lucide-react';
import AdvancedVideoRecorder from '../../components/builder/AdvancedVideoRecorder';

const PublicTestPage = () => {
    const { id: testId } = useParams();
    const navigate = useNavigate();

    // Loading & state
    const [loading, setLoading] = useState(true);
    const [test, setTest] = useState(null);
    const [viewState, setViewState] = useState('register'); // 'password' | 'register' | 'test' | 'success' | 'error'
    const [errorMsg, setErrorMsg] = useState('');

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

    // Speech Recognition setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = SpeechRecognition ? new SpeechRecognition() : null;

    if (recognition) {
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
    }

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
                    initialAnswers[idx] = q.type?.toLowerCase() === 'checkboxes' ? [] : '';
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

    // Timer effect
    useEffect(() => {
        if (viewState === 'test' && test?.publicSettings?.timeLimit > 0) {
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

        // Check for duplicate response
        setDuplicateChecking(true);
        try {
            const res = await axios.post(`/api/public-tests/${testId}/check-email`, { email: guestEmail });
            if (res.data.exists) {
                toast.error("You have already submitted this test.");
                setErrorMsg("You have already submitted this test. Duplicate responses are disabled by the instructor.");
                setViewState('error');
            } else {
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
        setAnswers(prev => ({ ...prev, [idx]: val }));
    };

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
            recognition.onerror = () => {
                recognition.stop();
                setIsListening(null);
            };
            recognition.onend = () => setIsListening(null);
        }
    };

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
                setRecordedURLs(prev => ({ ...prev, [idx]: { url, type } }));

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

    const blobToBase64 = (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    const submitQuestion = async (idx, question) => {
        try {
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
                    answers: finalAnswers
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
            <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row justify-center items-stretch font-sans text-slate-800">
                {/* Brand Side Panel */}
                <div className="md:w-[32%] bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-[size:16px_16px]" />
                    
                    <div className="flex items-center gap-2 relative z-10">
                        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-sm tracking-tight text-white border border-white/10">LMS</span>
                        <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-200">Public Portal</span>
                    </div>

                    <div className="space-y-6 relative z-10 py-12 md:py-0">
                        <span className="text-[10px] font-black uppercase bg-white/20 text-indigo-100 px-3 py-1 rounded-full tracking-widest">Web Assessment</span>
                        <h1 className="text-3xl font-black tracking-tight leading-tight">{test?.title || 'Assessments'}</h1>
                        <p className="text-indigo-200 text-xs leading-relaxed max-w-sm">
                            {test?.description || 'Complete the short assessment shared with you. Your score details will be logged in the system.'}
                        </p>

                        <div className="pt-6 border-t border-white/20 flex flex-wrap gap-4 text-xs">
                            <div className="flex items-center gap-1.5 text-indigo-150">
                                <Clock size={14} />
                                <span>{test?.publicSettings?.timeLimit || 60} mins limit</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-indigo-150">
                                <BookOpen size={14} />
                                <span>{test?.questions?.length || 0} questions</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-xs text-indigo-300 relative z-10 hidden md:block">
                        © 2026 Assessment Engine. All rights reserved.
                    </div>
                </div>

                {/* Form Side Panel */}
                <div className="flex-1 bg-white p-8 md:p-16 flex flex-col justify-center max-w-2xl">
                    <div className="mb-8">
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Access Information</h2>
                        <p className="text-slate-400 text-xs mt-1">Please enter your credentials to attempt this assessment.</p>
                    </div>

                    <form onSubmit={handleRegisterStart} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Full Name <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    value={guestName}
                                    onChange={e => setGuestName(e.target.value)}
                                    placeholder="Enter your full name..."
                                    required
                                    className="w-full border border-slate-200 rounded-2xl pl-11 pr-4 py-3 bg-slate-50 outline-none text-slate-850 text-sm focus:bg-white focus:border-indigo-500 transition-all font-semibold"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Email Address <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="email"
                                    value={guestEmail}
                                    onChange={e => setGuestEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    required
                                    className="w-full border border-slate-200 rounded-2xl pl-11 pr-4 py-3 bg-slate-50 outline-none text-slate-850 text-sm focus:bg-white focus:border-indigo-500 transition-all font-semibold"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Mobile Number <span className="text-slate-400">(Optional)</span></label>
                                <div className="relative">
                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="tel"
                                        value={guestPhone}
                                        onChange={e => setGuestPhone(e.target.value)}
                                        placeholder="Phone number..."
                                        className="w-full border border-slate-200 rounded-2xl pl-11 pr-4 py-3 bg-slate-50 outline-none text-slate-850 text-sm focus:bg-white focus:border-indigo-500 transition-all font-semibold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Institute/Organization <span className="text-slate-400">(Optional)</span></label>
                                <div className="relative">
                                    <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        value={guestOrg}
                                        onChange={e => setGuestOrg(e.target.value)}
                                        placeholder="Institute name..."
                                        className="w-full border border-slate-200 rounded-2xl pl-11 pr-4 py-3 bg-slate-50 outline-none text-slate-850 text-sm focus:bg-white focus:border-indigo-500 transition-all font-semibold"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* reCAPTCHA Anti-Spam simulation */}
                        {test?.publicSettings?.antiSpam && (
                            <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl flex items-center justify-between mt-6">
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleMockRecaptcha}
                                        disabled={recaptchaVerifying || recaptchaDone}
                                        className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${
                                            recaptchaDone
                                                ? 'bg-emerald-500 border-emerald-600 text-white'
                                                : 'bg-white border-slate-300 hover:border-slate-400'
                                        }`}
                                    >
                                        {recaptchaVerifying && <Loader2 size={12} className="animate-spin text-slate-550" />}
                                        {recaptchaDone && <CheckCircle size={14} className="text-white" />}
                                    </button>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-extrabold text-slate-700 leading-none">I'm not a robot</span>
                                        <span className="text-[9px] text-slate-400 font-semibold mt-1">reCAPTCHA Anti-Spam Protection</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center">
                                    <ShieldCheck size={28} className="text-indigo-600/30" />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={duplicateChecking}
                            className="w-full py-4 mt-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                        >
                            {duplicateChecking ? <Loader2 size={18} className="animate-spin" /> : "Start Assessment"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (viewState === 'test') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
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
                            <span>{formatTime(timeLeft)}</span>
                        </div>
                    )}
                </div>

                {/* Test Canvas */}
                <div className="flex-1 p-6 space-y-6 pb-24 max-w-4xl mx-auto w-full">
                    <div className="space-y-6">
                        {test.questions.map((q, idx) => {
                            const type = q.type?.toLowerCase();
                            const isTextType = type?.includes('answer') || type?.includes('para') || type === 'text';
                            const isMcq = type === 'multiple choice' || type === 'dropdown';
                            const isCheckboxes = type === 'checkboxes';
                            const isAudio = type?.includes('voice') || type?.includes('audio') || type?.includes('mic');
                            const isVideo = type?.includes('video') || type?.includes('cam');

                            return (
                                <div
                                    key={idx}
                                    className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col md:flex-row shadow-sm ${
                                        submittedAnswers[idx] ? 'border-emerald-300 shadow-emerald-100/50' : 'border-slate-200'
                                    }`}
                                >
                                    <div className={`w-full md:w-2 ${submittedAnswers[idx] ? 'bg-emerald-500' : 'bg-indigo-600'}`} />
                                    
                                    <div className="flex-1 p-6">
                                        <div className="flex justify-between items-start mb-6">
                                            <h3 className="text-lg font-bold text-slate-800 leading-snug">Q{idx + 1}. {q.text}</h3>
                                            <div className="flex items-center gap-2">
                                                {submittedAnswers[idx] && (
                                                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase tracking-wider">Saved</span>
                                                )}
                                                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-400 rounded text-[9px] font-black uppercase tracking-wider">{q.type}</span>
                                            </div>
                                        </div>

                                        {/* Render Question Inputs */}
                                        <div className="mb-6">
                                            
                                            {/* MCQ Options */}
                                            {isMcq && q.options && (
                                                <div className="space-y-2">
                                                    {q.options.map((opt, optIdx) => (
                                                        <label
                                                            key={optIdx}
                                                            className={`flex items-center gap-3 p-3.5 border rounded-xl hover:bg-slate-50 transition-all cursor-pointer ${
                                                                answers[idx] === opt.text
                                                                    ? 'border-indigo-600 bg-indigo-50/20'
                                                                    : 'border-slate-200 bg-white'
                                                            }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={`q-${idx}`}
                                                                disabled={!!submittedAnswers[idx]}
                                                                checked={answers[idx] === opt.text}
                                                                onChange={() => handleTextChange(idx, opt.text)}
                                                                className="rounded-full text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-slate-300"
                                                            />
                                                            <span className="text-sm font-semibold text-slate-700">{opt.text}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Checkboxes Options */}
                                            {isCheckboxes && q.options && (
                                                <div className="space-y-2">
                                                    {q.options.map((opt, optIdx) => {
                                                        const isChecked = Array.isArray(answers[idx]) && answers[idx].includes(opt.text);
                                                        return (
                                                            <label
                                                                key={optIdx}
                                                                className={`flex items-center gap-3 p-3.5 border rounded-xl hover:bg-slate-50 transition-all cursor-pointer ${
                                                                    isChecked
                                                                        ? 'border-indigo-600 bg-indigo-50/20'
                                                                        : 'border-slate-200 bg-white'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    disabled={!!submittedAnswers[idx]}
                                                                    checked={isChecked}
                                                                    onChange={(e) => handleCheckboxChange(idx, opt.text, e.target.checked)}
                                                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-slate-300"
                                                                />
                                                                <span className="text-sm font-semibold text-slate-700">{opt.text}</span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Text Widget */}
                                            {(isTextType || (!isAudio && !isVideo && !isMcq && !isCheckboxes)) && (
                                                <div className="relative group">
                                                    <textarea
                                                        disabled={!!submittedAnswers[idx]}
                                                        value={answers[idx] || ""}
                                                        onChange={(e) => handleTextChange(idx, e.target.value)}
                                                        className={`w-full p-4 border border-slate-250 rounded-xl bg-slate-50/50 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700 ${submittedAnswers[idx] ? 'opacity-60 cursor-not-allowed' : ''} ${type?.includes('long') || type?.includes('para') ? 'h-52' : 'h-24'}`}
                                                        placeholder="Type your answer response here..."
                                                    />
                                                    <button
                                                        type="button"
                                                        disabled={!!submittedAnswers[idx]}
                                                        onClick={() => toggleVoiceTyping(idx)}
                                                        className={`absolute bottom-4 right-4 p-2.5 rounded-full shadow-md transition-all ${isListening === idx ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-700'} ${submittedAnswers[idx] ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <Mic size={18} />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Audio recording block */}
                                            {isAudio && (
                                                <div className="border-2 border-dashed border-indigo-100 rounded-xl bg-indigo-50/20 p-6 flex flex-col items-center gap-3">
                                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${recordingStatus[idx] === 'recording' ? 'bg-red-100 text-red-600 animate-pulse ring-4 ring-red-150' : 'bg-indigo-100 text-indigo-600'} ${submittedAnswers[idx] ? 'opacity-50' : ''}`}>
                                                        <Mic size={24} />
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-700">{recordingStatus[idx] === 'recording' ? '🔴 Recording...' : recordedURLs[idx] ? '✅ Response Saved' : 'Voice Answer'}</p>
                                                    
                                                    {recordingStatus[idx] === 'recording' ? (
                                                        <button onClick={() => stopRecording(idx)} className="px-6 py-2 bg-red-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-red-700 transition-all">
                                                            <Square size={14} fill="currentColor" /> Stop Recording
                                                        </button>
                                                    ) : (
                                                        <button
                                                            disabled={!!submittedAnswers[idx]}
                                                            onClick={() => startRecording(idx, 'audio')}
                                                            className={`px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-indigo-700 transition-all ${submittedAnswers[idx] ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <Mic size={14} /> Start Voice Capture
                                                        </button>
                                                    )}

                                                    {recordedURLs[idx]?.type === 'audio' && (
                                                        <div className="w-full mt-2 bg-white rounded-xl p-3 border border-indigo-100 shadow-sm flex flex-col gap-2">
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
                                                                questionText: q.text || `Question ${idx + 1}`,
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

                                        {/* Submit question action bar */}
                                        {!isVideo && (
                                            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{idx + 1} of {test.questions.length}</span>
                                                <div className="flex gap-2">
                                                    {submittedAnswers[idx] ? (
                                                        <div className="flex gap-2">
                                                            <span className="px-4 py-1.5 bg-emerald-50 border border-emerald-250 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1">
                                                                ✓ Saved
                                                            </span>
                                                            <button
                                                                onClick={() => {
                                                                    setSubmittedAnswers(prev => {
                                                                        const n = { ...prev };
                                                                        delete n[idx];
                                                                        return n;
                                                                    });
                                                                }}
                                                                className="px-3 py-1.5 bg-slate-50 text-slate-550 border border-slate-200 text-xs font-bold rounded-lg hover:bg-slate-100"
                                                            >
                                                                Change
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => submitQuestion(idx, q)}
                                                            disabled={recordingStatus[idx] === 'recording'}
                                                            className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
                                                        >
                                                            Save Answer
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer panel */}
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex items-center justify-between px-8 z-50">
                    <div className="flex flex-col">
                        <span className="text-xs font-extrabold text-slate-500">
                            {Object.keys(submittedAnswers).length} / {test.questions.length} Saved
                        </span>
                        <div className="mt-1 w-44 h-1.5 bg-slate-250 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                style={{ width: `${(Object.keys(submittedAnswers).length / test.questions.length) * 100}%` }}
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => submitAllResponses(false)}
                        disabled={submitting}
                        className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-md disabled:opacity-60 flex items-center gap-2"
                    >
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : "🎯 Complete Assessment"}
                    </button>
                </div>
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

                    <button
                        onClick={() => navigate('/')}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
                    >
                        Return to Homepage
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default PublicTestPage;
