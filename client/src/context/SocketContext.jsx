import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, ShieldAlert, Video, VideoOff } from 'lucide-react';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [guestInfo, setGuestInfo] = useState(null);
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);

    const registerGuest = (name, email) => {
        const guestId = 'guest_' + email.replace(/[^a-zA-Z0-9]/g, '_');
        setGuestInfo({
            _id: guestId,
            name: name,
            role: 'Student'
        });
    };
    
    // Call States: idle, dialing, incoming, connected, offline, declined, ended
    const [callState, setCallState] = useState('idle'); 
    const [callInfo, setCallInfo] = useState({
        targetId: '',
        targetName: '',
        targetRole: '',
        callLogId: '',
        isCaller: false,
        callType: 'audio' // 'audio' | 'video'
    });
    
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    const socketRef = useRef(null);
    const pcRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const iceCandidatesQueueRef = useRef([]);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const audioCtxRef = useRef(null);
    const ringIntervalRef = useRef(null);
    const callStateRef = useRef(callState);
    const callInfoRef = useRef(callInfo);

    useEffect(() => {
        callStateRef.current = callState;
    }, [callState]);

    useEffect(() => {
        callInfoRef.current = callInfo;
    }, [callInfo]);

    // Dynamic Ringtone Generator using Web Audio API
    const startRingtone = (isRingback = false) => {
        try {
            stopRingtone();
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContextClass();
            audioCtxRef.current = audioCtx;

            const playTone = () => {
                if (!audioCtxRef.current) return;
                const osc1 = audioCtx.createOscillator();
                const osc2 = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();

                osc1.type = 'sine';
                osc2.type = 'sine';

                if (isRingback) {
                    // Standard ringback tone (low pitch dual tone: 440Hz and 480Hz)
                    osc1.frequency.value = 440;
                    osc2.frequency.value = 480;
                    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
                    gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime + 1.8);
                    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 2.0);
                } else {
                    // Standard incoming ring (cheerful dual tone: 660Hz and 880Hz)
                    osc1.frequency.value = 660;
                    osc2.frequency.value = 880;
                    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
                    gainNode.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.15);
                    gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime + 1.2);
                    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
                }

                osc1.connect(gainNode);
                osc2.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                osc1.start();
                osc2.start();

                setTimeout(() => {
                    try {
                        osc1.stop();
                        osc2.stop();
                    } catch (e) {}
                }, isRingback ? 2000 : 1500);
            };

            playTone();
            ringIntervalRef.current = setInterval(playTone, isRingback ? 4000 : 2500);
        } catch (err) {
            console.error('Failed to play ringtone:', err);
        }
    };

    const stopRingtone = () => {
        if (ringIntervalRef.current) {
            clearInterval(ringIntervalRef.current);
            ringIntervalRef.current = null;
        }
        if (audioCtxRef.current) {
            try {
                audioCtxRef.current.close();
            } catch (e) {}
            audioCtxRef.current = null;
        }
    };

    // Clean up local WebRTC Stream
    const cleanMedia = () => {
        // Stop recording if active
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try {
                mediaRecorderRef.current.stop();
                console.log('[WebRTC Recording] Stopped.');
            } catch (e) {
                console.error('[WebRTC Recording] Error stopping:', e);
            }
            mediaRecorderRef.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
        }
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }
        remoteStreamRef.current = null;
        setIsMuted(false);
        setIsCameraOff(false);
    };

    // Mix local and remote streams and record audio (Teacher side only)
    const startRecording = (localStream, remoteStream) => {
        const activeUser = user || guestInfo;
        if (!activeUser || activeUser.role !== 'Teacher') return;
        
        try {
            console.log('[WebRTC Recording] Initializing audio mix...');
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const mixContext = new AudioContextClass();
            
            const localSource = mixContext.createMediaStreamSource(localStream);
            const remoteSource = mixContext.createMediaStreamSource(remoteStream);
            const mixDestination = mixContext.createMediaStreamDestination();
            
            localSource.connect(mixDestination);
            remoteSource.connect(mixDestination);
            
            const mixedStream = mixDestination.stream;
            audioChunksRef.current = [];
            
            // Check supported mime types
            let options = { mimeType: 'audio/webm' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = { mimeType: 'audio/ogg' };
            }
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = {}; // Fallback to default
            }

            const mediaRecorder = new MediaRecorder(mixedStream, options);
            mediaRecorderRef.current = mediaRecorder;
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };
            
            mediaRecorder.onstop = async () => {
                console.log('[WebRTC Recording] Stopped. Preparing upload...');
                const blobType = options.mimeType || 'audio/webm';
                const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
                
                // Get the callLogId from state or ref
                const logId = callInfo.callLogId;
                if (logId) {
                    const formData = new FormData();
                    formData.append('recording', audioBlob, 'recording.webm');
                    
                    try {
                        const response = await fetch(`/api/calls/recordings/${logId}`, {
                            method: 'POST',
                            body: formData
                        });
                        const data = await response.json();
                        if (data.success) {
                            console.log('[WebRTC Recording] Uploaded successfully:', data.recordingUrl);
                        } else {
                            console.error('[WebRTC Recording] Upload failed:', data.message);
                        }
                    } catch (error) {
                        console.error('[WebRTC Recording] Error uploading audio:', error);
                    }
                } else {
                    console.warn('[WebRTC Recording] No callLogId found. Cannot upload recording.');
                }
                
                try {
                    mixContext.close();
                } catch (e) {}
            };
            
            mediaRecorder.start(1000); // 1-second chunks
            console.log('[WebRTC Recording] Started.');
        } catch (err) {
            console.error('[WebRTC Recording] Failed to start:', err);
        }
    };

    useEffect(() => {
        const activeUser = user || guestInfo;
        if (!activeUser) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                setSocket(null);
            }
            return;
        }

        const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;
        const s = io(socketUrl, {
            withCredentials: true,
            transports: ['websocket', 'polling']
        });

        socketRef.current = s;
        setSocket(s);

        s.on('connect', () => {
            console.log('[SOCKET] Connected to signaling server');
            s.emit('register', { userId: activeUser._id, role: activeUser.role, name: activeUser.name });
            s.emit('get-online-users', (users) => {
                setOnlineUsers(users);
            });
        });

        s.on('online-status-update', (users) => {
            setOnlineUsers(users);
        });

        // Incoming Call handler
        s.on('incoming-call', ({ offer, callerId, callerName, callLogId, callType }) => {
            console.log('[SOCKET] Incoming call from', callerName, 'type:', callType);
            // Ignore if already in a call
            if (callStateRef.current !== 'idle') {
                s.emit('reject-call', { callerId, callLogId });
                return;
            }

            iceCandidatesQueueRef.current = []; // Clear candidate queue for new incoming call
            setCallState('incoming');
            setCallInfo({
                targetId: callerId,
                targetName: callerName,
                targetRole: activeUser.role === 'Teacher' ? 'Student' : 'Teacher',
                callLogId,
                isCaller: false,
                callType: callType === 'video' ? 'video' : 'audio',
                offer
            });
            startRingtone(false);
        });

        // Call Accepted handler
        s.on('call-accepted', async ({ answer, callLogId }) => {
            console.log('[SOCKET] Call accepted');
            stopRingtone();
            setCallState('connected');
            setCallInfo(prev => ({ ...prev, callLogId }));
            
            try {
                if (pcRef.current) {
                    await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
                    await processQueuedCandidates(); // Process any queued candidates
                }
            } catch (err) {
                console.error('[WebRTC] Error setting remote description:', err);
                toast.error('WebRTC connection failed');
                handleEndCallLocally('ended');
            }
        });

        // Call Rejected handler
        s.on('call-rejected', () => {
            console.log('[SOCKET] Call rejected');
            toast.error('Call declined');
            handleEndCallLocally('declined');
        });

        // User Offline handler
        s.on('user-offline', () => {
            console.log('[SOCKET] User offline');
            toast.error('User is offline');
            handleEndCallLocally('offline');
        });

        // Call Ended handler
        s.on('call-ended', () => {
            console.log('[SOCKET] Call ended by remote peer');
            toast.success('Call ended');
            handleEndCallLocally('ended');
        });

        s.on('ice-candidate', async ({ candidate }) => {
            try {
                if (pcRef.current && pcRef.current.remoteDescription) {
                    await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                } else {
                    iceCandidatesQueueRef.current.push(candidate);
                }
            } catch (err) {
                console.error('[WebRTC] Error adding ICE candidate:', err);
            }
        });

        s.on('disconnect', () => {
            console.log('[SOCKET] Disconnected');
            handleEndCallLocally('ended');
        });

        return () => {
            s.disconnect();
            stopRingtone();
            cleanMedia();
        };
    }, [user, guestInfo]);

    // Duration timer for active calls
    useEffect(() => {
        if (callState === 'connected') {
            setCallDuration(0);
            timerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [callState]);

    // Automatically set video sources when the call connects and elements mount
    useEffect(() => {
        if (callState === 'connected' && callInfo.callType === 'video') {
            const bindVideoStreams = () => {
                if (localVideoRef.current && localStreamRef.current) {
                    if (localVideoRef.current.srcObject !== localStreamRef.current) {
                        localVideoRef.current.srcObject = localStreamRef.current;
                        localVideoRef.current.play().catch(err => console.error('[WebRTC] Local video play error:', err));
                    }
                }
                if (remoteVideoRef.current && remoteAudioRef.current?.srcObject) {
                    const remoteStream = remoteAudioRef.current.srcObject;
                    if (remoteVideoRef.current.srcObject !== remoteStream) {
                        remoteVideoRef.current.srcObject = remoteStream;
                        remoteVideoRef.current.play().catch(err => console.error('[WebRTC] Remote video play error:', err));
                    }
                }
            };
            bindVideoStreams();
            // Tiny delay to guarantee elements are painted and refs are updated
            const timer = setTimeout(bindVideoStreams, 100);
            const timer2 = setTimeout(bindVideoStreams, 500);
            return () => {
                clearTimeout(timer);
                clearTimeout(timer2);
            };
        }
    }, [callState, callInfo.callType]);

    const handleEndCallLocally = (finalState) => {
        stopRingtone();
        cleanMedia();
        iceCandidatesQueueRef.current = []; // Clear ICE candidates queue
        
        // If we are already idle, there is no active call to end, so we shouldn't show any ending popup.
        if (callStateRef.current === 'idle') {
            return;
        }

        if (finalState === 'idle') {
            setCallState('idle');
            setCallInfo({
                targetId: '',
                targetName: '',
                targetRole: '',
                callLogId: '',
                isCaller: false
            });
            setCallDuration(0);
            return;
        }

        setCallState(finalState);
        setTimeout(() => {
            setCallState('idle');
            setCallInfo({
                targetId: '',
                targetName: '',
                targetRole: '',
                callLogId: '',
                isCaller: false,
                callType: 'audio'
            });
            setCallDuration(0);
        }, 2500);
    };

    // Helper to process queued ICE candidates after remote description is set
    const processQueuedCandidates = async () => {
        if (!pcRef.current || !pcRef.current.remoteDescription) return;
        
        console.log(`[WebRTC] Draining ${iceCandidatesQueueRef.current.length} queued ICE candidates`);
        while (iceCandidatesQueueRef.current.length > 0) {
            const candidate = iceCandidatesQueueRef.current.shift();
            try {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.error('[WebRTC] Error adding queued ICE candidate:', err);
            }
        }
    };

    // Initialize WebRTC connection
    const initializePeerConnection = (targetId, callType) => {
        remoteStreamRef.current = new MediaStream();
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit('ice-candidate', {
                    targetId,
                    candidate: event.candidate
                });
            }
        };
        pc.ontrack = (event) => {
            console.log('[WebRTC] Remote track received:', event.track.kind);
            if (remoteStreamRef.current) {
                remoteStreamRef.current.addTrack(event.track);
            }

            if (event.track.kind === 'audio' && remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = remoteStreamRef.current;
                remoteAudioRef.current.volume = 1.0;
                remoteAudioRef.current.play()
                    .then(() => {
                        console.log('[WebRTC] Remote audio playing successfully');
                        const activeUser = user || guestInfo;
                        if (activeUser && activeUser.role === 'Teacher' && localStreamRef.current) {
                            startRecording(localStreamRef.current, remoteStreamRef.current);
                        }
                    })
                    .catch(e => {
                        console.error('[WebRTC] Audio play failed, trying on user interaction:', e);
                        const playOnGesture = () => {
                            if (remoteAudioRef.current) {
                                remoteAudioRef.current.play()
                                    .then(() => {
                                        console.log('[WebRTC] Audio played on user gesture');
                                        document.removeEventListener('click', playOnGesture);
                                    })
                                    .catch(err => console.error('[WebRTC] Gesture play failed:', err));
                            }
                        };
                        document.addEventListener('click', playOnGesture);
                    });
            }
        };

        pcRef.current = pc;
        return pc;
    };
    // Actions
    const callUser = async (targetId, targetName, targetRole, callType = 'audio') => {
        if (!socketRef.current) return;

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            toast.error('Calling requires a secure connection (HTTPS) or is not supported by your browser.');
            return;
        }
        console.log('[CALL] Calling user:', targetId);
        if (remoteAudioRef.current) {
            remoteAudioRef.current.play().catch(() => {});
        }
        setCallState('dialing');
        setCallInfo({
            targetId,
            targetName,
            targetRole,
            callLogId: '',
            isCaller: true,
            callType
        });

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: callType === 'video'
            });
            localStreamRef.current = stream;

            if (callType === 'video' && localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            const pc = initializePeerConnection(targetId, callType);
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            startRingtone(true); // Play ringback

            const activeUser = user || guestInfo;
            socketRef.current.emit('call-user', {
                targetId,
                offer,
                callerName: activeUser ? activeUser.name : 'Guest Student',
                callerId: activeUser ? activeUser._id : '',
                callType
            });
        } catch (err) {
            console.error('[CALL] Media capture or WebRTC failed:', err);
            toast.error(callType === 'video' ? 'Could not access camera/microphone' : 'Could not access microphone');
            handleEndCallLocally('idle');
        }
    };

    const acceptCall = async () => {
        if (!socketRef.current || !callInfo.targetId) return;
        
        stopRingtone();
        const callType = callInfo.callType || 'audio';
        if (remoteAudioRef.current) {
            remoteAudioRef.current.play().catch(() => {});
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            toast.error('Calling requires a secure connection (HTTPS) or is not supported by your browser.');
            socketRef.current.emit('reject-call', {
                callerId: callInfo.targetId,
                callLogId: callInfo.callLogId
            });
            handleEndCallLocally('idle');
            return;
        }

        console.log('[CALL] Accepting call from:', callInfo.targetId);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: callType === 'video'
            });
            localStreamRef.current = stream;

            if (callType === 'video' && localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            const pc = initializePeerConnection(callInfo.targetId, callType);
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
            await pc.setRemoteDescription(new RTCSessionDescription(callInfo.offer || pcRef.current?.remoteDescription));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await processQueuedCandidates();

            setCallState('connected');
            socketRef.current.emit('accept-call', {
                callerId: callInfo.targetId,
                answer,
                callLogId: callInfo.callLogId
            });        } catch (err) {
            console.error('[CALL] Failed accepting call:', err);
            toast.error('Could not connect call');
            socketRef.current.emit('reject-call', {
                callerId: callInfo.targetId,
                callLogId: callInfo.callLogId
            });
            handleEndCallLocally('idle');
        }
    };

    const rejectCall = () => {
        if (!socketRef.current || !callInfo.targetId) return;
        
        console.log('[CALL] Rejecting call');
        socketRef.current.emit('reject-call', {
            callerId: callInfo.targetId,
            callLogId: callInfo.callLogId
        });
        handleEndCallLocally('idle');
    };

    const endCall = () => {
        if (!socketRef.current || !callInfo.targetId) return;

        console.log('[CALL] Ending call');
        socketRef.current.emit('end-call', {
            targetId: callInfo.targetId,
            callLogId: callInfo.callLogId
        });
        handleEndCallLocally('ended');
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleCamera = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCameraOff(!videoTrack.enabled);
            }
        }
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const isVideoCall = callInfo.callType === 'video';

    return (
        <SocketContext.Provider value={{
            socket,
            onlineUsers,
            callState,
            callInfo,
            callDuration,
            isMuted,
            isCameraOff,
            callUser,
            acceptCall,
            rejectCall,
            endCall,
            toggleMute,
            toggleCamera,
            registerGuest
        }}>
            {children}

            {/* Live Call Overlay System */}
            {callState !== 'idle' && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all duration-300">
                    <div className={`bg-white/80 border border-white/20 backdrop-blur-xl rounded-[40px] shadow-2xl p-8 ${isVideoCall && callState === 'connected' ? 'max-w-2xl' : 'max-w-sm'} w-full mx-4 flex flex-col items-center text-center transform scale-100 transition-transform duration-300 relative overflow-hidden`}>
                        
                        {/* Glassmorphic Background Glow */}
                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 -mr-10 -mt-10 transition-colors duration-500 ${
                            callState === 'connected' ? 'bg-emerald-500' :
                            callState === 'incoming' ? 'bg-purple-500' :
                            callState === 'dialing' ? 'bg-indigo-500' : 'bg-red-500'
                        }`}></div>

                        {/* Title / Role */}
                        <span className="text-[10px] font-black tracking-widest text-indigo-600 uppercase mb-2 block flex items-center gap-1.5">
                            {isVideoCall ? <Video size={12} /> : <Phone size={12} />}
                            {callInfo.targetRole} {isVideoCall ? 'Video' : 'Voice'} Connection
                        </span>

                        {/* Video stage: shown only for connected video calls */}
                        {isVideoCall && callState === 'connected' ? (
                            <div className="relative w-full mb-6 mt-2 rounded-3xl overflow-hidden bg-slate-800 aspect-video">
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover bg-slate-800"
                                />
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="absolute bottom-3 right-3 w-24 h-32 object-cover rounded-2xl border-2 border-white/40 shadow-lg bg-slate-700"
                                />
                                {isCameraOff && (
                                    <div className="absolute top-3 left-3 bg-red-500 text-white p-1.5 rounded-full shadow-md">
                                        <VideoOff size={12} />
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Caller Icon / Avatar - used for audio calls and pre-connected video states */
                            <div className="relative mb-6 mt-4">
                                {/* Animated rings for active state */}
                                {(callState === 'incoming' || callState === 'dialing' || callState === 'connected') && (
                                    <div className={`absolute inset-0 rounded-full animate-ping opacity-25 scale-125 border-4 ${
                                        callState === 'connected' ? 'border-emerald-500' :
                                        callState === 'incoming' ? 'border-purple-500' : 'border-indigo-500'
                                    }`}></div>
                                )}

                                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-xl border-4 border-white transition-all duration-500 ${
                                    callState === 'connected' ? 'bg-emerald-500' :
                                    callState === 'incoming' ? 'bg-purple-500' :
                                    callState === 'dialing' ? 'bg-indigo-500' : 'bg-slate-400'
                                }`}>
                                    {callInfo.targetName ? callInfo.targetName[0] : (isVideoCall ? <Video size={36} /> : <Phone size={36} />)}
                                </div>

                                {/* Mute indicator badge */}
                                {isMuted && callState === 'connected' && (
                                    <div className="absolute bottom-0 right-0 bg-red-500 text-white p-2 rounded-full border-2 border-white shadow-md">
                                        <MicOff size={14} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Name & Subtitle */}
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">
                            {callInfo.targetName || 'User'}
                        </h3>

                        {/* Current call state details */}
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-8">
                            {callState === 'dialing' && (isVideoCall ? 'Starting Video Call...' : 'Dialing Out...')}
                            {callState === 'incoming' && (isVideoCall ? 'Incoming Video Call...' : 'Incoming Call...')}
                            {callState === 'connected' && `Connected (${formatTime(callDuration)})`}
                            {callState === 'offline' && 'User is Offline'}
                            {callState === 'declined' && 'Call Declined'}
                            {callState === 'ended' && 'Call Ended'}
                        </p>

                        {/* Bouncing Audio Wave Visualizer (connected audio call only) */}
                        {callState === 'connected' && !isMuted && !isVideoCall && (
                            <div className="flex items-center gap-1 mb-8 h-6 select-none">
                                {[...Array(5)].map((_, i) => (
                                    <span 
                                        key={i} 
                                        className="w-1 bg-emerald-500 rounded-full animate-bounce"
                                        style={{ 
                                            height: '100%', 
                                            animationDuration: `${0.6 + i * 0.15}s`,
                                            animationDelay: `${i * 0.1}s`
                                        }}
                                    ></span>
                                ))}
                            </div>
                        )}

                        {/* Action Control Panel */}
                        <div className="flex items-center justify-center gap-6 w-full mt-2">
                            {callState === 'incoming' && (
                                <>
                                    <button 
                                        onClick={rejectCall}
                                        className="w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
                                        title="Reject Call"
                                    >
                                        <PhoneOff size={24} />
                                    </button>
                                    <button 
                                        onClick={acceptCall}
                                        className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg animate-pulse transition-transform active:scale-95"
                                        title="Accept Call"
                                    >
                                        {isVideoCall ? <Video size={24} /> : <Phone size={24} />}
                                    </button>
                                </>
                            )}

                            {callState === 'dialing' && (
                                <button 
                                    onClick={endCall}
                                    className="w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
                                    title="Cancel Call"
                                >
                                    <PhoneOff size={24} />
                                </button>
                            )}

                            {callState === 'connected' && (
                                <>
                                    <button 
                                        onClick={toggleMute}
                                        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95 ${
                                            isMuted ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-slate-100 text-slate-655 hover:bg-slate-200 border border-slate-200'
                                        }`}
                                        title={isMuted ? "Unmute Mic" : "Mute Mic"}
                                    >
                                        {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                                    </button>

                                    {isVideoCall && (
                                        <button 
                                            onClick={toggleCamera}
                                            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95 ${
                                                isCameraOff ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-slate-100 text-slate-655 hover:bg-slate-200 border border-slate-200'
                                            }`}
                                            title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                                        >
                                            {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
                                        </button>
                                    )}
                                    
                                    <button 
                                        onClick={endCall}
                                        className="w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-xl transition-transform active:scale-95"
                                        title="End Call"
                                    >
                                        <PhoneOff size={24} />
                                    </button>
                                </>
                            )}

                            {(callState === 'offline' || callState === 'declined' || callState === 'ended') && (
                                <div className="text-red-500 p-2 rounded-full bg-red-50 border border-red-100 flex items-center justify-center animate-pulse">
                                    <ShieldAlert size={24} />
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}
            {/* Hidden Audio element for WebRTC Remote Stream */}
            <audio ref={remoteAudioRef} autoPlay playsInline style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }} />
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);