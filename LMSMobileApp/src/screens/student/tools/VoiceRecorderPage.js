import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    Share,
    Platform,
    Dimensions
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSizes, borderRadius } from '../../../theme/colors';
import { AppHeader } from '../../../components/common/UIComponents';
import { parseDateToDdMmYyyy, getTodayDdMmYyyy } from '../../../utils/dateUtils';
import Toast from 'react-native-toast-message';
import { BASE_URL } from '../../../config/api';
import GoogleDriveModal from '../../../components/common/GoogleDriveModal';

// Formatting helpers
const formatRulerTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

const formatFullDuration = (secs) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

const formatCardDateTime = (timestampStr) => {
    try {
        const d = new Date(timestampStr);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        let hours = d.getHours();
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${day}/${month}, ${hours}:${minutes} ${ampm}`;
    } catch (e) {
        return '';
    }
};

const formatTimeWithDimmedZeros = (ms) => {
    if (ms <= 0) {
        return { dimmed: "00:0", bright: "0.00" };
    }
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const centiseconds = Math.floor((ms % 1000) / 10);
    
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    const cc = centiseconds.toString().padStart(2, '0');
    
    const fullStr = `${mm}:${ss}.${cc}`;
    
    let firstActiveIdx = 0;
    for (let i = 0; i < fullStr.length; i++) {
        if (fullStr[i] !== '0' && fullStr[i] !== ':') {
            firstActiveIdx = i;
            break;
        }
    }
    
    return {
        dimmed: fullStr.substring(0, firstActiveIdx),
        bright: fullStr.substring(firstActiveIdx)
    };
};

const getDeterministicWaveform = (seedStr, count = 35) => {
    const bars = [];
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
        hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    for (let i = 0; i < count; i++) {
        const x = i / count;
        const envelope = Math.sin(x * Math.PI);
        const wave = Math.sin(hash + x * Math.PI * 4) * 0.4 + 
                     Math.sin(hash * 2 + x * Math.PI * 10) * 0.3 + 
                     Math.sin(hash * 7 + x * Math.PI * 16) * 0.2;
        const val = Math.max(0.1, Math.abs(wave) * envelope + 0.05);
        bars.push(val);
    }
    return bars;
};

const getWaveformData = (item, count = 35) => {
    let rawWave = null;
    if (item.waveform && Array.isArray(item.waveform)) {
        rawWave = item.waveform;
    } else if (item.metadata?.format) {
        try {
            const parsed = JSON.parse(item.metadata.format);
            if (Array.isArray(parsed)) {
                rawWave = parsed;
            }
        } catch (e) {}
    }

    if (rawWave && rawWave.length > 0) {
        const step = rawWave.length / count;
        const bars = [];
        for (let i = 0; i < count; i++) {
            const start = Math.floor(i * step);
            const end = Math.floor((i + 1) * step);
            let max = 0.1;
            for (let j = start; j < end; j++) {
                if (j < rawWave.length && rawWave[j] > max) {
                    max = rawWave[j];
                }
            }
            bars.push(max);
        }
        return bars;
    }

    const seed = item.id || item._id || item.filename || 'default';
    return getDeterministicWaveform(seed, count);
};

const VoiceRecorderPage = ({ route, navigation }) => {
    const { date: dateParam } = route.params || {};
    const todayDdMmYyyy = getTodayDdMmYyyy();
    const isReadOnly = dateParam && dateParam !== todayDdMmYyyy;

    // States
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [showRecorder, setShowRecorder] = useState(false);
    const [elapsedMillis, setElapsedMillis] = useState(0);
    const [volumeHistory, setVolumeHistory] = useState([]);
    const [flags, setFlags] = useState([]);
    
    const [localAudios, setLocalAudios] = useState([]);
    const [cloudFiles, setCloudFiles] = useState([]);
    const [cloudSpace, setCloudSpace] = useState({ used: 0, limit: 300 * 1024 * 1024 });
    const [activeTab, setActiveTab] = useState('local'); // 'local' | 'cloud'
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);

    // Google Drive state
    const [driveModalOpen, setDriveModalOpen] = useState(false);
    const [driveFileMeta, setDriveFileMeta] = useState({ name: '', uri: '' });
    
    // Playback state
    const [playingId, setPlayingId] = useState(null);
    const [soundInstance, setSoundInstance] = useState(null);
    const [playbackStatus, setPlaybackStatus] = useState({
        positionMillis: 0,
        durationMillis: 0,
        isPlaying: false
    });

    const timerRef = useRef(null);
    const startTimeRef = useRef(0);
    const accumulatedTimeRef = useRef(0);

    // Fetch cloud files
    const fetchCloudFiles = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/practice-files');
            const toolFiles = (res.data.files || []).filter(f => f.toolType === 'voice-recorder');
            setCloudFiles(toolFiles);
            setCloudSpace({
                used: res.data.usedBytes || 0,
                limit: res.data.limitBytes || 300 * 1024 * 1024
            });
        } catch (err) {
            console.error("Failed to fetch cloud files on voice page:", err);
        } finally {
            setLoading(false);
        }
    };

    // Load local recordings
    const loadLocalRecordings = async () => {
        try {
            const saved = await AsyncStorage.getItem('practice_audios');
            if (saved) {
                setLocalAudios(JSON.parse(saved));
            } else {
                setLocalAudios([]);
            }
        } catch (err) {
            console.error("Failed to load local audios:", err);
        }
    };

    useEffect(() => {
        fetchCloudFiles();
        loadLocalRecordings();
    }, []);

    // Filtered lists
    const filteredLocalAudios = useMemo(() => {
        return localAudios.filter(a => parseDateToDdMmYyyy(a.timestamp) === dateParam);
    }, [localAudios, dateParam]);

    const filteredCloudFiles = useMemo(() => {
        return cloudFiles.filter(c => parseDateToDdMmYyyy(c.createdAt) === dateParam);
    }, [cloudFiles, dateParam]);

    // Clean up audio sound instances and recording timers on unmount
    useEffect(() => {
        return () => {
            if (soundInstance) {
                soundInstance.unloadAsync();
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [soundInstance]);

    // Start audio recording
    const startRecording = async () => {
        if (isReadOnly) {
            Alert.alert("Read-Only", "Cannot record in a past date log.");
            return;
        }
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert("Permission Required", "Please allow microphone access to record audio.");
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            setVolumeHistory([]);
            setElapsedMillis(0);
            setFlags([]);
            setIsPaused(false);
            setShowRecorder(true);

            accumulatedTimeRef.current = 0;
            startTimeRef.current = Date.now();

            const recordingOptions = {
                android: {
                    extension: '.m4a',
                    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
                    audioEncoder: Audio.AndroidAudioEncoder.AAC,
                    sampleRate: 44100,
                    numberOfChannels: 2,
                    bitRate: 128000,
                },
                ios: {
                    extension: '.m4a',
                    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
                    audioQuality: Audio.IOSAudioQuality.HIGH,
                    sampleRate: 44100,
                    numberOfChannels: 2,
                    bitRate: 128000,
                    linearPCMBitDepth: 16,
                    linearPCMIsBigEndian: false,
                    linearPCMIsFloat: false,
                },
                isMeteringEnabled: true,
            };

            const handleRecordingStatus = (status) => {
                if (status.isRecording && !status.isPaused) {
                    if (status.metering !== undefined && status.metering !== null) {
                        const db = status.metering;
                        const minDb = -60;
                        let val = 0;
                        if (db > minDb) {
                            val = (db - minDb) / (-minDb);
                        }
                        val = Math.max(0, Math.min(1, val));
                        setVolumeHistory(prev => [...prev, val]);
                    }
                }
            };

            const { recording: newRecording } = await Audio.Recording.createAsync(
                recordingOptions,
                handleRecordingStatus,
                100
            );
            setRecording(newRecording);
            setIsRecording(true);

            timerRef.current = setInterval(() => {
                const now = Date.now();
                const total = now - startTimeRef.current + accumulatedTimeRef.current;
                setElapsedMillis(total);
            }, 30);

        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert("Error", "Could not start audio recording.");
        }
    };

    // Pause recording
    const pauseRecording = async () => {
        if (!recording) return;
        try {
            await recording.pauseAsync();
            setIsPaused(true);
            accumulatedTimeRef.current += Date.now() - startTimeRef.current;
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        } catch (err) {
            console.error('Failed to pause recording', err);
            Alert.alert("Error", "Could not pause recording.");
        }
    };

    // Resume recording
    const resumeRecording = async () => {
        if (!recording) return;
        try {
            await recording.startAsync();
            setIsPaused(false);
            startTimeRef.current = Date.now();
            timerRef.current = setInterval(() => {
                const now = Date.now();
                const total = now - startTimeRef.current + accumulatedTimeRef.current;
                setElapsedMillis(total);
            }, 30);
        } catch (err) {
            console.error('Failed to resume recording', err);
            Alert.alert("Error", "Could not resume recording.");
        }
    };

    // Cancel recording
    const cancelRecording = async () => {
        Alert.alert(
            "Discard Recording?",
            "Are you sure you want to discard the current recording?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Discard",
                    style: "destructive",
                    onPress: async () => {
                        if (timerRef.current) {
                            clearInterval(timerRef.current);
                            timerRef.current = null;
                        }
                        setIsRecording(false);
                        setIsPaused(false);
                        setShowRecorder(false);
                        if (recording) {
                            try {
                                await recording.stopAndUnloadAsync();
                            } catch (e) {
                                // ignore
                            }
                            setRecording(null);
                        }
                    }
                }
            ]
        );
    };

    // Stop recording
    const stopRecording = async () => {
        if (!recording) return;
        try {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            setIsRecording(false);
            setIsPaused(false);
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);
            setShowRecorder(false);

            const finalDurationSec = Math.round(elapsedMillis / 1000) || 1;

            const newLog = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                duration: finalDurationSec,
                uri: uri,
                synced: false,
                waveform: volumeHistory
            };

            const updatedList = [newLog, ...localAudios];
            setLocalAudios(updatedList);
            await AsyncStorage.setItem('practice_audios', JSON.stringify(updatedList));

            Toast.show({
                type: 'success',
                text1: 'Audio Saved',
                text2: 'Recording saved to local workspace!'
            });
        } catch (err) {
            console.error('Failed to stop recording', err);
            Alert.alert("Error", "Could not stop and save recording.");
        }
    };

    // Add a flag marker during recording
    const addFlag = () => {
        const flagTime = elapsedMillis / 1000;
        setFlags(prev => [...prev, flagTime]);
        Toast.show({
            type: 'success',
            text1: 'Flag Added',
            text2: `Flagged at ${formatRulerTime(flagTime)}`
        });
    };

    // Playback control
    const playSound = async (uri, id) => {
        try {
            if (playingId === id) {
                if (soundInstance) {
                    const status = await soundInstance.getStatusAsync();
                    if (status.isLoaded) {
                        if (status.isPlaying) {
                            await soundInstance.pauseAsync();
                        } else {
                            await soundInstance.playAsync();
                        }
                    }
                }
                return;
            }

            if (soundInstance) {
                await soundInstance.stopAsync();
                await soundInstance.unloadAsync();
            }

            const { sound } = await Audio.Sound.createAsync(
                { uri: uri },
                { shouldPlay: true }
            );
            
            setSoundInstance(sound);
            setPlayingId(id);

            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded) {
                    setPlaybackStatus({
                        positionMillis: status.positionMillis,
                        durationMillis: status.durationMillis || 1,
                        isPlaying: status.isPlaying
                    });
                    if (status.didJustFinish) {
                        setPlayingId(null);
                        setSoundInstance(null);
                        setPlaybackStatus({
                            positionMillis: 0,
                            durationMillis: 0,
                            isPlaying: false
                        });
                    }
                }
            });
        } catch (err) {
            console.error("Playback error:", err);
            Alert.alert("Error", "Could not play audio file.");
        }
    };

    // Seek control during playback
    const handleSeek = async (event, fileId, durationSec) => {
        if (!soundInstance || playingId !== fileId) return;
        const { locationX } = event.nativeEvent;
        const width = 180;
        const ratio = Math.max(0, Math.min(1, locationX / width));
        const seekMs = ratio * durationSec * 1000;
        try {
            await soundInstance.setPositionAsync(seekMs);
        } catch (e) {
            console.error("Seeking failed", e);
        }
    };

    // Sync local audios
    const syncLocalAudios = async () => {
        if (isReadOnly) return;
        const unsynced = filteredLocalAudios.filter(a => !a.synced);
        if (unsynced.length === 0) {
            Alert.alert("Synced", "All local audios on this date are already synced to cloud.");
            return;
        }

        setSyncing(true);
        let successCount = 0;

        for (const item of unsynced) {
            try {
                const formData = new FormData();
                formData.append('file', {
                    uri: item.uri,
                    name: `voice_recording_${item.id}.m4a`,
                    type: 'audio/m4a'
                });
                formData.append('toolType', 'voice-recorder');
                formData.append('duration', item.duration.toString());
                formData.append('format', JSON.stringify(item.waveform || []));

                await axios.post('/practice-files/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                item.synced = true;
                successCount++;
            } catch (err) {
                console.error("Failed to sync item:", item.id, err);
                const errMsg = err.response?.data?.message || '';
                if (errMsg.toLowerCase().includes('limit exceeded') || errMsg.toLowerCase().includes('space')) {
                    Alert.alert("Storage Limit Exceeded", errMsg);
                    break;
                }
            }
        }

        await AsyncStorage.setItem('practice_audios', JSON.stringify(localAudios));
        await fetchCloudFiles();
        setSyncing(false);

        if (successCount > 0) {
            Toast.show({
                type: 'success',
                text1: 'Sync Complete',
                text2: `Successfully synced ${successCount} recording(s) to cloud!`
            });
        }
    };

    // Delete file
    const deleteFile = async (id, isCloud) => {
        Alert.alert(
            "Confirm Delete",
            `Are you sure you want to delete this recording from ${isCloud ? 'cloud' : 'local'} storage?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        if (isCloud) {
                            try {
                                await axios.delete(`/practice-files/${id}`);
                                setCloudFiles(prev => prev.filter(f => f._id !== id));
                                Toast.show({
                                    type: 'success',
                                    text1: 'Deleted',
                                    text2: 'Recording deleted from cloud storage!'
                                });
                            } catch (err) {
                                Alert.alert("Error", "Failed to delete file from cloud.");
                            }
                        } else {
                            const updated = localAudios.filter(a => a.id !== id);
                            setLocalAudios(updated);
                            await AsyncStorage.setItem('practice_audios', JSON.stringify(updated));
                            Toast.show({
                                type: 'success',
                                text1: 'Deleted',
                                text2: 'Recording deleted from local storage!'
                                
                            });
                        }
                    }
                }
            ]
        );
    };

    const shareFile = async (uri, filename) => {
        try {
            await Share.share({
                message: uri,
                url: uri,
                title: filename
            });
        } catch (e) {
            console.warn(e);
        }
    };


    return (
        <View style={styles.container}>
            {showRecorder ? (
                <View style={styles.recorderOverlay}>
                    {/* Header */}
                    <View style={styles.recorderHeader}>
                        <TouchableOpacity onPress={cancelRecording} style={styles.headerBackBtn}>
                            <Ionicons name="arrow-back" size={24} color="#ffffff" />
                        </TouchableOpacity>
                        <Text style={styles.recorderHeaderTitle}>Standard</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Timer Area */}
                    <View style={styles.timerContainer}>
                        <Text style={styles.recordingTimerText}>
                            <Text style={styles.recordingTimerDimmed}>{formatTimeWithDimmedZeros(elapsedMillis).dimmed}</Text>
                            <Text style={styles.recordingTimerBright}>{formatTimeWithDimmedZeros(elapsedMillis).bright}</Text>
                        </Text>
                    </View>

                    {/* Waveform Area */}
                    <View style={styles.waveformWrapper}>
                        {/* Ruler */}
                        <View style={styles.rulerContainer}>
                            {(() => {
                                const W = Dimensions.get('window').width;
                                const X_center = W / 2;
                                const S = 60; // pixels per second
                                const currentTime = elapsedMillis / 1000;
                                const rulerMarks = [];
                                const startSec = Math.max(0, Math.floor(currentTime - 4));
                                const endSec = Math.floor(currentTime + 5);
                                
                                for (let s = startSec; s <= endSec; s++) {
                                    const x = X_center + (s - currentTime) * S;
                                    if (x >= -40 && x <= W + 40) {
                                        rulerMarks.push({ sec: s, x });
                                    }
                                }

                                return rulerMarks.map(mark => (
                                    <View key={`mark-${mark.sec}`} style={[styles.rulerTickWrapper, { left: mark.x - 20 }]}>
                                        {mark.sec % 2 === 0 && (
                                            <Text style={styles.rulerText}>{formatRulerTime(mark.sec)}</Text>
                                        )}
                                        <View style={[styles.rulerTick, mark.sec % 2 === 0 ? styles.majorTick : styles.minorTick]} />
                                    </View>
                                ));
                            })()}
                        </View>

                        {/* Waveform drawing area */}
                        <View style={styles.waveDrawingArea}>
                            {/* Horizontal dotted line */}
                            <View style={styles.horizontalDottedLine} />
                            
                            {/* Flag markers drawn on waveform */}
                            {(() => {
                                const W = Dimensions.get('window').width;
                                const X_center = W / 2;
                                const S = 60;
                                const currentTime = elapsedMillis / 1000;

                                return flags.map((f, idx) => {
                                    const x = X_center + (f - currentTime) * S;
                                    if (x >= -10 && x <= W + 10) {
                                        return (
                                            <View key={`flag-${idx}`} style={[styles.flagMarkerLine, { left: x }]}>
                                                <View style={styles.flagMarkerIconContainer}>
                                                    <Ionicons name="flag" size={12} color={colors.accent} />
                                                </View>
                                            </View>
                                        );
                                    }
                                    return null;
                                });
                            })()}

                            {/* Waveform bars */}
                            {(() => {
                                const W = Dimensions.get('window').width;
                                const X_center = W / 2;
                                const S = 60;
                                const currentTime = elapsedMillis / 1000;
                                const visibleBars = [];
                                const startIdx = Math.max(0, Math.floor((currentTime - 4) * 10));
                                const endIdx = volumeHistory.length - 1;

                                for (let i = startIdx; i <= endIdx; i++) {
                                    const t_i = i * 0.1;
                                    const x = X_center + (t_i - currentTime) * S;
                                    if (x >= -10 && x <= W + 10) {
                                        visibleBars.push({ val: volumeHistory[i], x, id: i });
                                    }
                                }

                                return visibleBars.map(bar => {
                                    const barHeight = Math.max(4, bar.val * 110);
                                    return (
                                        <View
                                            key={`bar-${bar.id}`}
                                            style={[
                                                styles.waveBar,
                                                {
                                                    left: bar.x - 1,
                                                    height: barHeight,
                                                    marginTop: -barHeight / 2
                                                }
                                            ]}
                                        />
                                    );
                                });
                            })()}
                        </View>

                        {/* Center red timeline line */}
                        <View style={styles.centerRedLine} />
                    </View>

                    {/* Bottom Controls */}
                    <View style={styles.recorderControls}>
                        <TouchableOpacity onPress={addFlag} style={styles.recorderSubBtn}>
                            <Ionicons name="flag" size={20} color="#ffffff" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={stopRecording} style={styles.recorderMainBtn}>
                            <View style={styles.stopButtonInner} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={isPaused ? resumeRecording : pauseRecording} 
                            style={styles.recorderSubBtn}
                        >
                            <Ionicons name={isPaused ? "play" : "pause"} size={20} color="#ffffff" />
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    <AppHeader
                        title="Voice Recorder"
                        showBack={true}
                        backAction={() => navigation.goBack()}
                        rightIcon="logo-google"
                        rightAction={() => {
                            setDriveFileMeta({ name: '', uri: '' });
                            setDriveModalOpen(true);
                        }}
                    />

                    {/* Top Workspace Date indicator */}
                    <View style={styles.workspaceHeader}>
                        <Ionicons name="calendar" size={16} color={colors.accent} style={{ marginRight: 6 }} />
                        <Text style={styles.workspaceText}>Workspace Date: {dateParam}</Text>
                    </View>

                    {/* Start New Recording Button (Only active for today's workspace) */}
                    {!isReadOnly && (
                        <View style={styles.startRecordingContainer}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={startRecording}
                                style={styles.startRecordingBtn}
                            >
                                <View style={styles.startRecordingBtnIconCircle}>
                                    <Ionicons name="mic" size={24} color="#ffffff" />
                                </View>
                                <Text style={styles.startRecordingBtnText}>Tap to Start Recording</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Tabs */}
                    <View style={styles.tabBar}>
                        <TouchableOpacity
                            onPress={() => setActiveTab('local')}
                            style={[styles.tabButton, activeTab === 'local' && styles.tabButtonActive]}
                        >
                            <Ionicons name="folder-open-outline" size={18} color={activeTab === 'local' ? colors.accent : colors.textSecondary} />
                            <Text style={[styles.tabText, activeTab === 'local' && styles.tabTextActive]}>
                                Local Log ({filteredLocalAudios.length})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('cloud')}
                            style={[styles.tabButton, activeTab === 'cloud' && styles.tabButtonActive]}
                        >
                            <Ionicons name="cloud-done-outline" size={18} color={activeTab === 'cloud' ? colors.accent : colors.textSecondary} />
                            <Text style={[styles.tabText, activeTab === 'cloud' && styles.tabTextActive]}>
                                Cloud Storage ({filteredCloudFiles.length})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Cloud Space Details */}
                    {activeTab === 'cloud' && (
                        <View style={styles.spaceUsageContainer}>
                            <View style={spaceRowStyle()}>
                                <Text style={styles.spaceText}>Cloud Storage Space</Text>
                                <Text style={styles.spaceValue}>
                                    {(cloudSpace.used / (1024 * 1024)).toFixed(1)}MB / {(cloudSpace.limit / (1024 * 1024)).toFixed(0)}MB
                                </Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: `${Math.min(100, (cloudSpace.used / cloudSpace.limit) * 100)}%` }]} />
                            </View>
                        </View>
                    )}

                    {/* Sync bar for local files */}
                    {activeTab === 'local' && !isReadOnly && filteredLocalAudios.some(a => !a.synced) && (
                        <TouchableOpacity
                            disabled={syncing}
                            onPress={syncLocalAudios}
                            style={styles.syncBanner}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="sync" size={18} color={colors.white} style={{ marginRight: 8 }} />
                            <Text style={styles.syncText}>
                                {syncing ? 'Syncing files with Cloud...' : 'Sync unsynced audios to Cloud'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* List */}
                    {loading ? (
                        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
                    ) : (
                        <FlatList
                            data={activeTab === 'local' ? filteredLocalAudios : filteredCloudFiles}
                            keyExtractor={item => item._id || item.id}
                            contentContainerStyle={styles.listContent}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <Ionicons name="mic-off-outline" size={48} color={colors.textMuted} />
                                    <Text style={styles.emptyText}>No recordings found on this date.</Text>
                                </View>
                            }
                            renderItem={({ item, index }) => {
                                const isCloud = activeTab === 'cloud';
                                const fileId = isCloud ? item._id : item.id;
                                const durationSec = isCloud ? (parseInt(item.metadata?.duration) || 0) : item.duration;
                                const fileUrl = isCloud ? `${BASE_URL}${item.fileUrl}` : item.uri;
                                const isSynced = isCloud ? true : item.synced;

                                const title = isCloud 
                                    ? item.filename 
                                    : `Standard recording ${filteredLocalAudios.length - index}`;
                                
                                const formattedDateTime = formatCardDateTime(isCloud ? item.createdAt : item.timestamp);
                                const durationFormatted = formatFullDuration(durationSec);

                                const isCurrentPlaying = playingId === fileId;
                                const isCurrentAudioPlaying = isCurrentPlaying && playbackStatus.isPlaying;
                                const progressRatio = isCurrentPlaying 
                                    ? playbackStatus.positionMillis / (playbackStatus.durationMillis || 1)
                                    : 0;

                                const elapsedFormatted = isCurrentPlaying
                                    ? formatFullDuration(Math.floor(playbackStatus.positionMillis / 1000))
                                    : '00:00:00';

                                const waveformBars = getWaveformData(item, 35);

                                return (
                                    <View style={styles.fileCard}>
                                        <View style={styles.cardHeaderRow}>
                                            <View style={styles.cardHeaderLeft}>
                                                <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
                                                <View style={styles.cardMetaRow}>
                                                    <Ionicons name="calendar-outline" size={12} color="#8e8e93" />
                                                    <Text style={styles.cardMetaText}>{formattedDateTime}</Text>
                                                    <View style={styles.cardMetaSpacer} />
                                                    <Ionicons name="time-outline" size={12} color="#8e8e93" />
                                                    <Text style={styles.cardMetaText}>{durationFormatted}</Text>
                                                </View>
                                            </View>
                                            
                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                onPress={() => playSound(fileUrl, fileId)}
                                                style={styles.cardPlayButton}
                                            >
                                                <Ionicons
                                                    name={isCurrentAudioPlaying ? "pause" : "play"}
                                                    size={20}
                                                    color="#ffffff"
                                                />
                                            </TouchableOpacity>
                                        </View>

                                        {/* Waveform Row */}
                                        <View style={styles.cardWaveformRow}>
                                            <Text style={styles.cardTimerText}>{elapsedFormatted}</Text>
                                            
                                            <TouchableOpacity
                                                activeOpacity={1}
                                                onPress={(e) => handleSeek(e, fileId, durationSec)}
                                                style={styles.cardWaveformContainer}
                                            >
                                                {/* Background Dotted Line */}
                                                <View style={styles.cardWaveformDottedLine} />
                                                
                                                {/* Waveform Bars */}
                                                <View style={styles.cardWaveformBarsWrapper}>
                                                    {waveformBars.map((val, idx) => {
                                                        const isPlayed = (idx / 35) < progressRatio;
                                                        const height = val * 30; // max height 30px
                                                        return (
                                                            <View
                                                                key={`wbar-${idx}`}
                                                                style={[
                                                                    styles.cardWaveBar,
                                                                    {
                                                                        height: Math.max(2, height),
                                                                        backgroundColor: isPlayed ? '#ffffff' : '#555555'
                                                                    }
                                                                ]}
                                                            />
                                                        );
                                                    })}
                                                </View>
                                                
                                                {/* Red cursor playhead */}
                                                {isCurrentPlaying && (
                                                    <View
                                                        style={[
                                                            styles.cardWaveCursor,
                                                            { left: `${progressRatio * 100}%` }
                                                        ]}
                                                    />
                                                )}
                                            </TouchableOpacity>
                                            
                                            <Text style={styles.cardTimerText}>{durationFormatted}</Text>
                                        </View>

                                        {/* Footer subtle actions for backend integration */}
                                        <View style={styles.cardFooter}>
                                            <View style={styles.cardFooterLeft}>
                                                {!isCloud && (
                                                    <View style={styles.syncStatusBadge}>
                                                        <Ionicons
                                                            name={isSynced ? "cloud-done" : "cloud-offline"}
                                                            size={12}
                                                            color={isSynced ? colors.success : colors.warning}
                                                        />
                                                        <Text style={[styles.syncStatusText, { color: isSynced ? colors.success : colors.warning }]}>
                                                            {isSynced ? 'Synced' : 'Local Log'}
                                                        </Text>
                                                    </View>
                                                )}
                                                {isCloud && (
                                                    <View style={styles.syncStatusBadge}>
                                                        <Ionicons name="cloud-done" size={12} color={colors.accent} />
                                                        <Text style={[styles.syncStatusText, { color: colors.accent }]}>Cloud Storage</Text>
                                                    </View>
                                                )}
                                            </View>

                                            <View style={styles.cardFooterActions}>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setDriveFileMeta({
                                                            name: isCloud ? item.filename : `voice_recording_${fileId}.m4a`,
                                                            uri: fileUrl
                                                        });
                                                        setDriveModalOpen(true);
                                                    }}
                                                    style={styles.cardActionIcon}
                                                >
                                                    <Ionicons name="logo-google" size={14} color="#8e8e93" />
                                                </TouchableOpacity>
                                                
                                                {isCloud && (
                                                    <TouchableOpacity
                                                        onPress={() => shareFile(fileUrl, item.filename)}
                                                        style={styles.cardActionIcon}
                                                    >
                                                        <Ionicons name="share-social-outline" size={14} color="#8e8e93" />
                                                    </TouchableOpacity>
                                                )}

                                                {!isReadOnly && (
                                                    <TouchableOpacity
                                                        onPress={() => deleteFile(fileId, isCloud)}
                                                        style={styles.cardActionIcon}
                                                    >
                                                        <Ionicons name="trash-outline" size={14} color={colors.danger} />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                );
                            }}
                        />
                    )}

                    <GoogleDriveModal
                        isOpen={driveModalOpen}
                        onClose={() => setDriveModalOpen(false)}
                        fileName={driveFileMeta.name}
                        fileUri={driveFileMeta.uri}
                        toolType="voice-recorder"
                        onSaveSuccess={() => {
                            fetchCloudFiles();
                        }}
                    />
                </View>
            )}
        </View>
    );
};

// Helper for dynamic style referencing in tabs
const spaceRowStyle = () => {
    return {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6
    };
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg
    },
    workspaceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        backgroundColor: '#eef2ff',
        borderBottomWidth: 1,
        borderBottomColor: colors.border
    },
    workspaceText: {
        fontSize: fontSizes.xs + 1,
        fontWeight: '800',
        color: colors.accent
    },
    // New Recording View styles
    recorderOverlay: {
        flex: 1,
        backgroundColor: '#000000',
        justifyContent: 'space-between',
        zIndex: 1000
    },
    recorderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        height: Platform.OS === 'ios' ? 90 : 60,
    },
    headerBackBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center'
    },
    recorderHeaderTitle: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold'
    },
    timerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    recordingTimerText: {
        fontSize: 48,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        textAlign: 'center'
    },
    recordingTimerDimmed: {
        color: '#555555',
        fontWeight: '400'
    },
    recordingTimerBright: {
        color: '#ffffff',
        fontWeight: 'bold'
    },
    waveformWrapper: {
        height: 200,
        backgroundColor: '#0a0a0a',
        position: 'relative',
        justifyContent: 'center'
    },
    rulerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 40,
        borderBottomWidth: 1,
        borderBottomColor: '#1f1f1f'
    },
    rulerTickWrapper: {
        position: 'absolute',
        bottom: 0,
        width: 40,
        alignItems: 'center'
    },
    rulerText: {
        color: '#666666',
        fontSize: 10,
        fontFamily: 'monospace',
        marginBottom: 4
    },
    rulerTick: {
        width: 1,
        backgroundColor: '#333333'
    },
    majorTick: {
        height: 10,
        backgroundColor: '#666666'
    },
    minorTick: {
        height: 5,
        backgroundColor: '#444444'
    },
    waveDrawingArea: {
        flex: 1,
        marginTop: 40,
        position: 'relative',
        justifyContent: 'center'
    },
    horizontalDottedLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: '50%',
        height: 0,
        borderTopWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#222222',
        marginTop: -0.5
    },
    flagMarkerLine: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: '#6366f1',
        zIndex: 5
    },
    flagMarkerIconContainer: {
        position: 'absolute',
        top: -12,
        left: -6,
        zIndex: 6
    },
    waveBar: {
        position: 'absolute',
        width: 2,
        backgroundColor: '#ffffff',
        borderRadius: 1,
        top: '50%'
    },
    centerRedLine: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '50%',
        width: 1.5,
        backgroundColor: '#ef4444',
        zIndex: 10
    },
    recorderControls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 50,
        paddingHorizontal: 30,
        backgroundColor: '#000000'
    },
    recorderSubBtn: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#1f1f1f',
        alignItems: 'center',
        justifyContent: 'center'
    },
    recorderMainBtn: {
        width: 86,
        height: 86,
        borderRadius: 43,
        backgroundColor: '#ef4444',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#ffffff',
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 6
    },
    stopButtonInner: {
        width: 26,
        height: 26,
        borderRadius: 4,
        backgroundColor: '#ffffff'
    },
    // Main UI Styles
    startRecordingContainer: {
        padding: spacing.md,
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.border
    },
    startRecordingBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accent,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 30,
        gap: 12
    },
    startRecordingBtnIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    startRecordingBtnText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: 'bold'
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.border
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent'
    },
    tabButtonActive: {
        borderBottomColor: colors.accent
    },
    tabText: {
        fontSize: fontSizes.sm,
        fontWeight: '700',
        color: colors.textSecondary
    },
    tabTextActive: {
        color: colors.accent
    },
    spaceUsageContainer: {
        backgroundColor: colors.bgCard,
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border
    },
    spaceText: {
        fontSize: fontSizes.xs,
        fontWeight: '600',
        color: colors.textSecondary
    },
    spaceValue: {
        fontSize: fontSizes.xs,
        fontWeight: '800',
        color: colors.text
    },
    progressBarBg: {
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.bgSecondary,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.accent
    },
    syncBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.success,
        paddingVertical: 10
    },
    syncText: {
        color: colors.white,
        fontSize: fontSizes.sm,
        fontWeight: '800'
    },
    listContent: {
        padding: spacing.md,
        paddingBottom: 40
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60
    },
    emptyText: {
        fontSize: fontSizes.sm,
        color: colors.textMuted,
        fontWeight: '600',
        marginTop: 10
    },
    // Sleek Playback Card styles (Image 2 style)
    fileCard: {
        backgroundColor: '#1c1c1e',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#2c2c2e',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    cardHeaderLeft: {
        flex: 1,
        marginRight: spacing.sm
    },
    cardTitle: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4
    },
    cardMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs
    },
    cardMetaText: {
        color: '#8e8e93',
        fontSize: 11,
        fontWeight: '500'
    },
    cardMetaSpacer: {
        width: 1,
        height: 10,
        backgroundColor: '#3a3a3c',
        marginHorizontal: spacing.xs
    },
    cardPlayButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#2c2c2e',
        alignItems: 'center',
        justifyContent: 'center'
    },
    cardWaveformRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 8
    },
    cardTimerText: {
        color: '#8e8e93',
        fontSize: 11,
        width: 50,
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace'
    },
    cardWaveformContainer: {
        width: 180,
        height: 40,
        justifyContent: 'center',
        position: 'relative'
    },
    cardWaveformDottedLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: '50%',
        height: 0,
        borderTopWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#3a3a3c',
        marginTop: -0.5
    },
    cardWaveformBarsWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '100%'
    },
    cardWaveBar: {
        width: 3,
        borderRadius: 1.5
    },
    cardWaveCursor: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: '#ef4444',
        marginLeft: -1
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#2c2c2e',
        paddingTop: 10,
        marginTop: 8
    },
    cardFooterLeft: {
        flex: 1
    },
    syncStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    syncStatusText: {
        fontSize: 10,
        fontWeight: '700'
    },
    cardFooterActions: {
        flexDirection: 'row',
        gap: 12
    },
    cardActionIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#2c2c2e',
        alignItems: 'center',
        justifyContent: 'center'
    }
});

export default VoiceRecorderPage;

