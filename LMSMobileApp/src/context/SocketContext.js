import React, { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    Vibration,
    Platform,
    PermissionsAndroid,
    ScrollView
} from 'react-native';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import Toast from 'react-native-toast-message';
import { Audio } from 'expo-av';
import { WebView } from 'react-native-webview';
import { colors, spacing, fontSizes, borderRadius } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '../config/api';
import * as SecureStore from 'expo-secure-store';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    
    // Call States: 'idle', 'dialing', 'incoming', 'connected', 'offline', 'declined', 'ended'
    const [callState, setCallState] = useState('idle'); 
    const [callInfo, setCallInfo] = useState({
        targetId: '',
        targetName: '',
        targetRole: '',
        callLogId: '',
        isCaller: false,
        callType: 'audio' // 'audio' | 'video'
    });
    
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaker, setIsSpeaker] = useState(true);
    const [debugLogs, setDebugLogs] = useState([]);

    const socketRef = useRef(null);
    const timerRef = useRef(null);
    const vibrationIntervalRef = useRef(null);
    const soundRef = useRef(null);
    const webViewRef = useRef(null);

    const [authToken, setAuthToken] = useState(null);

    // Retrieve Auth Token dynamically to authenticate WebRTC calling inside WebView
    useEffect(() => {
        const getAuthToken = async () => {
            try {
                const token = await SecureStore.getItemAsync('authToken');
                setAuthToken(token);
                console.log('[SOCKET] Resolved mobile authToken for WebRTC WebView');
            } catch (err) {
                console.log('[SOCKET] Error reading token from SecureStore:', err);
            }
        };
        if (callState === 'connected' || callState === 'dialing') {
            getAuthToken();
        } else {
            setAuthToken(null);
        }
    }, [callState]);

    // Request Camera & Audio Permissions for WebRTC inside WebView on Android/iOS
    const requestCallPermissions = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                ]);
                console.log('[PERMISSIONS] Android call permissions status:', granted);
                
                if (
                    granted[PermissionsAndroid.PERMISSIONS.CAMERA] !== PermissionsAndroid.RESULTS.GRANTED ||
                    granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !== PermissionsAndroid.RESULTS.GRANTED
                ) {
                    Toast.show({
                        type: 'info',
                        text1: 'Permissions Needed',
                        text2: 'Camera & Microphone access are required for voice/video call streaming.'
                    });
                }
            } catch (err) {
                console.log('[PERMISSIONS] Error requesting Android call permissions:', err);
            }
        } else {
            try {
                const { status } = await Audio.requestPermissionsAsync();
                console.log('[PERMISSIONS] iOS Audio permission status:', status);
            } catch (err) {
                console.log('[PERMISSIONS] Error requesting iOS call permissions:', err);
            }
        }
    };

    // Audio Playback Helpers for Ringtone and Dialtone
    const playSound = async (type) => {
        try {
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                shouldRouteThroughReceiverIOS: false,
                playThroughEarpieceAndroid: false,
                staysActiveInBackground: true,
            });

            // Load audio from Render backend server statically
            const url = type === 'dialing' 
                ? `${BASE_URL}/uploads/dialing.mp3` 
                : `${BASE_URL}/uploads/ringtone.mp3`;

            const { sound } = await Audio.Sound.createAsync(
                { uri: url },
                { shouldPlay: true, isLooping: true, volume: 1.0 }
            );
            soundRef.current = sound;
        } catch (error) {
            console.log('[AUDIO] Error playing sound:', error);
        }
    };

    const stopSound = async () => {
        try {
            if (soundRef.current) {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }
            // Reset audio mode to allow microphone capture in Jitsi WebView
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                shouldRouteThroughReceiverIOS: false,
                playThroughEarpieceAndroid: false,
                staysActiveInBackground: true,
            });
        } catch (error) {
            console.log('[AUDIO] Error stopping sound:', error);
        }
    };

    const toggleMute = () => {
        const nextMuted = !isMuted;
        setIsMuted(nextMuted);
        console.log('[CALL] Toggling mute to:', nextMuted);
        if (webViewRef.current) {
            const jsInject = `
                try {
                    if (window.APP && window.APP.conference) {
                        window.APP.conference.muteAudio(${nextMuted});
                    }
                } catch(e) {
                    console.warn('Mute injection failed:', e);
                }
                true;
            `;
            webViewRef.current.injectJavaScript(jsInject);
        }
    };

    const toggleSpeaker = async () => {
        try {
            const nextSpeaker = !isSpeaker;
            setIsSpeaker(nextSpeaker);
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                shouldRouteThroughReceiverIOS: !nextSpeaker,
                playThroughEarpieceAndroid: !nextSpeaker,
                staysActiveInBackground: true,
            });
            console.log('[AUDIO] Speaker toggled to:', nextSpeaker);
        } catch (error) {
            console.log('[AUDIO] Error toggling speaker:', error);
        }
    };

    const debugInjection = `
        (function() {
            // ── Step 0: Inject auth token into localStorage IMMEDIATELY ──
            // This runs before React app loads, ensuring axios interceptor finds the token
            try {
                var _params = new URLSearchParams(window.location.search);
                var _token = _params.get('token');
                if (_token) {
                    localStorage.setItem('authToken', _token);
                    // Also expose on window so React can use it as fallback
                    window.__mobileAuthToken = _token;
                }
            } catch(_e) {}

            var origLog = console.log;
            var origError = console.error;
            var origWarn = console.warn;
            
            console.log = function() {
                var args = Array.prototype.slice.call(arguments);
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOG', message: args.join(' ') }));
                }
                origLog.apply(console, arguments);
            };
            
            console.error = function() {
                var args = Array.prototype.slice.call(arguments);
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: args.join(' ') }));
                }
                origError.apply(console, arguments);
            };

            console.warn = function() {
                var args = Array.prototype.slice.call(arguments);
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WARN', message: args.join(' ') }));
                }
                origWarn.apply(console, arguments);
            };

            window.onerror = function(message, source, lineno, colno, error) {
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ 
                        type: 'ERROR', 
                        message: message + ' at ' + (source || '').split('/').pop() + ':' + lineno 
                    }));
                }
                return false;
            };
            console.log('Logger bridge injected.');

            // Tunnel Warning Auto-Bypass
            setInterval(function() {
                var links = document.getElementsByTagName('a');
                for (var i = 0; i < links.length; i++) {
                    var text = links[i].innerText.toLowerCase();
                    if (text.indexOf('proceed') !== -1 || text.indexOf('continue') !== -1 || text.indexOf('visit site') !== -1 || text.indexOf('click here') !== -1 || text.indexOf('enter site') !== -1 || text.indexOf('enter') !== -1) {
                        origLog('[WebView] Clicking warning bypass link: ' + links[i].innerText);
                        links[i].click();
                    }
                }
                var buttons = document.getElementsByTagName('button');
                for (var i = 0; i < buttons.length; i++) {
                    var text = buttons[i].innerText.toLowerCase();
                    if (text.indexOf('proceed') !== -1 || text.indexOf('continue') !== -1 || text.indexOf('visit site') !== -1 || text.indexOf('click here') !== -1 || text.indexOf('enter site') !== -1 || text.indexOf('enter') !== -1) {
                        origLog('[WebView] Clicking warning bypass button: ' + buttons[i].innerText);
                        buttons[i].click();
                    }
                }
            }, 500);

            // Diagnostic probe: fires at 3s and 6s to report internal state
            function runDiagnostic(label) {
                try {
                    var token = localStorage.getItem('authToken') || localStorage.getItem('token') || 'NONE';
                    var bodyText = (document.body ? document.body.innerText : 'NO BODY').substring(0, 120).replace(/\n/g, ' ');
                    var scripts = document.querySelectorAll('script[src]').length;
                    console.log('[DIAG-' + label + '] token=' + (token !== 'NONE' ? token.substring(0,20)+'...' : 'NONE') + ' scripts=' + scripts + ' body=' + bodyText);
                } catch(e) {
                    console.log('[DIAG-' + label + '] Error: ' + e.message);
                }
            }
            setTimeout(function() { runDiagnostic('3s'); }, 3000);
            setTimeout(function() { runDiagnostic('6s'); }, 6000);
        })();
        true;
    `;

    const handleWebViewMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'END_CALL') {
                console.log('[SOCKET] WebView received END_CALL message, ending local call');
                handleEndCallLocally('ended');
                return;
            }
            const formatted = `[${data.type}] ${data.message}`;
            setDebugLogs(prev => [...prev.slice(-30), formatted]);
            console.log('[WEBRTC WEBVIEW]', formatted);
        } catch (e) {
            console.log('[WEBRTC WEBVIEW RAW]', event.nativeEvent.data);
        }
    };

    // Dynamic Ringtone/Vibration for incoming calls
    const startVibration = () => {
        if (Platform.OS === 'android' || Platform.OS === 'ios') {
            Vibration.vibrate([500, 1000, 500, 1000], true);
        }
    };

    const stopVibration = () => {
        Vibration.cancel();
    };

    const handleEndCallLocally = (finalState) => {
        stopVibration();
        stopSound();
        setIsMuted(false);
        setIsSpeaker(true);
        setDebugLogs([]);
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        // If there is no active call, disconnect silently without opening call modal
        if (callState === 'idle') {
            return;
        }

        if (finalState === 'idle') {
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

            // Re-register mobile socket client on server
            if (socketRef.current && user?._id) {
                console.log('[SOCKET] Re-registering mobile socket after call ends (idle)');
                socketRef.current.emit('register', { userId: user._id, role: user.role, name: user.name });
            }
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

            // Re-register mobile socket client on server
            if (socketRef.current && user?._id) {
                console.log('[SOCKET] Re-registering mobile socket after call ends (timeout)');
                socketRef.current.emit('register', { userId: user._id, role: user.role, name: user.name });
            }
        }, 2000);
    };

    // Socket Connection Setup
    useEffect(() => {
        if (!user) {
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
            stopVibration();
            stopSound();
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            if (socketRef.current) {
                socketRef.current.off('disconnect');
                socketRef.current.disconnect();
                setSocket(null);
            }
            return;
        }

        console.log('[SOCKET] Connecting to server with user:', user.name);
        const s = io(BASE_URL, {
            transports: ['websocket'],
            forceNew: true,
            autoConnect: true
        });

        socketRef.current = s;
        setSocket(s);

        s.on('connect_error', (error) => {
            console.log('[SOCKET] Connection error:', error.message || error);
        });

        const registerUserSocket = () => {
            if (user?._id) {
                console.log('[SOCKET] Registering user:', user._id);
                s.emit('register', { userId: user._id, role: user.role, name: user.name });
                s.emit('get-online-users', (users) => {
                    setOnlineUsers(users || []);
                });
            }
        };

        if (s.connected) {
            registerUserSocket();
        }

        s.on('connect', () => {
            console.log('[SOCKET] Connected to Render socket server successfully.');
            registerUserSocket();
        });

        // Request calling permissions immediately on app/socket mount
        requestCallPermissions();

        s.on('online-status-update', (users) => {
            setOnlineUsers(users || []);
        });

        // Incoming Call Event
        s.on('incoming-call', ({ callerId, callerName, callLogId, callType, offer }) => {
            console.log(`[SOCKET] Incoming ${callType} call from ${callerName} (${callerId})`);
            
            // Auto reject if already busy
            if (callState !== 'idle') {
                s.emit('reject-call', { callerId, callLogId });
                return;
            }

            setCallState('incoming');
            setCallInfo({
                targetId: callerId,
                targetName: callerName,
                targetRole: user.role === 'Teacher' ? 'Student' : 'Teacher',
                callLogId,
                isCaller: false,
                callType: callType || 'audio',
                offer
            });
            startVibration();
            playSound('ringtone');
        });

        s.on('call-accepted', async ({ callLogId }) => {
            console.log('[SOCKET] Call accepted by peer. Requesting permissions...');
            await requestCallPermissions();
            stopVibration();
            await stopSound();
            setCallState('connected');
            setCallInfo(prev => ({ ...prev, callLogId }));
        });

        // Call Rejected Event
        s.on('call-rejected', () => {
            console.log('[SOCKET] Call rejected by peer');
            handleEndCallLocally('declined');
        });

        // User Offline Event
        s.on('user-offline', () => {
            console.log('[SOCKET] Called user is offline');
            handleEndCallLocally('offline');
        });

        // Call Ended Event
        s.on('call-ended', () => {
            console.log('[SOCKET] Call ended by peer');
            handleEndCallLocally('ended');
        });

        s.on('disconnect', () => {
            console.log('[SOCKET] Socket disconnected');
            handleEndCallLocally('ended');
        });

        return () => {
            s.disconnect();
            stopVibration();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [user]);

    // Active Call Duration Timer
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

    // Call Actions
    const callUser = async (targetId, targetName, targetRole, callType = 'audio') => {
        if (!socketRef.current || !socketRef.current.connected) {
            console.log('[CALL] Socket not connected. Reconnecting...');
            if (socketRef.current) {
                socketRef.current.connect();
            }
            Toast.show({
                type: 'error',
                text1: 'Connection Offline',
                text2: 'Server connection is offline. Reconnecting...'
            });
            return;
        }

        console.log(`[CALL] Calling ${targetName} (ID: ${targetId}, Type: ${callType})`);
        await requestCallPermissions();
        setCallState('dialing');
        setCallInfo({
            targetId,
            targetName,
            targetRole,
            callLogId: '',
            isCaller: true,
            callType
        });
        playSound('dialing');
    };

    const acceptCall = async () => {
        if (!socketRef.current || !callInfo.targetId) return;

        console.log('[CALL] Accepting call from:', callInfo.targetId);
        await requestCallPermissions();
        stopVibration();
        await stopSound();
        setCallState('connected');
    };

    const rejectCall = () => {
        if (!socketRef.current || !callInfo.targetId) return;

        console.log('[CALL] Rejecting call from:', callInfo.targetId);
        stopVibration();
        socketRef.current.emit('reject-call', {
            callerId: callInfo.targetId,
            callLogId: callInfo.callLogId
        });
        handleEndCallLocally('idle');
    };

    const endCall = () => {
        if (!socketRef.current || !callInfo.targetId) return;

        console.log('[CALL] Ending call with:', callInfo.targetId);
        socketRef.current.emit('end-call', {
            targetId: callInfo.targetId,
            callLogId: callInfo.callLogId
        });
        handleEndCallLocally('ended');
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const [activeWebViewSource, setActiveWebViewSource] = useState(null);

    useEffect(() => {
        if (callState === 'idle') {
            setActiveWebViewSource(null);
        } else if ((callState === 'dialing' || callState === 'incoming' || callState === 'connected') && !activeWebViewSource && authToken && callInfo.targetId) {
            const sourceUrl = `${BASE_URL}/mobile-call?token=${authToken}&callLogId=${callInfo.callLogId || ''}&targetId=${callInfo.targetId}&targetName=${encodeURIComponent(callInfo.targetName)}&targetRole=${callInfo.targetRole}&callType=${callInfo.callType}&isCaller=${callInfo.isCaller}${callInfo.offer ? `&offer=${encodeURIComponent(JSON.stringify(callInfo.offer))}` : ''}`;
            console.log('[SOCKET] Freezing WebView source to prevent reload:', sourceUrl.split('?')[0]);
            
            setActiveWebViewSource({
                uri: sourceUrl,
                headers: {
                    'pinggy-skip-browser-warning': 'true',
                    'X-Pinggy-No-Screen': 'true',
                    'ngrok-skip-browser-warning': 'true'
                }
            });
        }
    }, [callState, authToken, callInfo.targetId, activeWebViewSource]);

    return (
        <SocketContext.Provider value={{
            socket,
            onlineUsers,
            callState,
            callInfo,
            callDuration,
            callUser,
            acceptCall,
            rejectCall,
            endCall
        }}>
            {children}

            {/* Global Calling Overlay Modal */}
            <Modal
                visible={callState !== 'idle'}
                transparent={false}
                animationType="slide"
            >
                <View style={styles.callContainer}>
                    {/* WebRTC P2P WebView call container */}
                    {(callState === 'connected' || callState === 'dialing') && activeWebViewSource ? (
                        <WebView
                            ref={webViewRef}
                            key={`webview-${callInfo.targetId || 'default'}`}
                            source={activeWebViewSource}
                            cacheEnabled={false}
                            cacheMode="LOAD_NO_CACHE"
                            style={(callState === 'connected' && callInfo.callType === 'video') ? styles.videoWebView : styles.hiddenWebView}
                            mediaPlaybackRequiresUserAction={false}
                            allowsInlineMediaPlayback={true}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            databaseEnabled={true}
                            thirdPartyCookiesEnabled={true}
                            originWhitelist={['*']}
                            userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                            mediaCapturePermissionGrantType="grant"
                            injectedJavaScriptBeforeContentLoaded={debugInjection + `\nwindow.mobileOffer = ${JSON.stringify(callInfo.offer || null)};\ntrue;`}
                            onMessage={handleWebViewMessage}
                            onNavigationStateChange={(navState) => {
                                console.log('[WebView Nav]', navState.url);
                                setDebugLogs(prev => [...prev, `[NAV] Loading: ${navState.url.split('?')[0].slice(-45)}`]);
                            }}
                            onPermissionRequest={(event) => {
                                event.grant(event.resources);
                            }}
                            onLoadStart={() => {
                                console.log('[WebView] onLoadStart');
                                setDebugLogs(prev => [...prev, '[SYSTEM] WebView Loading Start...']);
                            }}
                            onLoadEnd={() => {
                                console.log('[WebView] onLoadEnd');
                                setDebugLogs(prev => [...prev, '[SYSTEM] WebView Loading End.']);
                            }}
                            onError={(syntheticEvent) => {
                                const { nativeEvent } = syntheticEvent;
                                console.warn('[WebView Error]', nativeEvent);
                                setDebugLogs(prev => [...prev, `[ERROR] WebView Error: ${nativeEvent.description} (${nativeEvent.code})`]);
                            }}
                            onHttpError={(syntheticEvent) => {
                                const { nativeEvent } = syntheticEvent;
                                console.warn('[WebView HTTP Error]', nativeEvent);
                                setDebugLogs(prev => [...prev, `[ERROR] WebView HTTP Error: Status ${nativeEvent.statusCode}`]);
                            }}
                        />
                    ) : null}

                    {/* Show Ringing/Avatar details overlay when dialing, incoming or for audio call (as background) */}
                    {(callState !== 'connected' || callInfo.callType === 'audio') && (
                        <View style={styles.topArea}>
                            <View style={[
                                styles.avatarContainer,
                                (callState === 'dialing' || callState === 'incoming') && styles.avatarPulse
                            ]}>
                                <View style={[
                                    styles.avatar,
                                    { backgroundColor: callInfo.targetRole === 'Teacher' ? colors.teacher : colors.student }
                                ]}>
                                    <Text style={styles.avatarText}>
                                        {callInfo.targetName?.[0]?.toUpperCase() || 'U'}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.targetName}>{callInfo.targetName}</Text>
                            <Text style={styles.statusText}>
                                {callState === 'dialing' && 'Calling...'}
                                {callState === 'incoming' && `Incoming ${callInfo.callType === 'video' ? 'Video' : 'Audio'} Call...`}
                                {callState === 'connected' && `Active ${callInfo.callType === 'video' ? 'Video' : 'Audio'} Call`}
                                {callState === 'offline' && 'Offline'}
                                {callState === 'declined' && 'Call Declined'}
                                {callState === 'ended' && 'Call Ended'}
                            </Text>
                            {callState === 'connected' && (
                                <Text style={styles.timerText}>{formatTime(callDuration)}</Text>
                            )}
                        </View>
                    )}

                    {/* Collapsible Debug Panel */}
                    {callState === 'connected' && (
                        <View style={styles.debugPanel}>
                            <Text style={styles.debugTitle}>System Logs (Scroll to view):</Text>
                            <ScrollView style={styles.debugScroll} nestedScrollEnabled={true}>
                                {debugLogs.length === 0 ? (
                                    <Text style={[styles.debugText, { color: '#eab308' }]}>Waiting for logs from WebRTC room...</Text>
                                ) : (
                                    debugLogs.map((log, idx) => (
                                        <Text key={idx} style={styles.debugText}>{log}</Text>
                                    ))
                                )}
                            </ScrollView>
                        </View>
                    )}

                    {/* Bottom Controls Area */}
                    <View style={styles.controlsArea}>
                        {callState === 'incoming' ? (
                            <View style={styles.actionsRow}>
                                <TouchableOpacity
                                    style={[styles.btnCircle, { backgroundColor: colors.danger }]}
                                    onPress={rejectCall}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="close" size={32} color={colors.white} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.btnCircle, { backgroundColor: colors.success }]}
                                    onPress={acceptCall}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="call" size={28} color={colors.white} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.actionsRow}>
                                {callState === 'connected' && (
                                    <TouchableOpacity
                                        style={[styles.mutedBtnCircle, isMuted && { backgroundColor: colors.danger }]}
                                        onPress={toggleMute}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name={isMuted ? "mic-off-outline" : "mic-outline"} size={24} color={colors.white} />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[styles.btnCircle, { backgroundColor: colors.danger }]}
                                    onPress={endCall}
                                    activeOpacity={0.8}
                                    disabled={callState === 'ended' || callState === 'declined' || callState === 'offline'}
                                >
                                    <Ionicons name="close" size={32} color={colors.white} />
                                </TouchableOpacity>
                                {callState === 'connected' && (
                                    <TouchableOpacity
                                        style={[styles.mutedBtnCircle, !isSpeaker && { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                                        onPress={toggleSpeaker}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name={isSpeaker ? "volume-high-outline" : "volume-mute-outline"} size={24} color={colors.white} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);

const styles = StyleSheet.create({
    callContainer: {
        flex: 1,
        backgroundColor: '#0b141a', // WhatsApp dark green-black style
        justifyContent: 'space-between',
        paddingVertical: 60,
        alignItems: 'center',
    },
    topArea: {
        alignItems: 'center',
        marginTop: 60,
        gap: 16,
    },
    avatarContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    avatarPulse: {
        borderWidth: 1.5,
        borderColor: 'rgba(99, 102, 241, 0.3)',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 54,
        fontWeight: '900',
        color: colors.white,
    },
    targetName: {
        fontSize: fontSizes.xxl + 2,
        fontWeight: '800',
        color: colors.white,
    },
    statusText: {
        fontSize: fontSizes.md,
        color: 'rgba(255, 255, 255, 0.6)',
        fontWeight: '600',
    },
    timerText: {
        fontSize: fontSizes.lg + 2,
        fontWeight: '700',
        color: colors.success,
        marginTop: 10,
        letterSpacing: 1,
    },
    controlsArea: {
        alignItems: 'center',
        width: '100%',
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
        width: '100%',
    },
    btnCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    mutedBtnCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#1f2c34',
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoWebView: {
        width: '100%',
        height: '75%',
        alignSelf: 'stretch',
        backgroundColor: '#0b141a',
    },
    hiddenWebView: {
        width: 300,
        height: 300,
        opacity: 0.01,
        position: 'absolute',
        left: -1000,
        top: -1000,
    },
    debugPanel: {
        width: '90%',
        height: 120,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        borderRadius: borderRadius.md || 8,
        padding: 8,
        marginTop: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    debugTitle: {
        fontSize: 10,
        color: '#10b981',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    debugScroll: {
        flex: 1,
    },
    debugText: {
        fontSize: 9,
        color: '#ffffff',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
});
