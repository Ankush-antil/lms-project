import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MonitorPlay, Camera, Mic, Clock, Settings, Cloud, Folder, RefreshCw, Database, Download, Trash, AlertTriangle, ArrowLeft, Play, Square } from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import toast from 'react-hot-toast';
import axios from 'axios';
import GoogleDriveModal from '../../../components/common/GoogleDriveModal';
import LocalHistoryModal from '../../../components/common/LocalHistoryModal';
import { saveLocalBlob, getLocalBlob, deleteLocalBlob } from '../../../utils/indexedDB';
import { parseDateToDdMmYyyy, getTodayDdMmYyyy } from '../../../utils/dateUtils';

const VideoRecorderPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const videoRef = useRef(null);

    // Parse selected date and inbox param
    const searchParams = new URLSearchParams(location.search);
    const dateParam = searchParams.get('date');
    const inboxParam = searchParams.get('inbox');
    const todayDdMmYyyy = getTodayDdMmYyyy();
    const isReadOnly = dateParam && dateParam !== todayDdMmYyyy;
    
    // States
    const [videoDevices, setVideoDevices] = useState([]);
    const [audioDevices, setAudioDevices] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState('');
    const [selectedAudio, setSelectedAudio] = useState('');
    
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [previewActive, setPreviewActive] = useState(false); // Camera preview is OFF by default
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [countdown, setCountdown] = useState(3); // Default to 3 seconds as in Image 2
    const [countdownActive, setCountdownActive] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);
    
    const [resolution, setResolution] = useState('1080p');
    const [frameRate, setFrameRate] = useState('30');
    const [format, setFormat] = useState('MP4');
    const [audioBitrate, setAudioBitrate] = useState('192k');
    
    const [stream, setStream] = useState(null);
    const [recording, setRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [videos, setVideos] = useState([]);
    const [error, setError] = useState(null);
    const [lastRecordingUrl, setLastRecordingUrl] = useState(null); // Show last recorded video in preview after stop

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    // Google Drive Modal State
    const [driveModalOpen, setDriveModalOpen] = useState(false);
    const [driveFileMeta, setDriveFileMeta] = useState({ name: '', blob: null });

    // Local History Modal State
    const [localHistoryModalOpen, setLocalHistoryModalOpen] = useState(false);

    // Active Gallery View: 'local' | 'cloud'
    const [galleryTab, setGalleryTab] = useState('local');

    // Cloud files state
    const [cloudFiles, setCloudFiles] = useState([]);

    // Filter local videos by selected date and inbox param
    const filteredLocalVideos = useMemo(() => {
        let filtered = videos;
        if (dateParam) {
            filtered = filtered.filter(v => parseDateToDdMmYyyy(v.timestamp) === dateParam);
        }
        if (inboxParam) {
            filtered = filtered.filter(v => v.inbox === inboxParam);
        }
        return filtered;
    }, [videos, dateParam, inboxParam]);

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
            const toolFiles = res.data.files.filter(f => f.toolType === 'video-recorder');
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
        if (filteredLocalVideos.length === 0) {
            toast.error("No recordings to save. Record something first.");
            return;
        }
        const latest = filteredLocalVideos[0];
        const blob = await getLocalBlob(latest.id);
        if (!blob) {
            toast.error("Recording file not found locally.");
            return;
        }
        setDriveFileMeta({
            name: `video_recording_${Date.now()}.webm`,
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
        const unsynced = filteredLocalVideos.filter(v => !v.synced);
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
                formData.append('file', blob, `video_recording_${item.id}.webm`);
                formData.append('toolType', 'video-recorder');
                formData.append('duration', item.duration);
                formData.append('resolution', item.resolution);
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
                    localStorage.setItem('practice_videos', JSON.stringify(videos.map(v => ({ ...v, url: '' }))));
                    fetchCloudFiles();
                    return;
                }
            }
        }

        localStorage.setItem('practice_videos', JSON.stringify(videos.map(v => ({ ...v, url: '' }))));
        await fetchCloudFiles();
        
        if (successCount > 0) {
            toast.success(`Successfully synced ${successCount} recordings!`, { id: toastId });
        } else {
            toast.error("Failed to sync recordings.", { id: toastId });
        }
    };

    // Load metadata AND restore blobs from IndexedDB
    const loadLocalRecordings = async () => {
        const saved = localStorage.getItem('practice_videos');
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
                setVideos(hydrated);
            } catch (e) {
                console.error("Failed to load or hydrate local video recordings:", e);
            }
        } else {
            setVideos([]);
        }
    };

    useEffect(() => {
        loadLocalRecordings();
    }, []);

    // Get media devices — enumerate without triggering camera permission
    useEffect(() => {
        const getDevices = async () => {
            try {
                // Just enumerate — no getUserMedia here to avoid triggering camera on page load
                // Labels may be empty until user grants permission (that's fine)
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = devices.filter(d => d.kind === 'videoinput');
                const audioInputs = devices.filter(d => d.kind === 'audioinput');

                // Fallback if no devices found yet (labels need permission first)
                setVideoDevices(videoInputs.length > 0 ? videoInputs : [{ deviceId: 'default', label: 'Default Camera' }]);
                setAudioDevices(audioInputs.length > 0 ? audioInputs : [{ deviceId: 'default', label: 'Default Microphone' }]);

                if (videoInputs.length > 0) setSelectedVideo(videoInputs[0].deviceId);
                if (audioInputs.length > 0) setSelectedAudio(audioInputs[0].deviceId);
            } catch (err) {
                setVideoDevices([{ deviceId: 'mock-vid', label: 'Front Camera (Default)' }]);
                setAudioDevices([{ deviceId: 'mock-aud', label: 'Internal Mic' }]);
                setSelectedVideo('mock-vid');
                setSelectedAudio('mock-aud');
            }
        };
        getDevices();
    }, []);

    // Manage WebRTC Camera Feed — only start when previewActive is true
    useEffect(() => {
        if (!cameraEnabled || !previewActive) {
            stopStream();
            return;
        }

        const startCamera = async () => {
            stopStream();
            setError(null);
            
            const constraints = {
                video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true,
                audio: audioEnabled && selectedAudio ? { deviceId: { exact: selectedAudio } } : audioEnabled
            };

            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
                // Re-enumerate after permission granted to get proper device labels
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = devices.filter(d => d.kind === 'videoinput');
                const audioInputs = devices.filter(d => d.kind === 'audioinput');
                if (videoInputs.length > 0) setVideoDevices(videoInputs);
                if (audioInputs.length > 0) setAudioDevices(audioInputs);
            } catch (err) {
                console.error("Error accessing video stream:", err);
                setError("Camera permission denied or camera is occupied.");
                setCameraEnabled(false);
                setPreviewActive(false);
            }
        };

        startCamera();

        return () => {
            stopStream();
        };
    }, [selectedVideo, cameraEnabled, audioEnabled, selectedAudio, previewActive]);

    const stopStream = () => {
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            setStream(null);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const toggleRecording = () => {
        if (isReadOnly) {
            toast.error("Recording new clips is disabled in Read-Only archive.");
            return;
        }
        if (recording) {
            handleStopRecording();
            toast.success("Video recording saved!");
        } else {
            // Ensure camera preview is active before recording
            if (!previewActive) {
                setPreviewActive(true);
                // Small delay to let stream initialize, then start recording
                setTimeout(() => {
                    if (countdown > 0) {
                        setCountdownActive(true);
                        setSecondsLeft(countdown);
                    } else {
                        startRecordingProcess();
                    }
                }, 800);
                return;
            }
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

    const startRecordingProcess = () => {
        if (!stream) {
            toast.error("Camera stream is not ready.");
            return;
        }

        chunksRef.current = [];

        let options = { mimeType: 'video/webm;codecs=vp9,opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: 'video/webm;codecs=vp8,opus' };
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = {}; // Default fallback
        }

        try {
            const recorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            recorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const blobUrl = URL.createObjectURL(blob);
                const recId = 'vid_' + Date.now();

                await saveLocalBlob(recId, blob);
                
                const searchParams = new URLSearchParams(window.location.search);
                const inboxVal = searchParams.get('inbox');
                const newVideo = {
                    id: recId,
                    timestamp: new Date().toLocaleString(),
                    url: blobUrl,
                    size: (blob.size / (1024 * 1024)).toFixed(2) + ' MB',
                    duration: formatTime(recordingTime),
                    resolution: resolution,
                    synced: false,
                    inbox: inboxVal || ''
                };

                setVideos(prev => {
                    const list = [newVideo, ...prev];
                    localStorage.setItem('practice_videos', JSON.stringify(list.map(v => ({ ...v, url: '' }))));
                    return list;
                });
                // Show the just-recorded video in the center preview (like screenshot tool)
                setLastRecordingUrl(blobUrl);
                setRecordingTime(0);
            };

            setRecording(true);
            setRecordingTime(0);
            recorder.start(1000);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

            toast.success("Recording video...");
        } catch (err) {
            console.error(err);
            toast.error("Failed to start video recording.");
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
        // Turn off camera after recording stops
        setPreviewActive(false);
        stopStream();
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleDelete = async (id) => {
        const updated = videos.filter(v => v.id !== id);
        setVideos(updated);
        localStorage.setItem('practice_videos', JSON.stringify(updated.map(v => ({ ...v, url: '' }))));
        await deleteLocalBlob(id);
        toast.success("Video deleted.");
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
                        <MonitorPlay className="text-purple-600" />
                        Video Recorder {isReadOnly && <span className="text-xs px-2.5 py-1 bg-amber-500 text-white rounded-md font-bold uppercase tracking-wider">Preview Only</span>}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Capture practice web videos with custom resolutions and audio bitrates.</p>
                </div>

                {isReadOnly && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-center gap-2.5 text-xs font-semibold leading-relaxed">
                        <AlertTriangle className="text-amber-600 shrink-0" size={16} />
                        <div>
                            <p className="font-bold">Past Workspace Preview (Read-Only)</p>
                            <p className="text-amber-800/80 text-[11px] font-medium mt-0.5">You are viewing files captured on {dateParam}. Capturing videos, deleting, or syncing files is disabled for this day.</p>
                        </div>
                    </div>
                )}

                {/* 3-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left Column: Source Panel */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Source</h3>
                            
                            {/* Camera Toggle & Device */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Camera</label>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${cameraEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                        {cameraEnabled ? 'ON' : 'OFF'}
                                    </span>
                                </div>
                                <div className="flex gap-2 min-w-0">
                                    <select
                                        disabled={!cameraEnabled}
                                        value={selectedVideo}
                                        onChange={(e) => setSelectedVideo(e.target.value)}
                                        className="flex-1 min-w-0 text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 disabled:opacity-50 truncate"
                                    >
                                        {videoDevices.map(d => (
                                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 5)}`}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => setCameraEnabled(!cameraEnabled)}
                                        className={`px-3 rounded-xl font-bold text-xs border transition-colors ${cameraEnabled ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        Toggle
                                    </button>
                                </div>
                            </div>

                            {/* Audio Toggle & Device */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Audio</label>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${audioEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                        {audioEnabled ? 'ON' : 'OFF'}
                                    </span>
                                </div>
                                <div className="flex gap-2 min-w-0">
                                    <select
                                        disabled={!audioEnabled}
                                        value={selectedAudio}
                                        onChange={(e) => setSelectedAudio(e.target.value)}
                                        className="flex-1 min-w-0 text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 disabled:opacity-50 truncate"
                                    >
                                        {audioDevices.map(d => (
                                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 5)}`}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => setAudioEnabled(!audioEnabled)}
                                        className={`px-3 rounded-xl font-bold text-xs border transition-colors ${audioEnabled ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        Toggle
                                    </button>
                                </div>
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
                                    <option value={10}>10 Seconds</option>
                                </select>
                            </div>

                            {/* Auto-Stop Limit */}
                            <div className="flex justify-between items-center p-3 bg-purple-50/40 border border-purple-100 rounded-xl">
                                <div className="text-left">
                                    <span className="text-[11px] font-black text-purple-800 uppercase tracking-wide">Auto-Stop Limit</span>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">PRO Feature & Save</p>
                                </div>
                                <span className="px-2 py-0.5 bg-amber-500 text-white text-[8px] font-black rounded-md uppercase tracking-wider shadow-sm">
                                    PRO
                                </span>
                            </div>

                            {/* Additional Settings */}
                            <details className="group border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                                <summary className="list-none flex justify-between items-center cursor-pointer text-xs font-bold text-slate-600 select-none">
                                    <span className="flex items-center gap-1.5"><Settings size={14} /> Additional Settings</span>
                                    <span className="transition-transform group-open:rotate-180">▼</span>
                                </summary>
                                <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">Auto Gain Control</span>
                                        <input type="checkbox" defaultChecked className="rounded text-purple-600 focus:ring-purple-500" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">Mirror Video Preview</span>
                                        <input type="checkbox" defaultChecked className="rounded text-purple-600 focus:ring-purple-500" />
                                    </div>
                                </div>
                            </details>
                        </div>
                    </div>

                    {/* Center Column: Video Capture Preview */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[460px]">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider flex items-center justify-between">
                                <span>{lastRecordingUrl && !previewActive ? 'Last Recording' : 'Camera Preview'}</span>
                                {recording && (
                                    <span className="flex items-center gap-1 text-red-500 font-black text-xs animate-pulse">
                                        <span className="w-2.5 h-2.5 bg-red-600 rounded-full"></span>
                                        LIVE {formatTime(recordingTime)}
                                    </span>
                                )}
                            </h3>

                            {/* Camera Video Stream / Last Recording */}
                            <div className="flex-1 my-4 bg-slate-900 rounded-2xl relative flex items-center justify-center overflow-hidden border border-slate-800 min-h-[280px]">
                                {cameraEnabled && previewActive && !error ? (
                                    <>
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            muted
                                            playsInline
                                            className="w-full h-full object-cover transform scale-x-[-1]"
                                        ></video>
                                        {countdownActive && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                                                <div className="w-20 h-20 bg-purple-600 text-white rounded-full flex items-center justify-center text-4xl font-black animate-ping">
                                                    {secondsLeft}
                                                </div>
                                            </div>
                                        )}
                                        {/* Stop Preview button overlay */}
                                        <button
                                            onClick={() => { setPreviewActive(false); }}
                                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition-colors z-10"
                                        >
                                            Stop Preview
                                        </button>
                                    </>
                                ) : lastRecordingUrl ? (
                                    // Show last recorded video (like screenshot tool shows captured image)
                                    <>
                                        <video
                                            src={lastRecordingUrl}
                                            controls
                                            playsInline
                                            className="w-full h-full object-contain"
                                        ></video>
                                        <button
                                            onClick={() => setLastRecordingUrl(null)}
                                            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition-colors z-10"
                                        >
                                            ✕ Close
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-500 p-6 text-center space-y-3">
                                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                                            <Camera size={32} />
                                        </div>
                                        {!cameraEnabled ? (
                                            <div>
                                                <p className="font-extrabold text-slate-400 text-sm uppercase tracking-wider">Camera is Off</p>
                                                <p className="text-xs text-slate-500 mt-1 max-w-xs">Toggle camera ON in the left pane to begin capturing.</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <div>
                                                    <p className="font-extrabold text-slate-300 text-sm uppercase tracking-wider">Preview Ready</p>
                                                    <p className="text-xs text-slate-500 mt-1 max-w-xs">Click below to enable camera preview before recording.</p>
                                                </div>
                                                <button
                                                    onClick={() => setPreviewActive(true)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors shadow-md"
                                                >
                                                    <Camera size={14} />
                                                    Enable Camera Preview
                                                </button>
                                            </div>
                                        )}
                                        {error && (
                                            <div className="flex items-center gap-1.5 text-xs text-red-500 bg-red-950/20 border border-red-900/30 px-3 py-1.5 rounded-xl font-medium mt-2">
                                                <AlertTriangle size={14} />
                                                <span>{error}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Video Settings Block */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Video Settings</h4>
                                <div className="grid grid-cols-4 gap-2">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Resolution</span>
                                        <select
                                            value={resolution}
                                            onChange={(e) => setResolution(e.target.value)}
                                            className="w-full text-[11px] bg-white border border-slate-200 rounded-xl p-2 outline-none font-bold text-slate-700"
                                        >
                                            <option value="1080p">Resolution: 1080p</option>
                                            <option value="720p">Resolution: 720p</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Frame Rate</span>
                                        <select
                                            value={frameRate}
                                            onChange={(e) => setFrameRate(e.target.value)}
                                            className="w-full text-[11px] bg-white border border-slate-200 rounded-xl p-2 outline-none font-bold text-slate-700"
                                        >
                                            <option value="30">Frame Rate: 30</option>
                                            <option value="60">Frame Rate: 60</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Format</span>
                                        <select
                                            value={format}
                                            onChange={(e) => setFormat(e.target.value)}
                                            className="w-full text-[11px] bg-white border border-slate-200 rounded-xl p-2 outline-none font-bold text-slate-700"
                                        >
                                            <option value="MP4">Format: MP4</option>
                                            <option value="WebM">Format: WebM</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Audio</span>
                                        <select
                                            value={audioBitrate}
                                            onChange={(e) => setAudioBitrate(e.target.value)}
                                            className="w-full text-[11px] bg-white border border-slate-200 rounded-xl p-2 outline-none font-bold text-slate-700"
                                        >
                                            <option value="192k">Audio: 192k</option>
                                            <option value="128k">Audio: 128k</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Start/Stop Recording Button */}
                            <button
                                disabled={isReadOnly || !cameraEnabled || countdownActive}
                                onClick={toggleRecording}
                                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-200 mt-4 text-white shadow-lg ${
                                    isReadOnly
                                        ? 'bg-slate-350 text-slate-500 cursor-not-allowed opacity-60 shadow-none'
                                        : recording 
                                            ? 'bg-red-650 hover:bg-red-700 shadow-red-600/10 hover:shadow-red-600/20' 
                                            : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10 hover:shadow-emerald-500/20'
                                } disabled:opacity-50`}
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
                    </div>

                    {/* Right Column: Data Actions & Recordings List */}
                    <div className="lg:col-span-3 space-y-6 text-left">
                        {/* Data Panel */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Data Settings</h3>
                            
                            <div className="space-y-2">                                {/* Save in Google Drive */}
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
                                    onClick={() => {
                                        setLocalHistoryModalOpen(true);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                                >
                                    <Folder className="text-purple-600 shrink-0" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Go to Local Data</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                            {filteredLocalVideos.length} Videos • View structured folders
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
                                            ? 'bg-indigo-55 bg-opacity-30 border-purple-200 text-purple-855 shadow-sm'
                                            : 'bg-slate-50 hover:bg-slate-100 border-slate-150 text-slate-700'
                                    }`}
                                >
                                    <Database className="text-purple-600 shrink-0" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Go to Cloud Data</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                            {filteredCloudFiles.length} Cloud Videos • {(cloudSpace.used / (1024 * 1024)).toFixed(1)} MB / 300 MB
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
                                    <RefreshCw className="text-purple-600 shrink-0 animate-hover-spin" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Sync with Cloud</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                            {filteredLocalVideos.filter(v => !v.synced).length} files not synced
                                        </span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Local vs Cloud Gallery */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                                    {galleryTab === 'local' ? 'Local Videos' : 'Cloud Videos'}
                                </h3>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-650 font-black text-[9px] uppercase tracking-wider">
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
                                            className="bg-indigo-600 h-full transition-all duration-300"
                                            style={{ width: `${Math.min(100, (cloudSpace.used / cloudSpace.limit) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            {/* Gallery Lists */}
                            {galleryTab === 'local' ? (
                                <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-center space-y-3.5">
                                    <Folder className="w-10 h-10 text-indigo-500 mx-auto" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Structured Offline History</p>
                                        <p className="text-[10px] text-slate-500 font-bold leading-normal">
                                            Your offline files are structured inside date folders and sequential names: <b>LMS / [Date] / Video Recorder</b>.
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
                                /* Cloud Gallery List */
                                cloudLoading ? (
                                    <div className="text-center py-6 text-xs text-slate-450 animate-pulse font-bold uppercase tracking-wider">Loading Cloud Data...</div>
                                ) : filteredCloudFiles.length === 0 ? (
                                    <p className="text-xs text-slate-450 italic text-center py-4">No cloud videos found. Click "Sync with Cloud" to upload.</p>
                                ) : (
                                    <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                                        {filteredCloudFiles.map(c => (
                                            <div key={c._id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-2 hover:border-slate-350 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <div className="min-w-0 text-left">
                                                        <p className="text-[10px] font-bold text-slate-700 truncate">{c.filename}</p>
                                                        <p className="text-[9px] text-slate-400 mt-0.5">Length: {c.metadata?.duration || '00:00'} • {(c.size / (1024 * 1024)).toFixed(2)} MB</p>
                                                    </div>
                                                    {!isReadOnly && (
                                                        <button
                                                            onClick={() => handleDeleteCloudFile(c._id)}
                                                            className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-655"
                                                            title="Delete from Cloud"
                                                        >
                                                            <Trash size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                                
                                                <div className="flex gap-2">
                                                    <a
                                                        href={c.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 flex items-center justify-center gap-1 py-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-755 rounded-lg text-[10px] font-bold transition-colors text-center"
                                                    >
                                                        <Play size={10} fill="currentColor" /> Play
                                                    </a>
                                                    <a
                                                        href={c.fileUrl}
                                                        download={c.filename}
                                                        className="flex-1 flex items-center justify-center gap-1 py-1 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-bold transition-colors text-center"
                                                    >
                                                        <Download size={10} /> Download
                                                    </a>
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
                    toast.success("Saved to Google Drive folder!");
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
        </DashboardLayout>
    );
};

export default VideoRecorderPage;
