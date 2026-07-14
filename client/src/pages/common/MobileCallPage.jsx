import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { Loader2, Phone, ShieldAlert, X } from 'lucide-react';

const MobileCallPage = () => {
    const { user, loading: authLoading } = useAuth();
    const { 
        callState, 
        callInfo, 
        callUser, 
        acceptCall, 
        endCall, 
        socket 
    } = useSocket();

    const [initializing, setInitializing] = useState(true);
    const [statusMessage, setStatusMessage] = useState('Initializing connection...');
    const [showExitButton, setShowExitButton] = useState(false);
    
    const hasInitiatedRef = useRef(false);
    const prevCallStateRef = useRef('idle');

    console.log('[MobileCall] Render - initializing:', initializing, 'authLoading:', authLoading, 'user:', !!user, 'socketConnected:', socket?.connected);

    // 1. Extract and inject Auth Token
    useEffect(() => {
        setInitializing(false);
    }, []);

    // 2. Monitor Auth & Socket, then Auto-Trigger call action
    useEffect(() => {
        if (initializing || authLoading) return;

        if (!user) {
            setStatusMessage('Error: User not authenticated.');
            setShowExitButton(true);
            return;
        }

        if (!socket || !socket.connected) {
            setStatusMessage('Connecting to signaling server...');
            return;
        }

        // We have user and active socket connection
        if (hasInitiatedRef.current) return;
        hasInitiatedRef.current = true;

        const query = new URLSearchParams(window.location.search);
        const isCaller = query.get('isCaller') === 'true';
        const targetId = query.get('targetId') || '';
        const targetName = decodeURIComponent(query.get('targetName') || 'User');
        const targetRole = query.get('targetRole') || 'Student';
        const callType = query.get('callType') || 'audio';
        
        if (isCaller) {
            if (!targetId) {
                setStatusMessage('Error: Missing target user ID.');
                setShowExitButton(true);
                return;
            }
            setStatusMessage(`Dialing ${targetName}...`);
            console.log(`[MobileCall] Auto-initiating call to ${targetName} (${targetId})`);
            callUser(targetId, targetName, targetRole, callType);
        } else {
            setStatusMessage('Answering incoming call...');
            console.log('[MobileCall] Auto-answering call');
            const callLogId = query.get('callLogId') || '';
            const offerParam = query.get('offer');
            let parsedOffer = null;
            if (offerParam) {
                try {
                    parsedOffer = JSON.parse(decodeURIComponent(offerParam));
                } catch (e) {
                    console.error('[MobileCall] Error parsing offer query param:', e);
                }
            }
            acceptCall({
                targetId,
                targetName,
                targetRole,
                callLogId,
                isCaller: false,
                callType,
                offer: parsedOffer || window.mobileOffer || null
            });
        }
    }, [initializing, authLoading, user, socket, socket?.connected]);

    // 3. Monitor Call State transitions
    useEffect(() => {
        const prevState = prevCallStateRef.current;
        prevCallStateRef.current = callState;

        console.log(`[MobileCall] State changed from ${prevState} -> ${callState}`);

        // If the call connected or dialed, update loading text
        if (callState === 'dialing') {
            setStatusMessage('Ringing...');
        } else if (callState === 'connected') {
            setStatusMessage('Call connected!');
        } else if (callState === 'incoming') {
            setStatusMessage('Incoming call...');
        }

        // If the call transitions back to idle from an active state, notify Mobile app to close WebView
        const wasActive = ['dialing', 'incoming', 'connected'].includes(prevState);
        const isEnded = ['idle', 'ended', 'declined', 'offline'].includes(callState);

        if (wasActive && isEnded) {
            setStatusMessage('Call ended. Closing...');
            setTimeout(() => {
                notifyMobileAppToClose();
            }, 1000);
        }
    }, [callState]);

    const notifyMobileAppToClose = () => {
        console.log('[MobileCall] Notifying mobile app to close WebView');
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'END_CALL' }));
        } else {
            console.warn('[MobileCall] window.ReactNativeWebView not found. Standard browser?');
            // Fallback: redirect back to home page or show exit button
            setShowExitButton(true);
        }
    };

    const handleManualExit = () => {
        if (callState !== 'idle') {
            endCall();
        }
        notifyMobileAppToClose();
    };

    return (
        <div className="min-h-screen w-full bg-[#0b141a] flex flex-col items-center justify-center p-6 text-white text-center">
            {/* The global Call Overlay inside SocketContext handles active call layouts (video/audio views) */}
            
            {callState === 'idle' || showExitButton ? (
                <div className="flex flex-col items-center gap-6 max-w-sm">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                        <Phone size={28} className="text-slate-400" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold tracking-tight">Call System</h2>
                        <p className="text-slate-400 text-sm">{statusMessage}</p>
                    </div>
                    <button
                        onClick={handleManualExit}
                        className="mt-4 px-6 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-sm font-semibold rounded-full flex items-center gap-2 transition-all shadow-lg"
                    >
                        <X size={16} /> Exit Call Room
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-6">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                    <div className="space-y-1">
                        <h2 className="text-lg font-bold">Secure WebRTC Call</h2>
                        <p className="text-slate-400 text-xs tracking-wide uppercase font-semibold">{statusMessage}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobileCallPage;
