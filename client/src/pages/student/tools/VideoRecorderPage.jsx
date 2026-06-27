import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MonitorPlay, Camera, Mic, Clock, Settings, Cloud, Folder, RefreshCw, Database, Download, Trash, AlertTriangle, ArrowLeft, Play, Square, Share2, CheckCircle, X, Save, Pencil, Eye } from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import toast from 'react-hot-toast';
import axios from 'axios';
import GoogleDriveModal from '../../../components/common/GoogleDriveModal';
import LocalHistoryModal from '../../../components/common/LocalHistoryModal';
import { saveLocalBlob, getLocalBlob, deleteLocalBlob } from '../../../utils/indexedDB';
import { parseDateToDdMmYyyy, getTodayDdMmYyyy } from '../../../utils/dateUtils';
import VideoTrimmerModal from '../../../components/common/VideoTrimmerModal';

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
    const [drafts, setDrafts] = useState([]);
    const [error, setError] = useState(null);
    const [lastRecordingUrl, setLastRecordingUrl] = useState(null); // Show last recorded video in preview after stop

    // Draft Preview & Edit Modal states
    const [previewDraft, setPreviewDraft] = useState(null);
    const [editDraft, setEditDraft] = useState(null);
    const [editTitle, setEditTitle] = useState('');

    const handleSaveEdit = () => {
        if (!editDraft) return;
        setDrafts(prev => prev.map(d => d.id === editDraft.id ? { ...d, title: editTitle } : d));
        setEditDraft(null);
        setEditTitle('');
        toast.success("Draft renamed!");
    };

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    // Google Drive Modal State
    const [driveModalOpen, setDriveModalOpen] = useState(false);
    const [driveFileMeta, setDriveFileMeta] = useState({ name: '', blob: null });

    // Local History Modal State
    const [localHistoryModalOpen, setLocalHistoryModalOpen] = useState(false);

    // Cloud files state
    const [cloudFiles, setCloudFiles] = useState([]);
    const [cloudSpace, setCloudSpace] = useState({ used: 0, limit: 300 * 1024 * 1024 });
    const [cloudLoading, setCloudLoading] = useState(false);

    // Share & Cloud Gallery modals
    const [shareModalItem, setShareModalItem] = useState(null);
    const [cloudGalleryModalOpen, setCloudGalleryModalOpen] = useState(false);

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
            blob: blob,
            itemId: latest.id
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

    // Sync single video with Cloud
    const handleSyncSingleWithCloud = async (item) => {
        if (isReadOnly) {
            toast.error("Sync is disabled in Read-Only archive.");
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

            setVideos(prev => {
                const list = prev.map(v => v.id === item.id ? { ...v, synced: true } : v);
                localStorage.setItem('practice_videos', JSON.stringify(list.map(v => ({ ...v, url: '' }))));
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

    // Sync single video with Drive
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
            name: `video_recording_${item.id}.webm`,
            blob: blob,
            itemId: item.id
        });
        setDriveModalOpen(true);
    };

    const openShareModal = (item) => {
        setShareModalItem(item);
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
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = devices.filter(d => d.kind === 'videoinput');
                const audioInputs = devices.filter(d => d.kind === 'audioinput');

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
            if (!previewActive) {
                setPreviewActive(true);
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
                const rawBlob = new Blob(chunksRef.current, { type: 'video/webm' });
                const finalDurationMs = recordingTime * 1000;

                const processBlob = (blob) => {
                    const blobUrl = URL.createObjectURL(blob);
                    const draftId = 'draft_' + Date.now();
                    const searchParams = new URLSearchParams(window.location.search);
                    const inboxVal = searchParams.get('inbox');
                    const newDraft = {
                        id: draftId,
                        timestamp: new Date().toLocaleString(),
                        blob: blob,
                        url: blobUrl,
                        size: (blob.size / (1024 * 1024)).toFixed(2) + ' MB',
                        duration: formatTime(recordingTime),
                        resolution: resolution,
                        inbox: inboxVal || ''
                    };

                    setDrafts(prev => [newDraft, ...prev]);
                    setLastRecordingUrl(blobUrl);
                    setRecordingTime(0);
                    toast.success("Recording complete! Added to Draft Content.");
                };

                if (window.ysFixWebmDuration && finalDurationMs > 0) {
                    window.ysFixWebmDuration(rawBlob, finalDurationMs, (fixedBlob) => {
                        processBlob(fixedBlob);
                    });
                } else {
                    processBlob(rawBlob);
                }
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

    const handleSaveDraft = async (draft) => {
        if (isReadOnly) {
            toast.error("Saving files is disabled in Read-Only archive.");
            return;
        }
        try {
            const recId = 'vid_' + Date.now();
            await saveLocalBlob(recId, draft.blob);

            const newVideo = {
                id: recId,
                timestamp: draft.timestamp,
                url: draft.url,
                size: draft.size,
                duration: draft.duration,
                resolution: draft.resolution,
                synced: false,
                driveSynced: false,
                driveUrl: null,
                inbox: draft.inbox,
                title: draft.title
            };

            setVideos(prev => {
                const list = [newVideo, ...prev];
                localStorage.setItem('practice_videos', JSON.stringify(list.map(v => ({ ...v, url: '' }))));
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

    return (
        <DashboardLayout role="Student" fullWidth={true}>
            <div className="max-w-7xl mx-auto px-4 py-2 text-left">
                {/* Back Link & Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
                    {/* Left: Title */}
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                            <MonitorPlay className="text-purple-650" size={20} />
                            Video Recorder
                        </h1>
                    </div>

                    {/* Center: Data Settings Quick Access */}
                    <div className="flex items-center gap-3 flex-wrap border rounded-xl p-3 bg-gray-100 h-15 w-[800px] justify-center">
                        {/* Local Data */}
                        <button
                            onClick={() => setLocalHistoryModalOpen(true)}
                            className="w-100 h-10 flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-655 hover:text-indigo-700 rounded-xl text-xs font-bold transition-all shadow-sm"
                            title="Go to Local Data"
                        >
                            <Folder size={13} className="text-indigo-500 shrink-0" />
                            <span className="hidden sm:inline">Data on Local Cloud</span>
                            <span className="text-[9px] font-black text-slate-400 hidden sm:inline">• {filteredLocalVideos.length}</span>
                        </button>

                        {/* Cloud Data */}
                        <button
                            onClick={async () => {
                                await fetchCloudFiles();
                                setCloudGalleryModalOpen(true);
                            }}
                            className="w-100 h-10 flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-indigo-200 bg-slate-50 hover:bg-indigo-50 text-slate-655 hover:text-indigo-705 rounded-xl text-xs font-bold transition-all shadow-sm"
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
                            className="w-100 h-10 flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-amber-55 border border-slate-200 hover:border-amber-200 text-slate-655 hover:text-amber-700 rounded-xl text-xs font-bold transition-all shadow-sm"
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
                            <p className="text-amber-800/80 text-[11px] font-medium mt-0.5">You are viewing files captured on {dateParam}. Capturing videos, deleting, or syncing files is disabled for this day.</p>
                        </div>
                    </div>
                )}

                {/* 2-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left Column: Capture Preview & Saved List */}
                    <div className="lg:col-span-9 space-y-6">
                        {/* Compact Toolbar Action Bar */}
                        <div className="bg-white px-5 py-4 rounded-3xl border border-slate-105 shadow-sm flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                                    <MonitorPlay className="text-purple-600" size={18} />
                                </div>
                                <div className="text-left">
                                    <p className="font-extrabold text-slate-800 text-sm leading-tight">Video Recorder</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                        {recording ? 'Recording is active' : 'Click to start or preview your camera'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {recording && (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-black animate-pulse">
                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                                        LIVE {formatTime(recordingTime)}
                                    </span>
                                )}
                                {countdownActive && (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-200 text-yellow-750 rounded-xl text-xs font-black animate-pulse">
                                        Countdown: {secondsLeft}s
                                    </span>
                                )}
                                <button
                                    disabled={isReadOnly || countdownActive}
                                    onClick={toggleRecording}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs shadow-sm active:scale-[0.98] transition-all duration-200 ${
                                        isReadOnly
                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                            : recording
                                                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-200'
                                                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200'
                                    }`}
                                >
                                    <span className="w-2 h-2 bg-white/85 rounded-full animate-pulse"></span>
                                    {isReadOnly ? 'Read-Only' : recording ? 'Stop Recording' : 'Start Recording'}
                                </button>
                                {!recording && (
                                    <button
                                        onClick={() => setPreviewActive(prev => !prev)}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                                            previewActive 
                                                ? 'bg-slate-800 text-white border-slate-800' 
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        {previewActive ? 'Hide Camera' : 'Show Camera'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Camera Video Stream Panel — only shown when preview/recording is active */}
                        {(previewActive || recording || countdownActive) && (
                            <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative min-h-[260px] flex items-center justify-center">
                                {cameraEnabled && previewActive && !error ? (
                                    <>
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            muted
                                            playsInline
                                            className="w-full max-h-[300px] object-contain transform scale-x-[-1]"
                                        ></video>
                                        {countdownActive && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 animate-fade-in">
                                                <div className="w-20 h-20 bg-purple-650 text-white rounded-full flex items-center justify-center text-4xl font-black animate-ping">
                                                    {secondsLeft}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-500 p-6 text-center space-y-3">
                                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-purple-400">
                                            <Camera size={32} />
                                        </div>
                                        {error ? (
                                            <div className="flex items-center gap-1.5 text-xs text-red-500 bg-red-950/20 border border-red-900/30 px-3 py-1.5 rounded-xl font-medium mt-2">
                                                <AlertTriangle size={14} />
                                                <span>{error}</span>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="font-extrabold text-slate-300 text-sm uppercase tracking-wider">Preview Initializing...</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Draft Content Section */}
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
                                        <div key={draft.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-300 transition-colors">
                                            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">
                                                        {draft.title || `Rec ${drafts.length - index}`}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold">
                                                        {draft.duration} • {draft.size} • {draft.resolution}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-500 font-bold block truncate">
                                                    {draft.timestamp}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {/* Preview Button */}
                                                <button
                                                    onClick={() => setPreviewDraft(draft)}
                                                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border border-slate-200"
                                                    title="Preview Recording"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                {/* Edit Button */}
                                                <button
                                                    onClick={() => {
                                                        setEditDraft(draft);
                                                        setEditTitle(draft.title || `Rec ${drafts.length - index}`);
                                                    }}
                                                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border border-slate-200"
                                                    title="Rename Draft"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                {/* Save Button */}
                                                <button
                                                    onClick={() => handleSaveDraft(draft)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-sm"
                                                    title="Save to Local Storage"
                                                >
                                                    <Save size={14} />
                                                    <span>Save</span>
                                                </button>
                                                {/* Download Button */}
                                                <a
                                                    href={draft.url}
                                                    download={`${draft.title || `draft_${draft.id}`}.webm`}
                                                    className="p-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-all border border-emerald-100"
                                                    title="Download File"
                                                >
                                                    <Download size={14} />
                                                </a>
                                                {/* Delete Button */}
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

                        {/* Saved Content Section */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider flex items-center justify-between">
                                <span>Saved Content</span>
                                <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded-full">
                                    {filteredLocalVideos.length} Saved
                                </span>
                            </h3>
                            {filteredLocalVideos.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-6">
                                    No saved video recordings found. Capture some videos to see them here.
                                </p>
                            ) : (
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                                    {filteredLocalVideos.map((item, index) => (
                                        <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-300 transition-all">
                                            <div className="flex flex-col gap-1.5 flex-1 min-w-0 text-left">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">
                                                        {item.title || `Rec ${filteredLocalVideos.length - index}`}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold">
                                                        {item.duration} • {item.size} • {item.resolution}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-450 font-bold">
                                                    {item.timestamp}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {/* Preview Button */}
                                                <button
                                                    onClick={() => setPreviewDraft(item)}
                                                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border border-slate-200"
                                                    title="Preview Recording"
                                                >
                                                    <Eye size={14} />
                                                </button>r gap-2 shrink-0">
                                                {/* Sync with Cloud Indicator / Sync Button */}
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
                                                    <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold">
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
                                                    className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all active:scale-95 shadow-sm"
                                                    title="Share Recording"
                                                >
                                                    <Share2 size={14} />
                                                </button>

                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all active:scale-95 shadow-sm"
                                                    title="Delete Recording"
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

                    {/* Right Column: Settings Panel */}
                    <div className="lg:col-span-3 space-y-3 text-left">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3.5">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Settings</h3>

                            {/* Camera Toggle & Device */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Camera Device</label>
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
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Audio input</label>
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

                            {/* Video Config options */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Video Options</h4>
                                <div className="space-y-2">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Resolution</span>
                                        <select
                                            value={resolution}
                                            onChange={(e) => setResolution(e.target.value)}
                                            className="w-full text-[11px] bg-white border border-slate-200 rounded-xl p-2 outline-none font-bold text-slate-700"
                                        >
                                            <option value="1080p">1080p (FullHD)</option>
                                            <option value="720p">720p (HD)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">FPS</span>
                                        <select
                                            value={frameRate}
                                            onChange={(e) => setFrameRate(e.target.value)}
                                            className="w-full text-[11px] bg-white border border-slate-200 rounded-xl p-2 outline-none font-bold text-slate-700"
                                        >
                                            <option value="30">30 fps</option>
                                            <option value="60">60 fps</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Format</span>
                                        <select
                                            value={format}
                                            onChange={(e) => setFormat(e.target.value)}
                                            className="w-full text-[11px] bg-white border border-slate-200 rounded-xl p-2 outline-none font-bold text-slate-700"
                                        >
                                            <option value="MP4">MP4 format</option>
                                            <option value="WebM">WebM format</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Audio Quality</span>
                                        <select
                                            value={audioBitrate}
                                            onChange={(e) => setAudioBitrate(e.target.value)}
                                            className="w-full text-[11px] bg-white border border-slate-200 rounded-xl p-2 outline-none font-bold text-slate-700"
                                        >
                                            <option value="192k">192 kbps</option>
                                            <option value="128k">128 kbps</option>
                                        </select>
                                    </div>
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
                                    <span className="flex items-center gap-1.5"><Settings size={14} /> Advanced settings</span>
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

                        setVideos(prev => {
                            const list = prev.map(v =>
                                v.id === driveFileMeta.itemId
                                    ? { ...v, driveSynced: true, driveUrl: driveFileViewUrl }
                                    : v
                            );
                            localStorage.setItem('practice_videos', JSON.stringify(list.map(v => ({ ...v, url: '' }))));
                            return list;
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
                    loadLocalRecordings();
                }}
                onRefresh={() => {
                    loadLocalRecordings();
                }}
            />

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
                                        {filteredCloudFiles.length} Cloud Videos • {(cloudSpace.used / (1024 * 1024)).toFixed(1)} MB / 300 MB used
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
                                        className="bg-indigo-600 h-full transition-all duration-300"
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
                                    <p className="text-xs text-slate-400 italic font-medium">No cloud videos found.</p>
                                    <p className="text-[10px] text-slate-400 mt-1">Click "Sync with Cloud" on any saved video recording to upload.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredCloudFiles.map(c => (
                                        <div key={c._id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col hover:border-slate-300 transition-colors">
                                            <div className="flex justify-between items-start gap-4 mb-3">
                                                <div className="min-w-0 text-left">
                                                    <p className="text-xs font-bold text-slate-700 truncate">{c.filename}</p>
                                                    <p className="text-[9px] text-slate-400 mt-0.5">
                                                        Length: {c.metadata?.duration || '00:00'} • {(c.size / (1024 * 1024)).toFixed(2)} MB
                                                    </p>
                                                </div>
                                                <div className="flex gap-1 shrink-0">
                                                    <a
                                                        href={c.fileUrl}
                                                        download={c.filename}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                                                        title="Download from Cloud"
                                                    >
                                                        <Download size={14} />
                                                    </a>
                                                    {!isReadOnly && (
                                                        <button
                                                            onClick={() => handleDeleteCloudFile(c._id)}
                                                            className="p-1.5 hover:bg-red-100 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                                                            title="Delete from Cloud"
                                                        >
                                                            <Trash size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <video src={c.fileUrl} controls className="w-full max-h-48 rounded-xl bg-slate-905 border border-slate-850" />
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
                </div>
            )}

            {/* Center Share Modal */}
            {shareModalItem && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                    <Share2 className="text-blue-650" size={18} />
                                </div>
                                <div>
                                    <span className="font-extrabold text-slate-800 text-sm block">Share Recording</span>
                                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5 uppercase tracking-wider">
                                        {shareModalItem.duration} • {shareModalItem.size}
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
                        <div className="px-6 py-5 space-y-4 text-left">
                            {/* Option 1: Cloud Link */}
                            <div className={`rounded-2xl border p-4 space-y-2.5 ${shareModalItem.synced ? 'border-indigo-100 bg-indigo-50/40' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                                <div className="flex items-center gap-2">
                                    <Database size={14} className={shareModalItem.synced ? 'text-indigo-655' : 'text-slate-400'} />
                                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">DS Cloud Link</span>
                                    {shareModalItem.synced
                                        ? <span className="ml-auto px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black rounded-full uppercase tracking-wider">Synced ✓</span>
                                        : <span className="ml-auto px-2 py-0.5 bg-slate-200 text-slate-500 text-[9px] font-black rounded-full uppercase tracking-wider">Not Synced</span>
                                    }
                                </div>
                                {shareModalItem.synced ? (() => {
                                    const match = cloudFiles.find(c =>
                                        c.filename?.includes(shareModalItem.id) ||
                                        c.filename?.includes(`video_recording_${shareModalItem.id}`)
                                    );
                                    const sharePageUrl = match?._id
                                        ? `${window.location.origin}/share/video/${match._id}`
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
                                            <p className="text-[9px] text-indigo-405 font-medium">ℹ️ Anyone with this link can watch your video without logging in.</p>
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

                            {/* Option 3: Share via App */}
                            <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4 space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <Share2 size={14} className="text-blue-600" />
                                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Share via App</span>
                                </div>
                                <p className="text-[10px] text-slate-555 font-medium">Share directly to WhatsApp, Telegram, Gmail, and other apps installed on your device.</p>
                                <button
                                    onClick={() => {
                                        const cloudMatch = cloudFiles.find(c =>
                                            c.filename?.includes(shareModalItem.id) ||
                                            c.filename?.includes(`video_recording_${shareModalItem.id}`)
                                        );
                                        const sharePageUrl = cloudMatch?._id
                                            ? `${window.location.origin}/share/video/${cloudMatch._id}`
                                            : shareModalItem.driveUrl || window.location.href;
                                        if (navigator.share) {
                                            navigator.share({
                                                title: `📹 Video Recording — ${shareModalItem.duration}`,
                                                text: `View my video recording shared via DS LMS`,
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
                        <div className="px-6 py-3 border-t border-slate-105 bg-slate-50/50 shrink-0 flex justify-end">
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

            {/* Preview Modal */}
            {previewDraft && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-100 shadow-2xl overflow-hidden animate-fade-in">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
                                Preview: {previewDraft.title || `Draft`}
                            </h3>
                            <button
                                onClick={() => setPreviewDraft(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-200 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        {/* Modal Body */}
                        <div className="p-6 flex flex-col items-center justify-center bg-slate-955 min-h-[300px]">
                            <video
                                src={previewDraft.url}
                                controls
                                autoPlay
                                playsInline
                                className="max-h-[60vh] max-w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl"
                            />
                        </div>
                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs text-slate-500 font-bold">
                            <div>
                                {previewDraft.resolution && <span>{previewDraft.resolution}</span>}
                                {previewDraft.size && <span className="mx-2">•</span>}
                                {previewDraft.size && <span>{previewDraft.size}</span>}
                                {previewDraft.duration && <span className="mx-2">•</span>}
                                {previewDraft.duration && <span>{previewDraft.duration}</span>}
                                <span className="mx-2">•</span>
                                <span>{previewDraft.timestamp}</span>
                            </div>
                            <button
                                onClick={() => setPreviewDraft(null)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit/Trim Modal */}
            {editDraft && (
                <VideoTrimmerModal
                    isOpen={!!editDraft}
                    onClose={() => {
                        setEditDraft(null);
                        setEditTitle('');
                    }}
                    draft={editDraft}
                    title={editTitle}
                    setTitle={setEditTitle}
                    onSave={(updatedDraft) => {
                        setDrafts(prev => prev.map(d => d.id === updatedDraft.id ? updatedDraft : d));
                        setEditDraft(null);
                        setEditTitle('');
                        toast.success("Draft updated!");
                    }}
                />
            )}
        </DashboardLayout>
    );
};

export default VideoRecorderPage;
