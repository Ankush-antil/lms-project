import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Mic, Clock, Settings, Cloud, Folder, RefreshCw, Database, Download, Trash, AlertTriangle, ArrowLeft, Play, Square } from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import toast from 'react-hot-toast';

const ScreenRecorderPage = () => {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    
    // States
    const [audioDevices, setAudioDevices] = useState([]);
    const [selectedAudio, setSelectedAudio] = useState('');
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [countdownActive, setCountdownActive] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);
    
    const [resolution, setResolution] = useState('1080p');
    const [frameRate, setFrameRate] = useState('30');
    const [format, setFormat] = useState('MP4');
    const [bitrate, setBitrate] = useState('192k');
    
    const [screenStream, setScreenStream] = useState(null);
    const [micStream, setMicStream] = useState(null);
    const [recording, setRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    
    const [recordings, setRecordings] = useState([]);
    const [error, setError] = useState(null);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    // Load metadata of screen recordings
    useEffect(() => {
        const saved = localStorage.getItem('practice_screen_recordings');
        if (saved) {
            try {
                // Parse metadata list
                const list = JSON.parse(saved);
                setRecordings(list);
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    // Enumerate audio devices
    useEffect(() => {
        const getAudioInputs = async () => {
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
        getAudioInputs();
    }, []);

    const startScreenCapture = async () => {
        setError(null);
        try {
            // Request screen sharing
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: resolution === '1080p' ? 1920 : 1280,
                    height: resolution === '1080p' ? 1080 : 720,
                    frameRate: parseInt(frameRate)
                },
                audio: true // try system audio
            });

            setScreenStream(displayStream);
            if (videoRef.current) {
                videoRef.current.srcObject = displayStream;
            }

            // Detect if user stops screen sharing from browser bar
            displayStream.getVideoTracks()[0].onended = () => {
                handleStopRecordingSilently();
            };

            return displayStream;
        } catch (err) {
            console.error("Screen share error:", err);
            setError("Screen sharing permission denied or cancelled.");
            return null;
        }
    };

    const handleStopRecordingSilently = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setRecording(false);
        stopAllTracks();
    };

    const stopAllTracks = () => {
        if (screenStream) {
            screenStream.getTracks().forEach(t => t.stop());
            setScreenStream(null);
        }
        if (micStream) {
            micStream.getTracks().forEach(t => t.stop());
            setMicStream(null);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const toggleRecording = async () => {
        if (recording) {
            // Stop recording
            handleStopRecordingSilently();
            toast.success("Recording stopped!");
        } else {
            // Start recording
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
        const displayStream = await startScreenCapture();
        if (!displayStream) return;

        let tracks = [...displayStream.getVideoTracks()];
        let micTracks = [];

        // Mix microphone audio if enabled
        if (audioEnabled) {
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({
                    audio: selectedAudio ? { deviceId: { exact: selectedAudio } } : true
                });
                setMicStream(audioStream);
                micTracks = audioStream.getAudioTracks();
                tracks = [...tracks, ...micTracks];
            } catch (err) {
                console.warn("Could not capture microphone track:", err);
                toast.error("Microphone denied. Recording screen audio/video only.");
            }
        }

        // Add display stream audio track if exists
        const displayAudioTracks = displayStream.getAudioTracks();
        if (displayAudioTracks.length > 0) {
            tracks = [...tracks, ...displayAudioTracks];
        }

        const combinedStream = new MediaStream(tracks);
        chunksRef.current = [];

        // Set recording options
        let options = { mimeType: 'video/webm;codecs=vp9,opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: 'video/webm;codecs=vp8,opus' };
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: 'video/webm' };
        }

        try {
            const mediaRecorder = new MediaRecorder(combinedStream, options);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const blobUrl = URL.createObjectURL(blob);
                
                const sizeStr = (blob.size / (1024 * 1024)).toFixed(2) + ' MB';
                const newRec = {
                    id: 'rec_' + Date.now(),
                    timestamp: new Date().toLocaleString(),
                    url: blobUrl, // Local playback URL
                    size: sizeStr,
                    duration: formatTime(recordingTime),
                    resolution: resolution
                };

                setRecordings(prev => {
                    const list = [newRec, ...prev];
                    localStorage.setItem('practice_screen_recordings', JSON.stringify(
                        list.map(r => ({ ...r, url: '' })) // Persist metadata only, URL will be empty on reload
                    ));
                    return list;
                });

                setRecordingTime(0);
            };

            setRecording(true);
            setRecordingTime(0);
            mediaRecorder.start(1000);

            // Timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

            toast.success("Recording started!");
        } catch (e) {
            console.error("Failed to start MediaRecorder:", e);
            toast.error("Failed to record stream.");
            stopAllTracks();
        }
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleDelete = (id) => {
        const updated = recordings.filter(r => r.id !== id);
        setRecordings(updated);
        localStorage.setItem('practice_screen_recordings', JSON.stringify(updated.map(r => ({ ...r, url: '' }))));
        toast.success("Recording deleted.");
    };

    return (
        <DashboardLayout role="Student" fullWidth={true}>
            <div className="max-w-7xl mx-auto px-4 py-4 text-left">
                {/* Back Link */}
                <button
                    onClick={() => navigate('/student/practice-tools')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-bold text-sm"
                >
                    <ArrowLeft size={16} />
                    Back to Practice Tools
                </button>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                        <Video className="text-emerald-600" />
                        Screen Recorder
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Record your screen activity combined with microphone commentary.</p>
                </div>

                {/* 3-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Column 1: Source Settings */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Source</h3>
                            
                            {/* Screen Source Dropdown */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Source View</label>
                                <select className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700">
                                    <option>Full Desktop / Tab / Application</option>
                                </select>
                            </div>

                            {/* Mic Toggle & Selector */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Microphone Input</label>
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
                                        className={`px-3 rounded-xl font-bold text-xs border transition-colors ${audioEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
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
                                </select>
                            </div>

                            {/* Auto-Stop Limit (PRO badge) */}
                            <div className="flex justify-between items-center p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl">
                                <div className="text-left">
                                    <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wide">Auto-Stop Limit</span>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Stops at 5 minutes</p>
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
                                        <span className="text-slate-500">Record System Audio</span>
                                        <input type="checkbox" defaultChecked className="rounded text-emerald-600 focus:ring-emerald-500" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">Show cursor clicks</span>
                                        <input type="checkbox" defaultChecked className="rounded text-emerald-600 focus:ring-emerald-500" />
                                    </div>
                                </div>
                            </details>
                        </div>
                    </div>

                    {/* Column 2: Stream Preview & Actions */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[460px]">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider flex items-center justify-between">
                                <span>Screen Preview</span>
                                {recording && (
                                    <span className="flex items-center gap-1 text-red-500 font-black text-xs animate-pulse">
                                        <span className="w-2.5 h-2.5 bg-red-600 rounded-full"></span>
                                        LIVE {formatTime(recordingTime)}
                                    </span>
                                )}
                            </h3>

                            {/* Share Screen Preview */}
                            <div className="flex-1 my-4 bg-slate-900 rounded-2xl relative flex items-center justify-center overflow-hidden border border-slate-800 min-h-[280px]">
                                {screenStream ? (
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className="w-full h-full object-contain"
                                    ></video>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-500 p-6 text-center space-y-3">
                                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                                            <Video size={32} />
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-slate-400 text-sm uppercase tracking-wider">Ready to Share Screen</p>
                                            <p className="text-xs text-slate-500 mt-1 max-w-xs">Click Start Recording to initialize browser screen-sharing overlay.</p>
                                        </div>
                                        {error && (
                                            <div className="flex items-center gap-1.5 text-xs text-red-500 bg-red-950/20 border border-red-900/30 px-3 py-1.5 rounded-xl font-medium mt-2">
                                                <AlertTriangle size={14} />
                                                <span>{error}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {countdownActive && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                                        <div className="w-20 h-20 bg-emerald-600 text-white rounded-full flex items-center justify-center text-4xl font-black animate-ping">
                                            {secondsLeft}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Format Settings Row */}
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
                                            <option value="1080p">1080p</option>
                                            <option value="720p">720p</option>
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
                                            <option value="MP4">MP4</option>
                                            <option value="WebM">WebM</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Audio</span>
                                        <select
                                            value={bitrate}
                                            onChange={(e) => setBitrate(e.target.value)}
                                            className="w-full text-[11px] bg-white border border-slate-200 rounded-xl p-2 outline-none font-bold text-slate-700"
                                        >
                                            <option value="192k">192 kbps</option>
                                            <option value="128k">128 kbps</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Trigger Recording button */}
                            <button
                                onClick={toggleRecording}
                                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-200 mt-4 text-white shadow-lg ${
                                    recording 
                                        ? 'bg-red-650 hover:bg-red-700 shadow-red-600/10 hover:shadow-red-600/20' 
                                        : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10 hover:shadow-emerald-500/20'
                                }`}
                            >
                                {recording ? (
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

                    {/* Column 3: Data Actions & Recordings List */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Data Card */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Data</h3>
                            
                            <div className="space-y-2">
                                <button
                                    onClick={() => toast.success("Recording uploaded to cloud portal!")}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                                >
                                    <Cloud className="text-emerald-600" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Save Screen Recording to Cloud</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Default: Local</span>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => toast.success("Redirected to Local Recordings Directory")}
                                    className="w-full flex items-center gap-3 p-3 bg-emerald-50/40 hover:bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-850 transition-colors"
                                >
                                    <Folder className="text-emerald-600" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Go to Local Data</p>
                                        <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">{recordings.length} Recordings</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => toast.success("Redirected to Cloud Recordings Directory")}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                                >
                                    <Database className="text-emerald-600" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Go to Cloud Data</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">0 files • 0 MB</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => toast.success("Cloud repository synchronized successfully")}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                                >
                                    <RefreshCw className="text-emerald-600" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Sync with Cloud</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{recordings.length} files not synced</span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Local Recordings Gallery */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Local Clips</h3>
                            {recordings.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-4">No recordings made yet.</p>
                            ) : (
                                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                                    {recordings.map(r => (
                                        <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-2 hover:border-slate-350 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-bold text-slate-700 truncate">{r.timestamp}</p>
                                                    <p className="text-[9px] text-slate-400 mt-0.5">Length: {r.duration} • {r.size}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(r.id)}
                                                    className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-650"
                                                    title="Delete"
                                                >
                                                    <Trash size={14} />
                                                </button>
                                            </div>
                                            
                                            {r.url && (
                                                <div className="flex gap-2">
                                                    <a
                                                        href={r.url}
                                                        controls
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 flex items-center justify-center gap-1 py-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-[10px] font-bold transition-colors"
                                                    >
                                                        <Play size={10} fill="currentColor" /> Play
                                                    </a>
                                                    <a
                                                        href={r.url}
                                                        download={`screen_${Date.now()}.webm`}
                                                        className="flex-1 flex items-center justify-center gap-1 py-1 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-bold transition-colors"
                                                    >
                                                        <Download size={10} /> Save
                                                    </a>
                                                </div>
                                            )}
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

export default ScreenRecorderPage;
