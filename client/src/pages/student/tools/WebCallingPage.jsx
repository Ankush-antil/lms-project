import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Video, Mic, Shield, Clock, Settings, Cloud, Folder, RefreshCw, Database, Download, Trash, AlertTriangle, ArrowLeft, Play, Square, Users, Cpu, PhoneOff, MicOff, VideoOff, MessageSquare, Eye } from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useSocket } from '../../../context/SocketContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import GoogleDriveModal from '../../../components/common/GoogleDriveModal';
import LocalHistoryModal from '../../../components/common/LocalHistoryModal';

const WebCallingPage = () => {
    const navigate = useNavigate();
    const { 
        callUser, 
        callState, 
        onlineUsers = [] 
    } = useSocket();

    const localVideoRef = useRef(null);
    const audioContextRef = useRef(null);
    const synthRef = useRef(null);

    // States
    const [teachers, setTeachers] = useState([]);
    const [loadingTeachers, setLoadingTeachers] = useState(true);
    
    const [micEnabled, setMicEnabled] = useState(true);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [callLimit, setCallLimit] = useState(10); // mins
    const [activeTab, setActiveTab] = useState('teachers'); // 'teachers' | 'ai'

    // AI Simulation States
    const [aiRole, setAiRole] = useState('interviewer');
    const [simulatedCall, setSimulatedCall] = useState(false);
    const [simulatedState, setSimulatedState] = useState('idle'); // 'dialing' | 'connected' | 'ended'
    const [simTime, setSimTime] = useState(0);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [aiIsMuted, setAiIsMuted] = useState(false);
    const [localStream, setLocalStream] = useState(null);

    const [callLogs, setCallLogs] = useState([]);

    // Google Drive Modal State
    const [driveModalOpen, setDriveModalOpen] = useState(false);
    const [driveFileMeta, setDriveFileMeta] = useState({ name: '', blob: null });

    // Local History Modal State
    const [localHistoryModalOpen, setLocalHistoryModalOpen] = useState(false);

    // Active Gallery View: 'local' | 'cloud'
    const [galleryTab, setGalleryTab] = useState('local');

    // Cloud files state
    const [cloudFiles, setCloudFiles] = useState([]);
    const [cloudSpace, setCloudSpace] = useState({ used: 0, limit: 300 * 1024 * 1024 });
    const [cloudLoading, setCloudLoading] = useState(false);

    // AI Scenarios definition
    const aiScenarios = {
        interviewer: {
            title: "AI Interviewer",
            description: "Practice behavioral and technical questions in a professional setting.",
            avatar: "👤",
            questions: [
                "Welcome to the mock interview. Let's start by introducing yourself.",
                "Why do you believe you are the right fit for this educational program?",
                "Can you describe a challenging learning scenario you faced and how you resolved it?",
                "How do you prioritize tasks when working under strict project deadlines?",
                "Thank you for answering. Do you have any questions for me?"
            ]
        },
        customer: {
            title: "Angry Customer Roleplay",
            description: "Practice handling escalations and de-escalating customer complaints.",
            avatar: "😡",
            questions: [
                "Hello? Finally someone picked up! I've been waiting for my order details for 3 days. What is going on?",
                "That's not good enough. Your system crashed and charged me twice. I need a refund immediately!",
                "If you can't process it right now, transfer me to your supervisor or manager. I don't want to waste more time.",
                "Fine. But I expect a confirmation email containing the details within 15 minutes. Can you do that?",
                "Thank you for helping. I appreciate your patience."
            ]
        },
        client: {
            title: "Business Client Negotiation",
            description: "Negotiate pricing plans, project scopes, and delivery deadlines.",
            avatar: "💼",
            questions: [
                "Hello, thank you for meeting with me today. Let's discuss the project budget.",
                "Your initial quote is about 20% higher than what we budgeted. Can we review options to lower it?",
                "If we extend the delivery deadline by 2 weeks, would you be able to provide a discount?",
                "Perfect. Let's draft a service agreement incorporating these terms. When can you send it over?",
                "Sounds like a deal. Talk to you soon."
            ]
        },
        support: {
            title: "Tech Support Simulation",
            description: "Resolve software setup problems and hardware configuration queries.",
            avatar: "🛠️",
            questions: [
                "Thank you for calling Technical Support. What error code are you currently experiencing?",
                "Okay, let's try power-cycling the device first. Have you restarted it in the last 15 minutes?",
                "Let's check the IP configuration next. Are you connected to the local network via Ethernet or Wi-Fi?",
                "I will push a configuration patch to your terminal now. Please check if the status light is green.",
                "Excellent. The system shows normal status. Let me know if there's anything else I can resolve."
            ]
        }
    };

    // Fetch cloud files
    const fetchCloudFiles = async () => {
        try {
            setCloudLoading(true);
            const res = await axios.get('/api/practice-files');
            // Filter files by toolType
            const toolFiles = res.data.files.filter(f => f.toolType === 'web-calling');
            setCloudFiles(toolFiles);
            setCloudSpace({
                used: res.data.usedBytes,
                limit: res.data.limitBytes
            });
        } catch (err) {
            console.error("Failed to fetch cloud files:", err);
        } finally {
            setCloudLoading(false);
        }
    };

    // Load call logs
    const loadLocalLogs = () => {
        const savedLogs = localStorage.getItem('practice_call_logs');
        if (savedLogs) {
            try {
                const parsed = JSON.parse(savedLogs);
                // Ensure synced field exists
                const formatted = parsed.map(log => ({
                    ...log,
                    synced: log.synced !== undefined ? log.synced : false
                }));
                setCallLogs(formatted);
            } catch (e) {
                console.error(e);
            }
        } else {
            // Mock initial logs
            const initialLogs = [
                { id: '1', name: 'Dr. Sarah (Instructor)', type: 'Voice Call', duration: '04:12', status: 'Completed', date: '2026-06-21 14:20', synced: false },
                { id: '2', name: 'Mock AI Interviewer', type: 'Simulated Call', duration: '05:00', status: 'Completed', date: '2026-06-22 10:15', synced: false }
            ];
            setCallLogs(initialLogs);
            localStorage.setItem('practice_call_logs', JSON.stringify(initialLogs));
        }
    };

    useEffect(() => {
        loadLocalLogs();
        fetchCloudFiles();
    }, []);

    // Load available teachers
    useEffect(() => {
        const loadTeachersList = async () => {
            try {
                setLoadingTeachers(true);
                const res = await axios.get('/api/calls/teachers');
                setTeachers(res.data);
            } catch (err) {
                console.error("Failed to load teachers:", err);
                // Simulated fallback list
                setTeachers([
                    { _id: 't1', name: 'Dr. Sarah (Instructor)', email: 'sarah@lms.edu', callEnabled: true },
                    { _id: 't2', name: 'Prof. James (Math Dept)', email: 'james@lms.edu', callEnabled: true },
                    { _id: 't3', name: 'Alice Smith (CS Tutor)', email: 'alice@lms.edu', callEnabled: false }
                ]);
            } finally {
                setLoadingTeachers(false);
            }
        };

        loadTeachersList();
    }, []);

    // Simulated Timer loop
    useEffect(() => {
        let interval = null;
        if (simulatedState === 'connected') {
            interval = setInterval(() => {
                setSimTime(prev => prev + 1);
            }, 1000);
        } else {
            clearInterval(interval);
            setSimTime(0);
        }
        return () => clearInterval(interval);
    }, [simulatedState]);

    // Local camera preview for simulated call
    const startLocalStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: cameraEnabled,
                audio: micEnabled
            });
            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Could not activate local video preview:", err);
        }
    };

    const stopLocalStream = () => {
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
            setLocalStream(null);
        }
    };

    // AI Simulation Handlers
    const startAiCall = async () => {
        setSimulatedCall(true);
        setSimulatedState('dialing');
        setCurrentQuestionIndex(0);
        
        // Play simulated dialing tone
        playTone(400, 440, 1.5);

        setTimeout(() => {
            setSimulatedState('connected');
            startLocalStream();
            speakQuestion(aiScenarios[aiRole].questions[0]);
        }, 2000);
    };

    const endAiCall = () => {
        stopLocalStream();
        setSimulatedState('ended');
        
        // Add log entry
        const newLog = {
            id: 'log_' + Date.now(),
            name: `AI Partner (${aiScenarios[aiRole].title})`,
            type: 'Simulated Call',
            duration: formatTime(simTime),
            status: 'Completed',
            date: new Date().toLocaleString(),
            synced: false
        };

        setCallLogs(prev => {
            const list = [newLog, ...prev];
            localStorage.setItem('practice_call_logs', JSON.stringify(list));
            return list;
        });

        setTimeout(() => {
            setSimulatedState('idle');
            setSimulatedCall(false);
        }, 1500);
    };

    const nextQuestion = () => {
        const questions = aiScenarios[aiRole].questions;
        if (currentQuestionIndex < questions.length - 1) {
            const nextIdx = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIdx);
            speakQuestion(questions[nextIdx]);
        } else {
            toast.success("Simulation finished! Ending call.");
            endAiCall();
        }
    };

    // Audio synthesizer for ringing effect
    const playTone = (f1, f2, duration) => {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.frequency.value = f1;
            osc2.frequency.value = f2;
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start();
            osc2.start();
            osc1.stop(ctx.currentTime + duration);
            osc2.stop(ctx.currentTime + duration);
        } catch (e) {}
    };

    // Text to Speech for simulated AI Partner
    const speakQuestion = (text) => {
        if ('speechSynthesis' in window && !aiIsMuted) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            // Try to pick a natural sounding voice
            const voices = window.speechSynthesis.getVoices();
            const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'));
            if (preferred) utterance.voice = preferred;
            utterance.rate = 0.95;
            window.speechSynthesis.speak(utterance);
        }
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // WebRTC call trigger (uses context)
    const handleTeacherCall = (teacher, callType = 'audio') => {
        // Check if teacher is online
        const isOnline = onlineUsers.some(user => user.userId === teacher._id);
        if (!isOnline && teacher._id !== 't1' && teacher._id !== 't2') { // Let mock teachers trigger dialing
            toast.error(`${teacher.name} is currently offline.`);
            return;
        }
        
        toast.loading(`Dialing ${teacher.name}...`, { duration: 2000 });
        callUser(teacher._id, teacher.name, 'Teacher', callType);
    };

    const handleDeleteLog = (id) => {
        const updated = callLogs.filter(log => log.id !== id);
        setCallLogs(updated);
        localStorage.setItem('practice_call_logs', JSON.stringify(updated));
    };

    // Save latest log to Google Drive (Open Modal)
    const handleSaveToDriveClick = () => {
        if (callLogs.length === 0) {
            toast.error("No call logs to save. Make a call first.");
            return;
        }
        const latest = callLogs[0];
        const logContent = `LMS CALL LOG\n====================\nName: ${latest.name}\nType: ${latest.type}\nDuration: ${latest.duration}\nStatus: ${latest.status}\nDate: ${latest.date}`;
        const blob = new Blob([logContent], { type: 'text/plain' });
        
        setDriveFileMeta({
            name: `call_log_${latest.id || Date.now()}.txt`,
            blob: blob
        });
        setDriveModalOpen(true);
    };

    // Delete cloud file
    const handleDeleteCloudFile = async (id) => {
        try {
            await axios.delete(`/api/practice-files/${id}`);
            toast.success("Call log deleted from cloud storage!");
            fetchCloudFiles();
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete file from cloud.");
        }
    };

    // Sync local unsynced logs with cloud
    const handleSyncWithCloud = async () => {
        const unsynced = callLogs.filter(log => !log.synced);
        if (unsynced.length === 0) {
            toast.success("All local logs are already synced!");
            return;
        }

        const toastId = toast.loading(`Syncing ${unsynced.length} logs to cloud...`);
        let successCount = 0;

        for (const item of unsynced) {
            try {
                const logContent = `LMS CALL LOG\n====================\nName: ${item.name}\nType: ${item.type}\nDuration: ${item.duration}\nStatus: ${item.status}\nDate: ${item.date}`;
                const blob = new Blob([logContent], { type: 'text/plain' });

                const formData = new FormData();
                formData.append('file', blob, `call_log_${item.id}.txt`);
                formData.append('toolType', 'web-calling');
                formData.append('duration', item.duration);
                formData.append('format', 'TXT');

                const res = await axios.post('/api/practice-files/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                item.synced = true;
                successCount++;
            } catch (err) {
                console.error("Sync error for log:", item.id, err);
                const errMsg = err.response?.data?.message || '';
                if (errMsg.toLowerCase().includes('limit exceeded') || errMsg.toLowerCase().includes('space')) {
                    toast.error(`Sync aborted: ${errMsg}`, { id: toastId });
                    saveToLocalStorage(callLogs);
                    fetchCloudFiles();
                    return;
                }
            }
        }

        saveToLocalStorage(callLogs);
        await fetchCloudFiles();
        
        if (successCount > 0) {
            toast.success(`Successfully synced ${successCount} call logs to cloud!`, { id: toastId });
        } else {
            toast.error("Failed to sync call logs to cloud.", { id: toastId });
        }
    };

    const saveToLocalStorage = (list) => {
        localStorage.setItem('practice_call_logs', JSON.stringify(list));
    };

    return (
        <DashboardLayout role="Student" fullWidth={true}>
            <div className="max-w-7xl mx-auto px-4 py-4 text-left">
                {/* Back Link */}
                <button
                    onClick={() => navigate('/student/tests')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-bold text-sm"
                >
                    <ArrowLeft size={16} />
                    Back to My Tests
                </button>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                        <Phone className="text-pink-600" />
                        Web-Calling Tool
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Connect with active teachers or practice solo with an interactive AI Roleplay partner.</p>
                </div>

                {/* 3-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
                    
                    {/* Simulated Call Active Screen Overlay (Takes over center-panel) */}
                    {simulatedCall && (
                        <div className="fixed inset-0 z-[999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                            <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[500px]">
                                
                                {/* AI Partner Avatar Panel */}
                                <div className="flex-1 bg-slate-950 p-6 flex flex-col justify-between items-center relative min-h-[240px]">
                                    <span className="text-[10px] font-black text-pink-500 tracking-widest uppercase mt-2">
                                        Active AI Practice Session
                                    </span>

                                    {simulatedState === 'dialing' ? (
                                        <div className="flex flex-col items-center gap-4 text-center my-auto">
                                            <div className="w-24 h-24 bg-pink-600 rounded-full flex items-center justify-center text-white text-4xl animate-pulse ring-4 ring-pink-900/40">
                                                {aiScenarios[aiRole].avatar}
                                            </div>
                                            <div>
                                                <h3 className="font-extrabold text-white text-xl">{aiScenarios[aiRole].title}</h3>
                                                <p className="text-xs text-pink-400 font-bold uppercase tracking-wider animate-bounce mt-1">Connecting line...</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-4 text-center my-auto w-full px-4">
                                            <div className="relative">
                                                <div className="w-28 h-28 bg-slate-800 rounded-full flex items-center justify-center text-5xl shadow-inner border border-slate-700">
                                                    {aiScenarios[aiRole].avatar}
                                                </div>
                                                {!aiIsMuted && (
                                                    <div className="absolute inset-0 w-28 h-28 border-2 border-pink-500 rounded-full animate-ping opacity-25"></div>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="font-black text-white text-lg">{aiScenarios[aiRole].title}</h4>
                                                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 max-w-md mx-auto">
                                                    <p className="text-sm font-bold text-indigo-300 leading-relaxed italic">
                                                        "{aiScenarios[aiRole].questions[currentQuestionIndex]}"
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                            {simulatedState === 'connected' ? `Connected: ${formatTime(simTime)}` : 'Calling...'}
                                        </span>
                                    </div>
                                </div>

                                {/* Student WebRTC Camera Panel */}
                                <div className="w-full md:w-[320px] bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-6 flex flex-col justify-between">
                                    <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
                                        Your Stream Preview
                                    </span>

                                    <div className="w-full bg-slate-955 aspect-video md:aspect-square rounded-2xl overflow-hidden my-4 relative bg-slate-950 border border-slate-850 flex items-center justify-center">
                                        {cameraEnabled && localStream ? (
                                            <video
                                                ref={localVideoRef}
                                                autoPlay
                                                muted
                                                playsInline
                                                className="w-full h-full object-cover transform scale-x-[-1]"
                                            ></video>
                                        ) : (
                                            <div className="text-slate-600 flex flex-col items-center gap-2 text-center p-4">
                                                <VideoOff size={28} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Camera Off</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons Panel */}
                                    <div className="flex flex-col gap-3">
                                        {simulatedState === 'connected' && (
                                            <button
                                                onClick={nextQuestion}
                                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 text-xs"
                                            >
                                                <MessageSquare size={14} />
                                                <span>Next Prompt / Answered</span>
                                            </button>
                                        )}

                                        <div className="flex justify-between gap-2">
                                            <button
                                                onClick={() => {
                                                    setMicEnabled(!micEnabled);
                                                    if (localStream) {
                                                        localStream.getAudioTracks().forEach(t => t.enabled = !micEnabled);
                                                    }
                                                }}
                                                className={`flex-1 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                                                    micEnabled ? 'bg-slate-850 border-slate-750 text-slate-300 hover:bg-slate-800' : 'bg-red-950/40 border-red-900/30 text-red-400'
                                                }`}
                                            >
                                                {micEnabled ? <Mic size={14} /> : <MicOff size={14} />}
                                                <span>{micEnabled ? 'Mute' : 'Muted'}</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setCameraEnabled(!cameraEnabled);
                                                    if (localStream) {
                                                        localStream.getVideoTracks().forEach(t => t.enabled = !cameraEnabled);
                                                    }
                                                }}
                                                className={`flex-1 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                                                    cameraEnabled ? 'bg-slate-850 border-slate-750 text-slate-300 hover:bg-slate-800' : 'bg-red-950/40 border-red-900/30 text-red-400'
                                                }`}
                                            >
                                                {cameraEnabled ? <Video size={14} /> : <VideoOff size={14} />}
                                                <span>{cameraEnabled ? 'Cam ON' : 'Cam OFF'}</span>
                                            </button>
                                        </div>

                                        <button
                                            onClick={endAiCall}
                                            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-red-650/10 text-xs"
                                        >
                                            <PhoneOff size={14} />
                                            <span>End Call Partner</span>
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    {/* Column 1: Source Settings */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Source</h3>
                            
                            {/* Device togglers */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Microphone</span>
                                    <button
                                        onClick={() => setMicEnabled(!micEnabled)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-colors ${
                                            micEnabled ? 'bg-emerald-50 border-emerald-250 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                                        }`}
                                    >
                                        {micEnabled ? 'ACTIVE' : 'MUTED'}
                                    </button>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Camera</span>
                                    <button
                                        onClick={() => setCameraEnabled(!cameraEnabled)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-colors ${
                                            cameraEnabled ? 'bg-emerald-50 border-emerald-250 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                                        }`}
                                    >
                                        {cameraEnabled ? 'ACTIVE' : 'OFF'}
                                    </button>
                                </div>
                            </div>

                            {/* Signal Indicator */}
                            <div className="space-y-2 text-xs">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Line Quality</span>
                                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between">
                                    <span className="font-bold text-slate-600">P2P Connection</span>
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black">EXCELLENT</span>
                                </div>
                            </div>

                            {/* Call Limit */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock size={14} /> Call Limit Limit
                                </label>
                                <select
                                    value={callLimit}
                                    onChange={(e) => setCallLimit(parseInt(e.target.value))}
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700"
                                >
                                    <option value={5}>5 Minutes</option>
                                    <option value={10}>10 Minutes</option>
                                    <option value={30}>30 Minutes</option>
                                </select>
                            </div>

                            {/* Auto-Recording */}
                            <div className="flex justify-between items-center p-3 bg-pink-50/40 border border-pink-100 rounded-xl">
                                <div className="text-left">
                                    <span className="text-[11px] font-black text-pink-850 uppercase tracking-wide">Call Recording</span>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Saves Call logs</p>
                                </div>
                                <span className="px-2 py-0.5 bg-indigo-650 text-white text-[8px] font-black rounded-md uppercase tracking-wider shadow-sm">
                                    AUTO
                                </span>
                            </div>

                            {/* Additional Settings */}
                            <details className="group border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                                <summary className="list-none flex justify-between items-center cursor-pointer text-xs font-bold text-slate-600 select-none">
                                    <span className="flex items-center gap-1.5"><Settings size={14} /> Advanced settings</span>
                                    <span className="transition-transform group-open:rotate-180">▼</span>
                                </summary>
                                <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">Video Call Bitrate</span>
                                        <select className="bg-white border border-slate-200 rounded p-1 font-medium text-[10px]">
                                            <option>Auto (Adaptive)</option>
                                            <option>High (1.5 Mbps)</option>
                                            <option>Low (500 kbps)</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">Bypass TURN Server</span>
                                        <input type="checkbox" className="rounded text-pink-600 focus:ring-pink-500" />
                                    </div>
                                </div>
                            </details>
                        </div>
                    </div>

                    {/* Center Column: Dialer / Connections Selector */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col min-h-[460px]">
                            
                            {/* Navigation tabs */}
                            <div className="flex border-b border-slate-100 pb-3 gap-6">
                                <button
                                    onClick={() => setActiveTab('teachers')}
                                    className={`pb-1.5 font-bold text-sm transition-colors border-b-2 px-1 ${
                                        activeTab === 'teachers' 
                                            ? 'text-pink-600 border-pink-600' 
                                            : 'text-slate-400 border-transparent hover:text-slate-655'
                                    }`}
                                >
                                    <span className="flex items-center gap-1.5"><Users size={16} /> Online Teachers</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('ai')}
                                    className={`pb-1.5 font-bold text-sm transition-colors border-b-2 px-1 ${
                                        activeTab === 'ai' 
                                            ? 'text-pink-600 border-pink-600' 
                                            : 'text-slate-400 border-transparent hover:text-slate-655'
                                    }`}
                                >
                                    <span className="flex items-center gap-1.5"><Cpu size={16} /> AI Practice Partner</span>
                                </button>
                            </div>

                            {/* Tab Content 1: Online Teachers */}
                            {activeTab === 'teachers' && (
                                <div className="flex-1 flex flex-col justify-between mt-4">
                                    <div className="space-y-3">
                                        {loadingTeachers ? (
                                            <div className="text-xs text-slate-500 text-center py-10 font-medium">Loading instructors...</div>
                                        ) : teachers.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic text-center py-10">No active teachers found.</p>
                                        ) : (
                                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                                {teachers.map(teacher => {
                                                    const isOnline = onlineUsers.some(u => u.userId === teacher._id) || teacher._id === 't1' || teacher._id === 't2'; // simulate online status for dr. sarah and prof. james
                                                    return (
                                                        <div 
                                                            key={teacher._id}
                                                            className="flex justify-between items-center p-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-150 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="relative">
                                                                    <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-extrabold flex items-center justify-center text-xs">
                                                                        {teacher.name[0]}
                                                                    </div>
                                                                    {isOnline && (
                                                                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></span>
                                                                    )}
                                                                </div>
                                                                <div className="text-left">
                                                                    <h4 className="text-xs font-bold text-slate-700">{teacher.name}</h4>
                                                                    <p className="text-[10px] text-slate-400 font-medium">{teacher.email}</p>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => handleTeacherCall(teacher, 'audio')}
                                                                    className="p-2 bg-pink-50 hover:bg-pink-100 text-pink-650 rounded-xl transition-colors border border-pink-100"
                                                                    title="Voice Call"
                                                                >
                                                                    <Phone size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleTeacherCall(teacher, 'video')}
                                                                    className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-xl transition-colors border border-purple-100"
                                                                    title="Video Call"
                                                                >
                                                                    <Video size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <div className="border border-indigo-50 bg-indigo-50/20 rounded-xl p-3 flex items-start gap-2.5 text-[10px] text-indigo-700/80 font-bold leading-normal mt-4">
                                        <Shield size={14} className="shrink-0 mt-0.5" />
                                        <span>Clicking voice or video call starts a secure WebRTC calling line with the teacher. Make sure they are online and active in their dashboard.</span>
                                    </div>
                                </div>
                            )}

                            {/* Tab Content 2: AI Partner */}
                            {activeTab === 'ai' && (
                                <div className="flex-1 flex flex-col justify-between mt-4">
                                    <div className="space-y-4">
                                        <p className="text-xs text-slate-500">Configure your simulation role and click start to call.</p>
                                        
                                        {/* Grid of Roles */}
                                        <div className="grid grid-cols-2 gap-3">
                                            {Object.entries(aiScenarios).map(([key, sc]) => (
                                                <div 
                                                    key={key}
                                                    onClick={() => setAiRole(key)}
                                                    className={`p-3 rounded-2xl border cursor-pointer text-left transition-all ${
                                                        aiRole === key 
                                                            ? 'bg-white border-pink-550 shadow-md shadow-pink-500/5 ring-1 ring-pink-500' 
                                                            : 'bg-slate-50 border-slate-150 hover:bg-white hover:border-slate-300'
                                                    }`}
                                                >
                                                    <span className="text-2xl block mb-1">{sc.avatar}</span>
                                                    <h4 className="text-xs font-extrabold text-slate-700">{sc.title}</h4>
                                                    <p className="text-[9px] text-slate-400 mt-1 leading-normal font-bold uppercase tracking-wider">{sc.questions.length} questions</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-[11px] text-slate-505 font-medium leading-relaxed">
                                            <strong>Scenario Objective:</strong> {aiScenarios[aiRole].description}
                                        </div>
                                    </div>

                                    {/* Big Trigger Call button */}
                                    <button
                                        onClick={startAiCall}
                                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.99] transition-all duration-200 mt-6"
                                    >
                                        <Phone className="animate-pulse" size={16} />
                                        <span>Start Practice Call Partner</span>
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Column 3: Data & Call logs */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 text-left">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Data Settings</h3>
                            
                            <div className="space-y-2">
                                {/* Save in Google Drive */}
                                <button
                                    onClick={handleSaveToDriveClick}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                                >
                                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                                        <path fill="#FFC107" d="M17 6h14l13 22H30L17 6z" />
                                        <path fill="#FF3D00" d="m15.5 11.5-8.5 15L17 42h13L15.5 11.5z" />
                                        <path fill="#4CAF50" d="M44 28H15.5L30 42h14z" />
                                    </svg>
                                    <div className="text-left flex-1">
                                        <p>Save in Google Drive</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Upload Latest Log</span>
                                    </div>
                                </button>

                                {/* Go to Drive History */}
                                <button
                                    onClick={() => {
                                        setDriveFileMeta({ name: '', blob: null });
                                        setDriveModalOpen(true);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                                >
                                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                                        <path fill="#FFC107" d="M17 6h14l13 22H30L17 6z" />
                                        <path fill="#FF3D00" d="m15.5 11.5-8.5 15L17 42h13L15.5 11.5z" />
                                        <path fill="#4CAF50" d="M44 28H15.5L30 42h14z" />
                                    </svg>
                                    <div className="text-left flex-1">
                                        <p>Go to Drive History</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                            View & Manage Drive Folders
                                        </span>
                                    </div>
                                </button>
                                
                                {/* Go to Local Data */}
                                <button
                                    onClick={() => {
                                        setLocalHistoryModalOpen(true);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                                >
                                    <Folder className="text-pink-650 shrink-0" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Go to Local Data</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                            {callLogs.length} Call Logs • View structured folders
                                        </span>
                                    </div>
                                </button>

                                {/* Go to Cloud Data */}
                                <button
                                    onClick={async () => {
                                        setGalleryTab('cloud');
                                        await fetchCloudFiles();
                                        toast.success("Switched to Cloud Storage");
                                    }}
                                    className={`w-full flex items-center gap-3 p-3 border rounded-xl text-xs font-bold transition-all ${
                                        galleryTab === 'cloud'
                                            ? 'bg-pink-50/40 border-pink-100 text-pink-850 shadow-sm'
                                            : 'bg-slate-50 hover:bg-slate-100 border-slate-150 text-slate-700'
                                    }`}
                                >
                                    <Database className="text-pink-600 shrink-0" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Go to Cloud Data</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                            {cloudFiles.length} Cloud Logs • {(cloudSpace.used / (1024 * 1024)).toFixed(1)} MB / 300 MB
                                        </span>
                                    </div>
                                </button>

                                {/* Sync with Cloud */}
                                <button
                                    onClick={handleSyncWithCloud}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                                >
                                    <RefreshCw className="text-pink-600 shrink-0 animate-hover-spin" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Sync with Cloud</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                            {callLogs.filter(log => !log.synced).length} logs not synced
                                        </span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Recent Call Logs / Cloud space limit and items list */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 text-left">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                                    {galleryTab === 'local' ? 'Local Logs' : 'Cloud Logs'}
                                </h3>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-655 font-black text-[9px] uppercase tracking-wider">
                                    {galleryTab === 'local' ? 'Offline' : 'Server'}
                                </span>
                            </div>

                            {/* Cloud Space limit bar if on cloud tab */}
                            {galleryTab === 'cloud' && (
                                <div className="space-y-1.5 p-2.5 bg-slate-50 border border-slate-150 rounded-xl">
                                    <div className="flex justify-between items-center text-[9px] text-slate-450 font-black uppercase tracking-wider">
                                        <span>Cloud Space Limit</span>
                                        <span>{(cloudSpace.used / (1024 * 1024)).toFixed(1)}MB / 300MB</span>
                                    </div>
                                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden border border-slate-300">
                                        <div
                                            className="bg-pink-600 h-full transition-all duration-300"
                                            style={{ width: `${Math.min(100, (cloudSpace.used / cloudSpace.limit) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            {galleryTab === 'local' ? (
                                <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-center space-y-3.5">
                                    <Folder className="w-10 h-10 text-indigo-500 mx-auto" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Structured Offline History</p>
                                        <p className="text-[10px] text-slate-500 font-bold leading-normal">
                                            Your offline files are structured inside date folders and sequential names: <b>LMS / [Date] / Web-Calling Tool</b>.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setLocalHistoryModalOpen(true)}
                                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                                    >
                                        Browse Local Folders
                                    </button>
                                </div>
                            ) : (
                                cloudLoading ? (
                                    <div className="text-xs text-slate-500 text-center py-10 font-medium">Loading cloud logs...</div>
                                ) : cloudFiles.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic text-center py-4">No synced cloud logs.</p>
                                ) : (
                                    <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                                        {cloudFiles.map(file => (
                                            <div key={file._id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-2 hover:border-slate-350 transition-colors relative text-left">
                                                <div className="flex justify-between items-start">
                                                    <div className="text-left">
                                                        <h4 className="text-[11px] font-bold text-slate-700">{file.filename}</h4>
                                                        <p className="text-[9px] text-slate-400 mt-0.5">
                                                            Duration: {file.metadata?.duration || 'N/A'} • Size: {(file.size / 1024).toFixed(1)} KB
                                                        </p>
                                                        <span className="text-[8px] text-slate-350 block mt-1">{new Date(file.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex gap-1.5 items-center">
                                                        <a
                                                            href={file.fileUrl}
                                                            download={file.filename}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1 hover:bg-slate-200 rounded text-slate-450 hover:text-slate-700"
                                                            title="Download File"
                                                        >
                                                            <Download size={12} />
                                                        </a>
                                                        <button
                                                            onClick={() => handleDeleteCloudFile(file._id)}
                                                            className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-650"
                                                            title="Delete from Cloud"
                                                        >
                                                            <Trash size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Google Drive Simulation Modal */}
            <GoogleDriveModal
                isOpen={driveModalOpen}
                onClose={() => setDriveModalOpen(false)}
                fileName={driveFileMeta.name}
                fileBlob={driveFileMeta.blob}
                onSaveSuccess={() => {
                    // Update latest call log synced status locally
                    if (callLogs.length > 0) {
                        const updated = [...callLogs];
                        updated[0].synced = true;
                        setCallLogs(updated);
                        localStorage.setItem('practice_call_logs', JSON.stringify(updated));
                    }
                }}
            />

            {/* Local Storage Virtual History Modal */}
            <LocalHistoryModal
                isOpen={localHistoryModalOpen}
                onClose={() => {
                    setLocalHistoryModalOpen(false);
                    loadLocalLogs();
                }}
                onRefresh={() => {
                    loadLocalLogs();
                }}
            />
        </DashboardLayout>
    );
};

export default WebCallingPage;
