import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MonitorPlay, Camera, Mic, Clock, Settings, Cloud, Folder, RefreshCw, Database, Download, Trash, AlertTriangle, ArrowLeft, Play, Square } from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import toast from 'react-hot-toast';

const VideoRecorderPage = () => {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    
    // States
    const [videoDevices, setVideoDevices] = useState([]);
    const [audioDevices, setAudioDevices] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState('');
    const [selectedAudio, setSelectedAudio] = useState('');
    
    const [cameraEnabled, setCameraEnabled] = useState(true);
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

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    // Load saved video recordings
    useEffect(() => {
        const saved = localStorage.getItem('practice_videos');
        if (saved) {
            try {
                setVideos(JSON.parse(saved));
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    // Get media devices
    useEffect(() => {
        const getDevices = async () => {
            try {
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
                setVideoDevices([{ deviceId: 'mock-vid', label: 'Front Camera (Default)' }]);
                setAudioDevices([{ deviceId: 'mock-aud', label: 'Internal Mic' }]);
                setSelectedVideo('mock-vid');
                setSelectedAudio('mock-aud');
            }
        };
        getDevices();
    }, []);

    // Manage WebRTC Camera Feed
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
                console.error("Error accessing video stream:", err);
                setError("Camera permission denied or camera is occupied.");
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
        if (recording) {
            handleStopRecording();
            toast.success("Video recording saved!");
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

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const blobUrl = URL.createObjectURL(blob);
                
                const newVideo = {
                    id: 'vid_' + Date.now(),
                    timestamp: new Date().toLocaleString(),
                    url: blobUrl,
                    size: (blob.size / (1024 * 1024)).toFixed(2) + ' MB',
                    duration: formatTime(recordingTime),
                    resolution: resolution
                };

                setVideos(prev => {
                    const list = [newVideo, ...prev];
                    localStorage.setItem('practice_videos', JSON.stringify(list.map(v => ({ ...v, url: '' }))));
                    return list;
                });
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
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleDelete = (id) => {
        const updated = videos.filter(v => v.id !== id);
        setVideos(updated);
        localStorage.setItem('practice_videos', JSON.stringify(updated.map(v => ({ ...v, url: '' }))));
        toast.success("Video deleted.");
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
                        <MonitorPlay className="text-purple-600" />
                        Video Recorder
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Capture practice web videos with custom resolutions and audio bitrates.</p>
                </div>

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

                            {/* Audio Toggle & Device */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Audio</label>
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
                                <span>Camera Preview</span>
                                {recording && (
                                    <span className="flex items-center gap-1 text-red-500 font-black text-xs animate-pulse">
                                        <span className="w-2.5 h-2.5 bg-red-600 rounded-full"></span>
                                        LIVE {formatTime(recordingTime)}
                                    </span>
                                )}
                            </h3>

                            {/* Camera Video Stream */}
                            <div className="flex-1 my-4 bg-slate-900 rounded-2xl relative flex items-center justify-center overflow-hidden border border-slate-800 min-h-[280px]">
                                {cameraEnabled && !error ? (
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
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-500 p-6 text-center space-y-3">
                                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                                            <Camera size={32} />
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-slate-400 text-sm uppercase tracking-wider">Camera is Off</p>
                                            <p className="text-xs text-slate-500 mt-1 max-w-xs">Enable camera in the left pane to begin capturing your video stream.</p>
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
                                disabled={!cameraEnabled || countdownActive}
                                onClick={toggleRecording}
                                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-200 mt-4 text-white shadow-lg ${
                                    recording 
                                        ? 'bg-red-650 hover:bg-red-700 shadow-red-600/10 hover:shadow-red-600/20' 
                                        : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10 hover:shadow-emerald-500/20'
                                } disabled:opacity-50`}
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

                    {/* Right Column: Data Actions & Recordings List */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Data Panel */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Data</h3>
                            
                            <div className="space-y-2">
                                <button
                                    onClick={() => toast.success("Screenshot/Video uploaded to cloud!")}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                                >
                                    <Cloud className="text-purple-600" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Save Screenshot to Cloud</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Default: Local</span>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => toast.success("Opening local videos directory")}
                                    className="w-full flex items-center gap-3 p-3 bg-purple-50/40 hover:bg-purple-50 border border-purple-100 rounded-xl text-xs font-bold text-purple-855 transition-colors"
                                >
                                    <Folder className="text-purple-600" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Go to Local Data</p>
                                        <span className="text-[9px] text-purple-650 font-bold uppercase tracking-wider">{videos.length} Videos</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => toast.success("Accessing cloud media stream data")}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                                >
                                    <Database className="text-purple-600" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Go to Cloud Data</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">0 files • 0 MB</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => toast.success("Videos synchronized successfully")}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                                >
                                    <RefreshCw className="text-purple-600" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Sync with Cloud</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{videos.length} files not synced</span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Local Video Clips List */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Video Clips</h3>
                            {videos.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-4">No video captures recorded yet.</p>
                            ) : (
                                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                                    {videos.map(v => (
                                        <div key={v.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-2 hover:border-slate-350 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div className="min-w-0 text-left">
                                                    <p className="text-[10px] font-bold text-slate-700 truncate">{v.timestamp}</p>
                                                    <p className="text-[9px] text-slate-400 mt-0.5">Length: {v.duration} • {v.size}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(v.id)}
                                                    className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-650"
                                                    title="Delete"
                                                >
                                                    <Trash size={14} />
                                                </button>
                                            </div>
                                            
                                            {v.url && (
                                                <div className="flex gap-2">
                                                    <a
                                                        href={v.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 flex items-center justify-center gap-1 py-1 px-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-lg text-[10px] font-bold transition-colors"
                                                    >
                                                        <Play size={10} fill="currentColor" /> Play
                                                    </a>
                                                    <a
                                                        href={v.url}
                                                        download={`video_${Date.now()}.webm`}
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

export default VideoRecorderPage;
