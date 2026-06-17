import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, ShieldAlert } from 'lucide-react';
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
        isCaller: false
    });
    
    const [isMuted, setIsMuted] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    const socketRef = useRef(null);
    const pcRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteAudioRef = useRef(new Audio());
    const timerRef = useRef(null);
    const audioCtxRef = useRef(null);
    const ringIntervalRef = useRef(null);
    const callStateRef = useRef(callState);

    useEffect(() => {
        callStateRef.current = callState;
    }, [callState]);

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
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        remoteAudioRef.current.srcObject = null;
        setIsMuted(false);
    };

    // Handle Socket initialization
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
        s.on('incoming-call', ({ offer, callerId, callerName, callLogId }) => {
            console.log('[SOCKET] Incoming call from', callerName);
            // Ignore if already in a call
            if (callStateRef.current !== 'idle') {
                s.emit('reject-call', { callerId, callLogId });
                return;
            }

            setCallState('incoming');
            setCallInfo({
                targetId: callerId,
                targetName: callerName,
                targetRole: activeUser.role === 'Teacher' ? 'Student' : 'Teacher',
                callLogId,
                isCaller: false
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
                if (pcRef.current) {
                    await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
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

    const handleEndCallLocally = (finalState) => {
        stopRingtone();
        cleanMedia();
        
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
                isCaller: false
            });
            setCallDuration(0);
        }, 2500);
    };

    // Initialize WebRTC connection
    const initializePeerConnection = (targetId) => {
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
            console.log('[WebRTC] Remote track received');
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play().catch(e => console.error('Audio play failed:', e));
        };

        pcRef.current = pc;
        return pc;
    };

    // Actions
    const callUser = async (targetId, targetName, targetRole) => {
        if (!socketRef.current) return;
        
        console.log('[CALL] Calling user:', targetId);
        setCallState('dialing');
        setCallInfo({
            targetId,
            targetName,
            targetRole,
            callLogId: '',
            isCaller: true
        });

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;

            const pc = initializePeerConnection(targetId);
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            startRingtone(true); // Play ringback

            const activeUser = user || guestInfo;
            socketRef.current.emit('call-user', {
                targetId,
                offer,
                callerName: activeUser ? activeUser.name : 'Guest Student',
                callerId: activeUser ? activeUser._id : ''
            });
        } catch (err) {
            console.error('[CALL] Media capture or WebRTC failed:', err);
            toast.error('Could not access microphone');
            handleEndCallLocally('idle');
        }
    };

    const acceptCall = async () => {
        if (!socketRef.current || !callInfo.targetId) return;
        
        stopRingtone();
        console.log('[CALL] Accepting call from:', callInfo.targetId);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;

            const pc = initializePeerConnection(callInfo.targetId);
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            await pc.setRemoteDescription(new RTCSessionDescription(callInfo.offer || pcRef.current?.remoteDescription));
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            setCallState('connected');
            socketRef.current.emit('accept-call', {
                callerId: callInfo.targetId,
                answer,
                callLogId: callInfo.callLogId
            });
        } catch (err) {
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

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <SocketContext.Provider value={{
            socket,
            onlineUsers,
            callState,
            callInfo,
            callDuration,
            isMuted,
            callUser,
            acceptCall,
            rejectCall,
            endCall,
            toggleMute,
            registerGuest
        }}>
            {children}

            {/* Live Call Overlay System */}
            {callState !== 'idle' && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all duration-300">
                    <div className="bg-white/80 border border-white/20 backdrop-blur-xl rounded-[40px] shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center text-center transform scale-100 transition-transform duration-300 relative overflow-hidden">
                        
                        {/* Glassmorphic Background Glow */}
                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 -mr-10 -mt-10 transition-colors duration-500 ${
                            callState === 'connected' ? 'bg-emerald-500' :
                            callState === 'incoming' ? 'bg-purple-500' :
                            callState === 'dialing' ? 'bg-indigo-500' : 'bg-red-500'
                        }`}></div>

                        {/* Title / Role */}
                        <span className="text-[10px] font-black tracking-widest text-indigo-600 uppercase mb-2 block">
                            {callInfo.targetRole} Connection
                        </span>

                        {/* Caller Icon / Avatar */}
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
                                {callInfo.targetName ? callInfo.targetName[0] : <Phone size={36} />}
                            </div>

                            {/* Mute indicator badge */}
                            {isMuted && callState === 'connected' && (
                                <div className="absolute bottom-0 right-0 bg-red-500 text-white p-2 rounded-full border-2 border-white shadow-md">
                                    <MicOff size={14} />
                                </div>
                            )}
                        </div>

                        {/* Name & Subtitle */}
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">
                            {callInfo.targetName || 'User'}
                        </h3>

                        {/* Current call state details */}
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-8">
                            {callState === 'dialing' && 'Dialing Out...'}
                            {callState === 'incoming' && 'Incoming Call...'}
                            {callState === 'connected' && `Connected (${formatTime(callDuration)})`}
                            {callState === 'offline' && 'User is Offline'}
                            {callState === 'declined' && 'Call Declined'}
                            {callState === 'ended' && 'Call Ended'}
                        </p>

                        {/* Bouncing Audio Wave Visualizer (connected call only) */}
                        {callState === 'connected' && !isMuted && (
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
                                        <Phone size={24} />
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
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
