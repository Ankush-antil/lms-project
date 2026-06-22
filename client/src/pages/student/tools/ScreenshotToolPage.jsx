import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Mic, Clock, Settings, Cloud, Folder, RefreshCw, Database, Download, Trash, AlertTriangle, ArrowLeft } from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import toast from 'react-hot-toast';

const ScreenshotToolPage = () => {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    
    // States
    const [videoDevices, setVideoDevices] = useState([]);
    const [audioDevices, setAudioDevices] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState('');
    const [selectedAudio, setSelectedAudio] = useState('');
    
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(false);
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

    // Enumerate media devices
    useEffect(() => {
        const getDevices = async () => {
            try {
                // Request permissions first to get device labels
                await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(s => {
                    s.getTracks().forEach(t => t.stop());
                }).catch(() => {});

                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = devices.filter(d => d.kind === 'videoinput');
                const audioInputs = devices.filter(d => d.kind === 'audioinput');
                
                setVideoDevices(videoInputs);
                setAudioDevices(audioInputs);
                
                if (videoInputs.length > 0) setSelectedVideo(videoInputs[0].deviceId);
                if (audioInputs.length > 0) setSelectedAudio(audioInputs[0].deviceId);
            } catch (err) {
                console.warn("Could not enumerate devices:", err);
                // Set mock devices in case of failure so UI is never empty
                setVideoDevices([{ deviceId: 'mock-vid', label: 'Front Camera (Default)' }]);
                setAudioDevices([{ deviceId: 'mock-aud', label: 'Internal Microphone' }]);
                setSelectedVideo('mock-vid');
                setSelectedAudio('mock-aud');
            }
        };

        getDevices();
    }, []);

    // Start/Stop media stream based on device selection and camera toggle
    useEffect(() => {
        if (!cameraEnabled) {
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
            } catch (err) {
                console.error("Error accessing camera:", err);
                setError("Camera permission denied or camera in use. Please check browser settings.");
                setCameraEnabled(false);
            }
        };

        startCamera();

        return () => {
            stopStream();
        };
    }, [selectedVideo, cameraEnabled, audioEnabled, selectedAudio]);

    const stopStream = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    // Screenshot Capture Function
    const handleCapture = () => {
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

            // Shutter sound effect (synthesized using Web Audio API)
            playShutterSound();

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            
            // Set canvas resolution based on settings
            const width = resolution === '1080p' ? 1920 : resolution === '720p' ? 1280 : 640;
            const height = resolution === '1080p' ? 1080 : resolution === '720p' ? 720 : 480;
            
            canvas.width = width;
            canvas.height = height;

            // Draw current video frame to canvas
            context.drawImage(video, 0, 0, width, height);
            
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
                resolution: resolution
            };

            const updated = [newScreenshot, ...screenshots];
            setScreenshots(updated);
            saveToLocalStorage(updated);
            toast.success("Screenshot captured locally!");
        } catch (err) {
            console.error("Screenshot capture failed:", err);
            toast.error("Failed to capture screenshot.");
        }
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
                    onClick={() => navigate('/student/practice-tools')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-bold text-sm"
                >
                    <ArrowLeft size={16} />
                    Back to Practice Tools
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
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Source</h3>
                            
                            {/* Camera Selector */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Camera</label>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${cameraEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                        {cameraEnabled ? 'ON' : 'OFF'}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <select
                                        disabled={!cameraEnabled}
                                        value={selectedVideo}
                                        onChange={(e) => setSelectedVideo(e.target.value)}
                                        className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 disabled:opacity-50"
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

                            {/* Audio Selector */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Audio Mic</label>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${audioEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                        {audioEnabled ? 'ON' : 'OFF'}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <select
                                        disabled={!audioEnabled}
                                        value={selectedAudio}
                                        onChange={(e) => setSelectedAudio(e.target.value)}
                                        className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 disabled:opacity-50"
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

                            {/* Auto-Stop / Capture (PRO Feature) */}
                            <div className="flex justify-between items-center p-3 bg-indigo-55 bg-opacity-30 border border-indigo-100 rounded-xl">
                                <div className="text-left">
                                    <span className="text-[11px] font-black text-indigo-800 uppercase tracking-wide">Auto-Capture</span>
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

                    {/* Center Column: Camera Preview */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[460px] relative overflow-hidden">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider text-left">Camera Preview</h3>
                            
                            {/* Flash Overlay */}
                            <div className={`absolute inset-0 bg-white transition-opacity z-20 pointer-events-none duration-150 ${flashActive ? 'opacity-100' : 'opacity-0'}`}></div>

                            {/* Video Capture Container */}
                            <div className="flex-1 my-4 bg-slate-900 rounded-2xl relative flex items-center justify-center overflow-hidden border border-slate-800 min-h-[280px]">
                                {cameraEnabled && !error ? (
                                    <>
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            className="w-full h-full object-cover transform scale-x-[-1]"
                                        ></video>
                                        {countdownActive && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                                                <div className="w-20 h-20 bg-indigo-600 text-white rounded-full flex items-center justify-center text-4xl font-black animate-ping">
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
                                            <p className="font-extrabold text-slate-400 text-sm uppercase tracking-wider">Camera is Disabled</p>
                                            <p className="text-xs text-slate-500 mt-1 max-w-xs">Enable camera toggle in the left pane to initialize device stream.</p>
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
                                            <option value="1080p">Resolution: 1080p</option>
                                            <option value="720p">Resolution: 720p</option>
                                            <option value="480p">Resolution: 480p</option>
                                        </select>
                                    </div>
                                    <div className="text-left space-y-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Format</span>
                                        <select
                                            value={format}
                                            onChange={(e) => setFormat(e.target.value)}
                                            className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 outline-none font-bold text-slate-700"
                                        >
                                            <option value="PNG">Format: PNG</option>
                                            <option value="JPG">Format: JPG</option>
                                        </select>
                                    </div>
                                    <div className="text-left space-y-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Quality</span>
                                        <select
                                            value={quality}
                                            onChange={(e) => setQuality(e.target.value)}
                                            className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 outline-none font-bold text-slate-700"
                                        >
                                            <option value="High">Quality: High</option>
                                            <option value="Medium">Quality: Medium</option>
                                            <option value="Low">Quality: Low</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Hidden canvas for screenshot extraction */}
                            <canvas ref={canvasRef} className="hidden"></canvas>

                            {/* Capture Button */}
                            <button
                                disabled={!cameraEnabled || countdownActive}
                                onClick={handleCapture}
                                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.99] transition-all duration-200 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></span>
                                {countdownActive ? 'Countdown Ticking...' : 'Take Screenshot'}
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Data & Logs */}
                    <div className="lg:col-span-3 space-y-6 text-left">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Data</h3>
                            
                            {/* Sync Actions */}
                            <div className="space-y-2">
                                <button
                                    onClick={handleSaveToCloud}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                                >
                                    <Cloud className="text-indigo-600" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Save Screenshot to Cloud</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Default: Local</span>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => toast.success("Showing Local Files Gallery")}
                                    className="w-full flex items-center gap-3 p-3 bg-indigo-50/40 hover:bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-850 transition-colors"
                                >
                                    <Folder className="text-indigo-600" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Go to Local Data</p>
                                        <span className="text-[9px] text-indigo-500 font-bold uppercase tracking-wider">{screenshots.length} Screenshots • {Math.round(screenshots.reduce((acc, s) => acc + parseFloat(s.size), 0) / 1024 * 10) / 10} MB</span>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => toast.success("Saved Cloud Sync Status")}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                                >
                                    <Database className="text-indigo-600" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Go to Cloud Data</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">0 Screenshots • 0 MB</span>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => toast.success("Local database synchronized with cloud portal!")}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                                >
                                    <RefreshCw className="text-indigo-600" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Sync with Cloud</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{screenshots.length} files not synced</span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Local Screenshot Gallery */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Local Snaps</h3>
                            {screenshots.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-4">No screenshots captured yet.</p>
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
                                                <p className="text-[9px] text-slate-400 mt-0.5">{s.resolution} • {s.size}</p>
                                            </div>
                                            <div className="flex gap-1 items-center">
                                                <a
                                                    href={s.url}
                                                    download={`capture_${Date.now()}.${s.format.toLowerCase()}`}
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
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
};

export default ScreenshotToolPage;
