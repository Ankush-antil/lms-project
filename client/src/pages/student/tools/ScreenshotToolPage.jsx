import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, Mic, Clock, Settings, Cloud, Folder, RefreshCw, Database, Download, Trash, AlertTriangle, ArrowLeft, Crop, Layers, FileText, Monitor, Square, Activity, Share2, CheckCircle, X, Save } from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import toast from 'react-hot-toast';
import axios from 'axios';
import GoogleDriveModal from '../../../components/common/GoogleDriveModal';
import LocalHistoryModal from '../../../components/common/LocalHistoryModal';
import html2canvas from 'html2canvas';
import { useScreenshot } from '../../../context/ScreenshotContext';
import { parseDateToDdMmYyyy, getTodayDdMmYyyy } from '../../../utils/dateUtils';

const ScreenshotToolPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const scrollReportRef = useRef(null);

    // Parse selected date and inbox param
    const searchParams = new URLSearchParams(location.search);
    const dateParam = searchParams.get('date');
    const inboxParam = searchParams.get('inbox');
    const todayDdMmYyyy = getTodayDdMmYyyy();
    const isReadOnly = dateParam && dateParam !== todayDdMmYyyy;

    // Page local states
    const [countdown, setCountdown] = useState(0); // 0, 3, 5, 10
    const [countdownActive, setCountdownActive] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);

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

    // Context integration
    const {
        screenshots,
        setScreenshots,
        pipActive,
        sourceType,
        setSourceType,
        cropShape,
        setCropShape,
        resolution,
        setResolution,
        format,
        setFormat,
        quality,
        setQuality,
        rectStart,
        setRectStart,
        rectEnd,
        setRectEnd,
        customPath,
        setCustomPath,
        scrollingActive,
        scrollPercent,
        flashActive,
        captureFrame,
        triggerActualLongScreenshot,
        deleteScreenshot: contextDeleteScreenshot,
        openPipWindow,
        closePipWindow,
        captureSource,
        setCaptureSource,
        connectScreenShare,
        stream,
        drafts,
        saveScreenshotDraft,
        deleteScreenshotDraft,
        latestCapture,
        setLatestCapture
    } = useScreenshot();

    const deleteScreenshot = (id) => {
        if (isReadOnly) {
            toast.error("Cannot delete screenshots in Read-Only archive.");
            return;
        }
        contextDeleteScreenshot(id);
    };

    // Filter local screenshots by selected date and inbox param
    const filteredLocalScreenshots = useMemo(() => {
        let filtered = screenshots;
        if (dateParam) {
            filtered = filtered.filter(s => parseDateToDdMmYyyy(s.timestamp) === dateParam);
        }
        if (inboxParam) {
            filtered = filtered.filter(s => s.inbox === inboxParam);
        }
        return filtered;
    }, [screenshots, dateParam, inboxParam]);

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
            const toolFiles = res.data.files.filter(f => f.toolType === 'screenshot');
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

    // Helper to convert dataURI to Blob
    const dataURIToBlob = (dataURI) => {
        try {
            const byteString = atob(dataURI.split(',')[1]);
            const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            return new Blob([ab], { type: mimeString });
        } catch (e) {
            console.error("Error parsing base64 image dataURI", e);
            return null;
        }
    };

    // Save latest screenshot to Google Drive (Open Modal)
    const handleSaveToDriveClick = () => {
        if (screenshots.length === 0) {
            toast.error("No screenshots to save. Take a screenshot first.");
            return;
        }
        const latest = screenshots[0];
        const blob = dataURIToBlob(latest.url);
        if (!blob) {
            toast.error("Failed to parse screenshot data.");
            return;
        }
        setDriveFileMeta({
            name: `screenshot_${Date.now()}.${latest.format.toLowerCase()}`,
            blob: blob,
            itemId: latest.id
        });
        setDriveModalOpen(true);
    };

    // Delete cloud file
    const handleDeleteCloudFile = async (id) => {
        if (isReadOnly) {
            toast.error("Cannot delete files in Read-Only archive.");
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

    // Sync local unsynced files with cloud
    const handleSyncWithCloud = async () => {
        const unsynced = screenshots.filter(s => !s.synced);
        if (unsynced.length === 0) {
            toast.success("All local files are already synced!");
            return;
        }

        const toastId = toast.loading(`Syncing ${unsynced.length} files to cloud...`);
        let successCount = 0;

        for (const item of unsynced) {
            try {
                const blob = dataURIToBlob(item.url);
                if (!blob) continue;

                const formData = new FormData();
                formData.append('file', blob, `screenshot_${item.id}.${item.format.toLowerCase()}`);
                formData.append('toolType', 'screenshot');
                formData.append('resolution', item.resolution);
                formData.append('format', item.format);
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
                    localStorage.setItem('practice_screenshots', JSON.stringify(screenshots));
                    fetchCloudFiles();
                    return;
                }
            }
        }

        localStorage.setItem('practice_screenshots', JSON.stringify(screenshots));
        await fetchCloudFiles();

        if (successCount > 0) {
            toast.success(`Successfully synced ${successCount} files to cloud!`, { id: toastId });
        } else {
            toast.error("Failed to sync files to cloud.", { id: toastId });
        }
    };

    // Sync single screenshot to cloud
    const handleSyncSingleWithCloud = async (item) => {
        if (isReadOnly) {
            toast.error("Sync is disabled in Read-Only archive.");
            return;
        }
        const toastId = toast.loading("Syncing screenshot to Cloud...");
        try {
            const blob = dataURIToBlob(item.url);
            if (!blob) {
                toast.error("Failed to parse screenshot data.", { id: toastId });
                return;
            }

            const formData = new FormData();
            formData.append('file', blob, `screenshot_${item.id}.${item.format.toLowerCase()}`);
            formData.append('toolType', 'screenshot');
            formData.append('resolution', item.resolution);
            formData.append('format', item.format);
            if (item.inbox) {
                formData.append('inbox', item.inbox);
            }

            await axios.post('/api/practice-files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setScreenshots(prev => {
                const list = prev.map(s => s.id === item.id ? { ...s, synced: true } : s);
                localStorage.setItem('practice_screenshots', JSON.stringify(list));
                return list;
            });

            await fetchCloudFiles();
            toast.success("Successfully synced screenshot to cloud!", { id: toastId });
        } catch (err) {
            console.error("Sync error:", err);
            const errMsg = err.response?.data?.message || 'Failed to sync with cloud.';
            toast.error(errMsg, { id: toastId });
        }
    };

    // Sync single screenshot to drive
    const handleSyncSingleWithDrive = async (item) => {
        if (isReadOnly) {
            toast.error("Google Drive upload is disabled in Read-Only archive.");
            return;
        }
        const blob = dataURIToBlob(item.url);
        if (!blob) {
            toast.error("Failed to parse screenshot data.");
            return;
        }
        setDriveFileMeta({
            name: `screenshot_${item.id}.${item.format.toLowerCase()}`,
            blob: blob,
            itemId: item.id
        });
        setDriveModalOpen(true);
    };

    const openShareModal = (item) => {
        setShareModalItem(item);
    };

    // Reset crop selections when switching modes
    useEffect(() => {
        setRectStart(null);
        setRectEnd(null);
        setCustomPath([]);
    }, [sourceType, cropShape]);

    // Capture Trigger
    const handleCapture = () => {
        if (sourceType === 'long') {
            triggerActualLongScreenshot();
            return;
        }

        if (countdown > 0 && !countdownActive) {
            setCountdownActive(true);
            setSecondsLeft(countdown);
            return;
        }

        captureFrame();
    };

    // Countdown effect
    useEffect(() => {
        if (!countdownActive) return;
        if (secondsLeft === 0) {
            setCountdownActive(false);
            captureFrame();
            return;
        }

        const interval = setInterval(() => {
            setSecondsLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [countdownActive, secondsLeft]);

    return (
        <DashboardLayout role="Student" fullWidth={true}>
            <div className="max-w-7xl mx-auto px-4 py-2 text-left">
                {/* Back Link & Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
                    {/* Left: Title */}
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                            <Camera className="text-indigo-605" size={20} />
                            Screenshot Tool {isReadOnly && <span className="text-xs px-2.5 py-1 bg-amber-500 text-white rounded-md font-bold uppercase tracking-wider">Preview Only</span>}
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
                            <span className="text-[9px] font-black text-slate-400 hidden sm:inline">• {filteredLocalScreenshots.length}</span>
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
                    <div className="mb-4 p-4 bg-amber-50 border border-amber-200 text-amber-905 rounded-2xl flex items-center gap-2.5 text-xs font-semibold leading-relaxed">
                        <AlertTriangle className="text-amber-600 shrink-0" size={16} />
                        <div>
                            <p className="font-bold">Past Workspace Preview (Read-Only)</p>
                            <p className="text-amber-800/80 text-[11px] font-medium mt-0.5">You are viewing files captured on {dateParam}. Capturing screenshots, deleting, or syncing files is disabled for this day.</p>
                        </div>
                    </div>
                )}

                {/* 2-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left Column: Live Capture & Saved list */}
                    <div className="lg:col-span-9 space-y-6">
                        {/* Live Capture Zone */}
                        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4 text-center">
                            <h3 className="font-bold text-slate-805 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider text-left flex justify-between items-center">
                                <span>Live Capture Stream</span>
                                {countdownActive && (
                                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 font-black animate-pulse rounded-full">
                                        Countdown: {secondsLeft}s
                                    </span>
                                )}
                            </h3>
                            
                            <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-850 relative min-h-[320px] flex items-center justify-center">
                                {latestCapture ? (
                                    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 bg-slate-950">
                                        <img
                                            src={latestCapture.url}
                                            alt="latest capture"
                                            className="max-h-[320px] max-w-full w-auto h-auto rounded-xl object-contain shadow-2xl border border-slate-850 animate-fade-in"
                                        />
                                        <button
                                            onClick={() => setLatestCapture(null)}
                                            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition-colors z-10"
                                        >
                                            ✕ Close Preview
                                        </button>
                                    </div>
                                ) : sourceType === 'long' ? (
                                    <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-8 text-center relative min-h-[300px]">
                                        <div className="relative flex items-center justify-center w-24 h-24 mb-6">
                                            <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping"></div>
                                            <div className="relative w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
                                                <Layers size={36} className={scrollingActive ? 'animate-bounce' : ''} />
                                            </div>
                                        </div>
                                        <div className="space-y-2 z-10">
                                            <h4 className="font-black text-slate-200 text-sm uppercase tracking-wider">Full-Page Scroll Capture</h4>
                                            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                                                This mode renders the entire LMS webpage layout from the very top to the bottom. Ready to capture the scrollable layout.
                                            </p>
                                        </div>

                                        {scrollingActive && (
                                            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-30 p-6 space-y-4 animate-fade-in">
                                                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                                <div className="text-center space-y-1">
                                                    <p className="text-xs font-black text-indigo-405 uppercase tracking-widest animate-pulse">Capturing Long Page</p>
                                                    <p className="text-lg font-black text-white">{scrollPercent}% Complete</p>
                                                </div>
                                                <div className="w-48 bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                                                    <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${scrollPercent}%` }}></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (captureSource === 'desktop' && stream) ? (
                                    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 bg-slate-950">
                                        <video
                                            ref={(el) => {
                                                if (el && stream) {
                                                    el.srcObject = stream;
                                                    el.play().catch(e => console.log(e));
                                                }
                                            }}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="max-h-[320px] max-w-full w-auto h-auto rounded-xl object-contain shadow-2xl border border-slate-850"
                                        />
                                        <div className="absolute bottom-3 left-3 bg-black/75 px-3 py-1.5 rounded-xl border border-white/10 text-[9px] font-black text-slate-350 uppercase tracking-wider z-20 flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                            <span>Live Desktop Stream</span>
                                        </div>
                                    </div>
                                ) : (captureSource === 'desktop' && !stream) ? (
                                    <div className="flex flex-col items-center justify-center text-slate-500 p-8 text-center space-y-4 min-h-[300px]">
                                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-indigo-400 border border-slate-700/50 shadow-inner">
                                            <Layers size={36} />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="font-extrabold text-slate-300 text-sm uppercase tracking-wider">No Desktop Stream Connected</p>
                                            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                                                Click below to share a window or screen from your laptop.
                                            </p>
                                        </div>
                                        <button
                                            onClick={connectScreenShare}
                                            className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-150 active:scale-95 transition-all"
                                        >
                                            Select Window / Screen
                                        </button>
                                    </div>
                                ) : filteredLocalScreenshots.length > 0 ? (
                                    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 bg-slate-950">
                                        <img
                                            src={filteredLocalScreenshots[0].url}
                                            alt="latest capture"
                                            className="max-h-[320px] max-w-full w-auto h-auto rounded-xl object-contain shadow-2xl border border-slate-850"
                                        />

                                        {countdownActive && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                                                <div className="w-20 h-20 bg-indigo-650 text-white rounded-full flex items-center justify-center text-4xl font-black animate-ping">
                                                    {secondsLeft}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-505 p-8 text-center space-y-4 min-h-[300px]">
                                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-indigo-405 border border-slate-700/50 shadow-inner">
                                            <Camera size={36} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="font-extrabold text-slate-305 text-sm uppercase tracking-wider">No Screenshots Captured Yet</p>
                                            <p className="text-xs text-slate-505 max-w-xs mx-auto leading-relaxed">
                                                Click "Take Screenshot" below or open the floating toolbar to capture screens and crops instantly.
                                            </p>
                                        </div>
                                        {countdownActive && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                                                <div className="w-20 h-20 bg-indigo-650 text-white rounded-full flex items-center justify-center text-4xl font-black animate-ping">
                                                    {secondsLeft}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Trigger buttons */}
                            <button
                                disabled={isReadOnly}
                                onClick={openPipWindow}
                                className={`w-full py-3.5 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-all duration-200 mt-4 ${isReadOnly
                                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60 shadow-none'
                                        : pipActive
                                            ? 'bg-red-500 hover:bg-red-600 shadow-red-500/10 hover:shadow-red-500/20'
                                            : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10 hover:shadow-emerald-500/20'
                                    }`}
                            >
                                <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span>
                                {isReadOnly ? 'Workspace Read-Only' : pipActive ? 'Close Screenshot Toolbar' : 'Open Screenshot Toolbar'}
                            </button>
                        </div>

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
                                    No draft screenshots. Take a screenshot to see drafts here.
                                </p>
                            ) : (
                                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                                    {drafts.map((draft, index) => (
                                        <div key={draft.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-150 hover:border-slate-350 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider shrink-0">
                                                    Draft {drafts.length - index}
                                                </span>
                                                <div className="w-16 h-11 bg-black/10 rounded-lg overflow-hidden border border-slate-200 shrink-0 relative flex items-center justify-center">
                                                    <img src={draft.url} alt="snapshot draft" className="max-w-full max-h-full object-contain" />
                                                </div>
                                                <div className="min-w-0 text-left">
                                                    <span className="text-[10px] text-slate-500 font-bold block truncate">
                                                        {draft.timestamp}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 font-medium block truncate mt-0.5">
                                                        {draft.size} • {draft.format} • {draft.resolution}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {/* Save Button */}
                                                <button
                                                    onClick={() => saveScreenshotDraft(draft)}
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
                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => deleteScreenshotDraft(draft.id)}
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
                                    {filteredLocalScreenshots.length} Saved
                                </span>
                            </h3>
                            {filteredLocalScreenshots.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-6">
                                    No saved screenshots found. Capture some snapshots to see them here.
                                </p>
                            ) : (
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                                    {filteredLocalScreenshots.map((item, index) => (
                                        <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-55 rounded-2xl border border-slate-150 hover:border-slate-350 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider shrink-0">
                                                    Snap {filteredLocalScreenshots.length - index}
                                                </span>
                                                <div className="w-16 h-11 bg-black/10 rounded-lg overflow-hidden border border-slate-200 shrink-0 relative flex items-center justify-center">
                                                    <img src={item.url} alt="snapshot" className="max-w-full max-h-full object-contain" />
                                                </div>
                                                <div className="min-w-0 text-left">
                                                    <span className="text-[10px] text-slate-500 font-bold block truncate">
                                                        {item.timestamp}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 font-medium block truncate mt-0.5">
                                                        {item.size} • {item.format} • {item.resolution}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {/* Sync with Cloud Indicator / Sync Button */}
                                                {item.synced ? (
                                                    <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">
                                                        <CheckCircle size={14} className="text-emerald-600" />
                                                        <span>Synced</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSyncSingleWithCloud(item)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-55 border border-indigo-200 text-indigo-700 rounded-xl text-[10px] font-extrabold hover:bg-indigo-100 transition-all"
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
                                                    title="Share Screenshot"
                                                >
                                                    <Share2 size={14} />
                                                </button>

                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => deleteScreenshot(item.id)}
                                                    className="p-2.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all active:scale-95 shadow-sm"
                                                    title="Delete Screenshot"
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
                    <div className="lg:col-span-3 space-y-6 text-left">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Settings</h3>
                            
                            {/* Capture Source */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Capture Mode</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setCaptureSource('webpage')}
                                        className={`py-2 px-3 rounded-xl border text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${captureSource === 'webpage'
                                                ? 'bg-indigo-50 border-indigo-300 text-indigo-800 shadow-sm'
                                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                            }`}
                                    >
                                        <Monitor size={14} />
                                        <span>Webpage</span>
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setCaptureSource('desktop');
                                            if (sourceType === 'long') {
                                                setSourceType('camera');
                                            }
                                            if (!stream) {
                                                await connectScreenShare();
                                            }
                                        }}
                                        className={`py-2 px-3 rounded-xl border text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${captureSource === 'desktop'
                                                ? 'bg-indigo-50 border-indigo-300 text-indigo-800 shadow-sm'
                                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                            }`}
                                    >
                                        <Layers size={14} />
                                        <span>Desktop</span>
                                    </button>
                                </div>
                            </div>

                            {/* Format & Resolution */}
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolution</label>
                                    <select
                                        value={resolution}
                                        onChange={(e) => setResolution(e.target.value)}
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 outline-none font-bold text-slate-700"
                                    >
                                        <option value="1080p">1080p (FullHD)</option>
                                        <option value="720p">720p (HD)</option>
                                        <option value="480p">480p (SD)</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Format</label>
                                    <select
                                        value={format}
                                        onChange={(e) => setFormat(e.target.value)}
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 outline-none font-bold text-slate-700"
                                    >
                                        <option value="PNG">PNG format</option>
                                        <option value="JPG">JPG format</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quality</label>
                                    <select
                                        value={quality}
                                        onChange={(e) => setQuality(e.target.value)}
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 outline-none font-bold text-slate-700"
                                    >
                                        <option value="High">High Quality</option>
                                        <option value="Medium">Medium Quality</option>
                                        <option value="Low">Low Quality</option>
                                    </select>
                                </div>

                                {/* Countdown */}
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
                                        <option value={10}>10 Seconds</option>
                                    </select>
                                </div>
                            </div>
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

                        setScreenshots(prev => {
                            const list = prev.map(s =>
                                s.id === driveFileMeta.itemId
                                    ? { ...s, driveSynced: true, driveUrl: driveFileViewUrl }
                                    : s
                            );
                            localStorage.setItem('practice_screenshots', JSON.stringify(list));
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
                    // Refresh local screenshots in page state
                    const saved = localStorage.getItem('practice_screenshots');
                    if (saved) {
                        setScreenshots(JSON.parse(saved));
                    }
                }}
                onRefresh={() => {
                    const saved = localStorage.getItem('practice_screenshots');
                    if (saved) {
                        setScreenshots(JSON.parse(saved));
                    }
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
                                    <Database className="text-indigo-650" size={18} />
                                </div>
                                <div>
                                    <span className="font-extrabold text-slate-800 text-sm tracking-tight block">Cloud Storage</span>
                                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                                        {filteredCloudFiles.length} Cloud Snaps • {(cloudSpace.used / (1024 * 1024)).toFixed(1)} MB / 300 MB used
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
                                <div className="text-center py-10 text-xs text-slate-455 animate-pulse font-bold uppercase tracking-wider">
                                    Loading Cloud Data...
                                </div>
                            ) : filteredCloudFiles.length === 0 ? (
                                <div className="text-center py-10">
                                    <Database className="mx-auto text-slate-300 mb-3" size={36} />
                                    <p className="text-xs text-slate-455 italic font-medium">No cloud screenshots found.</p>
                                    <p className="text-[10px] text-slate-400 mt-1">Click "Sync with Cloud" on any saved screenshot to upload.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredCloudFiles.map(c => (
                                        <div key={c._id} className="p-3 bg-slate-50 rounded-2xl border border-slate-150 flex flex-col justify-between hover:border-slate-300 transition-colors">
                                            <div className="relative aspect-video bg-black/10 rounded-xl overflow-hidden mb-3 border border-slate-200">
                                                <img src={c.fileUrl} alt="cloud screenshot" className="w-full h-full object-contain" />
                                            </div>
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="min-w-0 flex-1 text-left">
                                                    <p className="text-xs font-bold text-slate-700 truncate">{c.filename}</p>
                                                    <p className="text-[9px] text-slate-400 mt-0.5">
                                                        Resolution: {c.metadata?.resolution || 'unknown'} • {(c.size / 1024).toFixed(1)} KB
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
                                    <span className="font-extrabold text-slate-800 text-sm block">Share Screenshot</span>
                                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5 uppercase tracking-wider">
                                        {shareModalItem.format} • {shareModalItem.size}
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
                                        c.filename?.includes(`screenshot_${shareModalItem.id}`)
                                    );
                                    const sharePageUrl = match?._id
                                        ? `${window.location.origin}/share/screenshot/${match._id}`
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
                                            <p className="text-[9px] text-indigo-405 font-medium">ℹ️ Anyone with this link can view your screenshot without logging in.</p>
                                        </div>
                                    );
                                })() : (
                                    <p className="text-[10px] text-slate-400 font-medium">Sync this snapshot to DS Cloud first to get a shareable link.</p>
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
                                        <p className="text-[10px] text-slate-400 font-medium">Direct link not saved — please re-sync this screenshot to Drive to get the file link.</p>
                                    )
                                ) : (
                                    <p className="text-[10px] text-slate-400 font-medium">Sync this screenshot to Google Drive first to get a shareable link.</p>
                                )}
                            </div>

                            {/* Option 3: Share via App */}
                            <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4 space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <Share2 size={14} className="text-blue-600" />
                                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Share via App</span>
                                </div>
                                <p className="text-[10px] text-slate-550 font-medium">Share directly to WhatsApp, Telegram, Gmail, and other apps installed on your device.</p>
                                <button
                                    onClick={() => {
                                        const cloudMatch = cloudFiles.find(c =>
                                            c.filename?.includes(shareModalItem.id) ||
                                            c.filename?.includes(`screenshot_${shareModalItem.id}`)
                                        );
                                        const sharePageUrl = cloudMatch?._id
                                            ? `${window.location.origin}/share/screenshot/${cloudMatch._id}`
                                            : shareModalItem.driveUrl || window.location.href;
                                        if (navigator.share) {
                                            navigator.share({
                                                title: `📸 Screenshot Capture — ${shareModalItem.timestamp}`,
                                                text: `View my screenshot shared via DS LMS`,
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
        </DashboardLayout>
    );
};

export default ScreenshotToolPage;
