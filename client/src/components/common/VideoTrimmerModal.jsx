import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Square, Check, Trash, Scissors, Maximize, Crop, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const VideoTrimmerModal = ({ isOpen, onClose, draft, title, setTitle, onSave }) => {
    const videoRef = useRef(null);
    const hiddenVideoRef = useRef(null);
    const canvasRef = useRef(null);
    const timelineRef = useRef(null);

    const [localTitle, setLocalTitle] = useState(title || '');
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    // Timeline segments state: [{ id, start, end }]
    const [segments, setSegments] = useState([]);
    const [selectedSegmentId, setSelectedSegmentId] = useState(null);
    const [thumbnails, setThumbnails] = useState([]);
    const [generatingThumbnails, setGeneratingThumbnails] = useState(false);

    // Cropping state
    const [aspectRatio, setAspectRatio] = useState('original'); // 'original' | '16:9' | '9:16' | '1:1'

    // Render & Export states
    const [isRendering, setIsRendering] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);
    const [videoSpeed, setVideoSpeed] = useState(1.0); // 0.5 | 0.75 | 1.0 | 1.25 | 1.5 | 2.0

    const changeSpeed = (speed) => {
        setVideoSpeed(speed);
        const video = videoRef.current;
        if (video) {
            video.playbackRate = speed;
        }
    };

    // Initial load
    useEffect(() => {
        if (draft) {
            setLocalTitle(draft.title || '');
        }
    }, [draft]);

    const handleLoadedMetadata = () => {
        const video = videoRef.current;
        if (!video) return;
        
        let dur = video.duration;
        if (!dur || dur === Infinity || isNaN(dur)) {
            // Fallback: Parse draft.duration string (e.g. "02:41")
            if (draft && draft.duration) {
                const parts = draft.duration.split(':');
                if (parts.length === 2) {
                    dur = parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
                } else if (parts.length === 3) {
                    dur = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
                }
            }
        }
        
        // If still invalid, default to 30 seconds
        if (!dur || dur === Infinity || isNaN(dur)) {
            dur = 30; 
        }

        setDuration(dur);
        setCurrentTime(0);
        
        // Initialize with one single segment representing the whole video
        setSegments([{ id: 'seg_' + Date.now(), start: 0, end: dur }]);
        
        // Generate timeline thumbnails in the background
        generateThumbnails(dur);
    };

    // Seek background video and extract frame thumbnails
    const generateThumbnails = async (videoDuration) => {
        const hiddenVideo = hiddenVideoRef.current;
        if (!hiddenVideo) return;
        
        setGeneratingThumbnails(true);
        const frameCount = 8;
        const tempThumbnails = [];

        hiddenVideo.currentTime = 0;
        
        const captureFrame = (time) => {
            return new Promise((resolve) => {
                hiddenVideo.currentTime = time;
                
                // Add a backup timeout of 300ms in case the seeked event doesn't fire
                const timeoutId = setTimeout(() => {
                    hiddenVideo.removeEventListener('seeked', onSeeked);
                    const canvas = document.createElement('canvas');
                    canvas.width = 120;
                    canvas.height = 70;
                    const ctx = canvas.getContext('2d');
                    try {
                        ctx.drawImage(hiddenVideo, 0, 0, canvas.width, canvas.height);
                    } catch (e) {
                        console.warn("Failed drawing thumbnail frame", e);
                    }
                    resolve(canvas.toDataURL('image/jpeg', 0.5));
                }, 300);

                const onSeeked = () => {
                    clearTimeout(timeoutId);
                    hiddenVideo.removeEventListener('seeked', onSeeked);
                    const canvas = document.createElement('canvas');
                    canvas.width = 120;
                    canvas.height = 70;
                    const ctx = canvas.getContext('2d');
                    try {
                        ctx.drawImage(hiddenVideo, 0, 0, canvas.width, canvas.height);
                    } catch (e) {
                        console.warn("Failed drawing thumbnail frame", e);
                    }
                    resolve(canvas.toDataURL('image/jpeg', 0.5));
                };
                hiddenVideo.addEventListener('seeked', onSeeked);
            });
        };

        try {
            for (let i = 0; i < frameCount; i++) {
                const targetTime = (videoDuration / frameCount) * i;
                const dataUrl = await captureFrame(targetTime);
                tempThumbnails.push(dataUrl);
            }
            setThumbnails(tempThumbnails);
        } catch (e) {
            console.error("Error generating thumbnails:", e);
        } finally {
            setGeneratingThumbnails(false);
        }
    };

    // Dragging state for timeline handles
    const dragInfoRef = useRef({
        handle: null, // 'left' | 'right'
        segmentId: null,
        startX: 0,
        startVal: 0,
        timelineWidth: 0,
        minLimit: 0,
        maxLimit: 0
    });

    const handleDragRef = useRef(null);
    const handleDragEndRef = useRef(null);

    // Initialize dragging refs
    useEffect(() => {
        handleDragRef.current = (e) => {
            const info = dragInfoRef.current;
            if (!info.handle) return;
            
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const deltaX = clientX - info.startX;
            const deltaSecs = (deltaX / info.timelineWidth) * duration;

            let newVal = info.startVal + deltaSecs;
            newVal = Math.max(info.minLimit, Math.min(info.maxLimit, newVal));

            // Update active segment
            setSegments(prev => prev.map(s => {
                if (s.id === info.segmentId) {
                    if (info.handle === 'left') {
                        return { ...s, start: newVal };
                    } else {
                        return { ...s, end: newVal };
                    }
                }
                return s;
            }));

            // Seek player
            const video = videoRef.current;
            if (video) {
                video.currentTime = newVal;
                setCurrentTime(newVal);
            }
        };

        handleDragEndRef.current = () => {
            dragInfoRef.current = {
                handle: null,
                segmentId: null,
                startX: 0,
                startVal: 0,
                timelineWidth: 0,
                minLimit: 0,
                maxLimit: 0
            };
            window.removeEventListener('mousemove', handleDragRef.current);
            window.removeEventListener('mouseup', handleDragEndRef.current);
            window.removeEventListener('touchmove', handleDragRef.current);
            window.removeEventListener('touchend', handleDragEndRef.current);
        };

        return () => {
            if (handleDragRef.current) {
                window.removeEventListener('mousemove', handleDragRef.current);
                window.removeEventListener('touchmove', handleDragRef.current);
            }
            if (handleDragEndRef.current) {
                window.removeEventListener('mouseup', handleDragEndRef.current);
                window.removeEventListener('touchend', handleDragEndRef.current);
            }
        };
    }, [duration, segments]);

    const handleHandleStartDrag = (e, segment, handleType) => {
        e.stopPropagation();
        e.preventDefault();
        
        const timeline = timelineRef.current;
        if (!timeline) return;

        const rect = timeline.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;

        // Find boundary limits for dragging
        const idx = segments.findIndex(s => s.id === segment.id);
        const prevSeg = segments[idx - 1];
        const nextSeg = segments[idx + 1];

        let minLimit = 0;
        let maxLimit = duration;

        if (handleType === 'left') {
            minLimit = prevSeg ? prevSeg.end : 0;
            maxLimit = segment.end - 0.2; // Keep at least 0.2s duration
        } else {
            minLimit = segment.start + 0.2;
            maxLimit = nextSeg ? nextSeg.start : duration;
        }

        dragInfoRef.current = {
            handle: handleType,
            segmentId: segment.id,
            startX: clientX,
            startVal: handleType === 'left' ? segment.start : segment.end,
            timelineWidth: rect.width,
            minLimit,
            maxLimit
        };

        // Attach listeners
        window.addEventListener('mousemove', handleDragRef.current);
        window.addEventListener('mouseup', handleDragEndRef.current);
        window.addEventListener('touchmove', handleDragRef.current, { passive: false });
        window.addEventListener('touchend', handleDragEndRef.current);
    };

    // Time update listener
    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video) return;
        
        const curr = video.currentTime;
        setCurrentTime(curr);

        // Find the active segment playing right now
        const activeSegment = findActiveSegment(curr);
        
        if (!activeSegment) {
            // Seek to the start of the first segment
            if (segments.length > 0) {
                video.currentTime = segments[0].start;
            } else {
                video.pause();
                setIsPlaying(false);
            }
            return;
        }

        // If we reach the end of the current active segment, skip to the start of next segment
        if (curr >= activeSegment.end) {
            const currentIndex = segments.findIndex(s => s.id === activeSegment.id);
            if (currentIndex < segments.length - 1) {
                video.currentTime = segments[currentIndex + 1].start;
            } else {
                // Done playing all segments, loop back
                video.currentTime = segments[0].start;
                video.pause();
                setIsPlaying(false);
            }
        }
    };

    // Find which segment covers the current video time
    const findActiveSegment = (time) => {
        return segments.find(s => time >= s.start && time < s.end);
    };

    // Playhead Seeking
    const handleTimelineClick = (e) => {
        const timeline = timelineRef.current;
        if (!timeline || duration === 0) return;
        
        const rect = timeline.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = clickX / rect.width;
        const targetTime = percent * duration;

        const video = videoRef.current;
        if (video) {
            video.currentTime = targetTime;
            setCurrentTime(targetTime);
        }
    };

    // Split Action
    const handleSplit = () => {
        const activeSeg = findActiveSegment(currentTime);
        if (!activeSeg) {
            toast.error("Seek playhead onto a valid segment to split!");
            return;
        }

        // Check if currentTime is too close to segment start or end
        if (currentTime - activeSeg.start < 0.2 || activeSeg.end - currentTime < 0.2) {
            toast.error("Cannot split too close to the boundary!");
            return;
        }

        const newSeg1 = { id: 'seg_' + Date.now() + '_1', start: activeSeg.start, end: currentTime };
        const newSeg2 = { id: 'seg_' + Date.now() + '_2', start: currentTime, end: activeSeg.end };

        setSegments(prev => {
            const idx = prev.findIndex(s => s.id === activeSeg.id);
            const updated = [...prev];
            updated.splice(idx, 1, newSeg1, newSeg2);
            return updated;
        });

        toast.success("Video split at " + currentTime.toFixed(1) + "s");
    };

    // Delete selected segment
    const handleDeleteSegment = () => {
        if (!selectedSegmentId) {
            toast.error("Click on a timeline segment first to select it!");
            return;
        }

        if (segments.length <= 1) {
            toast.error("Cannot delete the only remaining segment! You need at least some video content.");
            return;
        }

        setSegments(prev => prev.filter(s => s.id !== selectedSegmentId));
        setSelectedSegmentId(null);
        toast.success("Selected segment removed!");
    };

    const handlePlayToggle = () => {
        const video = videoRef.current;
        if (!video) return;
        
        if (isPlaying) {
            video.pause();
            setIsPlaying(false);
        } else {
            video.play()
                .then(() => {
                    video.playbackRate = videoSpeed;
                    setIsPlaying(true);
                })
                .catch(e => console.log(e));
        }
    };

    // Web-Recorder Canvas stitching & Rendering export pipeline (VN-like render to new file)
    const handleRenderAndSave = async () => {
        if (segments.length === 0) {
            toast.error("No video segments to render!");
            return;
        }

        setIsRendering(true);
        setRenderProgress(0);

        const video = videoRef.current;
        if (!video) return;

        video.pause();
        setIsPlaying(false);

        // Create canvas to draw the video frames
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Define export resolution based on aspect ratio
        let canvasW = 640;
        let canvasH = 360;

        if (aspectRatio === '1:1') {
            canvasW = 480;
            canvasH = 480;
        } else if (aspectRatio === '9:16') {
            canvasW = 360;
            canvasH = 640;
        }

        canvas.width = canvasW;
        canvas.height = canvasH;

        // Capture video track stream
        const fps = 30;
        const stream = canvas.captureStream(fps);
        
        // Setup MediaRecorder
        let recordedChunks = [];
        const options = { mimeType: 'video/webm;codecs=vp9' };
        let mediaRecorder;
        
        try {
            mediaRecorder = new MediaRecorder(stream, options);
        } catch (e) {
            mediaRecorder = new MediaRecorder(stream);
        }

        mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };

        // Render loop variables
        let currentSegIdx = 0;
        const totalDuration = segments.reduce((sum, s) => sum + (s.end - s.start), 0);

        // Setup speed rate
        video.playbackRate = videoSpeed;

        // Seek to start of first segment
        video.currentTime = segments[0].start;

        mediaRecorder.start();

        // Mute sound during rendering
        const originalMuted = video.muted;
        video.muted = true;

        // Play the video for real-time capture
        video.play().catch(e => console.log("Play failed during render", e));

        let animationFrameId;

        const drawLoop = () => {
            const currentSegment = segments[currentSegIdx];
            if (!currentSegment) {
                // Done rendering!
                cancelAnimationFrame(animationFrameId);
                video.pause();
                video.muted = originalMuted;
                video.playbackRate = videoSpeed; // restore
                mediaRecorder.stop();
                
                setTimeout(() => {
                    const blob = new Blob(recordedChunks, { type: 'video/webm' });
                    const finalDuration = totalDuration / videoSpeed;
                    const finalDurationMs = finalDuration * 1000;

                    const finishSave = (fixedBlob) => {
                        const url = URL.createObjectURL(fixedBlob);
                        const finalMins = Math.floor(finalDuration / 60);
                        const finalSecs = Math.floor(finalDuration % 60);
                        const durationString = `${finalMins.toString().padStart(2, '0')}:${finalSecs.toString().padStart(2, '0')}`;

                        setIsRendering(false);
                        onSave({
                            ...draft,
                            title: localTitle,
                            url: url,
                            blob: fixedBlob,
                            size: (fixedBlob.size / (1024 * 1024)).toFixed(2) + ' MB',
                            duration: durationString
                        });
                    };

                    if (window.ysFixWebmDuration && finalDurationMs > 0) {
                        window.ysFixWebmDuration(blob, finalDurationMs, (fixedBlob) => {
                            finishSave(fixedBlob);
                        });
                    } else {
                        finishSave(blob);
                    }
                }, 500);
                return;
            }

            // Draw video frame according to crop aspect ratio settings
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvasW, canvasH);

            if (aspectRatio === 'original') {
                ctx.drawImage(video, 0, 0, canvasW, canvasH);
            } else if (aspectRatio === '1:1') {
                // Center square crop
                const minDim = Math.min(video.videoWidth, video.videoHeight);
                const sx = (video.videoWidth - minDim) / 2;
                const sy = (video.videoHeight - minDim) / 2;
                ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, canvasW, canvasH);
            } else if (aspectRatio === '9:16') {
                // Vertical crop
                const targetW = video.videoHeight * (9 / 16);
                const sx = (video.videoWidth - targetW) / 2;
                ctx.drawImage(video, sx, 0, targetW, video.videoHeight, 0, 0, canvasW, canvasH);
            } else if (aspectRatio === '16:9') {
                // Wide crop
                const targetH = video.videoWidth * (9 / 16);
                const sy = (video.videoHeight - targetH) / 2;
                ctx.drawImage(video, 0, sy, video.videoWidth, targetH, 0, 0, canvasW, canvasH);
            }

            // Update Progress
            const currentPlayedTime = segments.slice(0, currentSegIdx).reduce((sum, s) => sum + (s.end - s.start), 0) + (video.currentTime - currentSegment.start);
            const progressPercent = Math.min(Math.round((currentPlayedTime / totalDuration) * 100), 99);
            setRenderProgress(progressPercent);

            // Check if current segment finished
            if (video.currentTime >= currentSegment.end) {
                currentSegIdx++;
                if (segments[currentSegIdx]) {
                    video.currentTime = segments[currentSegIdx].start;
                }
            } else if (video.currentTime < currentSegment.start) {
                // Keep boundary alignment
                video.currentTime = currentSegment.start;
            }

            animationFrameId = requestAnimationFrame(drawLoop);
        };

        // Start render frame loop
        animationFrameId = requestAnimationFrame(drawLoop);
    };

    const formatTime = (timeSecs) => {
        const mins = Math.floor(timeSecs / 60);
        const secs = Math.floor(timeSecs % 60);
        const ms = Math.floor((timeSecs % 1) * 100);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left font-sans">
            <div className="bg-[#f5f5f5] rounded-3xl max-w-2xl w-full border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-scale-up">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                    <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                        <span>VN Video Editor Studio</span>
                        <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded-full">Timeline Pro</span>
                    </h3>
                    <button
                        onClick={onClose}
                        disabled={isRendering}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-655 hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex-1 overflow-y-auto space-y-4 relative">
                    {/* Render Loading Overlay */}
                    {isRendering && (
                        <div className="absolute inset-0 bg-slate-900/90 z-50 flex flex-col items-center justify-center p-8 text-center animate-fade-in text-white space-y-4">
                            <RefreshCw className="animate-spin text-indigo-400" size={48} />
                            <div className="space-y-1">
                                <h4 className="font-black text-sm uppercase tracking-widest text-indigo-400">Rendering Video Edits</h4>
                                <p className="text-xs text-slate-400">We are cropping, splitting, and rendering your video clips...</p>
                            </div>
                            <div className="w-56 bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
                                <div className="bg-indigo-500 h-full transition-all duration-100" style={{ width: `${renderProgress}%` }}></div>
                            </div>
                            <span className="text-xl font-extrabold">{renderProgress}% Complete</span>
                        </div>
                    )}

                    {/* Title Input */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Video Name / Title
                        </label>
                        <input
                            type="text"
                            value={localTitle}
                            onChange={(e) => setLocalTitle(e.target.value)}
                            placeholder="Enter video title..."
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 outline-none font-bold text-slate-700 focus:border-indigo-500 transition-all"
                        />
                    </div>

                    {/* Canvas/Video Player Area */}
                    <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-850 relative min-h-[220px] flex flex-col items-center justify-center p-4">
                        <video
                            ref={videoRef}
                            src={draft?.url?.split('#')[0]}
                            onLoadedMetadata={handleLoadedMetadata}
                            onTimeUpdate={handleTimeUpdate}
                            onPause={() => setIsPlaying(false)}
                            onPlay={() => setIsPlaying(true)}
                            className={`w-full max-h-[240px] rounded-xl object-contain bg-slate-900 mx-auto ${
                                aspectRatio === '1:1' ? 'aspect-square max-w-[240px]' : 
                                aspectRatio === '9:16' ? 'aspect-[9/16] max-w-[135px]' : ''
                            }`}
                        />
                        {/* Hidden video node for frame thumbnails extraction */}
                        <video
                            ref={hiddenVideoRef}
                            src={draft?.url?.split('#')[0]}
                            muted
                            playsInline
                            className="hidden"
                        />
                    </div>

                    {/* VN Crop & Speed controls */}
                    <div className="flex flex-col gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-150">
                        {/* Aspect Ratio */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1.5 flex items-center gap-1">
                                <Crop size={12} /> Aspect Ratio:
                            </span>
                            {['original', '16:9', '9:16', '1:1'].map(ratio => (
                                <button
                                    key={ratio}
                                    onClick={() => setAspectRatio(ratio)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                                        aspectRatio === ratio
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    {ratio}
                                </button>
                            ))}
                        </div>
                        {/* Speed multiplier selection */}
                        <div className="flex items-center gap-1.5 flex-wrap border-t border-slate-200 pt-2.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1.5 flex items-center gap-1">
                                <RefreshCw size={12} className="text-slate-400" /> Playback Speed:
                            </span>
                            {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(speed => (
                                <button
                                    key={speed}
                                    onClick={() => changeSpeed(speed)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                                        videoSpeed === speed
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    {speed === 1.0 ? 'Normal (1x)' : `${speed}x`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Timeline Studio Interface */}
                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-4">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                            <span className="text-slate-400 flex items-center gap-1.5">
                                <Play size={12} className="text-indigo-400" />
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleSplit}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl font-bold flex items-center gap-1 transition-all"
                                    title="Split clip at playhead"
                                >
                                    <Scissors size={12} />
                                    <span>Split</span>
                                </button>
                                <button
                                    onClick={handleDeleteSegment}
                                    disabled={!selectedSegmentId}
                                    className="px-3 py-1.5 bg-red-655 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Delete selected segment"
                                >
                                    <Trash size={12} />
                                    <span>Delete Clip</span>
                                </button>
                            </div>
                        </div>

                        {/* Interactive Timeline track */}
                        <div className="relative pt-4">
                            {/* Time ruler */}
                            <div className="flex justify-between text-[9px] font-mono text-slate-500 px-1 mb-1 select-none">
                                <span>0s</span>
                                <span>{(duration * 0.25).toFixed(1)}s</span>
                                <span>{(duration * 0.5).toFixed(1)}s</span>
                                <span>{(duration * 0.75).toFixed(1)}s</span>
                                <span>{duration.toFixed(1)}s</span>
                            </div>

                            {/* Main Track strip */}
                            <div 
                                ref={timelineRef}
                                onClick={handleTimelineClick}
                                className="relative bg-slate-950 h-16 rounded-xl border border-slate-800 overflow-hidden cursor-pointer select-none flex items-center"
                            >
                                {/* Thumbnail Strip representation */}
                                <div className="absolute inset-0 flex">
                                    {thumbnails.length > 0 ? (
                                        thumbnails.map((thumb, idx) => (
                                            <img 
                                                key={idx} 
                                                src={thumb} 
                                                alt="frame" 
                                                className="h-full flex-1 object-cover opacity-35" 
                                            />
                                        ))
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500 italic">
                                            {generatingThumbnails ? 'Generating thumbnails...' : 'Frame track preview'}
                                        </div>
                                    )}
                                </div>

                                {/* Render split segments boxes */}
                                {duration > 0 && segments.map((seg, idx) => {
                                    const leftPct = (seg.start / duration) * 100;
                                    const widthPct = ((seg.end - seg.start) / duration) * 100;
                                    const isSelected = seg.id === selectedSegmentId;
                                    
                                    return (
                                        <div
                                            key={seg.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedSegmentId(seg.id);
                                            }}
                                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                            className={`absolute h-full border-r border-slate-900 flex items-center justify-center select-none ${
                                                isSelected 
                                                    ? 'border-2 border-indigo-400 bg-indigo-500/20 z-10' 
                                                    : 'bg-white/5 hover:bg-white/10 transition-colors duration-150'
                                            }`}
                                        >
                                            {isSelected && (
                                                <>
                                                    {/* Left Drag Trim Handle */}
                                                    <div
                                                        onMouseDown={(e) => handleHandleStartDrag(e, seg, 'left')}
                                                        onTouchStart={(e) => handleHandleStartDrag(e, seg, 'left')}
                                                        className="absolute left-0 top-0 bottom-0 w-2.5 bg-indigo-500 cursor-ew-resize flex items-center justify-center z-30 border-r border-indigo-600 hover:bg-indigo-600"
                                                        title="Drag to trim start"
                                                    >
                                                        <div className="w-[1px] h-3 bg-white/90 rounded-full" />
                                                    </div>
                                                    {/* Right Drag Trim Handle */}
                                                    <div
                                                        onMouseDown={(e) => handleHandleStartDrag(e, seg, 'right')}
                                                        onTouchStart={(e) => handleHandleStartDrag(e, seg, 'right')}
                                                        className="absolute right-0 top-0 bottom-0 w-2.5 bg-indigo-500 cursor-ew-resize flex items-center justify-center z-30 border-l border-indigo-600 hover:bg-indigo-600"
                                                        title="Drag to trim end"
                                                    >
                                                        <div className="w-[1px] h-3 bg-white/90 rounded-full" />
                                                    </div>
                                                </>
                                            )}
                                            <span className="text-[9px] font-bold text-slate-400 tracking-tight px-3 truncate">
                                                Clip {idx + 1} ({(seg.end - seg.start).toFixed(1)}s)
                                            </span>
                                        </div>
                                    );
                                })}

                                {/* Active Playhead vertical bar */}
                                {duration > 0 && (
                                    <div 
                                        style={{ left: `${(currentTime / duration) * 100}%` }}
                                        className="absolute top-0 bottom-0 w-0.5 bg-indigo-400 z-20 pointer-events-none"
                                    >
                                        <div className="w-3 h-3 bg-indigo-400 rounded-full absolute -top-1.5 -left-1.5 border border-white shadow shadow-indigo-500/50" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Player controls */}
                        <div className="flex justify-center">
                            <button
                                onClick={handlePlayToggle}
                                className="flex items-center justify-center gap-1.5 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                            >
                                {isPlaying ? (
                                    <>
                                        <Square size={13} fill="white" />
                                        <span>Pause Preview</span>
                                    </>
                                ) : (
                                    <>
                                        <Play size={13} fill="white" />
                                        <span>Play Timeline</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5 shrink-0">
                    <button
                        onClick={onClose}
                        disabled={isRendering}
                        className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleRenderAndSave}
                        disabled={isRendering || segments.length === 0}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                        <Check size={14} />
                        <span>Render & Save</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default VideoTrimmerModal;
