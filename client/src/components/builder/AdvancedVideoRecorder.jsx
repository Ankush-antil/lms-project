import React, { useState, useEffect, useRef } from 'react';
import {
    Video, Mic, Monitor, Upload, Settings, RefreshCw, Play, Pause, Square, Trash2, Edit3,
    Volume2, Sliders, Scissors, Crop, Image as ImageIcon, MessageSquare, AlertTriangle, Check, CheckCircle2, ChevronRight, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdvancedVideoRecorder = ({ question, onSubmitAnswer, submittedAnswer, onReattempt }) => {
    // 1. Get configurations with fallback defaults
    const config = question.videoSettings || {
        allowWebcam: true,
        allowScreen: true,
        allowScreenWebcam: true,
        allowAudioOnly: true,
        allowUpload: true,
        minDuration: 30,
        maxDuration: 600,
        maxFileSize: 100,
        allowedFileTypes: 'mp4,webm,mov',
        recordingAttemptsLimit: 3,
        webcamRequired: false,
        microphoneRequired: false,
        fullScreenRequired: false,
        tabSwitchingDetection: false,
        multipleFaceDetection: false,
        faceMissingDetection: false,
        backgroundNoiseDetection: false,
        aiTranscriptEnabled: false,
        timestampFeedbackEnabled: false
    };

    // 2. States
    const [devices, setDevices] = useState({ video: [], audio: [] });
    const [selectedDevices, setSelectedDevices] = useState({ video: '', audio: '' });
    const [activeMode, setActiveMode] = useState(''); // 'webcam', 'screen', 'screenWebcam', 'audio', 'upload'
    const [recordingState, setRecordingState] = useState('idle'); // 'idle', 'countdown', 'recording', 'paused', 'stopped'
    const [countdownTime, setCountdownTime] = useState(3); // 3, 5, 10
    const [currentCountdown, setCurrentCountdown] = useState(0);
    const [timer, setTimer] = useState(0);
    const [recordedUrl, setRecordedUrl] = useState('');
    const [recordedBlob, setRecordedBlob] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [attemptsCount, setAttemptsCount] = useState(0);

    // Audio/Video streams & recorders
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const chunksRef = useRef([]);
    const previewVideoRef = useRef(null);
    const timerIntervalRef = useRef(null);

    // Drawing Canvas Annotations states
    const [activeTool, setActiveTool] = useState('none'); // 'none', 'pen', 'highlighter', 'arrow', 'rect', 'circle', 'text', 'spotlight'
    const [drawColor, setDrawColor] = useState('#E63946');
    const [drawThickness, setDrawThickness] = useState(4);
    const [drawingColorPickerOpen, setDrawingColorPickerOpen] = useState(false);
    const overlayCanvasRef = useRef(null);
    const isDrawingRef = useRef(false);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const mousePosRef = useRef({ x: 0, y: 0 });
    const shapesRef = useRef([]); // holds drawn shape paths to persistent redraw
    const spotlightRadius = 80;

    // Trimming / Caption editing states
    const [trimStart, setTrimStart] = useState(0);
    const [trimEnd, setTrimEnd] = useState(100);
    const [videoDuration, setVideoDuration] = useState(0);
    const [captions, setCaptions] = useState([]); // Array of { time: number, text: string }
    const [newCaptionText, setNewCaptionText] = useState('');
    const [newCaptionTime, setNewCaptionTime] = useState(0);
    const [thumbnailBase64, setThumbnailBase64] = useState('');
    const [editorTab, setEditorTab] = useState('trim'); // 'trim', 'thumbnail', 'captions'
    const [showEditor, setShowEditor] = useState(false);

    // Proctoring Metrics states
    const [violations, setViolations] = useState([]);
    const [fullScreenViolationCount, setFullScreenViolationCount] = useState(0);
    const [tabSwitchViolationCount, setTabSwitchViolationCount] = useState(0);

    // Fetch media devices
    useEffect(() => {
        const getDevices = async () => {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() => {});
                const allDevices = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = allDevices.filter(d => d.kind === 'videoinput');
                const audioInputs = allDevices.filter(d => d.kind === 'audioinput');
                setDevices({ video: videoInputs, audio: audioInputs });
                if (videoInputs.length) setSelectedDevices(prev => ({ ...prev, video: videoInputs[0].deviceId }));
                if (audioInputs.length) setSelectedDevices(prev => ({ ...prev, audio: audioInputs[0].deviceId }));
            } catch (err) {
                console.error("Error fetching devices", err);
            }
        };
        getDevices();

        // Auto select first allowed mode
        if (config.allowWebcam) setActiveMode('webcam');
        else if (config.allowScreenWebcam) setActiveMode('screenWebcam');
        else if (config.allowScreen) setActiveMode('screen');
        else if (config.allowAudioOnly) setActiveMode('audio');
        else if (config.allowUpload) setActiveMode('upload');
    }, [question]);

    // Proctoring: Tab switching & Full screen checkers
    useEffect(() => {
        if (recordingState !== 'recording') return;

        const handleVisibilityChange = () => {
            if (document.hidden && config.tabSwitchingDetection) {
                const now = new Date().toLocaleTimeString();
                const msg = `Tab switch detected at ${now}`;
                setViolations(prev => [...prev, msg]);
                setTabSwitchViolationCount(prev => prev + 1);
                toast.error("⚠️ Proctoring Violation: Please do not switch browser tabs/windows during this exam!");
            }
        };

        const handleFullScreenChange = () => {
            if (!document.fullscreenElement && config.fullScreenRequired) {
                const now = new Date().toLocaleTimeString();
                const msg = `Exited Full Screen at ${now}`;
                setViolations(prev => [...prev, msg]);
                setFullScreenViolationCount(prev => prev + 1);
                toast.error("⚠️ Proctoring Violation: Full screen mode is required! Please enter full screen again.");
            }
        };

        // Simulated AI proctoring checks (Face/Noise) every 6s
        const proctoringInterval = setInterval(() => {
            const roll = Math.random();
            if (roll < 0.04 && config.faceMissingDetection && activeMode !== 'audio') {
                const now = new Date().toLocaleTimeString();
                setViolations(prev => [...prev, `Face missing from frame at ${now}`]);
                toast.error("⚠️ Warn: Candidate face not detected in video feed!");
            } else if (roll > 0.04 && roll < 0.08 && config.multipleFaceDetection && activeMode !== 'audio') {
                const now = new Date().toLocaleTimeString();
                setViolations(prev => [...prev, `Multiple faces detected at ${now}`]);
                toast.error("⚠️ Alert: Multiple faces detected in video feed!");
            } else if (roll > 0.08 && roll < 0.12 && config.backgroundNoiseDetection) {
                const now = new Date().toLocaleTimeString();
                setViolations(prev => [...prev, `High background noise at ${now}`]);
                toast.error("⚠️ Alert: Background noise level exceeded standard limits!");
            }
        }, 7000);

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('fullscreenchange', handleFullScreenChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('fullscreenchange', handleFullScreenChange);
            clearInterval(proctoringInterval);
        };
    }, [recordingState, activeMode]);

    // Live device preview stream hook
    useEffect(() => {
        if (recordingState !== 'idle' || activeMode === 'upload') return;

        let activeStream = null;
        const startPreview = async () => {
            try {
                if (activeMode === 'webcam' || activeMode === 'screenWebcam') {
                    activeStream = await navigator.mediaDevices.getUserMedia({
                        video: selectedDevices.video ? { deviceId: { exact: selectedDevices.video } } : true,
                        audio: selectedDevices.audio ? { deviceId: { exact: selectedDevices.audio } } : true
                    });
                    if (previewVideoRef.current) {
                        previewVideoRef.current.srcObject = activeStream;
                        previewVideoRef.current.muted = true;
                        previewVideoRef.current.play().catch(() => {});
                    }
                } else if (activeMode === 'audio') {
                    activeStream = await navigator.mediaDevices.getUserMedia({
                        audio: selectedDevices.audio ? { deviceId: { exact: selectedDevices.audio } } : true
                    });
                }
            } catch (err) {
                console.warn("Could not capture preview stream", err);
            }
        };

        startPreview();

        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach(t => t.stop());
            }
        };
    }, [selectedDevices, activeMode, recordingState]);

    // Timer logic
    useEffect(() => {
        if (recordingState === 'recording') {
            timerIntervalRef.current = setInterval(() => {
                setTimer(prev => {
                    if (prev >= config.maxDuration) {
                        handleStopRecording();
                        toast.success("Max duration reached. Recording stopped.");
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);
        } else {
            clearInterval(timerIntervalRef.current);
        }
        return () => clearInterval(timerIntervalRef.current);
    }, [recordingState]);

    // Canvas Mouse annotation events
    useEffect(() => {
        const canvas = overlayCanvasRef.current;
        if (!canvas) return;

        const drawLoop = () => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw spotlight overlay first if selected
            if (activeTool === 'spotlight') {
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.save();
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath();
                ctx.arc(mousePosRef.current.x, mousePosRef.current.y, spotlightRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Redraw persistent shape lines
            shapesRef.current.forEach(shape => {
                ctx.strokeStyle = shape.color;
                ctx.lineWidth = shape.width;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                if (shape.tool === 'pen' || shape.tool === 'highlighter') {
                    if (shape.tool === 'highlighter') {
                        ctx.strokeStyle = hexToRgbA(shape.color, 0.45);
                    }
                    ctx.beginPath();
                    shape.points.forEach((pt, idx) => {
                        if (idx === 0) ctx.moveTo(pt.x, pt.y);
                        else ctx.lineTo(pt.x, pt.y);
                    });
                    ctx.stroke();
                } else if (shape.tool === 'rect') {
                    ctx.beginPath();
                    ctx.rect(shape.start.x, shape.start.y, shape.end.x - shape.start.x, shape.end.y - shape.start.y);
                    ctx.stroke();
                } else if (shape.tool === 'circle') {
                    const r = Math.sqrt(Math.pow(shape.end.x - shape.start.x, 2) + Math.pow(shape.end.y - shape.start.y, 2));
                    ctx.beginPath();
                    ctx.arc(shape.start.x, shape.start.y, r, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (shape.tool === 'arrow') {
                    ctx.beginPath();
                    ctx.moveTo(shape.start.x, shape.start.y);
                    ctx.lineTo(shape.end.x, shape.end.y);
                    ctx.stroke();
                    // Arrowhead
                    const angle = Math.atan2(shape.end.y - shape.start.y, shape.end.x - shape.start.x);
                    ctx.beginPath();
                    ctx.moveTo(shape.end.x, shape.end.y);
                    ctx.lineTo(shape.end.x - 12 * Math.cos(angle - Math.PI / 6), shape.end.y - 12 * Math.sin(angle - Math.PI / 6));
                    ctx.lineTo(shape.end.x - 12 * Math.cos(angle + Math.PI / 6), shape.end.y - 12 * Math.sin(angle + Math.PI / 6));
                    ctx.closePath();
                    ctx.fillStyle = shape.color;
                    ctx.fill();
                } else if (shape.tool === 'text') {
                    ctx.font = `${shape.width * 4 + 10}px sans-serif`;
                    ctx.fillStyle = shape.color;
                    ctx.fillText(shape.text, shape.start.x, shape.start.y);
                }
            });
        };

        const tick = () => {
            drawLoop();
            requestAnimationFrame(tick);
        };
        const handle = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(handle);
    }, [activeTool, shapesRef.current]);

    const hexToRgbA = (hex, alpha) => {
        let c;
        if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
            c = hex.substring(1).split('');
            if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
            c = '0x' + c.join('');
            return `rgba(${(c >> 16) & 255}, ${(c >> 8) & 255}, ${c & 255}, ${alpha})`;
        }
        return hex;
    };

    const handleCanvasPointerDown = (e) => {
        if (activeTool === 'none' || activeTool === 'spotlight') return;
        const rect = overlayCanvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        isDrawingRef.current = true;
        lastPosRef.current = { x, y };

        if (activeTool === 'pen' || activeTool === 'highlighter') {
            shapesRef.current.push({
                tool: activeTool,
                color: drawColor,
                width: drawThickness,
                points: [{ x, y }]
            });
        } else if (activeTool === 'text') {
            const txt = prompt("Enter text annotation:");
            if (txt) {
                shapesRef.current.push({
                    tool: 'text',
                    color: drawColor,
                    width: drawThickness,
                    start: { x, y },
                    text: txt
                });
            }
            isDrawingRef.current = false;
        } else {
            // Shapes (rect, circle, arrow)
            shapesRef.current.push({
                tool: activeTool,
                color: drawColor,
                width: drawThickness,
                start: { x, y },
                end: { x, y }
            });
        }
    };

    const handleCanvasPointerMove = (e) => {
        const rect = overlayCanvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        mousePosRef.current = { x, y };

        if (!isDrawingRef.current) return;

        const currentShape = shapesRef.current[shapesRef.current.length - 1];
        if (!currentShape) return;

        if (activeTool === 'pen' || activeTool === 'highlighter') {
            currentShape.points.push({ x, y });
        } else {
            currentShape.end = { x, y };
        }
    };

    const handleCanvasPointerUp = () => {
        isDrawingRef.current = false;
    };

    // 3. Recording handlers
    const triggerStartSequence = () => {
        if (config.recordingAttemptsLimit > 0 && attemptsCount >= config.recordingAttemptsLimit) {
            toast.error(`Attempt limit reached (${config.recordingAttemptsLimit} attempts maximum)`);
            return;
        }

        // Full Screen check
        if (config.fullScreenRequired && !document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {
                toast.error("Failed to enter full screen. Recording cancelled.");
                return;
            });
        }

        setRecordingState('countdown');
        setCurrentCountdown(countdownTime);

        let count = countdownTime;
        const interval = setInterval(() => {
            count -= 1;
            setCurrentCountdown(count);
            if (count === 0) {
                clearInterval(interval);
                handleStartCapture();
            }
        }, 1000);
    };

    const handleStartCapture = async () => {
        try {
            chunksRef.current = [];
            let combinedStream = null;

            const audioConstraints = selectedDevices.audio ? { deviceId: { exact: selectedDevices.audio } } : true;

            // Get webcam user media
            let videoStream = null;
            if (activeMode === 'webcam' || activeMode === 'screenWebcam') {
                videoStream = await navigator.mediaDevices.getUserMedia({
                    video: selectedDevices.video ? { deviceId: { exact: selectedDevices.video } } : true,
                    audio: audioConstraints
                });
                streamRef.current = videoStream;
            } else if (activeMode === 'audio') {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
                streamRef.current = audioStream;
                combinedStream = audioStream;
            }

            // Get screen capture media
            if (activeMode === 'screen' || activeMode === 'screenWebcam') {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                screenStreamRef.current = screenStream;

                if (activeMode === 'screenWebcam') {
                    // Combine videoStream (webcam) and screenStream
                    // Create video canvas stream to record both overlaid
                    const canvas = document.createElement('canvas');
                    canvas.width = 1280;
                    canvas.height = 720;
                    const ctx = canvas.getContext('2d');
                    const screenVideo = document.createElement('video');
                    screenVideo.srcObject = screenStream;
                    screenVideo.play().catch(() => {});
                    
                    const camVideo = document.createElement('video');
                    camVideo.srcObject = videoStream;
                    camVideo.play().catch(() => {});

                    const drawOverlay = () => {
                        if (screenStream.active) {
                            ctx.drawImage(screenVideo, 0, 0, 1280, 720);
                            // Draw webcam overlay bottom right
                            ctx.drawImage(camVideo, 1280 - 300, 720 - 220, 280, 200);
                            requestAnimationFrame(drawOverlay);
                        }
                    };
                    screenVideo.onloadedmetadata = () => {
                        drawOverlay();
                    };
                    combinedStream = canvas.captureStream(30);
                    // Add audio tracks
                    if (videoStream.getAudioTracks().length) {
                        combinedStream.addTrack(videoStream.getAudioTracks()[0]);
                    }
                } else {
                    combinedStream = screenStream;
                }
            } else {
                combinedStream = videoStream;
            }

            if (previewVideoRef.current && activeMode !== 'audio') {
                previewVideoRef.current.srcObject = combinedStream;
                previewVideoRef.current.muted = true;
                previewVideoRef.current.play().catch(() => {});
            }

            const options = { mimeType: activeMode === 'audio' ? 'audio/webm' : 'video/webm;codecs=vp8,opus' };
            const recorder = new MediaRecorder(combinedStream, options);
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const mimeType = activeMode === 'audio' ? 'audio/webm' : 'video/webm';
                const blob = new Blob(chunksRef.current, { type: mimeType });
                setRecordedBlob(blob);
                const url = URL.createObjectURL(blob);
                setRecordedUrl(url);

                // Stop tracks
                if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
                if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => t.stop());
            };

            recorder.start(1000); // chunk intervals
            setTimer(0);
            setRecordingState('recording');
        } catch (err) {
            console.error("Start capture error", err);
            toast.error("Could not access screen, camera, or mic permissions.");
            setRecordingState('idle');
        }
    };

    const handlePauseRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            setRecordingState('paused');
        }
    };

    const handleResumeRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            setRecordingState('recording');
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setRecordingState('stopped');
            setAttemptsCount(prev => prev + 1);
        }
    };

    const handleReRecord = () => {
        if (window.confirm("Are you sure you want to discard this recording and record again?")) {
            setRecordedUrl('');
            setRecordedBlob(null);
            setTimer(0);
            setRecordingState('idle');
            setShapesRef([]);
        }
    };

    // Upload support
    const handleFileUploadChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validation limits
        const sizeMb = file.size / (1024 * 1024);
        if (sizeMb > config.maxFileSize) {
            toast.error(`File size exceeds limit (${config.maxFileSize}MB max)`);
            return;
        }

        const ext = file.name.split('.').pop().toLowerCase();
        if (!config.allowedFileTypes.split(',').includes(ext)) {
            toast.error(`Unsupported format! Allowed types: ${config.allowedFileTypes}`);
            return;
        }

        const url = URL.createObjectURL(file);
        setRecordedBlob(file);
        setRecordedUrl(url);
        setRecordingState('stopped');
    };

    // Trimming, thumbnail frame grab, caption adds
    const handleFrameCapture = () => {
        const video = document.createElement('video');
        video.src = recordedUrl;
        video.currentTime = newCaptionTime || 1;
        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 360;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, 640, 360);
            const base64 = canvas.toDataURL('image/jpeg');
            setThumbnailBase64(base64);
            toast.success("Captured video thumbnail frame successfully!");
        };
    };

    const addCaption = () => {
        if (!newCaptionText) return;
        const newCap = { time: Number(newCaptionTime), text: newCaptionText };
        setCaptions(prev => [...prev, newCap].sort((a, b) => a.time - b.time));
        setNewCaptionText('');
        toast.success("Caption added!");
    };

    const deleteCaption = (index) => {
        setCaptions(prev => prev.filter((_, i) => i !== index));
    };

    // Convert blob to base64 draft for final save
    const saveAndSubmit = async () => {
        if (!recordedBlob) {
            toast.error("Please record or upload a video first!");
            return;
        }

        const duration = timer || videoDuration;
        if (duration < config.minDuration) {
            toast.error(`Violation: Minimum duration of ${config.minDuration} seconds is required!`);
            return;
        }

        toast.loading("Processing recording for submission...", { id: 'save' });

        try {
            const reader = new FileReader();
            reader.readAsDataURL(recordedBlob);
            reader.onloadend = () => {
                const base64Video = reader.result;

                // Build rich answer content including captions, trim indices, thumbnail, and proctoring logs
                const structuredData = {
                    url: base64Video,
                    duration,
                    thumbnail: thumbnailBase64,
                    trim: { start: trimStart, end: trimEnd },
                    captions,
                    proctoring: {
                        violations,
                        fullScreenViolations: fullScreenViolationCount,
                        tabSwitchViolations: tabSwitchViolationCount
                    }
                };

                onSubmitAnswer(structuredData);
                toast.success("Answer response ready and saved!", { id: 'save' });
            };
        } catch (err) {
            console.error("Save failed", err);
            toast.error("Error processing video file.", { id: 'save' });
        }
    };

    // Format helpers
    const formatDuration = (sec) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    };

    // Render submitted answers view
    if (submittedAnswer) {
        let answerData = null;
        try {
            // Check if answer is structured JSON or raw URL
            answerData = typeof submittedAnswer.videoData === 'string' && submittedAnswer.videoData.startsWith('{')
                ? JSON.parse(submittedAnswer.videoData)
                : { url: submittedAnswer.videoData, duration: 15 };
        } catch (e) {
            answerData = { url: submittedAnswer.videoData, duration: 15 };
        }

        return (
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="text-emerald-500" size={20} />
                        <span className="text-sm font-bold text-slate-800">Video Answer Saved & Submitted</span>
                    </div>
                    {onReattempt && (
                        <button
                            onClick={onReattempt}
                            className="px-4 py-1.5 border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 text-xs font-bold rounded-xl transition-all"
                        >
                            ✕ Re-attempt Question
                        </button>
                    )}
                </div>

                <div className="relative rounded-2xl overflow-hidden bg-black max-w-lg border border-slate-300">
                    <video
                        src={answerData.url}
                        controls
                        className="w-full h-auto max-h-[360px] object-contain"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500 max-w-lg">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Duration</span>
                        <span className="text-slate-800 mt-0.5 block">{answerData.duration ? formatDuration(answerData.duration) : 'N/A'}</span>
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Submission Format</span>
                        <span className="text-slate-800 mt-0.5 block">WebM/MP4 Recording</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col font-sans mb-4">
            
            {/* Header & Modes Selector */}
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-150 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-[#6F42C1] text-white rounded-lg"><Video size={16} /></span>
                    <span className="font-bold text-slate-800 text-sm">Advanced Recording System</span>
                </div>

                {/* Mode tabs */}
                {recordingState === 'idle' && (
                    <div className="flex items-center bg-slate-200/60 p-0.5 rounded-xl text-xs font-bold">
                        {config.allowWebcam && (
                            <button
                                onClick={() => setActiveMode('webcam')}
                                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${activeMode === 'webcam' ? 'bg-white text-[#6F42C1] shadow-sm' : 'text-slate-550 hover:text-slate-800'}`}
                            >
                                <Video size={13} /> Webcam Only
                            </button>
                        )}
                        {config.allowScreen && (
                            <button
                                onClick={() => setActiveMode('screen')}
                                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${activeMode === 'screen' ? 'bg-white text-[#6F42C1] shadow-sm' : 'text-slate-550 hover:text-slate-800'}`}
                            >
                                <Monitor size={13} /> Screen Only
                            </button>
                        )}
                        {config.allowScreenWebcam && (
                            <button
                                onClick={() => setActiveMode('screenWebcam')}
                                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${activeMode === 'screenWebcam' ? 'bg-white text-[#6F42C1] shadow-sm' : 'text-slate-550 hover:text-slate-800'}`}
                            >
                                <Monitor size={13} /><span className="text-[10px]">+</span><Video size={13} /> Screen + Cam
                            </button>
                        )}
                        {config.allowAudioOnly && (
                            <button
                                onClick={() => setActiveMode('audio')}
                                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${activeMode === 'audio' ? 'bg-white text-[#6F42C1] shadow-sm' : 'text-slate-550 hover:text-slate-800'}`}
                            >
                                <Mic size={13} /> Audio Only
                            </button>
                        )}
                        {config.allowUpload && (
                            <button
                                onClick={() => setActiveMode('upload')}
                                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${activeMode === 'upload' ? 'bg-white text-[#6F42C1] shadow-sm' : 'text-slate-550 hover:text-slate-800'}`}
                            >
                                <Upload size={13} /> Upload Existing
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Main Preview/Capture viewport */}
            <div className="relative bg-slate-950 min-h-[360px] max-h-[500px] flex items-center justify-center overflow-hidden">
                {/* Countdown overlay */}
                {recordingState === 'countdown' && (
                    <div className="absolute inset-0 z-30 bg-slate-900/90 flex flex-col items-center justify-center text-white select-none animate-pulse">
                        <span className="text-8xl font-black">{currentCountdown}</span>
                        <span className="text-xs uppercase font-extrabold tracking-widest text-[#B282FF] mt-4">Get ready... camera activating</span>
                    </div>
                )}

                {/* Draw Canvas Overlay (Screen recording annotations) */}
                {recordingState === 'recording' && (activeMode === 'screen' || activeMode === 'screenWebcam') && (
                    <canvas
                        ref={overlayCanvasRef}
                        width={800}
                        height={450}
                        onPointerDown={handleCanvasPointerDown}
                        onPointerMove={handleCanvasPointerMove}
                        onPointerUp={handleCanvasPointerUp}
                        className={`absolute inset-0 z-20 w-full h-full ${activeTool !== 'none' ? 'cursor-crosshair' : 'pointer-events-none'}`}
                    />
                )}

                {/* Live Camera Preview / Capture streams */}
                {activeMode !== 'upload' && (
                    <video
                        ref={previewVideoRef}
                        className={`w-full h-full max-h-[450px] object-contain bg-black ${recordingState === 'stopped' ? 'hidden' : 'block'}`}
                        muted
                        playsInline
                    />
                )}

                {/* Stopped state playback */}
                {recordingState === 'stopped' && recordedUrl && (
                    <video
                        src={recordedUrl}
                        controls
                        className="w-full h-full max-h-[450px] object-contain bg-black"
                    />
                )}

                {/* Upload zone */}
                {activeMode === 'upload' && !recordedUrl && (
                    <div className="p-8 text-center flex flex-col items-center gap-3 w-full">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                            <Upload size={28} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-300">Upload Video Answer File</h4>
                        <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                            Support MP4, WebM, or MOV formats up to {config.maxFileSize}MB. Maximum attempt limits apply.
                        </p>
                        <input
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime"
                            onChange={handleFileUploadChange}
                            className="hidden"
                            id="video-upload-input"
                        />
                        <label
                            htmlFor="video-upload-input"
                            className="px-5 py-2 bg-[#6F42C1] hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-purple-500/10"
                        >
                            Choose File
                        </label>
                    </div>
                )}

                {/* Proctoring Warning display */}
                {violations.length > 0 && (
                    <div className="absolute top-4 left-4 z-20 bg-rose-600/90 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-rose-900/20">
                        <AlertTriangle size={12} className="animate-bounce" />
                        <span>Security Alert: {violations.length} Violation(s) Logged</span>
                    </div>
                )}

                {/* Screen Annotations Toolbar */}
                {recordingState === 'recording' && (activeMode === 'screen' || activeMode === 'screenWebcam') && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/90 border border-slate-700 p-2 rounded-2xl shadow-xl flex items-center gap-2">
                        {[
                            { id: 'none', label: 'Pointer', icon: Eye },
                            { id: 'pen', label: 'Pen', icon: Edit3 },
                            { id: 'highlighter', label: 'Highlight', icon: Sliders },
                            { id: 'arrow', label: 'Arrow', icon: ChevronRight },
                            { id: 'rect', label: 'Rectangle', icon: Crop },
                            { id: 'circle', label: 'Circle', icon: ImageIcon },
                            { id: 'spotlight', label: 'Spotlight', icon: Settings }
                        ].map(tool => (
                            <button
                                key={tool.id}
                                onClick={() => setActiveTool(tool.id)}
                                className={`p-2 rounded-xl text-white transition-all ${activeTool === tool.id ? 'bg-[#6F42C1] shadow-lg' : 'hover:bg-slate-800'}`}
                                title={tool.label}
                            >
                                <tool.icon size={14} />
                            </button>
                        ))}

                        <div className="w-px h-6 bg-slate-700 mx-1" />

                        {/* Colors */}
                        <div className="flex items-center gap-1">
                            {['#E63946', '#457B9D', '#1D3557', '#FFB703'].map(color => (
                                <button
                                    key={color}
                                    onClick={() => setDrawColor(color)}
                                    className={`w-3.5 h-3.5 rounded-full border border-white/20 transition-transform ${drawColor === color ? 'scale-125 ring-2 ring-purple-500' : ''}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>

                        <button
                            onClick={() => shapesRef.current = []}
                            className="p-1.5 text-xs font-bold bg-slate-850 hover:bg-slate-800 text-rose-400 rounded-lg ml-2"
                        >
                            Clear
                        </button>
                    </div>
                )}
            </div>

            {/* Trimming / Editing Panel */}
            {showEditor && recordingState === 'stopped' && (
                <div className="bg-slate-50 border-t border-slate-200 p-4 animate-fade-in text-xs">
                    <div className="flex border-b border-slate-200 mb-4 bg-white p-1 rounded-xl w-fit">
                        <button
                            onClick={() => setEditorTab('trim')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${editorTab === 'trim' ? 'bg-purple-100 text-purple-750' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            <Scissors size={14} /> Trim Video
                        </button>
                        <button
                            onClick={() => setEditorTab('thumbnail')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${editorTab === 'thumbnail' ? 'bg-purple-100 text-purple-750' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            <ImageIcon size={14} /> Thumbnail Frame
                        </button>
                        <button
                            onClick={() => setEditorTab('captions')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${editorTab === 'captions' ? 'bg-purple-100 text-purple-750' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            <MessageSquare size={14} /> Captions Track
                        </button>
                    </div>

                    {editorTab === 'trim' && (
                        <div className="space-y-3 p-2">
                            <span className="font-bold text-slate-700">Set Video Range Trimming</span>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 flex flex-col gap-1">
                                    <span className="text-[10px] text-slate-400 font-bold">Trim Start (seconds)</span>
                                    <input
                                        type="range"
                                        min={0}
                                        max={videoDuration || 100}
                                        value={trimStart}
                                        onChange={(e) => setTrimStart(Number(e.target.value))}
                                        className="w-full accent-purple-600"
                                    />
                                </div>
                                <div className="flex-1 flex flex-col gap-1">
                                    <span className="text-[10px] text-slate-400 font-bold">Trim End (seconds)</span>
                                    <input
                                        type="range"
                                        min={0}
                                        max={videoDuration || 100}
                                        value={trimEnd}
                                        onChange={(e) => setTrimEnd(Number(e.target.value))}
                                        className="w-full accent-purple-600"
                                    />
                                </div>
                            </div>
                            <div className="text-[10px] font-bold text-slate-500">
                                Trimmed Range: {trimStart}s to {trimEnd}s (Total Output: {Math.max(0, trimEnd - trimStart)}s)
                            </div>
                        </div>
                    )}

                    {editorTab === 'thumbnail' && (
                        <div className="space-y-3 p-2">
                            <span className="font-bold text-slate-700">Capture Video Thumbnail</span>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    value={newCaptionTime}
                                    onChange={(e) => setNewCaptionTime(Number(e.target.value))}
                                    placeholder="Enter frame second (e.g. 5)"
                                    className="w-24 border border-slate-200 rounded p-1.5"
                                />
                                <button
                                    onClick={handleFrameCapture}
                                    className="px-4 py-1.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-lg transition-colors"
                                >
                                    Capture Frame
                                </button>
                            </div>
                            {thumbnailBase64 && (
                                <div className="mt-2 border border-slate-200 rounded-lg p-1.5 max-w-[160px] bg-white">
                                    <img src={thumbnailBase64} alt="Thumbnail preview" className="w-full h-auto rounded" />
                                </div>
                            )}
                        </div>
                    )}

                    {editorTab === 'captions' && (
                        <div className="space-y-3 p-2">
                            <span className="font-bold text-slate-700">Subtitles / Captions Track</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={newCaptionTime}
                                    onChange={(e) => setNewCaptionTime(Number(e.target.value))}
                                    placeholder="Sec"
                                    className="w-16 border border-slate-200 rounded p-1.5"
                                />
                                <input
                                    type="text"
                                    value={newCaptionText}
                                    onChange={(e) => setNewCaptionText(e.target.value)}
                                    placeholder="Enter subtitle text..."
                                    className="flex-1 border border-slate-200 rounded p-1.5"
                                />
                                <button
                                    onClick={addCaption}
                                    className="px-4 py-1.5 bg-purple-600 text-white rounded-lg font-bold"
                                >
                                    Add
                                </button>
                            </div>

                            {/* Caption List */}
                            <div className="space-y-1.5 max-h-[120px] overflow-y-auto mt-2">
                                {captions.map((cap, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-150">
                                        <span className="font-mono text-[10px] text-slate-400">Time: {formatDuration(cap.time)}</span>
                                        <span className="font-bold text-slate-700 flex-1 ml-4">{cap.text}</span>
                                        <button onClick={() => deleteCaption(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Bottom device selector and recorder controls */}
            <div className="bg-slate-50 border-t border-slate-150 px-5 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                
                {/* 1. Device selectors */}
                {recordingState === 'idle' && activeMode !== 'upload' && (
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                            <span className="p-1 bg-white border rounded text-slate-400"><Video size={12} /></span>
                            <select
                                value={selectedDevices.video}
                                onChange={(e) => setSelectedDevices(prev => ({ ...prev, video: e.target.value }))}
                                className="bg-white border border-slate-200 px-2 py-1 rounded outline-none text-slate-700 font-bold"
                            >
                                {devices.video.map(d => (
                                    <option key={d.deviceId} value={d.deviceId}>{d.label || 'Webcam'}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="p-1 bg-white border rounded text-slate-400"><Mic size={12} /></span>
                            <select
                                value={selectedDevices.audio}
                                onChange={(e) => setSelectedDevices(prev => ({ ...prev, audio: e.target.value }))}
                                className="bg-white border border-slate-200 px-2 py-1 rounded outline-none text-slate-700 font-bold"
                            >
                                {devices.audio.map(d => (
                                    <option key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* 2. Blinking live timers */}
                {(recordingState === 'recording' || recordingState === 'paused') && (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-700 text-white font-mono text-xs font-black shadow-inner">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                            <span>REC</span>
                            <span className="text-slate-400">|</span>
                            <span>{formatDuration(timer)}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Max Limit: {formatDuration(config.maxDuration)}
                        </span>
                    </div>
                )}

                {/* 3. Controls triggers */}
                <div className="flex items-center gap-2 ml-auto">
                    {recordingState === 'idle' && activeMode !== 'upload' && (
                        <>
                            {/* Countdown Selector */}
                            <select
                                value={countdownTime}
                                onChange={(e) => setCountdownTime(Number(e.target.value))}
                                className="bg-white border border-slate-200 px-2 py-1.5 rounded-xl outline-none text-xs font-bold text-slate-600"
                            >
                                <option value={3}>3s Countdown</option>
                                <option value={5}>5s Countdown</option>
                                <option value={10}>10s Countdown</option>
                            </select>
                            <button
                                onClick={triggerStartSequence}
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-500/10 transition-transform active:scale-95"
                            >
                                <Play size={14} fill="currentColor" /> Start Recording
                            </button>
                        </>
                    )}

                    {recordingState === 'recording' && (
                        <>
                            <button
                                onClick={handlePauseRecording}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                            >
                                <Pause size={13} /> Pause
                            </button>
                            <button
                                onClick={handleStopRecording}
                                className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-500/10 transition-transform active:scale-95"
                            >
                                <Square size={13} fill="currentColor" /> Stop Recording
                            </button>
                        </>
                    )}

                    {recordingState === 'paused' && (
                        <>
                            <button
                                onClick={handleResumeRecording}
                                className="px-4 py-2 bg-[#6F42C1] hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                            >
                                <Play size={13} fill="currentColor" /> Resume
                            </button>
                            <button
                                onClick={handleStopRecording}
                                className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-500/10 transition-transform active:scale-95"
                            >
                                <Square size={13} fill="currentColor" /> Stop
                            </button>
                        </>
                    )}

                    {recordingState === 'stopped' && (
                        <>
                            <button
                                onClick={() => setShowEditor(!showEditor)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${showEditor ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                            >
                                <Scissors size={13} /> Trimming & Edits
                            </button>
                            <button
                                onClick={handleReRecord}
                                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                            >
                                <RefreshCw size={13} /> Re-record
                            </button>
                            {recordedBlob && (
                                <a
                                    href={recordedUrl}
                                    download={`recording_${Date.now()}.webm`}
                                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                                >
                                    Download File
                                </a>
                            )}
                            <button
                                onClick={saveAndSubmit}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 transition-transform active:scale-95 animate-pulse"
                            >
                                <Check size={14} /> Submit Answer
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdvancedVideoRecorder;
