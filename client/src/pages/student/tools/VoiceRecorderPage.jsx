import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Clock, Settings, Cloud, Folder, RefreshCw, Database, Download, Trash, AlertTriangle, ArrowLeft, Play, Square, Pause } from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import toast from 'react-hot-toast';

const VoiceRecorderPage = () => {
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    
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
    const [error, setError] = useState(null);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    
    // Audio Context Visualizer refs
    const audioCtxRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);
    const streamSourceRef = useRef(null);

    // Load saved audios from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('practice_audios');
        if (saved) {
            try {
                setAudios(JSON.parse(saved));
            } catch (e) {
                console.error(e);
            }
        }
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
            ctx.fillStyle = '#0f172a'; // slate-900 matching styling
            ctx.fillRect(0, 0, canvas.width, canvas.height);

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

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const blobUrl = URL.createObjectURL(blob);
                
                const newAudio = {
                    id: 'aud_' + Date.now(),
                    timestamp: new Date().toLocaleString(),
                    url: blobUrl,
                    size: (blob.size / 1024).toFixed(1) + ' KB',
                    duration: formatTime(recordingTime),
                    format: format
                };

                setAudios(prev => {
                    const list = [newAudio, ...prev];
                    localStorage.setItem('practice_audios', JSON.stringify(list.map(a => ({ ...a, url: '' }))));
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

    const handleDelete = (id) => {
        const updated = audios.filter(a => a.id !== id);
        setAudios(updated);
        localStorage.setItem('practice_audios', JSON.stringify(updated.map(a => ({ ...a, url: '' }))));
        toast.success("Audio recording deleted.");
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
                        <Mic className="text-blue-600" />
                        Voice Recorder
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Record your speaking practice sessions with active audio waveform feed.</p>
                </div>

                {/* 3-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left Column: Source Panel */}
                    <div className="lg:col-span-3 space-y-6">
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
                                <div className="flex gap-2">
                                    <select
                                        disabled={!micEnabled}
                                        value={selectedAudio}
                                        onChange={(e) => setSelectedAudio(e.target.value)}
                                        className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-700 disabled:opacity-50"
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
                    </div>

                    {/* Center Column: Audio Waveform Visualizer & Action */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[460px]">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider flex items-center justify-between">
                                <span>Voice Visualizer</span>
                                {recording && (
                                    <span className="flex items-center gap-1 text-red-500 font-black text-xs animate-pulse">
                                        <span className="w-2.5 h-2.5 bg-red-600 rounded-full"></span>
                                        RECORDING {formatTime(recordingTime)}
                                    </span>
                                )}
                            </h3>

                            {/* Oscilloscope Canvas */}
                            <div className="flex-1 my-4 bg-slate-900 rounded-2xl relative flex items-center justify-center overflow-hidden border border-slate-800 min-h-[240px]">
                                {micEnabled && !error ? (
                                    <canvas
                                        ref={canvasRef}
                                        width={520}
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
                                            <p className="text-xs text-slate-500 mt-1 max-w-xs">Enable microphone input on the left panel to display real-time signal preview.</p>
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
                                onClick={toggleRecording}
                                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-200 mt-4 text-white shadow-lg ${
                                    recording 
                                        ? 'bg-red-650 hover:bg-red-700 shadow-red-600/10 hover:shadow-red-600/20' 
                                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/10 hover:shadow-blue-500/20'
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
                                    onClick={() => toast.success("Voice recording saved to cloud space!")}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                                >
                                    <Cloud className="text-blue-600" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Save Screenshot to Cloud</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Default: Local</span>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => toast.success("Showing local speech repository")}
                                    className="w-full flex items-center gap-3 p-3 bg-blue-50/40 hover:bg-blue-50 border border-blue-100 rounded-xl text-xs font-bold text-blue-850 transition-colors"
                                >
                                    <Folder className="text-blue-600" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Go to Local Data</p>
                                        <span className="text-[9px] text-blue-500 font-bold uppercase tracking-wider">{audios.length} Voice Logs</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => toast.success("No cloud credentials connected")}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                                >
                                    <Database className="text-blue-600" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Go to Cloud Data</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">0 files • 0 MB</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => toast.success("Cloud synchronization complete")}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                                >
                                    <RefreshCw className="text-blue-600" size={18} />
                                    <div className="text-left flex-1">
                                        <p>Sync with Cloud</p>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{audios.length} files not synced</span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Local Voice Clips Gallery */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider">Speech Clips</h3>
                            {audios.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-4">No speech clips recorded yet.</p>
                            ) : (
                                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                                    {audios.map(a => (
                                        <div key={a.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-2 hover:border-slate-350 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-bold text-slate-700 truncate">{a.timestamp}</p>
                                                    <p className="text-[9px] text-slate-400 mt-0.5">Length: {a.duration} • {a.size}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(a.id)}
                                                    className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-650"
                                                    title="Delete"
                                                >
                                                    <Trash size={14} />
                                                </button>
                                            </div>
                                            
                                            {a.url && (
                                                <div className="flex gap-2">
                                                    <audio src={a.url} controls className="w-full h-8 scale-95 opacity-90 rounded-md"></audio>
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

export default VoiceRecorderPage;
