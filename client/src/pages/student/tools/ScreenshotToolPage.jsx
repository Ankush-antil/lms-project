import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Mic, Clock, Settings, Cloud, Folder, RefreshCw, Database, Download, Trash, AlertTriangle, ArrowLeft, Crop, Layers, FileText, Monitor } from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import toast from 'react-hot-toast';
import axios from 'axios';
import GoogleDriveModal from '../../../components/common/GoogleDriveModal';

const ScreenshotToolPage = () => {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const scrollReportRef = useRef(null);
    
    // States
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [countdown, setCountdown] = useState(0); // 0, 3, 5, 10
    const [countdownActive, setCountdownActive] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);
    
    const [resolution, setResolution] = useState('1080p');
    const [format, setFormat] = useState('PNG');
    const [quality, setQuality] = useState('High');
    
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);
    const [screenshots, setScreenshots] = useState([]);
    const [flashActive, setFlashActive] = useState(false);

    // Screenshot Type states
    const [sourceType, setSourceType] = useState('camera'); // 'camera', 'screen', 'long', 'area'
    const [scrollingActive, setScrollingActive] = useState(false);
    const [cropWidth, setCropWidth] = useState(60); // %
    const [cropHeight, setCropHeight] = useState(60); // %
    const [cropX, setCropX] = useState(20); // %
    const [cropY, setCropY] = useState(20); // %

    // Google Drive Modal State
    const [driveModalOpen, setDriveModalOpen] = useState(false);
    const [driveFileMeta, setDriveFileMeta] = useState({ name: '', blob: null });

    // Active Gallery View: 'local' | 'cloud'
    const [galleryTab, setGalleryTab] = useState('local');

    // Cloud files state
    const [cloudFiles, setCloudFiles] = useState([]);
    const [cloudSpace, setCloudSpace] = useState({ used: 0, limit: 300 * 1024 * 1024 });
    const [cloudLoading, setCloudLoading] = useState(false);

    // Fetch cloud files
    const fetchCloudFiles = async () => {
        try {
            setCloudLoading(true);
            const res = await axios.get('/api/practice-files');
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
                    saveToLocalStorage(screenshots);
                    fetchCloudFiles();
                    return;
                }
            }
        }

        saveToLocalStorage(screenshots);
        await fetchCloudFiles();
        
        if (successCount > 0) {
            toast.success(`Successfully synced ${successCount} files to cloud!`, { id: toastId });
        } else {
            toast.error("Failed to sync files to cloud.", { id: toastId });
        }
    };

    // Load existing screenshots from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('practice_screenshots');
        if (saved) {
            try {
                setScreenshots(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse saved screenshots", e);
            }
        }
    }, []);

    // Save screenshots to localStorage
    const saveToLocalStorage = (list) => {
        localStorage.setItem('practice_screenshots', JSON.stringify(list));
    };

    // Start/Stop media stream based on camera toggle
    useEffect(() => {
        if (sourceType === 'long') {
            stopStream();
            return;
        }

        if (!cameraEnabled) {
            stopStream();
            return;
        }

        const startStream = async () => {
            stopStream();
            setError(null);
            
            try {
                const constraints = { video: true };
                const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error("Error accessing stream:", err);
                setError("Camera permission denied or camera in use. Please check browser settings.");
                setCameraEnabled(false);
            }
        };

        startStream();

        return () => {
            stopStream();
        };
    }, [cameraEnabled, sourceType]);

    const stopStream = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    // Screenshot Capture Function
    const handleCapture = () => {
        if (sourceType === 'long') {
            triggerLongScreenshot();
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

    const captureFrame = () => {
        if (!cameraEnabled || !videoRef.current) {
            toast.error("Camera is turned off or not ready.");
            return;
        }

        try {
            // Screen flash effect
            setFlashActive(true);
            setTimeout(() => setFlashActive(false), 150);

            // Shutter sound effect
            playShutterSound();

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            
            // Set canvas resolution based on settings
            const width = resolution === '1080p' ? 1920 : resolution === '720p' ? 1280 : 640;
            const height = resolution === '1080p' ? 1080 : resolution === '720p' ? 720 : 480;
            
            canvas.width = width;
            canvas.height = height;

            if (sourceType === 'area') {
                const videoW = video.videoWidth || video.clientWidth || 640;
                const videoH = video.videoHeight || video.clientHeight || 480;

                const sx = (cropX / 100) * videoW;
                const sy = (cropY / 100) * videoH;
                const sWidth = (cropWidth / 100) * videoW;
                const sHeight = (cropHeight / 100) * videoH;

                context.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, width, height);
            } else {
                context.drawImage(video, 0, 0, width, height);
            }
            
            // Convert to data URI
            const mimeType = format === 'PNG' ? 'image/png' : 'image/jpeg';
            const dataUrl = canvas.toDataURL(mimeType);

            // Create new screenshot entry
            const newScreenshot = {
                id: 'snap_' + Date.now(),
                timestamp: new Date().toLocaleString(),
                url: dataUrl,
                size: Math.round((dataUrl.length * 3) / 4 / 1024) + ' KB',
                format: format,
                resolution: sourceType === 'area' ? `${width}x${height} (Area Crop)` : `${width}x${height} (Webcam)`
            };

            const updated = [newScreenshot, ...screenshots];
            setScreenshots(updated);
            saveToLocalStorage(updated);
            toast.success(`${sourceType === 'area' ? 'Cropped area' : 'Webcam'} screenshot captured locally!`);
        } catch (err) {
            console.error("Screenshot capture failed:", err);
            toast.error("Failed to capture screenshot.");
        }
    };

    // Long Scrolling Simulation & Capture
    const triggerLongScreenshot = () => {
        if (!scrollReportRef.current) return;
        setScrollingActive(true);
        playShutterSound();
        
        const container = scrollReportRef.current;
        container.scrollTop = 0;
        
        let currentScroll = 0;
        const maxScroll = container.scrollHeight - container.clientHeight;
        
        const scrollInterval = setInterval(() => {
            currentScroll += 15;
            if (currentScroll >= maxScroll) {
                container.scrollTop = maxScroll;
                clearInterval(scrollInterval);
                
                setTimeout(() => {
                    captureLongFrame();
                    setScrollingActive(false);
                    container.scrollTop = 0;
                }, 300);
            } else {
                container.scrollTop = currentScroll;
            }
        }, 30);
    };

    const captureLongFrame = () => {
        try {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            
            canvas.width = 800;
            canvas.height = 1300;

            drawReportToCanvas(context, 800, 1300);

            // Convert to data URI
            const mimeType = format === 'PNG' ? 'image/png' : 'image/jpeg';
            const dataUrl = canvas.toDataURL(mimeType);

            // Create new screenshot entry
            const newScreenshot = {
                id: 'snap_' + Date.now(),
                timestamp: new Date().toLocaleString(),
                url: dataUrl,
                size: Math.round((dataUrl.length * 3) / 4 / 1024) + ' KB',
                format: format,
                resolution: '800x1300 (Long Scroll)'
            };

            const updated = [newScreenshot, ...screenshots];
            setScreenshots(updated);
            saveToLocalStorage(updated);
            toast.success("Long scroll screenshot captured successfully!");
        } catch (err) {
            console.error("Long screenshot capture failed:", err);
            toast.error("Failed to capture long screenshot.");
        }
    };

    const drawReportToCanvas = (ctx, w, h) => {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#4F46E5'; 
        ctx.fillRect(0, 0, w, 160);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText('LMS STUDENT PROGRESS REPORT', 40, 70);

        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#E0E7FF';
        ctx.fillText('TERM: SPRING 2026  •  STUDENT ID: LMS-88390', 40, 110);
        ctx.fillText('VERIFIED ACADEMIC COPY', 40, 130);

        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(40, 200);
        ctx.lineTo(w - 40, 200);
        ctx.stroke();

        ctx.fillStyle = '#1E293B';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('Student Profile Details', 40, 240);

        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#64748B';
        ctx.fillText('Full Name:', 40, 280);
        ctx.fillStyle = '#334155';
        ctx.fillText('Ankush Antil', 160, 280);

        ctx.fillStyle = '#64748B';
        ctx.fillText('Email:', 40, 310);
        ctx.fillStyle = '#334155';
        ctx.fillText('student.lms@gmail.com', 160, 310);

        ctx.fillStyle = '#64748B';
        ctx.fillText('Department:', 40, 340);
        ctx.fillStyle = '#334155';
        ctx.fillText('Computer Science Division', 160, 340);

        ctx.fillStyle = '#1E293B';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('Academic Grades Summary', 40, 420);

        ctx.fillStyle = '#ECFDF5';
        ctx.strokeStyle = '#A7F3D0';
        ctx.lineWidth = 1;
        ctx.fillRect(40, 450, 220, 110);
        ctx.strokeRect(40, 450, 220, 110);
        ctx.fillStyle = '#065F46';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('Mathematics', 60, 490);
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('92% (A)', 60, 530);

        ctx.fillStyle = '#EEF2FF';
        ctx.strokeStyle = '#C7D2FE';
        ctx.fillRect(280, 450, 220, 110);
        ctx.strokeRect(280, 450, 220, 110);
        ctx.fillStyle = '#3730A3';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('Computer Sci', 300, 490);
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('95% (A+)', 300, 530);

        ctx.fillStyle = '#F5F3FF';
        ctx.strokeStyle = '#DDD6FE';
        ctx.fillRect(520, 450, 220, 110);
        ctx.strokeRect(520, 450, 220, 110);
        ctx.fillStyle = '#5B21B6';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('Physics', 540, 490);
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('89% (B+)', 540, 530);

        ctx.fillStyle = '#1E293B';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('Practice Tool Activity Logs', 40, 620);

        const drawActivityItem = (text, count, y) => {
            ctx.fillStyle = '#F8FAFC';
            ctx.fillRect(40, y, w - 80, 50);
            ctx.strokeStyle = '#E2E8F0';
            ctx.strokeRect(40, y, w - 80, 50);
            
            ctx.fillStyle = '#334155';
            ctx.font = '16px sans-serif';
            ctx.fillText(text, 60, y + 31);
            
            ctx.fillStyle = '#4F46E5';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText(count, w - 180, y + 31);
        };

        drawActivityItem('Webcam Screenshot Logs', '12 Submissions', 650);
        drawActivityItem('Screen Audio Recordings', '8 Sessions', 710);
        drawActivityItem('Teacher Call Logs Synced', '4 Synchronized', 770);

        ctx.fillStyle = '#1E293B';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('Earned Certifications', 40, 880);

        ctx.fillStyle = '#FFFBEB';
        ctx.strokeStyle = '#FDE68A';
        ctx.fillRect(40, 910, 340, 120);
        ctx.strokeRect(40, 910, 340, 120);
        ctx.fillStyle = '#92400E';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('🥇 Top Performer Badge', 60, 960);
        ctx.font = '14px sans-serif';
        ctx.fillText('Awarded for exceptional scores.', 60, 990);

        ctx.fillStyle = '#EFF6FF';
        ctx.strokeStyle = '#BFDBFE';
        ctx.fillRect(400, 910, 360, 120);
        ctx.strokeRect(400, 910, 360, 120);
        ctx.fillStyle = '#1E40AF';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('⚡ Quick Learner Badge', 420, 960);
        ctx.font = '14px sans-serif';
        ctx.fillText('Awarded for rapid practice tool use.', 420, 990);

        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 4;
        ctx.strokeRect(w - 240, 1100, 180, 80);
        ctx.fillStyle = '#10B981';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('LMS PORTAL', w - 210, 1135);
        ctx.fillText('VERIFIED', w - 195, 1160);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '14px sans-serif';
        ctx.fillText('End of Academic Report — Generated on Spring 2026 LMS Practice Portal', 40, 1240);
    };

    const playShutterSound = () => {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                const ctx = new AudioContextClass();
                const noise = ctx.createOscillator();
                const gain = ctx.createGain();
                
                noise.type = 'triangle';
                noise.frequency.setValueAtTime(800, ctx.currentTime);
                noise.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
                
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
                
                noise.connect(gain);
                gain.connect(ctx.destination);
                
                noise.start();
                noise.stop(ctx.currentTime + 0.15);
            }
        } catch (e) {
            console.warn("Audio Context not allowed or failed", e);
        }
    };

    const handleDelete = (id) => {
        const updated = screenshots.filter(s => s.id !== id);
        setScreenshots(updated);
        saveToLocalStorage(updated);
        toast.success("Screenshot deleted.");
    };

    const handleSaveToCloud = () => {
        if (screenshots.length === 0) {
            toast.error("No screenshots to save.");
            return;
        }
        toast.success("Saved screenshots to Cloud (Simulated)");
    };

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
                            <Camera className="text-indigo-600" />
                            Screenshot Tool
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Capture high-quality screenshots using your web camera.</p>
                    </div>
                </div>

                {/* Main 3-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Left Column: Source Settings */}
                    <div className="lg:col-span-3 space-y-6 text-left">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Source</h3>
                            
                            {/* Capture Type */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Capture Type</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'camera', label: 'Simple Screenshot', icon: <Camera size={14} /> },
                                        { id: 'area', label: 'Crop Screenshot', icon: <Crop size={14} /> },
                                        { id: 'long', label: 'Long Screenshot', icon: <Layers size={14} /> }
                                    ].map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setSourceType(t.id)}
                                            className={`py-3 px-3.5 rounded-2xl border text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-3.5 ${
                                                sourceType === t.id
                                                    ? 'bg-indigo-50 border-indigo-250 text-indigo-755 shadow-sm'
                                                    : 'bg-slate-50 border-slate-200 text-slate-550 hover:bg-slate-100'
                                            }`}
                                        >
                                            {t.icon}
                                            <span>{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Crop Settings (Only for Crop Screenshot) */}
                            {sourceType === 'area' && (
                                <div className="space-y-3 p-3 bg-indigo-50/30 border border-indigo-100 rounded-2xl text-left animate-fade-in">
                                    <span className="text-[10px] font-black text-indigo-850 uppercase tracking-wider flex items-center gap-1"><Crop size={12} /> Crop Dimensions</span>
                                    <div className="space-y-3 text-xs">
                                        <div>
                                            <div className="flex justify-between font-bold text-slate-605 mb-1">
                                                <span>Width</span>
                                                <span>{cropWidth}%</span>
                                            </div>
                                            <input type="range" min="20" max="100" value={cropWidth} onChange={(e) => setCropWidth(parseInt(e.target.value))} className="w-full h-1 bg-slate-250 rounded-lg appearance-none cursor-pointer accent-indigo-650" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between font-bold text-slate-605 mb-1">
                                                <span>Height</span>
                                                <span>{cropHeight}%</span>
                                            </div>
                                            <input type="range" min="20" max="100" value={cropHeight} onChange={(e) => setCropHeight(parseInt(e.target.value))} className="w-full h-1 bg-slate-250 rounded-lg appearance-none cursor-pointer accent-indigo-650" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between font-bold text-slate-605 mb-1">
                                                <span>Position X</span>
                                                <span>{cropX}%</span>
                                            </div>
                                            <input type="range" min="0" max={100 - cropWidth} value={cropX} onChange={(e) => setCropX(parseInt(e.target.value))} className="w-full h-1 bg-slate-255 rounded-lg appearance-none cursor-pointer accent-indigo-655" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between font-bold text-slate-650 mb-1">
                                                <span>Position Y</span>
                                                <span>{cropY}%</span>
                                            </div>
                                            <input type="range" min="0" max={100 - cropHeight} value={cropY} onChange={(e) => setCropY(parseInt(e.target.value))} className="w-full h-1 bg-slate-255 rounded-lg appearance-none cursor-pointer accent-indigo-655" />
                                        </div>
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
                                    <span className="text-[11px] font-black text-indigo-805 uppercase tracking-wide">Auto-Capture</span>
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
                                        <span className="text-slate-500">Mirror Camera Preview</span>
                                        <input type="checkbox" defaultChecked className="rounded text-indigo-600 focus:ring-indigo-500" />
                                    </div>
                                </div>
                            </details>
                        </div>
                    </div>

                    {/* Center Column: Camera / Screen / Report Preview */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[460px] relative overflow-hidden">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider text-left">
                                {sourceType === 'long' ? 'Report Scroll Preview' : (sourceType === 'screen' ? 'Screen Stream Preview' : 'Camera Stream Preview')}
                            </h3>
                            
                            {/* Flash Overlay */}
                            <div className={`absolute inset-0 bg-white transition-opacity z-20 pointer-events-none duration-150 ${flashActive ? 'opacity-100' : 'opacity-0'}`}></div>

                            {/* Video / Long report Capture Container */}
                            <div className="flex-1 my-4 bg-slate-900 rounded-2xl relative flex items-center justify-center overflow-hidden border border-slate-800 min-h-[280px]">
                                
                                {sourceType === 'long' ? (
                                    <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-start overflow-hidden relative min-h-[280px]">
                                        {/* Mock Document Viewport */}
                                        <div 
                                            ref={scrollReportRef}
                                            className="w-full h-[280px] overflow-y-auto bg-white p-6 shadow-inner space-y-6 text-left relative transition-all duration-300"
                                        >
                                            {/* Header */}
                                            <div className="border-b-2 border-slate-200 pb-3">
                                                <h4 className="text-sm font-black text-slate-800 tracking-wide">STUDENT ACADEMIC PERFORMANCE REPORT</h4>
                                                <div className="flex justify-between text-[8px] text-slate-450 font-bold mt-1">
                                                    <span>NAME: ANKUSH ANTIL</span>
                                                    <span>TERM: SPRING 2026</span>
                                                </div>
                                            </div>
                                            
                                            {/* Grades Section */}
                                            <div className="space-y-2">
                                                <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Academic Grades Summary</h5>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="p-2 bg-emerald-50 border border-emerald-150 rounded-xl text-center">
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase block">Mathematics</span>
                                                        <span className="text-sm font-black text-emerald-700">92%</span>
                                                    </div>
                                                    <div className="p-2 bg-indigo-50 border border-indigo-150 rounded-xl text-center">
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase block">Computer Sci</span>
                                                        <span className="text-sm font-black text-indigo-700">95%</span>
                                                    </div>
                                                    <div className="p-2 bg-purple-50 border border-purple-150 rounded-xl text-center">
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase block">Physics</span>
                                                        <span className="text-sm font-black text-purple-700">89%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Performance Analytics */}
                                            <div className="space-y-2">
                                                <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Practice Tool Activity</h5>
                                                <div className="space-y-1.5 text-[9px] text-slate-655 font-bold">
                                                    <div className="flex justify-between items-center bg-slate-50 p-2 border border-slate-100 rounded-lg">
                                                        <span>Webcam Screenshot Logs</span>
                                                        <span className="text-indigo-650">12 Snaps</span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-slate-50 p-2 border border-slate-100 rounded-lg">
                                                        <span>Screen Audio Recordings</span>
                                                        <span className="text-indigo-655">8 Clips</span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-slate-50 p-2 border border-slate-100 rounded-lg">
                                                        <span>Teacher Call Logs Synced</span>
                                                        <span className="text-indigo-650">4 Synced</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Certifications & Badges */}
                                            <div className="space-y-2">
                                                <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Earned Certifications</h5>
                                                <div className="flex gap-2">
                                                    <div className="flex-1 bg-amber-50 border border-amber-150 p-2 rounded-xl text-center flex flex-col items-center">
                                                        <span className="text-lg">🥇</span>
                                                        <span className="text-[8px] font-black text-amber-800 uppercase mt-0.5">Top Performer</span>
                                                    </div>
                                                    <div className="flex-1 bg-blue-50 border border-blue-150 p-2 rounded-xl text-center flex flex-col items-center">
                                                        <span className="text-lg">⚡</span>
                                                        <span className="text-[8px] font-black text-blue-800 uppercase mt-0.5">Quick Learner</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Footer */}
                                            <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-[8px] text-slate-400 font-black">
                                                <span>LMS SECURE CERTIFICATE</span>
                                                <span className="text-emerald-600">VERIFIED COPY</span>
                                            </div>
                                        </div>

                                        {/* Scrolling Scanner Line */}
                                        {scrollingActive && (
                                            <div className="absolute inset-x-0 h-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] z-10 animate-pulse" style={{ top: '30%', animationDuration: '0.8s' }}></div>
                                        )}
                                    </div>
                                ) : (cameraEnabled || sourceType === 'screen') && !error ? (
                                    <>
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            className={`w-full h-full object-cover ${sourceType !== 'screen' ? 'transform scale-x-[-1]' : ''}`}
                                        ></video>
                                        
                                        {/* Area Crop Zone Shading Overlay */}
                                        {sourceType === 'area' && (
                                            <div 
                                                className="absolute border-2 border-dashed border-yellow-400 bg-yellow-400/10 pointer-events-none z-10 flex items-center justify-center shadow-lg"
                                                style={{
                                                    left: `${cropX}%`,
                                                    top: `${cropY}%`,
                                                    width: `${cropWidth}%`,
                                                    height: `${cropHeight}%`,
                                                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
                                                }}
                                            >
                                                <span className="bg-yellow-400 text-slate-900 text-[8px] font-black uppercase px-1 rounded absolute top-1 left-1">CROP ZONE</span>
                                            </div>
                                        )}

                                        {countdownActive && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                                                <div className="w-20 h-20 bg-indigo-655 text-white rounded-full flex items-center justify-center text-4xl font-black animate-ping">
                                                    {secondsLeft}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-500 p-6 text-center space-y-3">
                                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                                            <Camera size={32} />
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-slate-400 text-sm uppercase tracking-wider">Device Stream is Stopped</p>
                                            <p className="text-xs text-slate-500 mt-1 max-w-xs">Enable camera or screen toggle in the left pane to initialize device stream.</p>
                                        </div>
                                        {error && (
                                            <div className="flex items-center gap-1.5 text-xs text-red-500 bg-red-950/20 border border-red-900/30 px-3 py-1.5 rounded-xl font-medium mt-2">
                                                <AlertTriangle size={14} />
                                                <span>{error}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Video Settings Row */}
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

                            {/* Hidden canvas for screenshot extraction */}
                            <canvas ref={canvasRef} className="hidden"></canvas>

                            {/* Capture Button */}
                            <button
                                disabled={(sourceType !== 'long' && !cameraEnabled && sourceType !== 'screen') || countdownActive}
                                onClick={handleCapture}
                                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.99] transition-all duration-200 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span>
                                {countdownActive ? 'Countdown Ticking...' : (sourceType === 'long' ? 'Take Long Screenshot' : 'Take Screenshot')}
                            </button>
                        </div>
                    </div>                    {/* Right Column: Data & Logs */}
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
                                        setGalleryTab('local');
                                        toast.success("Switched to Local Storage Gallery");
                                    }}
                                    className={`w-full flex items-center gap-3 p-3 border rounded-xl text-xs font-bold transition-all ${
                                        galleryTab === 'local'
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-850 shadow-sm'
                                            : 'bg-slate-50 hover:bg-slate-100 border-slate-150 text-slate-700'
                                    }`}
                                >
                                    <Folder className="text-indigo-600 shrink-0" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Go to Local Data</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                            {screenshots.length} Screenshots • {Math.round(screenshots.reduce((acc, s) => acc + (parseFloat(s.size) || 0), 0) / 1024 * 10) / 10} MB
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
                                    {galleryTab === 'local' ? 'Local Snaps' : 'Cloud Snaps'}
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
                                screenshots.length === 0 ? (
                                    <p className="text-xs text-slate-450 italic text-center py-4">No local screenshots captured yet.</p>
                                ) : (
                                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                                        {screenshots.map(s => (
                                            <div key={s.id} className="flex gap-3 p-2 bg-slate-50 rounded-xl border border-slate-150 group hover:border-slate-350 transition-colors relative">
                                                <img
                                                    src={s.url}
                                                    alt="snap"
                                                    className="w-14 h-10 object-cover rounded-lg border border-slate-200"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-bold text-slate-700 truncate">{s.timestamp}</p>
                                                    <p className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                                                        <span>{s.resolution} • {s.size}</span>
                                                        {s.synced && <span className="text-emerald-500 font-extrabold text-[8px] uppercase tracking-wide">✓ Synced</span>}
                                                    </p>
                                                </div>
                                                <div className="flex gap-1 items-center">
                                                    <a
                                                        href={s.url}
                                                        download={`capture_${s.id}.${s.format.toLowerCase()}`}
                                                        className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800"
                                                        title="Download"
                                                    >
                                                        <Download size={14} />
                                                    </a>
                                                    <button
                                                        onClick={() => handleDelete(s.id)}
                                                        className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-650"
                                                        title="Delete"
                                                    >
                                                        <Trash size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
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
                                                        className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-650"
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
                }}
            />
        </DashboardLayout>
    );
};

export default ScreenshotToolPage;
