import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, Video, Mic, Shield, Clock, Settings, Cloud, Folder, RefreshCw, Database, Download, Trash, AlertTriangle, ArrowLeft, Play, Square, Users, Cpu, PhoneOff, MicOff, VideoOff, MessageSquare, Eye, CheckCircle, X, Pause, Save } from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import GoogleDriveModal from '../../../components/common/GoogleDriveModal';
import LocalHistoryModal from '../../../components/common/LocalHistoryModal';
import { saveLocalBlob, getLocalBlob, deleteLocalBlob } from '../../../utils/indexedDB';
import { parseDateToDdMmYyyy, getTodayDdMmYyyy } from '../../../utils/dateUtils';

const WebCallingPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // Parse selected date and inbox param
    const searchParams = new URLSearchParams(location.search);
    const dateParam = searchParams.get('date');
    const inboxParam = searchParams.get('inbox');
    const todayDdMmYyyy = getTodayDdMmYyyy();
    const isReadOnly = dateParam && dateParam !== todayDdMmYyyy;

    const getSessionTimestamp = () => {
        const activeDate = dateParam || todayDdMmYyyy;
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        return `${activeDate}, ${timeStr}`;
    };
    const {
        callUser,
        callState,
        callInfo,
        callDuration,
        onlineUsers = [],
        localStreamRef,
        remoteStreamRef
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
    const [drafts, setDrafts] = useState([]);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const [playingAudioId, setPlayingAudioId] = useState(null);
    const [audioElement, setAudioElement] = useState(null);

    useEffect(() => {
        return () => {
            if (audioElement) {
                audioElement.pause();
            }
        };
    }, [audioElement]);

    const handleToggleAudio = async (item) => {
        const targetId = item.id;
        
        // If already playing this log, stop it
        if (playingAudioId === targetId && audioElement) {
            audioElement.pause();
            setPlayingAudioId(null);
            setAudioElement(null);
            return;
        }

        // If playing something else, stop it first
        if (audioElement) {
            audioElement.pause();
        }

        try {
            let url = item.audioUrl;
            if (!url && item.audioId) {
                // Fetch from IndexedDB
                const blob = await getLocalBlob(item.audioId);
                if (blob) {
                    url = URL.createObjectURL(blob);
                }
            }

            if (!url) {
                toast.error("No audio recording found for this call.");
                return;
            }

            const audio = new Audio(url);
            audio.onended = () => {
                setPlayingAudioId(null);
                setAudioElement(null);
            };
            audio.play();
            setPlayingAudioId(targetId);
            setAudioElement(audio);
        } catch (err) {
            console.error("Error playing call audio:", err);
            toast.error("Could not play audio recording.");
        }
    };

    // Watch WebRTC call state changes to create draft logs
    const prevCallStateRef = useRef(callState);
    const callStartTimeRef = useRef(null);

    useEffect(() => {
        // When call connects
        if (callState === 'connected' && prevCallStateRef.current !== 'connected') {
            callStartTimeRef.current = Date.now();
            
            // Wait 1 second to ensure that remote/local streams are established
            setTimeout(() => {
                const localStream = localStreamRef?.current;
                const remoteStream = remoteStreamRef?.current;

                if (localStream && remoteStream) {
                    try {
                        console.log('[WebCallingPage Recording] Mixing local & remote streams...');
                        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                        const mixContext = new AudioContextClass();

                        // Clone streams to prevent WebRTC track close conflicts
                        const clonedLocal = localStream.clone();
                        const clonedRemote = remoteStream.clone();

                        const localSource = mixContext.createMediaStreamSource(clonedLocal);
                        const remoteSource = mixContext.createMediaStreamSource(clonedRemote);
                        const mixDestination = mixContext.createMediaStreamDestination();

                        localSource.connect(mixDestination);
                        remoteSource.connect(mixDestination);

                        const mixedStream = mixDestination.stream;
                        audioChunksRef.current = [];

                        const mediaRecorder = new MediaRecorder(mixedStream, { mimeType: 'audio/webm' });
                        mediaRecorderRef.current = mediaRecorder;

                        mediaRecorder.ondataavailable = (event) => {
                            if (event.data && event.data.size > 0) {
                                audioChunksRef.current.push(event.data);
                            }
                        };

                        mediaRecorder.onstop = () => {
                            try {
                                clonedLocal.getTracks().forEach(t => t.stop());
                                clonedRemote.getTracks().forEach(t => t.stop());
                                mixContext.close();
                            } catch (e) {}
                        };

                        mediaRecorder.start(1000); // Record in 1-second chunks
                        console.log('[WebCallingPage Recording] Mixed WebRTC recording started.');
                    } catch (err) {
                        console.error('[WebCallingPage Recording] Failed to start mixed WebRTC recording:', err);
                    }
                } else {
                    // Fallback to mic only if stream is missing
                    console.log('[WebCallingPage Recording] Streams missing, fallback to mic-only...');
                    if (localStream) {
                        try {
                            const mediaRecorder = new MediaRecorder(localStream, { mimeType: 'audio/webm' });
                            mediaRecorderRef.current = mediaRecorder;
                            audioChunksRef.current = [];
                            mediaRecorder.ondataavailable = (event) => {
                                if (event.data && event.data.size > 0) {
                                    audioChunksRef.current.push(event.data);
                                }
                            };
                            mediaRecorder.start(1000);
                        } catch (err) {
                            console.error('[WebCallingPage Recording] Mic-only fallback failed:', err);
                        }
                    }
                }
            }, 1000);
        }

        // When call ends (leaves 'connected' state)
        if (callState !== 'connected' && prevCallStateRef.current === 'connected') {
            const durationMs = callStartTimeRef.current ? (Date.now() - callStartTimeRef.current) : 0;
            const durationSecs = Math.max(1, Math.floor(durationMs / 1000));
            
            const searchParams = new URLSearchParams(window.location.search);
            const inboxVal = searchParams.get('inbox');
            const draftId = 'draft_log_' + Date.now();

            const finalizeWebRtcDraft = (audioBlob = null) => {
                const newDraft = {
                    id: draftId,
                    name: callInfo?.targetName || 'Teacher User',
                    type: callInfo?.callType === 'video' ? 'Video Call' : 'Voice Call',
                    duration: formatTime(durationSecs),
                    status: 'Completed',
                    date: getSessionTimestamp(),
                    synced: false,
                    inbox: inboxVal || '',
                    audioBlob: audioBlob
                };
                if (audioBlob) {
                    newDraft.audioUrl = URL.createObjectURL(audioBlob);
                }
                setDrafts(prev => [newDraft, ...prev]);
                toast.success("WebRTC Call ended. Saved as draft!");
            };

            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.onstop = () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    finalizeWebRtcDraft(audioBlob);
                };
                mediaRecorderRef.current.stop();
            } else {
                finalizeWebRtcDraft();
            }
        }

        prevCallStateRef.current = callState;
    }, [callState, callInfo, micEnabled, localStreamRef, remoteStreamRef]);

    // Google Drive Modal State
    const [driveModalOpen, setDriveModalOpen] = useState(false);
    const [driveFileMeta, setDriveFileMeta] = useState({ name: '', blob: null });

    // Local History Modal State
    const [localHistoryModalOpen, setLocalHistoryModalOpen] = useState(false);

    // Cloud Gallery Modal State
    const [cloudGalleryModalOpen, setCloudGalleryModalOpen] = useState(false);

    // Active Gallery View: 'local' | 'cloud'
    const [galleryTab, setGalleryTab] = useState('local');

    // Cloud files state
    const [cloudFiles, setCloudFiles] = useState([]);

    // Filter local logs only by inbox param (no date filter for local files)
    const filteredLocalLogs = useMemo(() => {
        let filtered = callLogs;
        if (inboxParam) {
            filtered = filtered.filter(log => log.inbox === inboxParam);
        }
        return filtered;
    }, [callLogs, inboxParam]);

    // Filter cloud files by selected date and inbox param
    const filteredCloudFiles = useMemo(() => {
        let filtered = cloudFiles;
        if (dateParam) {
            filtered = filtered.filter(c => parseDateToDdMmYyyy(c.createdAt) === dateParam);
        }
        if (inboxParam) {
            filtered = filtered.filter(c => c.inbox === inboxParam);
        }
        return filtered;
    }, [cloudFiles, dateParam, inboxParam]);
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
            const url = inboxParam ? `/api/practice-files?inbox=${encodeURIComponent(inboxParam)}` : '/api/practice-files';
            const res = await axios.get(url);
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

            // Start MediaRecorder if microphone is enabled
            if (micEnabled && stream.getAudioTracks().length > 0) {
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };
                mediaRecorder.start(1000);
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
        if (isReadOnly) {
            toast.error("Calling is disabled in Read-Only archive.");
            return;
        }
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
        setSimulatedState('ended');

        const searchParams = new URLSearchParams(window.location.search);
        const inboxVal = searchParams.get('inbox');
        const draftId = 'draft_log_' + Date.now();

        const finalizeDraft = (audioBlob = null) => {
            const newDraft = {
                id: draftId,
                name: `AI Partner (${aiScenarios[aiRole].title})`,
                type: 'Simulated Call',
                duration: formatTime(simTime),
                status: 'Completed',
                date: getSessionTimestamp(),
                synced: false,
                inbox: inboxVal || '',
                audioBlob: audioBlob
            };
            if (audioBlob) {
                newDraft.audioUrl = URL.createObjectURL(audioBlob);
            }
            setDrafts(prev => [newDraft, ...prev]);
            toast.success("Call ended. Saved as draft!");

            setTimeout(() => {
                setSimulatedState('idle');
                setSimulatedCall(false);
            }, 1500);
        };

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                finalizeDraft(audioBlob);
            };
            mediaRecorderRef.current.stop();
        } else {
            finalizeDraft();
        }

        stopLocalStream();
    };

    const handleSaveDraft = async (draft) => {
        if (isReadOnly) {
            toast.error("Saving is disabled in Read-Only archive.");
            return;
        }
        
        const logId = 'log_' + Date.now();
        let audioId = null;

        if (draft.audioBlob) {
            try {
                audioId = 'call_audio_' + Date.now();
                await saveLocalBlob(audioId, draft.audioBlob);
            } catch (err) {
                console.error("Failed to save audio file to IndexedDB:", err);
            }
        }

        const newLog = {
            ...draft,
            id: logId,
            audioId: audioId,
            audioBlob: undefined // Don't serialize blob to localStorage
        };

        setCallLogs(prev => {
            const list = [newLog, ...prev];
            localStorage.setItem('practice_call_logs', JSON.stringify(list));
            return list;
        });

        // Clean up object URL in drafts
        if (draft.audioUrl) {
            URL.revokeObjectURL(draft.audioUrl);
        }

        setDrafts(prev => prev.filter(d => d.id !== draft.id));
        toast.success("Call log saved to workspace!");
    };

    const handleDeleteDraft = (id) => {
        setDrafts(prev => prev.filter(d => d.id !== id));
        toast.success("Draft discarded.");
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
        } catch (e) { }
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
        if (isReadOnly) {
            toast.error("Calling is disabled in Read-Only archive.");
            return;
        }
        // Check if teacher is online
        const isOnline = onlineUsers.includes(teacher._id);
        if (!isOnline && teacher._id !== 't1' && teacher._id !== 't2') { // Let mock teachers trigger dialing
            toast.error(`${teacher.name} is currently offline.`);
            return;
        }

        toast.loading(`Dialing ${teacher.name}...`, { duration: 2000 });
        callUser(teacher._id, teacher.name, 'Teacher', callType);
    };

    const handleDeleteLog = async (id) => {
        if (isReadOnly) {
            toast.error("Deleting logs is disabled in Read-Only archive.");
            return;
        }
        const itemToDelete = callLogs.find(log => log.id === id);
        if (itemToDelete && itemToDelete.audioId) {
            try {
                await deleteLocalBlob(itemToDelete.audioId);
            } catch (err) {
                console.error("Failed to delete local audio blob:", err);
            }
        }
        const updated = callLogs.filter(log => log.id !== id);
        setCallLogs(updated);
        localStorage.setItem('practice_call_logs', JSON.stringify(updated));
        toast.success("Call log deleted.");
    };

    // Save latest log to Google Drive (Open Modal)
    const handleSaveToDriveClick = () => {
        if (isReadOnly) {
            toast.error("Google Drive upload is disabled in Read-Only archive.");
            return;
        }
        if (filteredLocalLogs.length === 0) {
            toast.error("No call logs to save. Make a call first.");
            return;
        }
        const latest = filteredLocalLogs[0];
        const logContent = `LMS CALL LOG\n====================\nName: ${latest.name}\nType: ${latest.type}\nDuration: ${latest.duration}\nStatus: ${latest.status}\nDate: ${latest.date}`;
        const blob = new Blob([logContent], { type: 'text/plain' });

        setDriveFileMeta({
            name: `call_log_${latest.id || Date.now()}.txt`,
            blob: blob,
            itemId: latest.id
        });
        setDriveModalOpen(true);
    };

    const handleSyncSingleWithCloud = async (item) => {
        if (isReadOnly) {
            toast.error("Syncing files is disabled in Read-Only archive.");
            return;
        }
        const toastId = toast.loading(`Syncing call to cloud...`);
        try {
            let blob;
            let filename;
            let format;

            if (item.audioId) {
                blob = await getLocalBlob(item.audioId);
                filename = `call_recording_${item.id}.webm`;
                format = 'WEBM';
            }

            if (!blob) {
                const logContent = `LMS CALL LOG\n====================\nName: ${item.name}\nType: ${item.type}\nDuration: ${item.duration}\nStatus: ${item.status}\nDate: ${item.date}`;
                blob = new Blob([logContent], { type: 'text/plain' });
                filename = `call_log_${item.id}.txt`;
                format = 'TXT';
            }

            const formData = new FormData();
            formData.append('file', blob, filename);
            formData.append('toolType', 'web-calling');
            formData.append('duration', item.duration);
            formData.append('format', format);
            if (item.inbox) {
                formData.append('inbox', item.inbox);
            }

            await axios.post('/api/practice-files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Update local state and localStorage
            const updated = callLogs.map(log =>
                log.id === item.id ? { ...log, synced: true } : log
            );
            setCallLogs(updated);
            localStorage.setItem('practice_call_logs', JSON.stringify(updated));

            toast.success(`Successfully synced call to cloud!`, { id: toastId });
            await fetchCloudFiles();
        } catch (err) {
            console.error("Sync error for log:", item.id, err);
            const errMsg = err.response?.data?.message || 'Failed to sync call to cloud.';
            toast.error(errMsg, { id: toastId });
        }
    };

    const handleSyncSingleWithDrive = async (item) => {
        if (isReadOnly) {
            toast.error("Google Drive upload is disabled in Read-Only archive.");
            return;
        }
        let blob;
        let filename;

        if (item.audioId) {
            blob = await getLocalBlob(item.audioId);
            filename = `call_recording_${item.id}.webm`;
        }

        if (!blob) {
            const logContent = `LMS CALL LOG\n====================\nName: ${item.name}\nType: ${item.type}\nDuration: ${item.duration}\nStatus: ${item.status}\nDate: ${item.date}`;
            blob = new Blob([logContent], { type: 'text/plain' });
            filename = `call_log_${item.id}.txt`;
        }

        setDriveFileMeta({
            name: filename,
            blob: blob,
            itemId: item.id
        });
        setDriveModalOpen(true);
    };

    // Delete cloud file
    const handleDeleteCloudFile = async (id) => {
        if (isReadOnly) {
            toast.error("Deleting files is disabled in Read-Only archive.");
            return;
        }
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
        if (isReadOnly) {
            toast.error("Syncing files is disabled in Read-Only archive.");
            return;
        }
        const unsynced = filteredLocalLogs.filter(log => !log.synced);
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
                if (item.inbox) {
                    formData.append('inbox', item.inbox);
                }

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
        <DashboardLayout role={user?.role || 'Student'} fullWidth={true}>
            <div className="max-w-7xl mx-auto px-4 py-4 text-left">
                {/* Back Link & Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
                    {/* Left: Title */}
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                            <Phone className="text-pink-600" size={20} />
                            Web-Calling Tool {isReadOnly && <span className="text-xs px-2.5 py-1 bg-amber-500 text-white rounded-md font-bold uppercase tracking-wider">Preview Only</span>}
                        </h1>
                    </div>

                    {/* Center: Data Settings Quick Access */}
                    <div className="flex items-center gap-3 flex-wrap border rounded-xl p-3 bg-gray-100 h-15 w-[750px] justify-center">
                        {/* Local Data */}
                        <button
                            onClick={() => setLocalHistoryModalOpen(true)}
                            className="w-100 h-10 flex items-center gap-1.5 px-3 py-1.5 bg-slate-55 hover:bg-pink-50 border border-slate-205 hover:border-pink-200 text-slate-600 hover:text-pink-700 rounded-xl text-xs font-bold transition-all shadow-sm"
                            title="Go to Local Data"
                        >
                            <Folder size={13} className="text-pink-500 shrink-0" />
                            <span className="hidden sm:inline">Data on Local Cloud</span>
                            <span className="text-[9px] font-black text-slate-400 hidden sm:inline">• {filteredLocalLogs.length}</span>
                        </button>

                        {/* Cloud Data */}
                        <button
                            onClick={async () => {
                                await fetchCloudFiles();
                                setCloudGalleryModalOpen(true);
                            }}
                            className="w-100 h-10 flex items-center gap-1.5 px-3 py-1.5 border border-slate-205 hover:border-pink-200 bg-slate-50 hover:bg-pink-55 text-slate-600 hover:text-pink-700 rounded-xl text-xs font-bold transition-all shadow-sm"
                            title="Go to Cloud Data"
                        >
                            <Database size={13} className="text-pink-500 shrink-0" />
                            <span className="hidden sm:inline">Data on DS Cloud</span>
                            <span className="text-[9px] font-black text-slate-400 hidden sm:inline">• {filteredCloudFiles.length}</span>
                        </button>

                        {/* Drive History */}
                        <button
                            onClick={() => {
                                setDriveFileMeta({ name: '', blob: null });
                                setDriveModalOpen(true);
                            }}
                            className="w-100 h-10 flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-amber-50 border border-slate-205 hover:border-amber-200 text-slate-600 hover:text-amber-700 rounded-xl text-xs font-bold transition-all shadow-sm"
                            title="Go to Drive History"
                        >
                            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 48 48">
                                <path fill="#FFC107" d="M17 6h14l13 22H30L17 6z" />
                                <path fill="#FF3D00" d="m15.5 11.5-8.5 15L17 42h13L15.5 11.5z" />
                                <path fill="#4CAF50" d="M44 28H15.5L30 42h14z" />
                            </svg>
                            <span className="hidden sm:inline">Data On Google Drive</span>
                        </button>
                    </div>

                    {/* Right: Back to Practice Tools */}
                    <button
                        onClick={() => {
                            if (user?.role && user.role !== 'Student') {
                                navigate(`/${user.role.toLowerCase()}/tools`);
                            } else if (inboxParam) {
                                navigate('/student/tests');
                            } else {
                                navigate(dateParam ? `/student/practice-tools?date=${dateParam}` : '/student/practice-tools');
                            }
                        }}
                        className="h-[65px] w-45 flex items-center gap-1.5 text-slate-550 hover:text-slate-800 transition-colors font-bold text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl self-start sm:self-auto shadow-sm"
                    >
                        <ArrowLeft size={14} />
                        Back to Practice Tools
                    </button>
                </div>

                {isReadOnly && (
                    <div className="mb-4 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-center gap-2.5 text-xs font-semibold leading-relaxed">
                        <AlertTriangle className="text-amber-600 shrink-0" size={16} />
                        <div>
                            <p className="font-bold">Past Workspace Preview (Read-Only)</p>
                            <p className="text-amber-800/80 text-[11px] font-medium mt-0.5">You are viewing files captured on {dateParam}. Interactive calling, deleting call logs, or syncing files is disabled for this day.</p>
                        </div>
                    </div>
                )}

                {/* 2-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 relative">

                    {/* Simulated Call Active Screen Overlay (Takes over center-panel) */}
                    {simulatedCall && (
                        <div className="fixed inset-0 z-[999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                            <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[500px]">

                                {/* AI Partner Avatar Panel */}
                                <div className="flex-1 bg-slate-955 p-6 flex flex-col justify-between items-center relative min-h-[240px]">
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
                                                className={`flex-1 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1 transition-all ${micEnabled ? 'bg-slate-850 border-slate-750 text-slate-300 hover:bg-slate-800' : 'bg-red-955/40 border-red-900/30 text-red-400'
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
                                                className={`flex-1 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1 transition-all ${cameraEnabled ? 'bg-slate-850 border-slate-750 text-slate-300 hover:bg-slate-800' : 'bg-red-955/40 border-red-900/30 text-red-400'
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

                    {/* Left Column: Dialer / Connections Selector & Recent Call Logs */}
                    <div className="lg:col-span-9 space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col min-h-[460px]">

                            {/* Navigation tabs */}
                            <div className="flex border-b border-slate-100 pb-3 gap-6">
                                <button
                                    onClick={() => setActiveTab('teachers')}
                                    className={`pb-1.5 font-bold text-sm transition-colors border-b-2 px-1 ${activeTab === 'teachers'
                                        ? 'text-pink-600 border-pink-600'
                                        : 'text-slate-400 border-transparent hover:text-slate-655'
                                        }`}
                                >
                                    <span className="flex items-center gap-1.5"><Users size={16} /> Online Teachers</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('ai')}
                                    className={`pb-1.5 font-bold text-sm transition-colors border-b-2 px-1 ${activeTab === 'ai'
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
                                                    const isOnline = onlineUsers.includes(teacher._id) || teacher._id === 't1' || teacher._id === 't2'; // simulate online status for dr. sarah and prof. james
                                                    return (
                                                        <div
                                                            key={teacher._id}
                                                            className="flex justify-between items-center p-3.5 bg-slate-50 hover:bg-slate-105 rounded-2xl border border-slate-150 transition-colors"
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
                                                                    <div className="flex items-center gap-1.5">
                                                                        <h4 className="text-xs font-bold text-slate-700">{teacher.name}</h4>
                                                                        {isOnline && (
                                                                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-black rounded-full uppercase tracking-wider animate-pulse">Online</span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[10px] text-slate-400 font-medium">{teacher.email}</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    disabled={isReadOnly}
                                                                    onClick={() => handleTeacherCall(teacher, 'audio')}
                                                                    className={`p-2 bg-pink-50 text-pink-650 rounded-xl transition-colors border border-pink-100 ${isReadOnly ? 'opacity-40 cursor-not-allowed' : 'hover:bg-pink-100'
                                                                        }`}
                                                                    title="Voice Call"
                                                                >
                                                                    <Phone size={14} />
                                                                </button>
                                                                <button
                                                                    disabled={isReadOnly}
                                                                    onClick={() => handleTeacherCall(teacher, 'video')}
                                                                    className={`p-2 bg-purple-50 text-purple-650 rounded-xl transition-colors border border-purple-100 ${isReadOnly ? 'opacity-40 cursor-not-allowed' : 'hover:bg-purple-100'
                                                                        }`}
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
                                    <div className="border border-indigo-50 bg-indigo-50/20 rounded-xl p-3 flex items-start gap-2.5 text-[10px] text-indigo-700/80 font-bold leading-normal mt-4 text-left">
                                        <Shield size={14} className="shrink-0 mt-0.5" />
                                        <span>Clicking voice or video call starts a secure WebRTC calling line with the teacher. Make sure they are online and active in their dashboard.</span>
                                    </div>
                                </div>
                            )}

                            {/* Tab Content 2: AI Partner */}
                            {activeTab === 'ai' && (
                                <div className="flex-1 flex flex-col justify-between mt-4">
                                    <div className="space-y-4">
                                        <p className="text-xs text-slate-550">Configure your simulation role and click start to call.</p>

                                        {/* Grid of Roles */}
                                        <div className="grid grid-cols-2 gap-3">
                                            {Object.entries(aiScenarios).map(([key, sc]) => (
                                                <div
                                                    key={key}
                                                    onClick={() => setAiRole(key)}
                                                    className={`p-3 rounded-2xl border cursor-pointer text-left transition-all ${aiRole === key
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

                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-[11px] text-slate-505 font-medium leading-relaxed text-left">
                                            <strong>Scenario Objective:</strong> {aiScenarios[aiRole].description}
                                        </div>
                                    </div>

                                    {/* Big Trigger Call button */}
                                    <button
                                        disabled={isReadOnly}
                                        onClick={startAiCall}
                                        className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-all duration-200 mt-6 text-white ${isReadOnly
                                            ? 'bg-slate-350 cursor-not-allowed opacity-60 shadow-none'
                                            : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10 hover:shadow-emerald-500/20'
                                            }`}
                                    >
                                        <Phone className="animate-pulse" size={16} />
                                        <span>{isReadOnly ? 'Workspace Read-Only' : 'Start Practice Call Partner'}</span>
                                    </button>
                                </div>
                            )}

                        </div>

                        {/* Draft Content Card */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 mb-6">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider flex items-center justify-between">
                                <span>Draft Content</span>
                                <span className="text-xs px-2 py-0.5 bg-yellow-105 text-yellow-800 font-bold rounded-full">
                                    {drafts.length} Drafts
                                </span>
                            </h3>

                            {drafts.length === 0 ? (
                                <p className="text-xs text-slate-405 italic text-center py-6">
                                    No draft call logs. End a practice call to see drafts here.
                                </p>
                            ) : (
                                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                                    {drafts.map((draft, index) => (
                                        <div key={draft.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-150 hover:border-slate-350 transition-colors">
                                            <div className="flex flex-col gap-1.5 flex-1 min-w-0 text-left">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">
                                                        {draft.name || `Call Draft`}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold">
                                                        {draft.type} • Duration: {draft.duration} • Status: {draft.status}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-450 font-bold">
                                                    {draft.date}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {/* Play/Pause Button */}
                                                {(draft.audioUrl || draft.audioBlob) && (
                                                    <button
                                                        onClick={() => handleToggleAudio(draft)}
                                                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                                            playingAudioId === draft.id
                                                                ? 'bg-red-50 text-red-650 border-red-200 animate-pulse'
                                                                : 'bg-indigo-50 text-indigo-650 border-indigo-200 hover:bg-indigo-105'
                                                        }`}
                                                        title={playingAudioId === draft.id ? "Pause Recording" : "Play Recording"}
                                                    >
                                                        {playingAudioId === draft.id ? <Square size={14} className="text-red-500" /> : <Play size={14} />}
                                                    </button>
                                                )}
                                                {/* Save Button */}
                                                <button
                                                    onClick={() => handleSaveDraft(draft)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-750 transition-all active:scale-95 shadow-sm cursor-pointer"
                                                    title="Save Call Log"
                                                >
                                                    <Save size={14} />
                                                    <span>Save</span>
                                                </button>
                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => handleDeleteDraft(draft.id)}
                                                    className="px-3 py-1.5 bg-white text-slate-805 border-2 border-slate-800 rounded-xl text-xs font-black uppercase hover:bg-slate-50 transition-all cursor-pointer"
                                                    title="Delete Draft"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent Call Logs Card */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider flex items-center justify-between">
                                <span>Recent Call Logs</span>
                                <span className="text-xs px-2 py-0.5 bg-pink-100 text-pink-800 font-bold rounded-full">
                                    {filteredLocalLogs.length} Saved
                                </span>
                            </h3>

                            {filteredLocalLogs.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-6">
                                    No local call logs found. Start a practice call to see them here.
                                </p>
                            ) : (
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                                    {filteredLocalLogs.map((item, index) => (
                                        <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors">
                                            <div className="flex flex-col gap-1.5 flex-1 min-w-0 text-left">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider font-sans">
                                                        {item.name || `Call Log ${filteredLocalLogs.length - index}`}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold font-sans">
                                                        {item.type} • Duration: {item.duration} • Status: {item.status}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-450 font-bold font-sans">
                                                    {item.date}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {/* Play/Pause Button */}
                                                {item.audioId && (
                                                    <button
                                                        onClick={() => handleToggleAudio(item)}
                                                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                                            playingAudioId === item.id
                                                                ? 'bg-red-50 text-red-650 border-red-200 animate-pulse'
                                                                : 'bg-indigo-50 text-indigo-650 border-indigo-200 hover:bg-indigo-105'
                                                        }`}
                                                        title={playingAudioId === item.id ? "Pause Recording" : "Play Recording"}
                                                    >
                                                        {playingAudioId === item.id ? <Square size={14} className="text-red-500" /> : <Play size={14} />}
                                                    </button>
                                                )}
                                                {/* Sync with Cloud Indicator / Sync Button */}
                                                {item.synced ? (
                                                    <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold font-sans">
                                                        <CheckCircle size={14} className="text-emerald-600" />
                                                        <span>Synced</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        disabled={isReadOnly}
                                                        onClick={() => handleSyncSingleWithCloud(item)}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 border border-pink-200 text-pink-700 rounded-xl text-[10px] font-extrabold transition-all font-sans ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-pink-100'}`}
                                                        title="Sync with Cloud"
                                                    >
                                                        <Cloud size={14} />
                                                        <span className="text-[9px] leading-none text-left">Not Sync<br />Click to Sync</span>
                                                    </button>
                                                )}

                                                {/* Google Drive Sync Indicator / Sync Button */}
                                                {item.driveSynced ? (
                                                    <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold font-sans">
                                                        <CheckCircle size={14} className="text-amber-600" />
                                                        <span>Drive Synced</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        disabled={isReadOnly}
                                                        onClick={() => handleSyncSingleWithDrive(item)}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-805 rounded-xl text-[10px] font-extrabold transition-all font-sans ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-amber-100'}`}
                                                        title="Sync with Google Drive"
                                                    >
                                                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                                                            <path fill="#FFC107" d="M17 6h14l13 22H30L17 6z" />
                                                            <path fill="#FF3D00" d="m15.5 11.5-8.5 15L17 42h13L15.5 11.5z" />
                                                            <path fill="#4CAF50" d="M44 28H15.5L30 42h14z" />
                                                        </svg>
                                                        <span className="text-[9px] leading-none text-left">Not Sync<br />Click to Sync</span>
                                                    </button>
                                                )}

                                                {/* Delete Button */}
                                                {!isReadOnly && (
                                                    <button
                                                        onClick={() => handleDeleteLog(item.id)}
                                                        className="p-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all active:scale-95 shadow-sm"
                                                        title="Delete Call Log"
                                                    >
                                                        <Trash size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Right Column: Source Settings */}
                    <div className="lg:col-span-3 space-y-6 text-left">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Source</h3>

                            {/* Device togglers */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Microphone</span>
                                    <button
                                        onClick={() => setMicEnabled(!micEnabled)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-colors ${micEnabled ? 'bg-emerald-50 border-emerald-250 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                                            }`}
                                    >
                                        {micEnabled ? 'ACTIVE' : 'MUTED'}
                                    </button>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Camera</span>
                                    <button
                                        onClick={() => setCameraEnabled(!cameraEnabled)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-colors ${cameraEnabled ? 'bg-emerald-50 border-emerald-250 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'
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
                                    <span className="font-bold text-slate-600 font-sans">P2P Connection</span>
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black font-sans">EXCELLENT</span>
                                </div>
                            </div>

                            {/* Call Limit */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                                    <Clock size={14} /> Call Limit
                                </label>
                                <select
                                    value={callLimit}
                                    onChange={(e) => setCallLimit(parseInt(e.target.value))}
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 font-sans"
                                >
                                    <option value={5}>5 Minutes</option>
                                    <option value={10}>10 Minutes</option>
                                    <option value={30}>30 Minutes</option>
                                </select>
                            </div>

                            {/* Auto-Recording */}
                            <div className="flex justify-between items-center p-3 bg-pink-50/40 border border-pink-100 rounded-xl">
                                <div className="text-left">
                                    <span className="text-[11px] font-black text-pink-850 uppercase tracking-wide font-sans">Call Recording</span>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 font-sans">Saves Call logs</p>
                                </div>
                                <span className="px-2 py-0.5 bg-pink-600 text-white text-[8px] font-black rounded-md uppercase tracking-wider shadow-sm font-sans">
                                    AUTO
                                </span>
                            </div>

                            {/* Additional Settings */}
                            <details className="group border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                                <summary className="list-none flex justify-between items-center cursor-pointer text-xs font-bold text-slate-600 select-none font-sans">
                                    <span className="flex items-center gap-1.5"><Settings size={14} /> Advanced settings</span>
                                    <span className="transition-transform group-open:rotate-180">▼</span>
                                </summary>
                                <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 text-xs">
                                    <div className="flex items-center justify-between font-sans">
                                        <span className="text-slate-500">Video Call Bitrate</span>
                                        <select className="bg-white border border-slate-200 rounded p-1 font-medium text-[10px]">
                                            <option>Auto (Adaptive)</option>
                                            <option>High (1.5 Mbps)</option>
                                            <option>Low (500 kbps)</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center justify-between font-sans">
                                        <span className="text-slate-500">Bypass TURN Server</span>
                                        <input type="checkbox" className="rounded text-pink-600 focus:ring-pink-500" />
                                    </div>
                                </div>
                            </details>
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
                onSaveSuccess={(driveData) => {
                    toast.success("Saved to Google Drive!");
                    if (driveFileMeta.itemId) {
                        const driveFileViewUrl = driveData?.id
                            ? `https://drive.google.com/file/d/${driveData.id}/view`
                            : driveData?.webViewLink || null;

                        setCallLogs(prev => {
                            const updated = prev.map(log =>
                                log.id === driveFileMeta.itemId
                                    ? { ...log, driveSynced: true, driveUrl: driveFileViewUrl }
                                    : log
                            );
                            localStorage.setItem('practice_call_logs', JSON.stringify(updated));
                            return updated;
                        });
                    } else if (callLogs.length > 0) {
                        setCallLogs(prev => {
                            const updated = [...prev];
                            updated[0].driveSynced = true;
                            localStorage.setItem('practice_call_logs', JSON.stringify(updated));
                            return updated;
                        });
                    }
                    fetchCloudFiles();
                }}
            />

            {/* Local Storage Virtual History Modal */}
            <LocalHistoryModal
                isOpen={localHistoryModalOpen}
                readOnly={isReadOnly}
                onClose={() => {
                    setLocalHistoryModalOpen(false);
                    loadLocalLogs();
                }}
                onRefresh={() => {
                    loadLocalLogs();
                }}
            />

            {/* Cloud Gallery Center Modal */}
            {cloudGalleryModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left font-sans">
                    <div className="bg-[#f5f5f5] rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden relative flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center shrink-0">
                                    <Database className="text-pink-600" size={18} />
                                </div>
                                <div>
                                    <span className="font-extrabold text-slate-800 text-sm tracking-tight block">Cloud Storage</span>
                                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                                        {filteredCloudFiles.length} Cloud Logs • {(cloudSpace.used / (1024 * 1024)).toFixed(1)} MB / 300 MB used
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setCloudGalleryModalOpen(false)}
                                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Space limit bar */}
                        <div className="px-6 pt-4 shrink-0">
                            <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                <div className="flex justify-between items-center text-[9px] text-slate-400 font-black uppercase tracking-wider">
                                    <span>Cloud Space Limit</span>
                                    <span>{(cloudSpace.used / (1024 * 1024)).toFixed(1)} MB / 300 MB</span>
                                </div>
                                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-300">
                                    <div
                                        className="bg-pink-600 h-full transition-all duration-300"
                                        style={{ width: `${Math.min(100, (cloudSpace.used / cloudSpace.limit) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* Cloud Files List */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                            {cloudLoading ? (
                                <div className="text-center py-10 text-xs text-slate-400 animate-pulse font-bold uppercase tracking-wider">
                                    Loading Cloud Data...
                                </div>
                            ) : filteredCloudFiles.length === 0 ? (
                                <div className="text-center py-10">
                                    <Database className="mx-auto text-slate-300 mb-3" size={36} />
                                    <p className="text-xs text-slate-400 italic font-medium">No cloud logs found.</p>
                                    <p className="text-[10px] text-slate-400 mt-1">Click "Sync with Cloud" on any saved call log to upload.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredCloudFiles.map(file => (
                                        <div key={file._id} className="p-4 bg-slate-50 rounded-2xl border border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-350 transition-colors text-left">
                                            <div className="min-w-0 text-left col-span-2">
                                                <h4 className="text-xs font-bold text-slate-700 truncate">{file.filename}</h4>
                                                <p className="text-[10px] text-slate-400 mt-0.5 font-sans">
                                                    Duration: {file.metadata?.duration || 'N/A'} • Size: {(file.size / 1024).toFixed(1)} KB
                                                </p>
                                                <span className="text-[9px] text-slate-350 block mt-1 font-sans">{new Date(file.createdAt).toLocaleString()}</span>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <a
                                                    href={file.fileUrl}
                                                    download={file.filename}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 hover:bg-slate-200 rounded-xl text-slate-455 hover:text-slate-700 transition-colors border border-slate-200"
                                                    title="Download File"
                                                >
                                                    <Download size={14} />
                                                </a>
                                                {!isReadOnly && (
                                                    <button
                                                        onClick={() => handleDeleteCloudFile(file._id)}
                                                        className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-colors border border-slate-200 hover:border-red-200"
                                                        title="Delete from Cloud"
                                                    >
                                                        <Trash size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-end">
                            <button
                                onClick={() => setCloudGalleryModalOpen(false)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </DashboardLayout>
    );
};

export default WebCallingPage;
