import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, Clock, Settings, Cloud, Folder, RefreshCw, Database, Download, Trash, AlertTriangle, ArrowLeft, Play, Square, Pause, Scissors, Share2, Save, CheckCircle, X } from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import toast from 'react-hot-toast';
import axios from 'axios';
import GoogleDriveModal from '../../../components/common/GoogleDriveModal';
import LocalHistoryModal from '../../../components/common/LocalHistoryModal';
import { saveLocalBlob, getLocalBlob, deleteLocalBlob } from '../../../utils/indexedDB';
import { parseDateToDdMmYyyy, getTodayDdMmYyyy } from '../../../utils/dateUtils';

// --- Web Audio WAV Encoder Utilities ---
const bufferToWav = (buffer, startOffset, endOffset) => {
    const numOfChan = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // raw PCM
    const bitDepth = 16;

    const startSample = Math.floor(startOffset * sampleRate);
    const endSample = Math.min(Math.floor(endOffset * sampleRate), buffer.length);
    const blockLength = endSample - startSample;

    let result;
    if (numOfChan === 2) {
        result = interleave(
            buffer.getChannelData(0).subarray(startSample, endSample),
            buffer.getChannelData(1).subarray(startSample, endSample)
        );
    } else {
        result = buffer.getChannelData(0).subarray(startSample, endSample);
    }

    const bufferBytes = new ArrayBuffer(44 + blockLength * 2);
    const view = new DataView(bufferBytes);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + blockLength * 2, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, format, true);
    /* channel count */
    view.setUint16(22, numOfChan, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * numOfChan * 2, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, numOfChan * 2, true);
    /* bits per sample */
    view.setUint16(34, bitDepth, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, blockLength * 2, true);

    floatTo16BitPCM(view, 44, result);

    return new Blob([view], { type: 'audio/wav' });
};

const interleave = (inputL, inputR) => {
    const length = inputL.length + inputR.length;
    const result = new Float32Array(length);
    let index = 0;
    let inputIndex = 0;

    while (index < length) {
        result[index++] = inputL[inputIndex];
        result[index++] = inputR[inputIndex];
        inputIndex++;
    }
    return result;
};

const floatTo16BitPCM = (output, offset, input) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
};

const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};

const removeRangeFromBuffer = (audioBuffer, startTime, endTime) => {
    const sampleRate = audioBuffer.sampleRate;
    const totalSamples = audioBuffer.length;

    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.min(Math.floor(endTime * sampleRate), totalSamples);

    const cutSamples = endSample - startSample;
    const newLength = totalSamples - cutSamples;

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const newBuffer = ctx.createBuffer(
        audioBuffer.numberOfChannels,
        newLength,
        sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const oldData = audioBuffer.getChannelData(channel);
        const newData = newBuffer.getChannelData(channel);

        newData.set(oldData.subarray(0, startSample), 0);
        newData.set(oldData.subarray(endSample, totalSamples), startSample);
    }

    return newBuffer;
};

const sliceAudioBuffer = (audioBuffer, startTime, endTime) => {
    const sampleRate = audioBuffer.sampleRate;
    const totalSamples = audioBuffer.length;

    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.min(Math.floor(endTime * sampleRate), totalSamples);

    const newLength = endSample - startSample;

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const newBuffer = ctx.createBuffer(
        audioBuffer.numberOfChannels,
        newLength,
        sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const oldData = audioBuffer.getChannelData(channel);
        const newData = newBuffer.getChannelData(channel);
        newData.set(oldData.subarray(startSample, endSample), 0);
    }

    return newBuffer;
};

const WaveformPlayer = ({ src, id, durationStr }) => {
    const audioRef = useRef(null);
    const canvasRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    const parseTimeToSeconds = (timeStr) => {
        if (!timeStr) return 0;
        const parts = String(timeStr).split(':').map(Number);
        if (parts.some(isNaN)) return 0;
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 0;
    };

    const [duration, setDuration] = useState(() => {
        if (durationStr) {
            return parseTimeToSeconds(durationStr);
        }
        return 0;
    });

    useEffect(() => {
        if (durationStr) {
            setDuration(parseTimeToSeconds(durationStr));
        }
    }, [durationStr]);

    const peaks = useMemo(() => {
        const seed = String(id || src).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        let rand = seed;
        const lcg = () => {
            rand = (rand * 1664525 + 1013904223) % 4294967296;
            return rand / 4294967296;
        };
        const numPeaks = 45;
        const res = [];
        for (let i = 0; i < numPeaks; i++) {
            res.push(0.15 + lcg() * 0.7);
        }
        return res;
    }, [id, src]);

    const handlePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(e => console.error("Audio playback error:", e));
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            const audioDuration = audioRef.current.duration;
            if (audioDuration && audioDuration !== Infinity && !isNaN(audioDuration)) {
                setDuration(audioDuration);
            }
        }
    };

    const handleAudioEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const handleCanvasClick = (e) => {
        const canvas = canvasRef.current;
        const audio = audioRef.current;
        if (!canvas || !audio || duration === 0) return;

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const cx = rect.width / 2;

        const barWidth = 2.5;
        const gap = 1.5;
        const pixelsPerSecond = (peaks.length * (barWidth + gap)) / duration;

        const clickTime = audio.currentTime + (clickX - cx) / pixelsPerSecond;
        const newTime = Math.max(0, Math.min(duration, clickTime));

        audio.currentTime = newTime;
        setCurrentTime(newTime);
    };

    useEffect(() => {
        let animId;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const draw = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.scale(dpr, dpr);

            const width = rect.width;
            const height = rect.height;
            const centerY = height / 2;
            const cx = width / 2; // Center playhead

            ctx.clearRect(0, 0, width, height);

            // Draw horizontal dotted line in middle
            ctx.strokeStyle = 'rgba(100, 116, 139, 0.1)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(0, centerY);
            ctx.lineTo(width, centerY);
            ctx.stroke();
            ctx.setLineDash([]); // Reset

            // Draw central solid horizontal line
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(0, centerY);
            ctx.lineTo(width, centerY);
            ctx.stroke();

            const barWidth = 1.5;
            const gap = 0.5;
            const curTime = audioRef.current ? audioRef.current.currentTime : 0;
            const activeBarIndex = duration > 0 ? (curTime / duration) * peaks.length : 0;

            peaks.forEach((peakHeight, i) => {
                // Calculate position relative to center playhead
                const x = cx + (i - activeBarIndex) * (barWidth + gap);

                // Skip drawing if offscreen
                if (x < -10 || x > width + 10) return;

                // Dynamic bounce with ripple propagation
                let factor = 1.0;
                if (isPlaying) {
                    const dist = Math.abs(i - activeBarIndex);
                    const ripple = Math.exp(-dist * 0.15);
                    const timeFactor = Date.now() * 0.015;
                    const currentVoiceAmplitude = peaks[Math.floor(activeBarIndex)] || 0.05;
                    factor = 1.0 + Math.sin(dist * 0.5 - timeFactor) * 0.4 * currentVoiceAmplitude * ripple;
                }

                const barHeight = peakHeight * height * 0.75 * factor;

                if (barHeight > 1) {
                    // Played vs unplayed colors
                    if (i <= activeBarIndex) {
                        ctx.strokeStyle = '#ef4444'; // Red
                    } else {
                        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)'; // Slate gray translucent
                    }
                    ctx.lineWidth = barWidth;
                    ctx.beginPath();
                    ctx.moveTo(x, centerY - barHeight / 2);
                    ctx.lineTo(x, centerY + barHeight / 2);
                    ctx.stroke();
                }
            });

            // Draw center red playhead line
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx, 0);
            ctx.lineTo(cx, height);
            ctx.stroke();

            // Small red circle at the top of playhead
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(cx, 3, 2, 0, Math.PI * 2);
            ctx.fill();

            if (isPlaying) {
                animId = requestAnimationFrame(draw);
            }
        };

        draw();

        return () => {
            if (animId) {
                cancelAnimationFrame(animId);
            }
        };
    }, [peaks, duration, isPlaying]);

    const formatTime = (secs) => {
        if (isNaN(secs)) return '00:00';
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = Math.floor(secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-2xl w-full h-11 border border-slate-800 shadow-inner">
            <audio
                ref={audioRef}
                src={src}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleAudioEnded}
            />
            <button
                onClick={handlePlayPause}
                className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all active:scale-90 shrink-0"
            >
                {isPlaying ? (
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                ) : (
                    <svg className="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                )}
            </button>

            <span className="text-[10px] text-slate-400 font-mono select-none min-w-[36px] text-center shrink-0">
                {formatTime(currentTime)}
            </span>

            <div className="flex-1 h-full flex items-center cursor-pointer min-w-0">
                <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    className="w-full h-8"
                />
            </div>

            <span className="text-[10px] text-slate-400 font-mono select-none min-w-[36px] text-center shrink-0">
                {formatTime(duration || 0)}
            </span>

            <svg className="w-4 h-4 text-slate-400 select-none shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
        </div>
    );
};

const VoiceRecorderPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const canvasRef = useRef(null);
    const recordingPeaksRef = useRef([]);
    const lastPeakTimeRef = useRef(0);
    const recordingStartTimeRef = useRef(0);
    const recordingTimeRef = useRef(0);

    // Parse selected date and inbox param
    const searchParams = new URLSearchParams(location.search);
    const dateParam = searchParams.get('date');
    const inboxParam = searchParams.get('inbox');
    const todayDdMmYyyy = getTodayDdMmYyyy();
    const isReadOnly = dateParam && dateParam !== todayDdMmYyyy;

    // States
    const [audioDevices, setAudioDevices] = useState([]);
    const [selectedAudio, setSelectedAudio] = useState('');
    const [micEnabled, setMicEnabled] = useState(true);
    const [countdown, setCountdown] = useState(0);
    const [countdownActive, setCountdownActive] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);

    const [format, setFormat] = useState('WebM');
    const [bitrate, setBitrate] = useState('192k');
    const [channels, setChannels] = useState('mono');

    const [micStream, setMicStream] = useState(null);
    const [recording, setRecording] = useState(false);
    const [recordingPaused, setRecordingPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audios, setAudios] = useState([]);
    const [drafts, setDrafts] = useState([]);
    const [error, setError] = useState(null);
    const [lastAudioUrl, setLastAudioUrl] = useState(null); // Show last recording as audio player after stop

    // Trimmer State
    const [trimmingDraft, setTrimmingDraft] = useState(null);
    const [duration, setDuration] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [decoding, setDecoding] = useState(false);
    const [audioBuffer, setAudioBuffer] = useState(null);
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);
    const [trimming, setTrimming] = useState(false);
    const [editorPeaks, setEditorPeaks] = useState([]);
    const editorCanvasRef = useRef(null);

    // Trimmer Undo/Preview URL States
    const [historyStack, setHistoryStack] = useState([]);
    const [currentPreviewUrl, setCurrentPreviewUrl] = useState(null);
    const createdUrlsRef = useRef([]);

    const previewIntervalRef = useRef(null);
    const trimAudioRef = useRef(null);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    // Audio Context Visualizer refs
    const audioCtxRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);
    const streamSourceRef = useRef(null);

    // Google Drive Modal State
    const [driveModalOpen, setDriveModalOpen] = useState(false);
    const [driveFileMeta, setDriveFileMeta] = useState({ name: '', blob: null });

    // Local History Modal State
    const [localHistoryModalOpen, setLocalHistoryModalOpen] = useState(false);

    // Cloud Gallery Modal State
    const [cloudGalleryModalOpen, setCloudGalleryModalOpen] = useState(false);


    // Cloud files state
    const [cloudFiles, setCloudFiles] = useState([]);

    // Filter local audios by selected date (default: today) and inbox param
    const filteredLocalAudios = useMemo(() => {
        let filtered = audios;
        const targetDate = dateParam || todayDdMmYyyy;

        filtered = filtered.filter(a => parseDateToDdMmYyyy(a.timestamp) === targetDate);

        if (inboxParam) {
            filtered = filtered.filter(a => a.inbox === inboxParam);
        }
        return filtered;
    }, [audios, dateParam, todayDdMmYyyy, inboxParam]);

    // Filter cloud files by selected date (default: today) and inbox param
    const filteredCloudFiles = useMemo(() => {
        let filtered = cloudFiles;
        const targetDate = dateParam || todayDdMmYyyy;

        filtered = filtered.filter(c => parseDateToDdMmYyyy(c.createdAt) === targetDate);

        if (inboxParam) {
            filtered = filtered.filter(c => c.inbox === inboxParam);
        }
        return filtered;
    }, [cloudFiles, dateParam, todayDdMmYyyy, inboxParam]);
    const [cloudSpace, setCloudSpace] = useState({ used: 0, limit: 300 * 1024 * 1024 });
    const [cloudLoading, setCloudLoading] = useState(false);

    // Fetch cloud files
    const fetchCloudFiles = async () => {
        try {
            setCloudLoading(true);
            const url = inboxParam ? `/api/practice-files?inbox=${encodeURIComponent(inboxParam)}` : '/api/practice-files';
            const res = await axios.get(url);
            // Filter files by toolType
            const toolFiles = res.data.files.filter(f => f.toolType === 'voice-recorder');
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

    // Load cloud files on mount
    useEffect(() => {
        fetchCloudFiles();
    }, []);

    // Save latest recording to Google Drive
    const handleSaveToDriveClick = async () => {
        if (isReadOnly) {
            toast.error("Google Drive upload is disabled in Read-Only archive.");
            return;
        }
        if (filteredLocalAudios.length === 0) {
            toast.error("No recordings to save. Record something first.");
            return;
        }
        const latest = filteredLocalAudios[0];
        const blob = await getLocalBlob(latest.id);
        if (!blob) {
            toast.error("Recording file not found locally.");
            return;
        }
        setDriveFileMeta({
            name: `voice_recording_${Date.now()}.webm`,
            blob: blob
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
            toast.success("File deleted from cloud storage!");
            fetchCloudFiles();
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete file from cloud.");
        }
    };

    // Sync local unsynced recordings with cloud
    const handleSyncWithCloud = async () => {
        if (isReadOnly) {
            toast.error("Syncing files is disabled in Read-Only archive.");
            return;
        }
        const unsynced = filteredLocalAudios.filter(a => !a.synced);
        if (unsynced.length === 0) {
            toast.success("All local recordings are synced!");
            return;
        }

        const toastId = toast.loading(`Syncing ${unsynced.length} recordings...`);
        let successCount = 0;

        for (const item of unsynced) {
            try {
                const blob = await getLocalBlob(item.id);
                if (!blob) continue;

                const formData = new FormData();
                formData.append('file', blob, `voice_recording_${item.id}.webm`);
                formData.append('toolType', 'voice-recorder');
                formData.append('duration', item.duration);
                if (item.inbox) {
                    formData.append('inbox', item.inbox);
                }

                await axios.post('/api/practice-files/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                item.synced = true;
                successCount++;
            } catch (err) {
                console.error("Sync error for item:", item.id, err);
                const errMsg = err.response?.data?.message || '';
                if (errMsg.toLowerCase().includes('limit exceeded') || errMsg.toLowerCase().includes('space')) {
                    toast.error(`Sync aborted: ${errMsg}`, { id: toastId });
                    localStorage.setItem('practice_audios', JSON.stringify(audios.map(a => ({ ...a, url: '' }))));
                    fetchCloudFiles();
                    return;
                }
            }
        }

        localStorage.setItem('practice_audios', JSON.stringify(audios.map(a => ({ ...a, url: '' }))));
        await fetchCloudFiles();

        if (successCount > 0) {
            toast.success(`Successfully synced ${successCount} recordings!`, { id: toastId });
        } else {
            toast.error("Failed to sync recordings.", { id: toastId });
        }
    };

    // Load metadata AND restore blobs from IndexedDB
    const loadLocalRecordings = async () => {
        const saved = localStorage.getItem('practice_audios');
        if (saved) {
            try {
                const list = JSON.parse(saved);
                const hydrated = await Promise.all(list.map(async (r) => {
                    const blob = await getLocalBlob(r.id);
                    if (blob) {
                        return { ...r, url: URL.createObjectURL(blob) };
                    }
                    return r;
                }));
                setAudios(hydrated);
            } catch (e) {
                console.error("Failed to load or hydrate local voice recordings:", e);
            }
        } else {
            setAudios([]);
        }
    };

    useEffect(() => {
        loadLocalRecordings();

        // Document-wide user gesture listener to automatically resume AudioContext
        const handleUserGesture = () => {
            if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
                audioCtxRef.current.resume().catch(() => { });
            }
        };

        window.addEventListener('click', handleUserGesture);
        window.addEventListener('keydown', handleUserGesture);

        return () => {
            window.removeEventListener('click', handleUserGesture);
            window.removeEventListener('keydown', handleUserGesture);
        };
    }, []);

    const extractPeaks = (buffer, numPeaks = 150) => {
        const channelData = buffer.getChannelData(0);
        const step = Math.floor(channelData.length / numPeaks);
        const peaksList = [];

        for (let i = 0; i < numPeaks; i++) {
            const start = i * step;
            let max = 0;
            for (let j = 0; j < step; j++) {
                const val = Math.abs(channelData[start + j]);
                if (val > max) max = val;
            }
            peaksList.push(max);
        }

        const maxPeak = Math.max(...peaksList);
        if (maxPeak > 0) {
            return peaksList.map(p => p / maxPeak);
        }
        return peaksList;
    };

    // Trimmer effects and functions
    useEffect(() => {
        if (!trimmingDraft) {
            setAudioBuffer(null);
            setDuration(0);
            setStartTime(0);
            setEndTime(0);
            setEditorPeaks([]);
            setHistoryStack([]);
            setCurrentPreviewUrl(null);
            return;
        }
        const decodeAudio = async () => {
            try {
                setDecoding(true);
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const arrayBuffer = await trimmingDraft.blob.arrayBuffer();
                const decoded = await audioCtx.decodeAudioData(arrayBuffer);
                setAudioBuffer(decoded);
                setDuration(decoded.duration);
                setStartTime(0);
                setEndTime(decoded.duration);
                setEditorPeaks(extractPeaks(decoded));
            } catch (err) {
                console.error("Error decoding audio data:", err);
                toast.error("Failed to load audio for editing.");
            } finally {
                setDecoding(false);
            }
        };
        decodeAudio();
    }, [trimmingDraft]);

    const cleanupSessionUrls = () => {
        createdUrlsRef.current.forEach(url => {
            if (url) {
                try {
                    URL.revokeObjectURL(url);
                } catch (e) {
                    console.error("Failed to revoke URL:", url, e);
                }
            }
        });
        createdUrlsRef.current = [];
        if (currentPreviewUrl) {
            try {
                URL.revokeObjectURL(currentPreviewUrl);
            } catch (e) { }
            setCurrentPreviewUrl(null);
        }
    };

    const handleUndo = () => {
        if (historyStack.length === 0) return;

        stopPreview();

        const previousState = historyStack[historyStack.length - 1];
        setHistoryStack(prev => prev.slice(0, -1));

        setAudioBuffer(previousState.audioBuffer);
        setDuration(previousState.duration);
        setStartTime(0);
        setEndTime(previousState.duration);
        setEditorPeaks(previousState.editorPeaks);
        setCurrentPreviewUrl(previousState.previewUrl);

        toast.success("Last edit undone!");
    };

    const handleSaveEditedAudio = async () => {
        if (!trimmingDraft || !audioBuffer) return;

        stopPreview();
        setTrimming(true);

        try {
            // Only save if edits were made
            if (historyStack.length > 0) {
                const finalBlob = bufferToWav(audioBuffer, 0, audioBuffer.duration);
                const finalUrl = URL.createObjectURL(finalBlob);

                setDrafts(prev => prev.map(d => {
                    if (d.id === trimmingDraft.id) {
                        if (d.url) {
                            try {
                                URL.revokeObjectURL(d.url);
                            } catch (e) { }
                        }
                        return {
                            ...d,
                            blob: finalBlob,
                            url: finalUrl,
                            size: (finalBlob.size / 1024).toFixed(1) + ' KB',
                            duration: formatTime(Math.round(audioBuffer.duration)),
                            durationSec: Math.round(audioBuffer.duration),
                            format: 'WAV'
                        };
                    }
                    return d;
                }));
                toast.success("Voice recording updated and saved to drafts!");
            } else {
                toast.success("No edits made.");
            }

            cleanupSessionUrls();
            setTrimmingDraft(null);
        } catch (err) {
            console.error("Save error:", err);
            toast.error("Failed to save edited audio.");
        } finally {
            setTrimming(false);
        }
    };

    // Handle seeking in the editor canvas
    const handleEditorCanvasClick = (e) => {
        const canvas = editorCanvasRef.current;
        const audio = trimAudioRef.current;
        if (!canvas || !audio || duration === 0 || editorPeaks.length === 0) return;

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const cx = rect.width / 2;

        const barWidth = 2.5;
        const gap = 1.5;
        const pixelsPerSecond = (editorPeaks.length * (barWidth + gap)) / duration;

        const clickTime = audio.currentTime + (clickX - cx) / pixelsPerSecond;
        const newTime = Math.max(0, Math.min(duration, clickTime));

        audio.currentTime = newTime;
    };

    // Editor visualizer animation loop
    useEffect(() => {
        if (!trimmingDraft || !editorCanvasRef.current || editorPeaks.length === 0) return;

        let animId;
        const canvas = editorCanvasRef.current;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const drawEditorWaveform = () => {
            animId = requestAnimationFrame(drawEditorWaveform);
            if (!editorCanvasRef.current) return;

            // Recalculate dimensions in case of resize
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            ctx.scale(dpr, dpr);

            const width = rect.width;
            const height = rect.height;
            const centerY = height / 2;
            const cx = width / 2; // Center playhead

            // Draw horizontal dotted line
            ctx.strokeStyle = 'rgba(100, 116, 139, 0.12)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(0, centerY);
            ctx.lineTo(width, centerY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw central solid horizontal line
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, centerY);
            ctx.lineTo(width, centerY);
            ctx.stroke();

            const barWidth = 1.5;
            const gap = 0.5;
            const curTime = trimAudioRef.current ? trimAudioRef.current.currentTime : 0;
            const activeIndex = duration > 0 ? (curTime / duration) * editorPeaks.length : 0;

            const pixelsPerSecond = (editorPeaks.length * (barWidth + gap)) / duration;

            // Draw timeline ticks at the top of the canvas
            const visibleDuration = width / pixelsPerSecond;
            const startSec = Math.max(0, Math.floor(curTime - visibleDuration / 2));
            const endSec = Math.min(duration, Math.ceil(curTime + visibleDuration / 2));

            for (let sec = startSec; sec <= endSec; sec++) {
                const tickX = cx + (sec - curTime) * pixelsPerSecond;
                if (tickX >= 0 && tickX <= width) {
                    ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(tickX, 0);
                    ctx.lineTo(tickX, 6);
                    ctx.stroke();

                    ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
                    ctx.font = '8px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(formatTime(sec), tickX, 15);
                }
            }

            // Draw selection range background overlay
            const startPct = duration > 0 ? startTime / duration : 0;
            const endPct = duration > 0 ? endTime / duration : 0;

            const selXStart = cx + (startTime - curTime) * pixelsPerSecond;
            const selXEnd = cx + (endTime - curTime) * pixelsPerSecond;

            // Draw unselected dim background outside selection
            ctx.fillStyle = 'rgba(15, 23, 42, 0.05)';
            ctx.fillRect(0, 0, Math.max(0, selXStart), height);
            ctx.fillRect(Math.min(width, selXEnd), 0, Math.max(0, width - selXEnd), height);

            // Draw selection range overlay (darker blue)
            ctx.fillStyle = 'rgba(59, 130, 246, 0.35)';
            ctx.fillRect(Math.max(0, selXStart), 0, Math.max(0, Math.min(width, selXEnd) - Math.max(0, selXStart)), height);

            const isPlaying = trimAudioRef.current && !trimAudioRef.current.paused;
            const currentVoiceAmplitude = editorPeaks[Math.floor(activeIndex)] || 0.05;
            const timeFactor = Date.now() * 0.012;

            // Draw peaks
            editorPeaks.forEach((peakHeight, i) => {
                const x = cx + (i - activeIndex) * (barWidth + gap);

                // Skip drawing if offscreen
                if (x < -10 || x > width + 10) return;

                // Add bounce factor when audio is playing, modulated by current playhead amplitude and ripple decay
                let factor = 1.0;
                if (isPlaying) {
                    const dist = Math.abs(i - activeIndex);
                    const ripple = Math.exp(-dist * 0.12);
                    factor = 1.0 + Math.sin(dist * 0.5 - timeFactor) * 0.4 * currentVoiceAmplitude * ripple;
                }

                const barHeight = peakHeight * height * 0.75 * factor;

                if (barHeight > 1) {
                    const peakPct = i / editorPeaks.length;
                    const isSelected = peakPct >= startPct && peakPct <= endPct;

                    if (isSelected) {
                        ctx.strokeStyle = '#ef4444'; // Red
                    } else {
                        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)'; // Slate gray translucent
                    }

                    ctx.lineWidth = barWidth;
                    ctx.beginPath();
                    ctx.moveTo(x, centerY - barHeight / 2);
                    ctx.lineTo(x, centerY + barHeight / 2);
                    ctx.stroke();
                }
            });

            // Draw center playback cursor (red line)
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx, 0);
            ctx.lineTo(cx, height);
            ctx.stroke();

            // Draw red playhead circle at top
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(cx, 3, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Draw selection handles as vertical dotted lines at selXStart and selXEnd
            ctx.strokeStyle = '#2563eb'; // Solid blue handle lines
            ctx.lineWidth = 1.8;
            ctx.setLineDash([4, 2]);
            if (selXStart >= 0 && selXStart <= width) {
                ctx.beginPath();
                ctx.moveTo(selXStart, 0);
                ctx.lineTo(selXStart, height);
                ctx.stroke();
            }
            if (selXEnd >= 0 && selXEnd <= width) {
                ctx.beginPath();
                ctx.moveTo(selXEnd, 0);
                ctx.lineTo(selXEnd, height);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            ctx.restore();
        };

        drawEditorWaveform();

        return () => {
            cancelAnimationFrame(animId);
        };
    }, [trimmingDraft, editorPeaks, startTime, endTime, duration]);

    const playPreview = () => {
        if (!trimAudioRef.current) return;
        const audio = trimAudioRef.current;
        audio.currentTime = startTime;
        audio.play();
        setIsPlayingPreview(true);

        if (previewIntervalRef.current) clearInterval(previewIntervalRef.current);
        previewIntervalRef.current = setInterval(() => {
            if (audio.currentTime >= endTime) {
                audio.pause();
                audio.currentTime = startTime;
                setIsPlayingPreview(false);
                clearInterval(previewIntervalRef.current);
            }
        }, 50);
    };

    const stopPreview = () => {
        if (!trimAudioRef.current) return;
        trimAudioRef.current.pause();
        setIsPlayingPreview(false);
        if (previewIntervalRef.current) {
            clearInterval(previewIntervalRef.current);
            previewIntervalRef.current = null;
        }
    };

    useEffect(() => {
        return () => {
            if (previewIntervalRef.current) {
                clearInterval(previewIntervalRef.current);
            }
        };
    }, []);

    // Get microphone devices
    useEffect(() => {
        const getMics = async () => {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
                    s.getTracks().forEach(t => t.stop());
                }).catch(() => { });

                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioInputs = devices.filter(d => d.kind === 'audioinput');
                setAudioDevices(audioInputs);
                if (audioInputs.length > 0) setSelectedAudio(audioInputs[0].deviceId);
            } catch (e) {
                setAudioDevices([{ deviceId: 'mock-mic', label: 'Default Microphone' }]);
                setSelectedAudio('mock-mic');
            }
        };
        getMics();
    }, []);

    // Handle stream and visualizer binding
    useEffect(() => {
        if (!micEnabled) {
            stopAudioStream();
            return;
        }

        const startMic = async () => {
            stopAudioStream();
            setError(null);

            const constraints = {
                audio: selectedAudio ? { deviceId: { exact: selectedAudio } } : true
            };

            try {
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                setMicStream(stream);
                setupVisualizer(stream);
            } catch (err) {
                console.error(err);
                setError("Microphone permission denied or microphone in use.");
                setMicEnabled(false);
            }
        };

        startMic();

        return () => {
            stopAudioStream();
        };
    }, [selectedAudio, micEnabled]);

    const stopAudioStream = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (streamSourceRef.current) {
            streamSourceRef.current.disconnect();
            streamSourceRef.current = null;
        }
        if (analyserRef.current) {
            analyserRef.current = null;
        }
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            audioCtxRef.current.close();
            audioCtxRef.current = null;
        }
        if (micStream) {
            micStream.getTracks().forEach(t => t.stop());
            setMicStream(null);
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    // Setup Web Audio Analyser
    const setupVisualizer = async (stream) => {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContextClass();
            audioCtxRef.current = audioCtx;

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256; // lower fftSize for simpler wave representation
            analyser.smoothingTimeConstant = 0.85;
            analyser.minDecibels = -90;
            analyser.maxDecibels = -10;
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            streamSourceRef.current = source;
            source.connect(analyser);

            if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => { });
            }
        } catch (e) {
            console.error("Failed to initialize visualizer:", e);
        }
    };

    // Continuous waveform animation loop
    useEffect(() => {
        let animId;
        const draw = () => {
            animId = requestAnimationFrame(draw);

            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const isRecording = mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording';

            if (isRecording && analyserRef.current) {
                const now = Date.now();
                const elapsedMs = now - recordingStartTimeRef.current;
                const elapsedSec = elapsedMs / 1000;

                // Collect peaks every 100ms
                if (now - lastPeakTimeRef.current >= 100) {
                    const analyser = analyserRef.current;
                    const bufferLength = analyser.frequencyBinCount;
                    const dataArray = new Uint8Array(bufferLength);
                    analyser.getByteFrequencyData(dataArray);

                    let sum = 0;
                    for (let i = 0; i < bufferLength; i++) {
                        sum += dataArray[i];
                    }
                    const average = sum / bufferLength;
                    let normalized = average / 140; // Boost sensitivity for better visual feel
                    normalized = Math.max(0.04, Math.min(1.0, normalized));

                    recordingPeaksRef.current.push(normalized);
                    lastPeakTimeRef.current = now;
                }

                // Draw scrolling waveform with DPR scaling
                const dpr = window.devicePixelRatio || 1;
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                ctx.scale(dpr, dpr);

                const width = rect.width;
                const height = rect.height;
                const centerY = height / 2;
                const cx = width / 2; // Center playhead

                ctx.clearRect(0, 0, width, height);

                // Draw horizontal dotted line
                ctx.strokeStyle = 'rgba(100, 116, 139, 0.15)';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(0, centerY);
                ctx.lineTo(width, centerY);
                ctx.stroke();
                ctx.setLineDash([]);

                const barWidth = 2.5;
                const gap = 1.5;
                const peaksList = recordingPeaksRef.current;

                // Draw timeline ticks at the top of the canvas
                const pixelsPerSecond = 10 * (barWidth + gap); // 10 peaks per second
                const visibleDuration = width / pixelsPerSecond;
                const startSec = Math.max(0, Math.floor(elapsedSec - visibleDuration / 2));
                const endSec = Math.ceil(elapsedSec + visibleDuration / 2);

                for (let sec = startSec; sec <= endSec; sec++) {
                    const tickX = cx + (sec - elapsedSec) * pixelsPerSecond;
                    if (tickX >= 0 && tickX <= width) {
                        ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(tickX, 0);
                        ctx.lineTo(tickX, 6);
                        ctx.stroke();

                        ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
                        ctx.font = '8px monospace';
                        ctx.textAlign = 'center';
                        ctx.fillText(formatTime(sec), tickX, 15);
                    }
                }

                // Draw peaks to the left of playhead
                peaksList.forEach((peakHeight, i) => {
                    const x = cx + (i - elapsedSec * 10) * (barWidth + gap);

                    // Skip drawing if offscreen
                    if (x < -10 || x > width + 10) return;

                    const barHeight = Math.max(peakHeight * height * 0.75, 2);
                    const y = centerY - barHeight / 2;

                    // Red/rose gradient for active voice recorder waves
                    const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
                    grad.addColorStop(0, '#f43f5e');
                    grad.addColorStop(1, '#ef4444');
                    ctx.fillStyle = grad;

                    ctx.beginPath();
                    const radius = 0.5;
                    ctx.moveTo(x + radius, y);
                    ctx.arcTo(x + barWidth, y, x + barWidth, y + barHeight, radius);
                    ctx.arcTo(x + barWidth, y + barHeight, x, y + barHeight, radius);
                    ctx.arcTo(x, y + barHeight, x, y, radius);
                    ctx.arcTo(x, y, x + barWidth, y, radius);
                    ctx.closePath();
                    ctx.fill();
                });

                // Red center playhead line
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx, 0);
                ctx.lineTo(cx, height);
                ctx.stroke();

                // Red circle at the top of playhead
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(cx, 3, 2.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                const dpr = window.devicePixelRatio || 1;
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                ctx.scale(dpr, dpr);

                const width = rect.width;
                const height = rect.height;
                const centerY = height / 2;

                ctx.clearRect(0, 0, width, height);

                // Draw a beautiful flowing quiet wavy line
                const time = Date.now() * 0.003;
                const points = 100;
                const sliceWidth = width / (points - 1);

                // Draw main wave (semi-transparent red)
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                for (let i = 0; i < points; i++) {
                    const x = i * sliceWidth;
                    const t = i / (points - 1);
                    const envelope = Math.sin(t * Math.PI); // taper edges to 0
                    const y = centerY + Math.sin(t * Math.PI * 4 - time) * 6 * envelope;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();

                // Draw secondary wave (slightly out of phase, smaller)
                ctx.strokeStyle = 'rgba(244, 63, 94, 0.2)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let i = 0; i < points; i++) {
                    const x = i * sliceWidth;
                    const t = i / (points - 1);
                    const envelope = Math.sin(t * Math.PI);
                    const y = centerY + Math.sin(t * Math.PI * 6 + time * 0.8) * 4 * envelope;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
        };

        draw();

        return () => {
            cancelAnimationFrame(animId);
        };
    }, []);

    function roundRect(ctx, x, y, width, height, radius) {

        ctx.beginPath();

        ctx.moveTo(x + radius, y);

        ctx.arcTo(x + width, y, x + width, y + height, radius);

        ctx.arcTo(x + width, y + height, x, y + height, radius);

        ctx.arcTo(x, y + height, x, y, radius);

        ctx.arcTo(x, y, x + width, y, radius);

        ctx.closePath();

        ctx.fill();

    }

    const toggleRecording = () => {
        if (isReadOnly) {
            toast.error("Recording new clips is disabled in Read-Only archive.");
            return;
        }

        // Resume AudioContext if suspended
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume().catch(err => console.error("Error resuming audio context:", err));
        }

        if (recording) {
            handleStopRecording();
            toast.success("Voice recording stopped!");
        } else {
            if (countdown > 0) {
                setCountdownActive(true);
                setSecondsLeft(countdown);
            } else {
                startRecordingProcess();
            }
        }
    };

    const handleAudioUpload = (e) => {
        if (isReadOnly) {
            toast.error("Uploading files is disabled in Read-Only archive.");
            return;
        }
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('audio/')) {
            toast.error("Please upload a valid audio file.");
            return;
        }

        const url = URL.createObjectURL(file);
        const audioEl = new Audio(url);

        const toastId = toast.loading("Processing uploaded audio...");

        audioEl.addEventListener('loadedmetadata', () => {
            const fileDuration = audioEl.duration;
            const draftId = 'draft_' + Date.now();
            const searchParams = new URLSearchParams(window.location.search);
            const inboxVal = searchParams.get('inbox');

            const newDraft = {
                id: draftId,
                timestamp: new Date().toLocaleString(),
                blob: file,
                url: url,
                size: (file.size / 1024).toFixed(1) + ' KB',
                duration: formatTime(Math.round(fileDuration)),
                durationSec: Math.round(fileDuration),
                format: file.name.split('.').pop().toUpperCase() || 'WAV',
                inbox: inboxVal || ''
            };

            setDrafts(prev => [newDraft, ...prev]);
            setLastAudioUrl(url);
            toast.success("Audio file uploaded and added to Drafts!", { id: toastId });
        });

        audioEl.addEventListener('error', () => {
            const draftId = 'draft_' + Date.now();
            const searchParams = new URLSearchParams(window.location.search);
            const inboxVal = searchParams.get('inbox');

            const newDraft = {
                id: draftId,
                timestamp: new Date().toLocaleString(),
                blob: file,
                url: url,
                size: (file.size / 1024).toFixed(1) + ' KB',
                duration: '00:00',
                durationSec: 0,
                format: file.name.split('.').pop().toUpperCase() || 'WAV',
                inbox: inboxVal || ''
            };
            setDrafts(prev => [newDraft, ...prev]);
            setLastAudioUrl(url);
            toast.success("Audio file uploaded (duration estimate unavailable).", { id: toastId });
        });
    };

    // Countdown effect
    useEffect(() => {
        if (!countdownActive) return;
        if (secondsLeft === 0) {
            setCountdownActive(false);
            startRecordingProcess();
            return;
        }
        const timer = setInterval(() => {
            setSecondsLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [countdownActive, secondsLeft]);

    const startRecordingProcess = async () => {
        // Resume AudioContext if suspended
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            await audioCtxRef.current.resume().catch(() => { });
        }

        if (!micStream) {
            toast.error("Microphone is not active.");
            return;
        }

        chunksRef.current = [];

        let options = { mimeType: 'audio/webm;codecs=opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = {}; // fallback
        }

        try {
            const recorder = new MediaRecorder(micStream, options);
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            recorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const blobUrl = URL.createObjectURL(blob);
                const draftId = 'draft_' + Date.now();

                const searchParams = new URLSearchParams(window.location.search);
                const inboxVal = searchParams.get('inbox');
                const newDraft = {
                    id: draftId,
                    timestamp: new Date().toLocaleString(),
                    blob: blob,
                    url: blobUrl,
                    size: (blob.size / 1024).toFixed(1) + ' KB',
                    duration: formatTime(recordingTimeRef.current),
                    durationSec: recordingTimeRef.current,
                    format: format,
                    inbox: inboxVal || ''
                };

                setDrafts(prev => [newDraft, ...prev]);
                setLastAudioUrl(blobUrl);
                setRecordingTime(0);
                recordingTimeRef.current = 0;
                toast.success("Recording complete! Added to Draft Content.");
            };

            setRecording(true);
            recordingTimeRef.current = 0;
            setRecordingTime(0);
            recordingPeaksRef.current = [];
            lastPeakTimeRef.current = Date.now();
            recordingStartTimeRef.current = Date.now();
            recorder.start(1000);

            timerRef.current = setInterval(() => {
                recordingTimeRef.current += 1;
                setRecordingTime(recordingTimeRef.current);
            }, 1000);

            toast.success("Recording voice...");
        } catch (err) {
            console.error(err);
            toast.error("Failed to start voice recording.");
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setRecording(false);
        setRecordingPaused(false);
    };

    const handlePauseRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            setRecordingPaused(true);
            toast.success("Recording paused.");
        }
    };

    const handleResumeRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            timerRef.current = setInterval(() => {
                recordingTimeRef.current += 1;
                setRecordingTime(recordingTimeRef.current);
            }, 1000);
            setRecordingPaused(false);
            toast.success("Recording resumed.");
        }
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleSaveDraft = async (draft) => {
        if (isReadOnly) {
            toast.error("Saving files is disabled in Read-Only archive.");
            return;
        }
        try {
            const recId = 'aud_' + Date.now();
            await saveLocalBlob(recId, draft.blob);

            const newAudio = {
                id: recId,
                timestamp: draft.timestamp,
                url: draft.url,
                size: draft.size,
                duration: draft.duration,
                format: draft.format,
                synced: false,
                driveSynced: false,
                inbox: draft.inbox
            };

            setAudios(prev => {
                const list = [newAudio, ...prev];
                localStorage.setItem('practice_audios', JSON.stringify(list.map(a => ({ ...a, url: '' }))));
                return list;
            });

            setDrafts(prev => prev.filter(d => d.id !== draft.id));
            toast.success("Recording saved locally!");
        } catch (e) {
            console.error("Failed to save draft:", e);
            toast.error("Failed to save recording.");
        }
    };

    const handleDeleteDraft = (id) => {
        setDrafts(prev => {
            const item = prev.find(d => d.id === id);
            if (item && item.url) {
                URL.revokeObjectURL(item.url);
            }
            return prev.filter(d => d.id !== id);
        });
        toast.success("Draft recording deleted.");
    };

    const handleSyncSingleWithCloud = async (item) => {
        if (isReadOnly) {
            toast.error("Syncing files is disabled in Read-Only archive.");
            return;
        }
        const toastId = toast.loading("Syncing recording to Cloud...");
        try {
            const blob = await getLocalBlob(item.id);
            if (!blob) {
                toast.error("Recording file not found locally.", { id: toastId });
                return;
            }

            const formData = new FormData();
            formData.append('file', blob, `voice_recording_${item.id}.${item.format.toLowerCase()}`);
            formData.append('toolType', 'voice-recorder');
            formData.append('duration', item.duration);
            if (item.inbox) {
                formData.append('inbox', item.inbox);
            }

            await axios.post('/api/practice-files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Mark as synced
            setAudios(prev => {
                const list = prev.map(a => a.id === item.id ? { ...a, synced: true } : a);
                localStorage.setItem('practice_audios', JSON.stringify(list.map(a => ({ ...a, url: '' }))));
                return list;
            });

            await fetchCloudFiles();
            toast.success("Successfully synced recording with Cloud!", { id: toastId });
        } catch (err) {
            console.error("Cloud sync error:", err);
            const errMsg = err.response?.data?.message || 'Failed to sync with cloud.';
            toast.error(errMsg, { id: toastId });
        }
    };

    const handleSyncSingleWithDrive = async (item) => {
        if (isReadOnly) {
            toast.error("Google Drive upload is disabled in Read-Only archive.");
            return;
        }
        const blob = await getLocalBlob(item.id);
        if (!blob) {
            toast.error("Recording file not found locally.");
            return;
        }
        setDriveFileMeta({
            name: `voice_recording_${item.id}.${item.format.toLowerCase()}`,
            blob: blob,
            itemId: item.id
        });
        setDriveModalOpen(true);
    };

    // Share Modal State
    const [shareModalItem, setShareModalItem] = useState(null);

    const openShareModal = (item) => {
        setShareModalItem(item);
    };

    const getCloudLinkForItem = (item) => {
        if (!item?.synced) return null;
        const match = cloudFiles.find(c =>
            c.filename?.includes(item.id) ||
            c.filename?.includes(`voice_recording_${item.id}`)
        );
        return match?.fileUrl || null;
    };

    const handleDelete = async (id) => {
        const updated = audios.filter(a => a.id !== id);
        setAudios(updated);
        localStorage.setItem('practice_audios', JSON.stringify(updated.map(a => ({ ...a, url: '' }))));
        await deleteLocalBlob(id);
        toast.success("Audio recording deleted.");
    };

    return (
        <DashboardLayout role="Student" fullWidth={true}>
            <div className="max-w-7xl mx-auto px-4 py-2 text-left">
                {/* Back Link & Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
                    {/* Left: Title */}
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                            <Mic className="text-blue-650" size={20} />
                            Voice Recorder {isReadOnly && <span className="text-xs px-2.5 py-1 bg-amber-500 text-white rounded-md font-bold uppercase tracking-wider">Preview Only</span>}
                        </h1>
                    </div>

                    {/* Center: Data Settings Quick Access */}
                    <div className="flex items-center gap-3 flex-wrap border rounded-xl p-3 bg-gray-100 h-15 w-[800px] justify-center">
                        {/* Local Data */}
                        <button
                            onClick={() => setLocalHistoryModalOpen(true)}
                            className="w-100 h-10 flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-700 rounded-xl text-xs font-bold transition-all shadow-sm"
                            title="Go to Local Data"
                        >
                            <Folder size={13} className="text-indigo-500 shrink-0" />
                            <span className="hidden sm:inline">Data on Local Cloud</span>
                            <span className="text-[9px] font-black text-slate-400 hidden sm:inline">• {filteredLocalAudios.length}</span>
                        </button>

                        {/* Cloud Data */}
                        <button
                            onClick={async () => {
                                await fetchCloudFiles();
                                setCloudGalleryModalOpen(true);
                            }}
                            className="w-100 h-10 flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-indigo-200 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 rounded-xl text-xs font-bold transition-all shadow-sm"
                            title="Go to Cloud Data"
                        >
                            <Database size={13} className="text-indigo-500 shrink-0" />
                            <span className="hidden sm:inline">Data on DS Cloud</span>
                            <span className="text-[9px] font-black text-slate-400 hidden sm:inline">• {filteredCloudFiles.length}</span>
                        </button>

                        {/* Drive History */}
                        <button
                            onClick={() => {
                                setDriveFileMeta({ name: '', blob: null });
                                setDriveModalOpen(true);
                            }}
                            className="w-100 h-10 flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 text-slate-600 hover:text-amber-700 rounded-xl text-xs font-bold transition-all shadow-sm"
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
                            if (inboxParam) {
                                navigate('/student/tests');
                            } else {
                                navigate(dateParam ? `/student/practice-tools?date=${dateParam}` : '/student/practice-tools');
                            }
                        }}
                        className="flex items-center gap-1.5 text-slate-550 hover:text-slate-800 transition-colors font-bold text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl self-start sm:self-auto shadow-sm"
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
                            <p className="text-amber-800/80 text-[11px] font-medium mt-0.5">You are viewing files captured on {dateParam}. Capturing recordings, deleting, or syncing files is disabled for this day.</p>
                        </div>
                    </div>
                )}

                {/* 2-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

                    {/* Left Column: Recording Area, Draft Content, Saved Content */}
                    <div className="lg:col-span-9 space-y-6 order-2 lg:order-1">

                        {/* Recording Zone */}
                        {/* </div><div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[100px]"> */}

                        {/* Voice Visualizer Box */}
                        <div className="flex-1 mt-2.5 mb-3 bg-slate-950 rounded-2xl relative flex flex-col justify-between items-center overflow-hidden border border-slate-800 min-h-[100px] h-[100px] pt-2">
                            {/* Top Header / Status Inside Visualizer */}
                            <div className=" flex justify-end items-center z-20 absolute top-0 right-0 w-full">
                                {recording && (
                                    <span className="text-red-500 font-bold text-[10px] animate-pulse flex items-center gap-1 bg-red-950/40 px-2.5 py-0.5 rounded-full border border-red-900/30">
                                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                        {formatTime(recordingTime)}
                                    </span>
                                )}
                            </div>

                            {/* Center: Controls Grid */}
                            <div className="flex items-center justify-center gap-6 px-6 z-10 w-full relative">
                                {recording ? (
                                    <div className="flex items-center gap-3">
                                        {/* Stop Voice */}
                                        <button
                                            disabled={isReadOnly}
                                            onClick={toggleRecording}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white border border-red-600 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs shadow-[0_0_12px_rgba(239,68,68,0.2)] active:scale-95"
                                        >
                                            <Square size={12} fill="white" />
                                            <span>Stop Voice</span>
                                        </button>

                                        {/* Pause / Resume Button */}
                                        {recordingPaused ? (
                                            <button
                                                disabled={isReadOnly}
                                                onClick={handleResumeRecording}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs shadow-[0_0_12px_rgba(16,185,129,0.2)] active:scale-95"
                                            >
                                                <Play size={12} fill="white" />
                                                <span>Resume</span>
                                            </button>
                                        ) : (
                                            <button
                                                disabled={isReadOnly}
                                                onClick={handlePauseRecording}
                                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white border border-amber-500 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs shadow-[0_0_12px_rgba(245,158,11,0.2)] active:scale-95"
                                            >
                                                <Pause size={12} fill="white" />
                                                <span>Pause</span>
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-5">
                                        {/* Left Button: Start Voice */}
                                        <button
                                            disabled={isReadOnly}
                                            onClick={toggleRecording}
                                            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs border ${isReadOnly
                                                ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                                                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.2)] active:scale-95'
                                                }`}
                                        >
                                            <Mic size={12} />
                                            <span>Start Voice</span>
                                        </button>

                                        {/* Center: Glowing Microphone Icon Button */}
                                        <button
                                            onClick={() => setMicEnabled(!micEnabled)}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${micEnabled
                                                ? 'bg-blue-600/10 text-blue-400 border border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse'
                                                : 'bg-slate-900 text-slate-655 border border-slate-800'
                                                }`}
                                            title={micEnabled ? "Mute Microphone" : "Unmute Microphone"}
                                        >
                                            <Mic size={18} />
                                        </button>

                                        {/* Right Button: Upload Audio */}
                                        <button
                                            disabled={isReadOnly}
                                            onClick={() => document.getElementById('audio-upload-input')?.click()}
                                            className={`px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-350 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs active:scale-95 shadow-sm ${isReadOnly ? 'opacity-40 cursor-not-allowed' : ''
                                                }`}
                                        >
                                            <Cloud size={12} />
                                            <span>Upload Audio</span>
                                        </button>

                                        {/* Hidden File Input for Audio Upload */}
                                        <input
                                            type="file"
                                            id="audio-upload-input"
                                            accept="audio/*"
                                            onChange={handleAudioUpload}
                                            className="hidden"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Bottom: Waves Canvas (Stacked below buttons, no absolute inset-0 overlay) */}
                            <div className="w-full h-16 relative overflow-hidden bg-slate-900/30 border-t border-slate-900/50 flex items-center justify-center pointer-events-none">
                                <canvas
                                    ref={canvasRef}
                                    width={800}
                                    height={64}
                                    className="w-full h-full opacity-90"
                                ></canvas>
                            </div>

                            {/* Countdown Ping Overlay */}
                            {countdownActive && (
                                <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-20 rounded-2xl">
                                    <div className="w-20 h-20 bg-blue-650 text-white rounded-full flex items-center justify-center text-4xl font-black animate-ping">
                                        {secondsLeft}
                                    </div>
                                </div>
                            )}
                        </div>




                        {/* Draft Content */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider flex items-center justify-between">
                                <span>Draft Content</span>
                                <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 font-bold rounded-full">
                                    {drafts.length} Drafts
                                </span>
                            </h3>
                            {drafts.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-6">
                                    No draft recordings. Record something to see drafts here.
                                </p>
                            ) : (
                                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                                    {drafts.map((draft, index) => (
                                        <div key={draft.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-150 hover:border-slate-300 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">
                                                    Rec {drafts.length - index}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold">
                                                    {draft.duration} • {draft.size}
                                                </span>
                                            </div>
                                            <div className="flex-1 max-w-md">
                                                <WaveformPlayer src={draft.url} id={draft.id} durationStr={draft.duration} />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* Voice Editor Trim Button (Blue Circle) */}
                                                <button
                                                    onClick={() => setTrimmingDraft(draft)}
                                                    className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all active:scale-95 shadow-sm"
                                                    title="Trim Audio"
                                                >
                                                    <Scissors size={14} />
                                                </button>
                                                {/* Save Button */}
                                                <button
                                                    onClick={() => handleSaveDraft(draft)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-750 transition-all active:scale-95 shadow-sm"
                                                    title="Save to Local Storage"
                                                >
                                                    <Save size={14} />
                                                    <span>Save</span>
                                                </button>
                                                {/* Download Button */}
                                                <a
                                                    href={draft.url}
                                                    download={`draft_${draft.id}.${draft.format.toLowerCase()}`}
                                                    className="p-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-all border border-emerald-100"
                                                    title="Download File"
                                                >
                                                    <Download size={14} />
                                                </a>
                                                {/* Delete Button (Bold black outline) */}
                                                <button
                                                    onClick={() => handleDeleteDraft(draft.id)}
                                                    className="px-3 py-1.5 bg-white text-slate-800 border-2 border-slate-800 rounded-xl text-xs font-black uppercase hover:bg-slate-50 transition-all"
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

                        {/* Saved Content */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider flex items-center justify-between">
                                <span>Saved Content</span>
                                <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded-full">
                                    {filteredLocalAudios.length} Saved
                                </span>
                            </h3>
                            {filteredLocalAudios.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-6">
                                    No saved recordings found.
                                </p>
                            ) : (
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                                    {filteredLocalAudios.map((item, index) => (
                                        <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-150 hover:border-slate-350 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">
                                                    Rec {filteredLocalAudios.length - index}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold">
                                                    {item.duration} • {item.size} • {item.format}
                                                </span>
                                            </div>
                                            <div className="flex-1 max-w-md">
                                                <WaveformPlayer src={item.url} id={item.id} durationStr={item.duration} />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* Synced with Cloud Indicator / Sync Button */}
                                                {item.synced ? (
                                                    <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">
                                                        <CheckCircle size={14} className="text-emerald-600" />
                                                        <span>Synced</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSyncSingleWithCloud(item)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-[10px] font-extrabold hover:bg-indigo-100 transition-all"
                                                        title="Sync with Cloud"
                                                    >
                                                        <Cloud size={14} />
                                                        <span className="text-[9px] leading-none text-left">Not Sync<br />Click to Sync</span>
                                                    </button>
                                                )}

                                                {/* Google Drive Sync Indicator / Sync Button */}
                                                {item.driveSynced ? (
                                                    <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-255 rounded-xl text-xs font-bold">
                                                        <CheckCircle size={14} className="text-amber-600" />
                                                        <span>Drive Synced</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSyncSingleWithDrive(item)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-[10px] font-extrabold hover:bg-amber-100 transition-all"
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

                                                {/* Share Button */}
                                                <button
                                                    onClick={() => openShareModal(item)}
                                                    className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-750 transition-all active:scale-95 shadow-sm"
                                                    title="Share Recording"
                                                >
                                                    <Share2 size={14} />
                                                </button>

                                                {/* Trash/Delete Button */}
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all active:scale-95 shadow-sm"
                                                    title="Delete Saved Recording"
                                                >
                                                    <Trash size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Right Column: Source & Settings Sidebar */}
                    <div className="lg:col-span-3 space-y-6">

                        {/* Source Card */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3.5">
                            <h3 className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-2 uppercase tracking-wider">Source</h3>

                            {/* Microphone Device */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Microphone</label>
                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${micEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                        {micEnabled ? 'ON' : 'OFF'}
                                    </span>
                                </div>
                                <div className="flex gap-2 min-w-0">
                                    <select
                                        disabled={!micEnabled}
                                        value={selectedAudio}
                                        onChange={(e) => setSelectedAudio(e.target.value)}
                                        className="flex-1 min-w-0 text-xs bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 outline-none font-bold text-slate-700 disabled:opacity-50 truncate"
                                    >
                                        {audioDevices.map(d => (
                                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 5)}`}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => setMicEnabled(!micEnabled)}
                                        className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-colors ${micEnabled ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        Toggle
                                    </button>
                                </div>
                            </div>

                            {/* Channel Config */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Channels</label>
                                <select
                                    value={channels}
                                    onChange={(e) => setChannels(e.target.value)}
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 outline-none font-bold text-slate-700"
                                >
                                    <option value="mono">Mono Channel</option>
                                    <option value="stereo">Stereo Channel</option>
                                </select>
                            </div>

                            {/* Format Config */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Format</label>
                                <select
                                    value={format}
                                    onChange={(e) => setFormat(e.target.value)}
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 outline-none font-bold text-slate-700"
                                >
                                    <option value="WebM">Format: WebM</option>
                                    <option value="WAV">Format: WAV</option>
                                </select>
                            </div>

                            {/* Bitrate Config */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bitrate</label>
                                <select
                                    value={bitrate}
                                    onChange={(e) => setBitrate(e.target.value)}
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 outline-none font-bold text-slate-700"
                                >
                                    <option value="192k">Bitrate: 192k</option>
                                    <option value="128k">Bitrate: 128k</option>
                                    <option value="320k">Bitrate: 320k (Pro)</option>
                                </select>
                            </div>

                            {/* Countdown Timer */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <Clock size={12} /> Countdown Timer
                                </label>
                                <select
                                    value={countdown}
                                    onChange={(e) => setCountdown(parseInt(e.target.value))}
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 outline-none font-bold text-slate-700"
                                >
                                    <option value={0}>Off (Instant)</option>
                                    <option value={3}>3 Seconds</option>
                                    <option value={5}>5 Seconds</option>
                                </select>
                            </div>

                            {/* Auto-Stop Limit */}
                            <div className="flex justify-between items-center p-2 bg-blue-50/40 border border-blue-100 rounded-xl">
                                <div className="text-left">
                                    <span className="text-[10px] font-black text-blue-800 uppercase tracking-wide">Auto-Stop Limit</span>
                                    <p className="text-[8px] text-slate-405 font-bold uppercase tracking-wider">Stops at 10 minutes</p>
                                </div>
                                <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[7px] font-black rounded uppercase tracking-wider shadow-sm">
                                    PRO
                                </span>
                            </div>

                            {/* Additional Settings */}
                            <details className="group border border-slate-100 rounded-xl p-2.5 bg-slate-50/50">
                                <summary className="list-none flex justify-between items-center cursor-pointer text-xs font-bold text-slate-600 select-none">
                                    <span className="flex items-center gap-1.5"><Settings size={12} /> Advanced settings</span>
                                    <span className="transition-transform group-open:rotate-180 text-[10px]">▼</span>
                                </summary>
                                <div className="mt-2 pt-2 border-t border-slate-100 space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 text-[11px]">Echo Cancellation</span>
                                        <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 text-[11px]">Noise Suppression</span>
                                        <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
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
                        // Build direct file view URL using the Drive file ID
                        const driveFileViewUrl = driveData?.id
                            ? `https://drive.google.com/file/d/${driveData.id}/view`
                            : driveData?.webViewLink || null;

                        setAudios(prev => {
                            const list = prev.map(a =>
                                a.id === driveFileMeta.itemId
                                    ? { ...a, driveSynced: true, driveUrl: driveFileViewUrl }
                                    : a
                            );
                            localStorage.setItem('practice_audios', JSON.stringify(list.map(a => ({ ...a, url: '' }))));
                            return list;
                        });
                    }
                }}
            />

            {/* Local Storage Virtual History Modal */}
            <LocalHistoryModal
                isOpen={localHistoryModalOpen}
                readOnly={isReadOnly}
                filterDate={dateParam || todayDdMmYyyy}
                onClose={() => {
                    setLocalHistoryModalOpen(false);
                    loadLocalRecordings();
                }}
                onRefresh={() => {
                    loadLocalRecordings();
                }}
            />

            {/* ── Share Modal ── */}
            {shareModalItem && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden flex flex-col">

                        {/* Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                    <Share2 className="text-blue-600" size={18} />
                                </div>
                                <div>
                                    <span className="font-extrabold text-slate-800 text-sm block">Share Recording</span>
                                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5 uppercase tracking-wider">
                                        {shareModalItem.duration} • {shareModalItem.format}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setShareModalItem(null)}
                                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5 space-y-4">

                            {/* Option 1: Cloud Link */}
                            <div className={`rounded-2xl border p-4 space-y-2.5 ${shareModalItem.synced ? 'border-indigo-100 bg-indigo-50/40' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                                <div className="flex items-center gap-2">
                                    <Database size={14} className={shareModalItem.synced ? 'text-indigo-600' : 'text-slate-400'} />
                                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">DS Cloud Link</span>
                                    {shareModalItem.synced
                                        ? <span className="ml-auto px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black rounded-full uppercase tracking-wider">Synced ✓</span>
                                        : <span className="ml-auto px-2 py-0.5 bg-slate-200 text-slate-500 text-[9px] font-black rounded-full uppercase tracking-wider">Not Synced</span>
                                    }
                                </div>
                                {shareModalItem.synced ? (() => {
                                    const match = cloudFiles.find(c =>
                                        c.filename?.includes(shareModalItem.id) ||
                                        c.filename?.includes(`voice_recording_${shareModalItem.id}`)
                                    );
                                    const sharePageUrl = match?._id
                                        ? `${window.location.origin}/share/voice/${match._id}`
                                        : null;
                                    return (
                                        <div className="space-y-2">
                                            {sharePageUrl ? (
                                                <div className="flex gap-2">
                                                    <input
                                                        readOnly
                                                        value={sharePageUrl}
                                                        className="flex-1 text-[10px] font-mono bg-white border border-indigo-100 rounded-xl px-3 py-2 outline-none text-slate-600 truncate select-all cursor-pointer"
                                                        onClick={e => e.target.select()}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard?.writeText(sharePageUrl);
                                                            toast.success('Cloud share link copied! 🔗');
                                                        }}
                                                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black transition-all shrink-0"
                                                    >
                                                        Copy
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-slate-400 font-medium">Cloud file ID not found — try refreshing Cloud Data first.</p>
                                            )}
                                            <p className="text-[9px] text-indigo-400 font-medium">ℹ️ Anyone with this link can listen to your recording without logging in.</p>
                                        </div>
                                    );
                                })() : (
                                    <p className="text-[10px] text-slate-400 font-medium">Sync this recording to DS Cloud first to get a shareable link.</p>
                                )}
                            </div>

                            {/* Option 2: Google Drive Link */}
                            <div className={`rounded-2xl border p-4 space-y-2.5 ${shareModalItem.driveSynced ? 'border-amber-100 bg-amber-50/40' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                                <div className="flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 48 48">
                                        <path fill="#FFC107" d="M17 6h14l13 22H30L17 6z" />
                                        <path fill="#FF3D00" d="m15.5 11.5-8.5 15L17 42h13L15.5 11.5z" />
                                        <path fill="#4CAF50" d="M44 28H15.5L30 42h14z" />
                                    </svg>
                                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Google Drive Link</span>
                                    {shareModalItem.driveSynced
                                        ? <span className="ml-auto px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded-full uppercase tracking-wider">Synced ✓</span>
                                        : <span className="ml-auto px-2 py-0.5 bg-slate-200 text-slate-500 text-[9px] font-black rounded-full uppercase tracking-wider">Not Synced</span>
                                    }
                                </div>
                                {shareModalItem.driveSynced ? (
                                    shareModalItem.driveUrl ? (
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <input
                                                    readOnly
                                                    value={shareModalItem.driveUrl}
                                                    className="flex-1 text-[10px] font-mono bg-white border border-amber-100 rounded-xl px-3 py-2 outline-none text-slate-600 truncate select-all cursor-pointer"
                                                    onClick={e => e.target.select()}
                                                />
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard?.writeText(shareModalItem.driveUrl);
                                                        toast.success('Drive file link copied! 🔗');
                                                    }}
                                                    className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black transition-all shrink-0"
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                            <p className="text-[9px] text-amber-600 font-medium">⚠️ Make sure the file is set to "Anyone with the link can view" in Google Drive settings.</p>
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-slate-400 font-medium">Direct link not saved — please re-sync this recording to Drive to get the file link.</p>
                                    )
                                ) : (
                                    <p className="text-[10px] text-slate-400 font-medium">Sync this recording to Google Drive first to get a shareable link.</p>
                                )}
                            </div>

                            <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4 space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <Share2 size={14} className="text-blue-600" />
                                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Share via App</span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium">Share directly to WhatsApp, Telegram, Gmail, and other apps installed on your device.</p>
                                <button
                                    onClick={() => {
                                        const cloudMatch = cloudFiles.find(c =>
                                            c.filename?.includes(shareModalItem.id) ||
                                            c.filename?.includes(`voice_recording_${shareModalItem.id}`)
                                        );
                                        // Use beautiful share page URL if cloud file found
                                        const sharePageUrl = cloudMatch?._id
                                            ? `${window.location.origin}/share/voice/${cloudMatch._id}`
                                            : shareModalItem.driveUrl || window.location.href;
                                        if (navigator.share) {
                                            navigator.share({
                                                title: `🎤 Voice Recording — ${shareModalItem.duration}`,
                                                text: `Listen to my voice recording (${shareModalItem.duration}, ${shareModalItem.format}) shared via DS LMS`,
                                                url: sharePageUrl,
                                            }).catch(err => console.error('Share cancelled:', err));
                                        } else {
                                            navigator.clipboard?.writeText(sharePageUrl);
                                            toast.success('Link copied — paste it anywhere to share!');
                                        }
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all active:scale-[0.98]"
                                >
                                    <Share2 size={14} />
                                    Share Now
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-end">
                            <button
                                onClick={() => setShareModalItem(null)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cloud Gallery Center Modal */}
            {cloudGalleryModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left font-sans">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden relative flex flex-col max-h-[85vh]">

                        {/* Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                                    <Database className="text-indigo-600" size={18} />
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

                        {/* Cloud Space Bar */}
                        <div className="px-6 pt-4 shrink-0">
                            <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-150 rounded-xl">
                                <div className="flex justify-between items-center text-[9px] text-slate-450 font-black uppercase tracking-wider">
                                    <span>Cloud Space Limit</span>
                                    <span>{(cloudSpace.used / (1024 * 1024)).toFixed(1)} MB / 300 MB</span>
                                </div>
                                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-300">
                                    <div
                                        className="bg-indigo-600 h-full transition-all duration-300"
                                        style={{ width: `${Math.min(100, (cloudSpace.used / cloudSpace.limit) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* Cloud Files List */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                            {cloudLoading ? (
                                <div className="text-center py-10 text-xs text-slate-450 animate-pulse font-bold uppercase tracking-wider">
                                    Loading Cloud Data...
                                </div>
                            ) : filteredCloudFiles.length === 0 ? (
                                <div className="text-center py-10">
                                    <Database className="mx-auto text-slate-300 mb-3" size={36} />
                                    <p className="text-xs text-slate-450 italic font-medium">No cloud recordings found.</p>
                                    <p className="text-[10px] text-slate-400 mt-1">Click "Sync with Cloud" on any saved recording to upload.</p>
                                </div>
                            ) : (
                                filteredCloudFiles.map(c => (
                                    <div key={c._id} className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-3 hover:border-slate-300 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-700 truncate">{c.filename}</p>
                                                <p className="text-[9px] text-slate-400 mt-0.5">
                                                    Length: {c.metadata?.duration || '00:00'} • {(c.size / (1024 * 1024)).toFixed(2)} MB
                                                </p>
                                            </div>
                                            {!isReadOnly && (
                                                <button
                                                    onClick={() => handleDeleteCloudFile(c._id)}
                                                    className="p-1.5 hover:bg-red-100 rounded-lg text-slate-400 hover:text-red-600 transition-colors shrink-0"
                                                    title="Delete from Cloud"
                                                >
                                                    <Trash size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <WaveformPlayer src={c.fileUrl} id={c._id} durationStr={c.metadata?.duration} />
                                    </div>
                                ))
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
                </div>
            )}

            {/* Voice Trimming Editor Modal */}
            {trimmingDraft && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden text-left flex flex-col">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                                    <Scissors className="text-blue-600 animate-pulse" size={18} />
                                    Voice Editor (Trim Audio)
                                </h3>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                    Trim start or end sections of the recording
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    stopPreview();
                                    cleanupSessionUrls();
                                    setTrimmingDraft(null);
                                }}
                                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-4 space-y-4">
                            {/* Dummy Audio for loading/decoding and playing */}
                            <audio
                                ref={trimAudioRef}
                                src={currentPreviewUrl || trimmingDraft.url}
                                className="hidden"
                                onLoadedMetadata={(e) => {
                                    if (!duration || duration === 0) {
                                        setDuration(e.target.duration);
                                        setEndTime(e.target.duration);
                                    }
                                }}
                            />

                            {decoding ? (
                                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                                    <RefreshCw className="animate-spin text-blue-600 w-8 h-8" />
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Decoding audio stream...</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Audio info */}
                                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150 flex justify-between text-xs">
                                        <div>
                                            <span className="text-slate-400 font-bold">Total Duration:</span>{' '}
                                            <span className="font-extrabold text-slate-700">{duration.toFixed(2)}s</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 font-bold">Current Format:</span>{' '}
                                            <span className="font-extrabold text-slate-700 uppercase">{trimmingDraft.format}</span>
                                        </div>
                                    </div>

                                    {/* Visual Waveform Editor peaks */}
                                    {editorPeaks.length > 0 && (
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                <span className="text-[10px]">Visual Waveform (Click to Seek)</span>
                                                <span className="text-[10px] text-red-500 font-mono">
                                                    Playhead: {formatTime(trimAudioRef.current ? trimAudioRef.current.currentTime : 0)}
                                                </span>
                                            </div>
                                            <div className="w-full h-20 bg-slate-950 rounded-2xl border border-slate-800 relative overflow-hidden flex items-center justify-center cursor-pointer select-none">
                                                <canvas
                                                    ref={editorCanvasRef}
                                                    width={500}
                                                    height={80}
                                                    onClick={handleEditorCanvasClick}
                                                    className="w-full h-full"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Sliders and precise inputs in 2 columns */}
                                    <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                                        {/* Start Selection Controls */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Start Time</label>
                                                <span className="font-extrabold text-blue-650 text-[11px]">{startTime.toFixed(1)}s</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={0}
                                                max={duration}
                                                step={0.1}
                                                value={startTime}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    if (val < endTime) {
                                                        setStartTime(val);
                                                    }
                                                }}
                                                className="w-full accent-blue-600 h-1 rounded-lg appearance-none bg-slate-200 cursor-pointer"
                                            />
                                            <div className="flex items-center gap-1.5 mt-1 justify-between">
                                                <span className="text-[10px] font-bold text-slate-400">Precise (s):</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={endTime - 0.1}
                                                    step={0.01}
                                                    value={Number(startTime.toFixed(2))}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        if (!isNaN(val) && val >= 0 && val < endTime) {
                                                            setStartTime(val);
                                                        }
                                                    }}
                                                    className="w-18 text-[11px] border border-slate-200 rounded-lg p-1 outline-none font-bold text-slate-700 bg-slate-50 text-center"
                                                />
                                            </div>
                                        </div>

                                        {/* End Selection Controls */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">End Time</label>
                                                <span className="font-extrabold text-blue-650 text-[11px]">{endTime.toFixed(1)}s</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={0}
                                                max={duration}
                                                step={0.1}
                                                value={endTime}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    if (val > startTime) {
                                                        setEndTime(val);
                                                    }
                                                }}
                                                className="w-full accent-blue-600 h-1 rounded-lg appearance-none bg-slate-200 cursor-pointer"
                                            />
                                            <div className="flex items-center gap-1.5 mt-1 justify-between">
                                                <span className="text-[10px] font-bold text-slate-400">Precise (s):</span>
                                                <input
                                                    type="number"
                                                    min={startTime + 0.1}
                                                    max={duration}
                                                    step={0.01}
                                                    value={Number(endTime.toFixed(2))}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        if (!isNaN(val) && val > startTime && val <= duration) {
                                                            setEndTime(val);
                                                        }
                                                    }}
                                                    className="w-18 text-[11px] border border-slate-200 rounded-lg p-1 outline-none font-bold text-slate-700 bg-slate-50 text-center"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Preview Segment Area (Compact Row) */}
                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150 flex items-center justify-between gap-4">
                                        <div className="text-left min-w-0">
                                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Selected Segment</span>
                                            <p className="text-xs font-extrabold text-slate-700 truncate">
                                                {(endTime - startTime).toFixed(2)}s ({startTime.toFixed(2)}s to {endTime.toFixed(2)}s)
                                            </p>
                                        </div>
                                        {isPlayingPreview ? (
                                            <button
                                                onClick={stopPreview}
                                                className="px-3 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all flex items-center gap-1 active:scale-95 shadow-sm shrink-0"
                                            >
                                                <Pause size={12} fill="white" />
                                                <span>Stop Preview</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={playPreview}
                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95 shadow-sm shrink-0"
                                            >
                                                <Play size={12} fill="white" />
                                                <span>Play Selection</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        stopPreview();
                                        cleanupSessionUrls();
                                        setTrimmingDraft(null);
                                    }}
                                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors bg-white active:scale-95 shadow-sm"
                                >
                                    Cancel
                                </button>

                                {historyStack.length > 0 && (
                                    <button
                                        onClick={handleUndo}
                                        className="px-4 py-2 bg-amber-50 border border-amber-250 text-amber-700 border-amber-200 rounded-xl text-xs font-bold hover:bg-amber-100 transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                                        title="Undo last edit operation"
                                    >
                                        <RefreshCw size={12} className="rotate-180" />
                                        <span>Undo ({historyStack.length})</span>
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-2">
                                {/* Remove Selection (Cut) Button */}
                                <button
                                    disabled={decoding || trimming || startTime >= endTime}
                                    onClick={async () => {
                                        stopPreview();
                                        setTrimming(true);
                                        try {
                                            const stitchedBuffer = removeRangeFromBuffer(audioBuffer, startTime, endTime);
                                            const stitchedBlob = bufferToWav(stitchedBuffer, 0, stitchedBuffer.duration);
                                            const stitchedUrl = URL.createObjectURL(stitchedBlob);
                                            createdUrlsRef.current.push(stitchedUrl);

                                            setHistoryStack(prev => [
                                                ...prev,
                                                {
                                                    audioBuffer: audioBuffer,
                                                    duration: duration,
                                                    editorPeaks: editorPeaks,
                                                    previewUrl: currentPreviewUrl
                                                }
                                            ]);

                                            setAudioBuffer(stitchedBuffer);
                                            setDuration(stitchedBuffer.duration);
                                            setStartTime(0);
                                            setEndTime(stitchedBuffer.duration);
                                            setEditorPeaks(extractPeaks(stitchedBuffer));
                                            setCurrentPreviewUrl(stitchedUrl);

                                            toast.success("Selected region removed from preview!");
                                        } catch (err) {
                                            console.error("Cut execution error:", err);
                                            toast.error("Failed to cut selected region.");
                                        } finally {
                                            setTrimming(false);
                                        }
                                    }}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 active:scale-95 shadow-sm"
                                    title="Delete selected range and merge the outer parts"
                                >
                                    {trimming ? 'Processing...' : 'Remove Selected'}
                                </button>

                                {/* Keep Selection (Trim) Button */}
                                <button
                                    disabled={decoding || trimming || startTime >= endTime}
                                    onClick={async () => {
                                        stopPreview();
                                        setTrimming(true);
                                        try {
                                            const trimmedBuffer = sliceAudioBuffer(audioBuffer, startTime, endTime);
                                            const trimmedBlob = bufferToWav(trimmedBuffer, 0, trimmedBuffer.duration);
                                            const trimmedUrl = URL.createObjectURL(trimmedBlob);
                                            createdUrlsRef.current.push(trimmedUrl);

                                            setHistoryStack(prev => [
                                                ...prev,
                                                {
                                                    audioBuffer: audioBuffer,
                                                    duration: duration,
                                                    editorPeaks: editorPeaks,
                                                    previewUrl: currentPreviewUrl
                                                }
                                            ]);

                                            setAudioBuffer(trimmedBuffer);
                                            setDuration(trimmedBuffer.duration);
                                            setStartTime(0);
                                            setEndTime(trimmedBuffer.duration);
                                            setEditorPeaks(extractPeaks(trimmedBuffer));
                                            setCurrentPreviewUrl(trimmedUrl);

                                            toast.success("Recording trimmed in preview!");
                                        } catch (err) {
                                            console.error("Trim execution error:", err);
                                            toast.error("Failed to trim recording.");
                                        } finally {
                                            setTrimming(false);
                                        }
                                    }}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 active:scale-95 shadow-sm"
                                    title="Keep only the selected range and discard everything else"
                                >
                                    {trimming ? 'Processing...' : 'Keep Selected'}
                                </button>

                                {/* Save Final Changes Button */}
                                <button
                                    disabled={decoding || trimming}
                                    onClick={handleSaveEditedAudio}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 active:scale-95 shadow-md flex items-center gap-1.5"
                                    title="Save final edited audio to drafts"
                                >
                                    <Save size={14} />
                                    <span>Save Edits</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default VoiceRecorderPage;
