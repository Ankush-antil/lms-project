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

const VoiceRecorderPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const canvasRef = useRef(null);

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

    // Active Gallery View: 'local' | 'cloud'
    const [galleryTab, setGalleryTab] = useState('local');

    // Cloud files state
    const [cloudFiles, setCloudFiles] = useState([]);

    // Filter local audios by selected date and inbox param
    const filteredLocalAudios = useMemo(() => {
        let filtered = audios;
        if (dateParam) {
            filtered = filtered.filter(a => parseDateToDdMmYyyy(a.timestamp) === dateParam);
        }
        if (inboxParam) {
            filtered = filtered.filter(a => a.inbox === inboxParam);
        }
        return filtered;
    }, [audios, dateParam, inboxParam]);

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
    }, []);

    // Trimmer effects and functions
    useEffect(() => {
        if (!trimmingDraft) {
            setAudioBuffer(null);
            setDuration(0);
            setStartTime(0);
            setEndTime(0);
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
            } catch (err) {
                console.error("Error decoding audio data:", err);
                toast.error("Failed to load audio for editing.");
            } finally {
                setDecoding(false);
            }
        };
        decodeAudio();
    }, [trimmingDraft]);

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
                }).catch(() => {});

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

    // Setup Web Audio Analyser and draw waveform loop
    const setupVisualizer = (stream) => {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContextClass();
            audioCtxRef.current = audioCtx;
            
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 254; // lower fftSize for simpler wave representation
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            streamSourceRef.current = source;
            source.connect(analyser);

            drawWaveform();
        } catch (e) {
            console.error("Failed to initialize visualizer:", e);
        }
    };

    const drawWaveform = () => {
        if (!canvasRef.current || !analyserRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const analyser = analyserRef.current;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (!analyserRef.current) return;
            
            animationFrameRef.current = requestAnimationFrame(draw);
            analyser.getByteTimeDomainData(dataArray);

            // Clean background
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw grid lines
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, canvas.height / 2);
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();

            // Set drawing styling (Indigo-500 pulsing line)
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#6366f1'; 
            ctx.beginPath();

            const sliceWidth = canvas.width * 1.0 / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * canvas.height / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        };

        draw();
    };

    const toggleRecording = () => {
        if (isReadOnly) {
            toast.error("Recording new clips is disabled in Read-Only archive.");
            return;
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
                    duration: formatTime(recordingTime),
                    durationSec: recordingTime,
                    format: format,
                    inbox: inboxVal || ''
                };

                setDrafts(prev => [newDraft, ...prev]);
                setLastAudioUrl(blobUrl);
                setRecordingTime(0);
                toast.success("Recording complete! Added to Draft Content.");
            };

            setRecording(true);
            setRecordingTime(0);
            recorder.start(1000);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
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

    const handleShareItem = (item) => {
        if (navigator.share) {
            navigator.share({
                title: `Voice Recording ${item.id}`,
                text: `Listen to my voice recording from ${item.timestamp}`,
                url: item.url
            }).catch(err => console.error("Error sharing:", err));
        } else {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(item.url || '');
                toast.success("Audio URL copied to clipboard!");
            } else {
                toast.error("Clipboard sharing not supported on this device.");
            }
        }
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
            <div className="max-w-7xl mx-auto px-4 py-4 text-left">
                {/* Back Link */}
                <button
                    onClick={() => {
                        if (inboxParam) {
                            navigate('/student/tests');
                        } else {
                            navigate(dateParam ? `/student/practice-tools?date=${dateParam}` : '/student/practice-tools');
                        }
                    }}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-bold text-sm"
                >
                    <ArrowLeft size={16} />
                    Back to Practice Tools
                </button>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                        <Mic className="text-blue-600" />
                        Voice Recorder {isReadOnly && <span className="text-xs px-2.5 py-1 bg-amber-500 text-white rounded-md font-bold uppercase tracking-wider">Preview Only</span>}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Record your speaking practice sessions with active audio waveform feed.</p>
                </div>

                {isReadOnly && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-center gap-2.5 text-xs font-semibold leading-relaxed">
                        <AlertTriangle className="text-amber-600 shrink-0" size={16} />
                        <div>
                            <p className="font-bold">Past Workspace Preview (Read-Only)</p>
                            <p className="text-amber-800/80 text-[11px] font-medium mt-0.5">You are viewing files captured on {dateParam}. Capturing recordings, deleting, or syncing files is disabled for this day.</p>
                        </div>
                    </div>
                )}

                {/* 2-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left Column: Recording Area, Draft Content, Saved Content */}
                    <div className="lg:col-span-9 space-y-6">
                        
                        {/* Recording Zone */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[460px]">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider flex items-center justify-between">
                                <span>{lastAudioUrl && !recording ? 'Last Recording' : 'Voice Visualizer'}</span>
                                {recording && (
                                    <span className="flex items-center gap-1 text-red-500 font-black text-xs animate-pulse">
                                        <span className="w-2.5 h-2.5 bg-red-600 rounded-full"></span>
                                        RECORDING {formatTime(recordingTime)}
                                    </span>
                                )}
                            </h3>

                            {/* Oscilloscope Canvas / Last Audio Player */}
                            <div className="flex-1 my-4 bg-slate-900 rounded-2xl relative flex items-center justify-center overflow-hidden border border-slate-800 min-h-[240px]">
                                {recording && micEnabled && !error ? (
                                    <div className="flex flex-col items-center justify-center w-full h-full p-6 relative select-none">
                                        {/* Mic Icon in Center */}
                                        <div className="flex flex-col items-center justify-center space-y-3 mb-8">
                                            <div className="w-18 h-18 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center text-blue-500 animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.25)] p-4">
                                                <Mic size={36} className="animate-bounce" style={{ animationDuration: '2s' }} />
                                            </div>
                                            <span className="text-[11px] font-black uppercase tracking-widest text-blue-400">
                                                Recording Speak Practice...
                                            </span>
                                        </div>
                                        {/* Waves Canvas at Bottom */}
                                        <div className="w-full absolute bottom-0 left-0 right-0 h-28 overflow-hidden">
                                            <canvas
                                                ref={canvasRef}
                                                width={720}
                                                height={112}
                                                className="w-full h-full object-cover"
                                            ></canvas>
                                        </div>
                                    </div>
                                ) : lastAudioUrl && !recording ? (
                                    <div className="flex flex-col items-center justify-center gap-4 p-6 w-full">
                                        <div className="flex items-center gap-2 text-slate-300">
                                            <Mic size={20} className="text-blue-400" />
                                            <span className="text-sm font-bold uppercase tracking-wider">Recording Complete</span>
                                        </div>
                                        <audio
                                            src={lastAudioUrl}
                                            controls
                                            className="w-full max-w-sm rounded-xl"
                                            style={{ filter: 'invert(1) hue-rotate(180deg)' }}
                                        ></audio>
                                        <button
                                            onClick={() => setLastAudioUrl(null)}
                                            className="text-slate-400 hover:text-white text-[10px] font-bold px-3 py-1 border border-slate-600 rounded-lg transition-colors"
                                        >
                                            ✕ Close & Show Visualizer
                                        </button>
                                    </div>
                                ) : micEnabled && !error ? (
                                    <canvas
                                        ref={canvasRef}
                                        width={720}
                                        height={240}
                                        className="w-full h-full object-cover"
                                    ></canvas>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-500 p-6 text-center space-y-3">
                                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                                            <Mic size={32} />
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-slate-400 text-sm uppercase tracking-wider">Microphone is Muted/Disabled</p>
                                            <p className="text-xs text-slate-500 mt-1 max-w-xs">Enable microphone input on the right panel to display real-time signal preview.</p>
                                        </div>
                                    </div>
                                )}

                                {countdownActive && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                                        <div className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center text-4xl font-black animate-ping">
                                            {secondsLeft}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Audio Quality Settings Row */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Audio Settings</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Format</span>
                                        <select
                                            value={format}
                                            onChange={(e) => setFormat(e.target.value)}
                                            className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 outline-none font-bold text-slate-700"
                                        >
                                            <option value="WebM">Format: WebM</option>
                                            <option value="WAV">Format: WAV</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Bitrate</span>
                                        <select
                                            value={bitrate}
                                            onChange={(e) => setBitrate(e.target.value)}
                                            className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 outline-none font-bold text-slate-700"
                                        >
                                            <option value="192k">Bitrate: 192k</option>
                                            <option value="128k">Bitrate: 128k</option>
                                            <option value="320k">Bitrate: 320k (Pro)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Record Toggle Button */}
                            <button
                                disabled={isReadOnly}
                                onClick={toggleRecording}
                                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-200 mt-4 text-white shadow-lg ${
                                    isReadOnly
                                        ? 'bg-slate-350 text-slate-500 cursor-not-allowed opacity-60 shadow-none'
                                        : recording 
                                            ? 'bg-red-650 hover:bg-red-700 shadow-red-600/10 hover:shadow-red-600/20' 
                                            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/10 hover:shadow-blue-500/20'
                                }`}
                            >
                                {isReadOnly ? (
                                    <span>Workspace Read-Only</span>
                                ) : recording ? (
                                    <>
                                        <Square size={16} fill="white" />
                                        <span>Stop Recording</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping"></span>
                                        <span>Start Recording</span>
                                    </>
                                )}
                            </button>
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
                                                <audio src={draft.url} controls className="w-full h-8 opacity-90 rounded-lg scale-95"></audio>
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
                                                <audio src={item.url} controls className="w-full h-8 opacity-90 rounded-lg scale-95"></audio>
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
                                                    onClick={() => handleShareItem(item)}
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
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Source</h3>
                            
                            {/* Microphone Device */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Microphone</label>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${micEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                        {micEnabled ? 'ON' : 'OFF'}
                                    </span>
                                </div>
                                <div className="flex gap-2 min-w-0">
                                    <select
                                        disabled={!micEnabled}
                                        value={selectedAudio}
                                        onChange={(e) => setSelectedAudio(e.target.value)}
                                        className="flex-1 min-w-0 text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 disabled:opacity-50 truncate"
                                    >
                                        {audioDevices.map(d => (
                                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 5)}`}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => setMicEnabled(!micEnabled)}
                                        className={`px-3 rounded-xl font-bold text-xs border transition-colors ${micEnabled ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        Toggle
                                    </button>
                                </div>
                            </div>

                            {/* Channel Config */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Channels</label>
                                <select
                                    value={channels}
                                    onChange={(e) => setChannels(e.target.value)}
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700"
                                >
                                    <option value="mono">Mono Channel</option>
                                    <option value="stereo">Stereo Channel</option>
                                </select>
                            </div>

                            {/* Countdown Timer */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock size={14} /> Countdown Timer
                                </label>
                                <select
                                    value={countdown}
                                    onChange={(e) => setCountdown(parseInt(e.target.value))}
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700"
                                >
                                    <option value={0}>Off (Instant)</option>
                                    <option value={3}>3 Seconds</option>
                                    <option value={5}>5 Seconds</option>
                                </select>
                            </div>

                            {/* Auto-Stop Limit */}
                            <div className="flex justify-between items-center p-3 bg-blue-50/40 border border-blue-100 rounded-xl">
                                <div className="text-left">
                                    <span className="text-[11px] font-black text-blue-800 uppercase tracking-wide">Auto-Stop Limit</span>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Stops at 10 minutes</p>
                                </div>
                                <span className="px-2 py-0.5 bg-amber-500 text-white text-[8px] font-black rounded-md uppercase tracking-wider shadow-sm">
                                    PRO
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
                                        <span className="text-slate-500">Echo Cancellation</span>
                                        <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">Noise Suppression</span>
                                        <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
                                    </div>
                                </div>
                            </details>
                        </div>

                        {/* Data Card */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 text-left">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Data Settings</h3>
                            
                            <div className="space-y-2">
                                {/* Save in Google Drive */}
                                <button
                                    disabled={isReadOnly}
                                    onClick={handleSaveToDriveClick}
                                    className={`w-full flex items-center gap-3 p-3 bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors ${
                                        isReadOnly ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'
                                    }`}
                                >
                                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                                        <path fill="#FFC107" d="M17 6h14l13 22H30L17 6z" />
                                        <path fill="#FF3D00" d="m15.5 11.5-8.5 15L17 42h13L15.5 11.5z" />
                                        <path fill="#4CAF50" d="M44 28H15.5L30 42h14z" />
                                    </svg>
                                    <div className="text-left flex-1">
                                        <p>Save in Google Drive</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Upload Latest Clip</span>
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
                                    onClick={() => setLocalHistoryModalOpen(true)}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                                >
                                    <Folder className="text-indigo-600 shrink-0" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Go to Local Data</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                            {filteredLocalAudios.length} Voice Logs • View structured folders
                                        </span>
                                    </div>
                                </button>
                                
                                {/* Go to Cloud Data */}
                                <button
                                    onClick={async () => {
                                        setGalleryTab('cloud');
                                        await fetchCloudFiles();
                                        toast.success("Switched to Cloud Storage Gallery");
                                    }}
                                    className={`w-full flex items-center gap-3 p-3 border rounded-xl text-xs font-bold transition-all ${
                                        galleryTab === 'cloud'
                                            ? 'bg-[#3e3add]/10 border-indigo-200 text-indigo-850 shadow-sm'
                                            : 'bg-slate-50 hover:bg-slate-100 border-slate-150 text-slate-700'
                                    }`}
                                >
                                    <Database className="text-indigo-600 shrink-0" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Go to Cloud Data</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                            {filteredCloudFiles.length} Cloud Logs • {(cloudSpace.used / (1024 * 1024)).toFixed(1)} MB / 300 MB
                                        </span>
                                    </div>
                                </button>
                                
                                {/* Sync with Cloud */}
                                <button
                                    disabled={isReadOnly}
                                    onClick={handleSyncWithCloud}
                                    className={`w-full flex items-center gap-3 p-3 bg-slate-50 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors ${
                                        isReadOnly ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'
                                    }`}
                                >
                                    <RefreshCw className="text-indigo-600 shrink-0 animate-hover-spin" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Sync with Cloud</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                            {filteredLocalAudios.filter(a => !a.synced).length} files not synced
                                        </span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Local vs Cloud Gallery */}
                        {galleryTab === 'cloud' && (
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 text-left animate-fadeIn">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                                        Cloud Clips
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-650 font-black text-[9px] uppercase tracking-wider">
                                        Server
                                    </span>
                                </div>

                                {/* Cloud Space limit bar if on cloud tab */}
                                <div className="space-y-1.5 p-2.5 bg-slate-50 border border-slate-150 rounded-xl">
                                    <div className="flex justify-between items-center text-[9px] text-slate-450 font-black uppercase tracking-wider">
                                        <span>Cloud Space Limit</span>
                                        <span>{(cloudSpace.used / (1024 * 1024)).toFixed(1)}MB / 300MB</span>
                                    </div>
                                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden border border-slate-300">
                                        <div
                                            className="bg-indigo-600 h-full transition-all duration-300"
                                            style={{ width: `${Math.min(100, (cloudSpace.used / cloudSpace.limit) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Cloud Gallery List */}
                                {cloudLoading ? (
                                    <div className="text-center py-6 text-xs text-slate-450 animate-pulse font-bold uppercase tracking-wider">Loading Cloud Data...</div>
                                ) : filteredCloudFiles.length === 0 ? (
                                    <p className="text-xs text-slate-450 italic text-center py-4">No cloud recordings found. Click "Sync with Cloud" to upload.</p>
                                ) : (
                                    <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                                        {filteredCloudFiles.map(c => (
                                            <div key={c._id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-2 hover:border-slate-350 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-bold text-slate-700 truncate text-left">{c.filename}</p>
                                                        <p className="text-[9px] text-slate-400 mt-0.5 text-left">Length: {c.metadata?.duration || '00:00'} • {(c.size / (1024 * 1024)).toFixed(2)} MB</p>
                                                    </div>
                                                    {!isReadOnly && (
                                                        <button
                                                            onClick={() => handleDeleteCloudFile(c._id)}
                                                            className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-650"
                                                            title="Delete from Cloud"
                                                        >
                                                            <Trash size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                                
                                                <div className="flex gap-2">
                                                    <audio src={c.fileUrl} controls className="w-full h-8 scale-95 opacity-90 rounded-md"></audio>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

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
                    toast.success("Saved to Google Drive folder!");
                    if (driveFileMeta.itemId) {
                        setAudios(prev => {
                            const list = prev.map(a => a.id === driveFileMeta.itemId ? { ...a, driveSynced: true } : a);
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
                onClose={() => {
                    setLocalHistoryModalOpen(false);
                    loadLocalRecordings();
                }}
                onRefresh={() => {
                    loadLocalRecordings();
                }}
            />

            {/* Voice Trimming Editor Modal */}
            {trimmingDraft && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden text-left flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
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
                                    setTrimmingDraft(null);
                                }}
                                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {/* Dummy Audio for loading/decoding and playing */}
                            <audio
                                ref={trimAudioRef}
                                src={trimmingDraft.url}
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
                                <div className="space-y-6">
                                    {/* Audio info */}
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex justify-between text-xs">
                                        <div>
                                            <span className="text-slate-400 font-bold">Total Duration:</span>{' '}
                                            <span className="font-extrabold text-slate-700">{duration.toFixed(2)}s</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 font-bold">Current Format:</span>{' '}
                                            <span className="font-extrabold text-slate-700 uppercase">{trimmingDraft.format}</span>
                                        </div>
                                    </div>

                                    {/* Trimming settings */}
                                    <div className="space-y-4">
                                        {/* Start Time Slider */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs">
                                                <label className="font-bold text-slate-500 uppercase tracking-wider">Start Trim (Seconds)</label>
                                                <span className="font-extrabold text-blue-650">{startTime.toFixed(1)}s</span>
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
                                                className="w-full accent-blue-600"
                                            />
                                        </div>

                                        {/* End Time Slider */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs">
                                                <label className="font-bold text-slate-500 uppercase tracking-wider">End Trim (Seconds)</label>
                                                <span className="font-extrabold text-blue-650">{endTime.toFixed(1)}s</span>
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
                                                className="w-full accent-blue-600"
                                            />
                                        </div>
                                    </div>

                                    {/* Precision Inputs */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Precise Start (s)</label>
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
                                                className="w-full text-xs border border-slate-200 rounded-xl p-2 outline-none font-bold text-slate-700 bg-slate-50"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Precise End (s)</label>
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
                                                className="w-full text-xs border border-slate-200 rounded-xl p-2 outline-none font-bold text-slate-700 bg-slate-50"
                                            />
                                        </div>
                                    </div>

                                    {/* Preview Segment Area */}
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 text-center space-y-3">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                            Trimmed Length: {(endTime - startTime).toFixed(1)}s (from {startTime.toFixed(1)}s to {endTime.toFixed(1)}s)
                                        </p>
                                        <div className="flex justify-center gap-3">
                                            {isPlayingPreview ? (
                                                <button
                                                    onClick={stopPreview}
                                                    className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all flex items-center gap-1.5"
                                                >
                                                    <Pause size={14} fill="white" />
                                                    <span>Stop Preview</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={playPreview}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm animate-pulse"
                                                >
                                                    <Play size={14} fill="white" />
                                                    <span>Play Segment</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    stopPreview();
                                    setTrimmingDraft(null);
                                }}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors bg-white"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={decoding || trimming || startTime >= endTime}
                                onClick={async () => {
                                    stopPreview();
                                    setTrimming(true);
                                    try {
                                        const trimmedBlob = bufferToWav(audioBuffer, startTime, endTime);
                                        const trimmedUrl = URL.createObjectURL(trimmedBlob);
                                        
                                        setDrafts(prev => prev.map(d => {
                                            if (d.id === trimmingDraft.id) {
                                                if (d.url) URL.revokeObjectURL(d.url);
                                                return {
                                                    ...d,
                                                    blob: trimmedBlob,
                                                    url: trimmedUrl,
                                                    size: (trimmedBlob.size / 1024).toFixed(1) + ' KB',
                                                    duration: formatTime(Math.round(endTime - startTime)),
                                                    durationSec: Math.round(endTime - startTime),
                                                    format: 'WAV'
                                                };
                                            }
                                            return d;
                                        }));
                                        toast.success("Recording trimmed!");
                                        setTrimmingDraft(null);
                                    } catch (err) {
                                        console.error("Trim execution error:", err);
                                        toast.error("Failed to trim recording.");
                                    } finally {
                                        setTrimming(false);
                                    }
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                            >
                                {trimming ? 'Trimming...' : 'Apply Trim'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default VoiceRecorderPage;
