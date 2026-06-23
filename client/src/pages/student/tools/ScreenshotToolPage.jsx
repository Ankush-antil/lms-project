import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Mic, Clock, Settings, Cloud, Folder, RefreshCw, Database, Download, Trash, AlertTriangle, ArrowLeft, Crop, Layers, FileText, Monitor, Square, Activity } from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import toast from 'react-hot-toast';
import axios from 'axios';
import GoogleDriveModal from '../../../components/common/GoogleDriveModal';
import LocalHistoryModal from '../../../components/common/LocalHistoryModal';
import html2canvas from 'html2canvas';
import { useScreenshot } from '../../../context/ScreenshotContext';

const ScreenshotToolPage = () => {
    const navigate = useNavigate();
    const scrollReportRef = useRef(null);
    
    // Page local states
    const [countdown, setCountdown] = useState(0); // 0, 3, 5, 10
    const [countdownActive, setCountdownActive] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);

    // Google Drive Modal State
    const [driveModalOpen, setDriveModalOpen] = useState(false);
    const [driveFileMeta, setDriveFileMeta] = useState({ name: '', blob: null });

    // Local History Modal State
    const [localHistoryModalOpen, setLocalHistoryModalOpen] = useState(false);

    // Active Gallery View: 'local' | 'cloud'
    const [galleryTab, setGalleryTab] = useState('local');

    // Cloud files state
    const [cloudFiles, setCloudFiles] = useState([]);
    const [cloudSpace, setCloudSpace] = useState({ used: 0, limit: 300 * 1024 * 1024 });
    const [cloudLoading, setCloudLoading] = useState(false);

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
        deleteScreenshot,
        openPipWindow,
        closePipWindow,
        captureSource,
        setCaptureSource,
        connectScreenShare,
        stream
    } = useScreenshot();

    // Fetch cloud files
    const fetchCloudFiles = async () => {
        try {
            setCloudLoading(true);
            const res = await axios.get('/api/practice-files');
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
            blob: blob
        });
        setDriveModalOpen(true);
    };

    // Delete cloud file
    const handleDeleteCloudFile = async (id) => {
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

                const res = await axios.post('/api/practice-files/upload', formData, {
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
            <div className="max-w-7xl mx-auto px-4 py-4">
                {/* Back Link */}
                <button
                    onClick={() => navigate('/student/tests')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-bold text-sm"
                >
                    <ArrowLeft size={16} />
                    Back to My Tests
                </button>

                {/* Header */}
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                            <Monitor className="text-indigo-600" />
                            Screenshot Tool
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Capture screen screenshots, crop custom shapes, or take a full scrollable page snapshot.</p>
                    </div>
                </div>

                {/* Main 3-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Source Settings */}
                    <div className="lg:col-span-3 space-y-6 text-left">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Source</h3>
                            {/* Capture Source */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Capture Mode</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setCaptureSource('webpage')}
                                        className={`py-2 px-3 rounded-xl border text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                            captureSource === 'webpage'
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
                                        className={`py-2 px-3 rounded-xl border text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                            captureSource === 'desktop'
                                                ? 'bg-indigo-50 border-indigo-300 text-indigo-800 shadow-sm'
                                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                        }`}
                                    >
                                        <Layers size={14} />
                                        <span>Desktop</span>
                                    </button>
                                </div>
                            </div>
                            {/* Capture Type */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Capture Type</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'camera', label: 'Simple Screenshot', icon: <Monitor size={14} />, disabled: false },
                                        { id: 'area', label: 'Crop Screenshot', icon: <Crop size={14} />, disabled: false },
                                        { id: 'long', label: 'Long Screenshot', icon: <Layers size={14} />, disabled: captureSource === 'desktop' }
                                    ].map(t => (
                                        <button
                                            key={t.id}
                                            disabled={t.disabled}
                                            onClick={() => setSourceType(t.id)}
                                            className={`py-3 px-3.5 rounded-2xl border text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-3.5 ${
                                                t.disabled
                                                    ? 'opacity-40 cursor-not-allowed bg-slate-150 border-slate-200 text-slate-400'
                                                    : sourceType === t.id
                                                        ? 'bg-indigo-55 border-indigo-300 text-indigo-800 shadow-sm'
                                                        : 'bg-slate-50 border-slate-200 text-slate-550 hover:bg-slate-100'
                                            }`}
                                            title={t.disabled ? 'Long screenshot is only supported in Webpage mode' : ''}
                                        >
                                            {t.icon}
                                            <span>{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Crop Shape Selection (Only for Crop Screenshot) */}
                            {sourceType === 'area' && (
                                <div className="space-y-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-left animate-fade-in">
                                    <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                                        <Crop size={12} /> Crop Shape Option
                                    </span>
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                        <button
                                            onClick={() => setCropShape('rect')}
                                            className={`py-2 px-1 rounded-xl border text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                                                cropShape === 'rect'
                                                    ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-55'
                                            }`}
                                        >
                                            <Square size={12} />
                                            <span>Rectangle</span>
                                        </button>
                                        <button
                                            onClick={() => setCropShape('custom')}
                                            className={`py-2 px-1 rounded-xl border text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                                                cropShape === 'custom'
                                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-55'
                                            }`}
                                        >
                                            <Activity size={12} />
                                            <span>Custom Shape</span>
                                        </button>
                                    </div>
                                    <div className="text-[10px] text-slate-500 leading-normal font-bold bg-slate-50 border border-slate-150 rounded-xl p-2.5 mt-2">
                                        {cropShape === 'rect' ? (
                                            <p className="text-amber-800">💡 Drag and draw a box directly on the screen preview window to select a rectangular crop area.</p>
                                        ) : (
                                            <p className="text-emerald-800">💡 Click and drag a custom freehand path on the screen preview window to crop any custom shape.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Countdown Timer */}
                            <div className="space-y-2 text-left">
                                <label className="text-xs font-bold text-slate-505 uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock size={14} /> Countdown Timer
                                </label>
                                <select
                                    value={countdown}
                                    onChange={(e) => setCountdown(parseInt(e.target.value))}
                                    className="w-full text-xs bg-slate-55 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700"
                                >
                                    <option value={0}>Off (Instant)</option>
                                    <option value={3}>3 Seconds</option>
                                    <option value={5}>5 Seconds</option>
                                    <option value={10}>10 Seconds</option>
                                </select>
                            </div>

                            {/* Auto-Stop / Capture (PRO Feature) */}
                            <div className="flex justify-between items-center p-3 bg-indigo-55 bg-opacity-30 border border-indigo-100 rounded-xl text-left">
                                <div className="text-left">
                                    <span className="text-[11px] font-black text-indigo-855 uppercase tracking-wide">Auto-Capture</span>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Captures every 10s</p>
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
                                <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 text-xs text-left">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Aspect Ratio</label>
                                    <select className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 font-medium">
                                        <option>Widescreen (16:9)</option>
                                        <option>Standard (4:3)</option>
                                        <option>Square (1:1)</option>
                                    </select>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-slate-500">Show Capture Overlay Guides</span>
                                        <input type="checkbox" defaultChecked className="rounded text-indigo-600 focus:ring-indigo-500" />
                                    </div>
                                </div>
                            </details>
                        </div>
                    </div>

                    {/* Center Column: Screen / Preview */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[460px] relative overflow-hidden">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider text-left">
                                    {sourceType === 'long' ? 'Full Page Scanner Preview' : 'Screen Capture Preview'}
                                </h3>
                                <button
                                    onClick={openPipWindow}
                                    className={`px-3.5 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                        pipActive
                                            ? 'bg-red-50 border-red-200 text-red-600 shadow-sm shadow-red-100'
                                            : 'bg-indigo-50 border-indigo-250 text-indigo-700 hover:bg-indigo-100 shadow-sm shadow-indigo-100'
                                    }`}
                                >
                                    <Layers size={12} />
                                    <span>{pipActive ? 'Close Floating Bar' : 'Open Floating Toolbar'}</span>
                                </button>
                            </div>
                            
                            {/* Flash Overlay */}
                            <div className={`absolute inset-0 bg-white transition-opacity z-20 pointer-events-none duration-150 ${flashActive ? 'opacity-100' : 'opacity-0'}`}></div>

                            {/* Visual Capture Preview */}
                            <div className="flex-1 my-4 bg-slate-900 rounded-2xl relative flex items-center justify-center overflow-hidden border border-slate-800 min-h-[300px]">
                                {sourceType === 'long' ? (
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
                                                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest animate-pulse">Capturing Long Page</p>
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
                                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-150 active:scale-95 transition-all"
                                        >
                                            Select Window / Screen
                                        </button>
                                    </div>
                                ) : screenshots.length > 0 ? (
                                    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 bg-slate-950">
                                        <img
                                            src={screenshots[0].url}
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
                                        
                                        <div className="absolute bottom-3 left-3 bg-black/75 px-3 py-1.5 rounded-xl border border-white/10 text-[9px] font-black text-slate-350 uppercase tracking-wider z-20 flex items-center gap-1.5">
                                            <span>Latest Capture: {screenshots[0].timestamp}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-500 p-8 text-center space-y-4 min-h-[300px]">
                                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-indigo-400 border border-slate-700/50 shadow-inner">
                                            <Camera size={36} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="font-extrabold text-slate-300 text-sm uppercase tracking-wider">No Screenshots Captured Yet</p>
                                            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                                                Click "Take Screenshot" below or open the floating toolbar to capture screens and custom crops instantly.
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

                            {/* Settings Row */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-left">Capture Settings</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="text-left space-y-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Resolution</span>
                                        <select
                                            value={resolution}
                                            onChange={(e) => setResolution(e.target.value)}
                                            className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 outline-none font-bold text-slate-700"
                                        >
                                            <option value="1080p">1080p (FullHD)</option>
                                            <option value="720p">720p (HD)</option>
                                            <option value="480p">480p (SD)</option>
                                        </select>
                                    </div>
                                    <div className="text-left space-y-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Format</span>
                                        <select
                                            value={format}
                                            onChange={(e) => setFormat(e.target.value)}
                                            className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 outline-none font-bold text-slate-700"
                                        >
                                            <option value="PNG">PNG</option>
                                            <option value="JPG">JPG</option>
                                        </select>
                                    </div>
                                    <div className="text-left space-y-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Quality</span>
                                        <select
                                            value={quality}
                                            onChange={(e) => setQuality(e.target.value)}
                                            className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 outline-none font-bold text-slate-700"
                                        >
                                            <option value="High">High</option>
                                            <option value="Medium">Medium</option>
                                            <option value="Low">Low</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Capture Button */}
                            <button
                                onClick={openPipWindow}
                                className={`w-full py-4 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-all duration-200 mt-4 ${
                                    pipActive 
                                        ? 'bg-red-500 hover:bg-red-600 shadow-red-500/10 hover:shadow-red-500/20' 
                                        : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10 hover:shadow-emerald-500/20'
                                }`}
                            >
                                <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span>
                                {pipActive ? 'Close Screenshot Toolbar' : 'Take Screenshot'}
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Data & Logs */}
                    <div className="lg:col-span-3 space-y-6 text-left">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Data Settings</h3>
                            
                            {/* Sync Actions */}
                            <div className="space-y-2">
                                {/* Save in Google Drive */}
                                <button
                                    onClick={handleSaveToDriveClick}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                                >
                                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                                        <path fill="#FFC107" d="M17 6h14l13 22H30L17 6z" />
                                        <path fill="#FF3D00" d="m15.5 11.5-8.5 15L17 42h13L15.5 11.5z" />
                                        <path fill="#4CAF50" d="M44 28H15.5L30 42h14z" />
                                    </svg>
                                    <div className="text-left flex-1">
                                        <p>Save in Google Drive</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Upload Latest Snap</span>
                                    </div>
                                </button>
                                
                                {/* Go to Local Data */}
                                <button
                                    onClick={() => {
                                        setLocalHistoryModalOpen(true);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                                >
                                    <Folder className="text-indigo-650 shrink-0" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Go to Local Data</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                            {screenshots.length} captures • view structured folders
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
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-850 shadow-sm'
                                            : 'bg-slate-50 hover:bg-slate-100 border-slate-150 text-slate-700'
                                    }`}
                                >
                                    <Database className="text-indigo-600 shrink-0" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Go to Cloud Data</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                            {cloudFiles.length} Cloud Snaps • {(cloudSpace.used / (1024 * 1024)).toFixed(1)} MB / 300 MB
                                        </span>
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
                                
                                {/* Sync with Cloud */}
                                <button
                                    onClick={handleSyncWithCloud}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                                >
                                    <RefreshCw className="text-indigo-600 shrink-0 animate-hover-spin" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Sync with Cloud</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                            {screenshots.filter(s => !s.synced).length} files not synced
                                        </span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Local vs Cloud Gallery */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                                    {galleryTab === 'local' ? 'Local Snaps' : galleryTab === 'cloud' ? 'Cloud Snaps' : 'Google Drive Snaps'}
                                </h3>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-655 font-black text-[9px] uppercase tracking-wider">
                                    {galleryTab === 'local' ? 'Offline' : galleryTab === 'cloud' ? 'Server' : 'Google Drive'}
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
                                            Your offline files are structured inside date folders and sequential names: <b>LMS / [Date] / Screenshot Tool</b>.
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
                                ) : cloudFiles.length === 0 ? (
                                    <p className="text-xs text-slate-450 italic text-center py-4">No cloud files found. Click "Sync with Cloud" to upload.</p>
                                ) : (
                                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                                        {cloudFiles.map(c => (
                                            <div key={c._id} className="flex gap-3 p-2 bg-slate-50 rounded-xl border border-slate-150 group hover:border-slate-350 transition-colors relative">
                                                <img
                                                    src={c.fileUrl}
                                                    alt="cloud-snap"
                                                    className="w-14 h-10 object-cover rounded-lg border border-slate-200"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-bold text-slate-700 truncate">{c.filename}</p>
                                                    <p className="text-[9px] text-slate-400 mt-0.5">{(c.size / 1024).toFixed(1)} KB • {c.metadata?.resolution || '1080p'}</p>
                                                </div>
                                                <div className="flex gap-1 items-center">
                                                    <a
                                                        href={c.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        download
                                                        className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800"
                                                        title="Download from Cloud"
                                                    >
                                                        <Download size={14} />
                                                    </a>
                                                    <button
                                                        onClick={() => handleDeleteCloudFile(c._id)}
                                                        className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-655"
                                                        title="Delete from Cloud"
                                                    >
                                                        <Trash size={14} />
                                                    </button>
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
                    fetchCloudFiles();
                }}
            />

            {/* Local Storage Virtual History Modal */}
            <LocalHistoryModal
                isOpen={localHistoryModalOpen}
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
        </DashboardLayout>
    );
};

export default ScreenshotToolPage;
