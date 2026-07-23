import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, ChevronRight, Eye, Trash, Folder, FolderOpen, 
    ArrowLeft, RefreshCw, Camera, Video, Mic, Phone, FileText, Download, Loader2, Upload
} from 'lucide-react';

// --- Custom WaveformPlayer Component for Modal ---
const WaveformPlayer = ({ src, id, durationStr }) => {
    const audioRef = useRef(null);
    const canvasRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    const parseTimeToSeconds = (timeStr) => {
        if (!timeStr) return 0;
        const parts = String(timeStr).split(':').map(Number);
        if (parts.some(isNaN)) return 0;
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 0;
    };

    const [duration, setDuration] = useState(() => {
        if (durationStr) {
            return parseTimeToSeconds(durationStr);
        }
        return 0;
    });

    useEffect(() => {
        if (durationStr) {
            setDuration(parseTimeToSeconds(durationStr));
        }
    }, [durationStr]);

    const peaks = useMemo(() => {
        const seed = String(id || src).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        let rand = seed;
        const lcg = () => {
            rand = (rand * 1664525 + 1013904223) % 4294967296;
            return rand / 4294967296;
        };
        const numPeaks = 45;
        const res = [];
        for (let i = 0; i < numPeaks; i++) {
            res.push(0.15 + lcg() * 0.7);
        }
        return res;
    }, [id, src]);

    const handlePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(e => console.error("Audio playback error:", e));
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            const audioDuration = audioRef.current.duration;
            if (audioDuration && audioDuration !== Infinity && !isNaN(audioDuration)) {
                setDuration(audioDuration);
            }
        }
    };

    const handleAudioEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const handleCanvasClick = (e) => {
        const canvas = canvasRef.current;
        const audio = audioRef.current;
        if (!canvas || !audio || duration === 0) return;

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const cx = rect.width / 2;

        const barWidth = 2.5;
        const gap = 1.5;
        const pixelsPerSecond = (peaks.length * (barWidth + gap)) / duration;

        const clickTime = audio.currentTime + (clickX - cx) / pixelsPerSecond;
        const newTime = Math.max(0, Math.min(duration, clickTime));

        audio.currentTime = newTime;
        setCurrentTime(newTime);
    };

    useEffect(() => {
        let animId;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const draw = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.scale(dpr, dpr);

            const width = rect.width;
            const height = rect.height;
            const centerY = height / 2;
            const cx = width / 2; // Center playhead

            ctx.clearRect(0, 0, width, height);

            // Draw horizontal dotted line in middle
            ctx.strokeStyle = 'rgba(100, 116, 139, 0.1)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(0, centerY);
            ctx.lineTo(width, centerY);
            ctx.stroke();
            ctx.setLineDash([]); // Reset

            // Draw central solid horizontal line
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(0, centerY);
            ctx.lineTo(width, centerY);
            ctx.stroke();

            const barWidth = 1.5;
            const gap = 0.5;
            const curTime = audioRef.current ? audioRef.current.currentTime : 0;
            const activeBarIndex = duration > 0 ? (curTime / duration) * peaks.length : 0;

            peaks.forEach((peakHeight, i) => {
                // Calculate position relative to center playhead
                const x = cx + (i - activeBarIndex) * (barWidth + gap);

                // Skip drawing if offscreen
                if (x < -10 || x > width + 10) return;

                // Dynamic bounce with ripple propagation
                let factor = 1.0;
                if (isPlaying) {
                    const dist = Math.abs(i - activeBarIndex);
                    const ripple = Math.exp(-dist * 0.15);
                    const timeFactor = Date.now() * 0.015;
                    const currentVoiceAmplitude = peaks[Math.floor(activeBarIndex)] || 0.05;
                    factor = 1.0 + Math.sin(dist * 0.5 - timeFactor) * 0.4 * currentVoiceAmplitude * ripple;
                }

                const barHeight = peakHeight * height * 0.75 * factor;

                if (barHeight > 1) {
                    // Played vs unplayed colors
                    if (i <= activeBarIndex) {
                        ctx.strokeStyle = '#ef4444'; // Red
                    } else {
                        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)'; // Slate gray translucent
                    }
                    ctx.lineWidth = barWidth;
                    ctx.beginPath();
                    ctx.moveTo(x, centerY - barHeight / 2);
                    ctx.lineTo(x, centerY + barHeight / 2);
                    ctx.stroke();
                }
            });

            // Draw center red playhead line
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx, 0);
            ctx.lineTo(cx, height);
            ctx.stroke();

            // Small red circle at the top of playhead
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(cx, 3, 2, 0, Math.PI * 2);
            ctx.fill();

            if (isPlaying) {
                animId = requestAnimationFrame(draw);
            }
        };

        draw();

        return () => {
            if (animId) {
                cancelAnimationFrame(animId);
            }
        };
    }, [peaks, duration, isPlaying]);

    const formatTime = (secs) => {
        if (isNaN(secs)) return '00:00';
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = Math.floor(secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-2xl w-full h-11 border border-slate-800 shadow-inner">
            <audio
                ref={audioRef}
                src={src}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleAudioEnded}
            />
            <button
                onClick={handlePlayPause}
                className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all active:scale-90 shrink-0"
            >
                {isPlaying ? (
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                ) : (
                    <svg className="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                )}
            </button>

            <span className="text-[10px] text-slate-400 font-mono select-none min-w-[36px] text-center shrink-0">
                {formatTime(currentTime)}
            </span>

            <div className="flex-1 h-full flex items-center cursor-pointer min-w-0">
                <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    className="w-full h-8"
                />
            </div>

            <span className="text-[10px] text-slate-400 font-mono select-none min-w-[36px] text-center shrink-0">
                {formatTime(duration || 0)}
            </span>

            <svg className="w-4 h-4 text-slate-400 select-none shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
        </div>
    );
};
import toast from 'react-hot-toast';
import { getLocalBlob, deleteLocalBlob } from '../../utils/indexedDB';

const TARGET_FOLDERS = [
    "Screenshot Tool",
    "Screen Recorder",
    "Voice Recorder",
    "Video Recorder",
    "Web-Calling Tool",
    "File Uploader"
];

const FOLDER_ICONS = {
    "Screenshot Tool": Camera,
    "Screen Recorder": Video,
    "Voice Recorder": Mic,
    "Video Recorder": Video,
    "Web-Calling Tool": Phone,
    "File Uploader": Upload
};

const FOLDER_COLORS = {
    "Screenshot Tool": "bg-indigo-50 border-indigo-150 text-indigo-700",
    "Screen Recorder": "bg-emerald-50 border-emerald-150 text-emerald-700",
    "Voice Recorder": "bg-blue-50 border-blue-150 text-blue-700",
    "Video Recorder": "bg-purple-50 border-purple-150 text-purple-700",
    "Web-Calling Tool": "bg-pink-50 border-pink-150 text-pink-700",
    "File Uploader": "bg-amber-50 border-amber-150 text-amber-700"
};

const LocalHistoryModal = ({ isOpen, onClose, onRefresh, readOnly, filterDate }) => {
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [rawFiles, setRawFiles] = useState([]);
    
    // Multi-level History state
    const [historyLevel, setHistoryLevel] = useState(0); // 0: Date Folders list, 1: Tool Folders list, 2: Files list
    const [selectedDateFolder, setSelectedDateFolder] = useState(null); // { id, name }
    const [selectedToolFolder, setSelectedToolFolder] = useState(null); // { id, name }
    const [dateFolders, setDateFolders] = useState([]); // List of date folders

    const [foldersMap, setFoldersMap] = useState({}); // folderName: exists (boolean)
    const [historyFiles, setHistoryFiles] = useState([]);

    // Preview state
    const [previewFile, setPreviewFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewText, setPreviewText] = useState('');
    const [loadingPreview, setLoadingPreview] = useState(false);

    // Robust Date Parser to DD-MM-YYYY
    const parseDateToDdMmYyyy = (dateStr) => {
        if (!dateStr) return 'Unknown Date';
        try {
            // Check if timestamp in milliseconds
            if (!isNaN(dateStr) && typeof dateStr !== 'boolean') {
                const d = new Date(parseInt(dateStr));
                if (!isNaN(d.getTime())) {
                    const dd = String(d.getDate()).padStart(2, '0');
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const yyyy = d.getFullYear();
                    return `${dd}-${mm}-${yyyy}`;
                }
            }
            
            let normalizedDateStr = String(dateStr).trim();
            
            // Clean time parts and extract only the date portion (e.g. before space or comma)
            const dateOnly = normalizedDateStr.split(',')[0].split(' ')[0].trim();
            
            // Try parsing using standard Date constructor
            const d = new Date(normalizedDateStr);
            if (!isNaN(d.getTime())) {
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yyyy = d.getFullYear();
                return `${dd}-${mm}-${yyyy}`;
            }
            
            // 1. Try dot separation (e.g., "04.07.2026")
            const dotParts = dateOnly.split('.');
            if (dotParts.length === 3) {
                let dd, mm, yyyy;
                if (dotParts[0].length === 4) {
                    yyyy = parseInt(dotParts[0]);
                    mm = parseInt(dotParts[1]);
                    dd = parseInt(dotParts[2]);
                } else {
                    dd = parseInt(dotParts[0]);
                    mm = parseInt(dotParts[1]);
                    yyyy = parseInt(dotParts[2]);
                }
                const cleanDate = new Date(yyyy, mm - 1, dd);
                if (!isNaN(cleanDate.getTime())) {
                    const rdd = String(cleanDate.getDate()).padStart(2, '0');
                    const rmm = String(cleanDate.getMonth() + 1).padStart(2, '0');
                    const ryyyy = cleanDate.getFullYear();
                    return `${rdd}-${rmm}-${ryyyy}`;
                }
            }

            // 2. Try slash separation (e.g. "04/07/2026")
            const slashParts = dateOnly.split('/');
            if (slashParts.length === 3) {
                let dd, mm, yyyy;
                if (slashParts[0].length === 4) {
                    yyyy = parseInt(slashParts[0]);
                    mm = parseInt(slashParts[1]);
                    dd = parseInt(slashParts[2]);
                } else {
                    dd = parseInt(slashParts[0]);
                    mm = parseInt(slashParts[1]);
                    yyyy = parseInt(slashParts[2]);
                }
                const cleanDate = new Date(yyyy, mm - 1, dd);
                if (!isNaN(cleanDate.getTime())) {
                    const rdd = String(cleanDate.getDate()).padStart(2, '0');
                    const rmm = String(cleanDate.getMonth() + 1).padStart(2, '0');
                    const ryyyy = cleanDate.getFullYear();
                    return `${rdd}-${rmm}-${ryyyy}`;
                }
            }

            // 3. Try dash separation (e.g. "2026-07-04" or "04-07-2026")
            const dashParts = dateOnly.split('-');
            if (dashParts.length === 3) {
                let dd, mm, yyyy;
                if (dashParts[0].length === 4) {
                    yyyy = parseInt(dashParts[0]);
                    mm = parseInt(dashParts[1]);
                    dd = parseInt(dashParts[2]);
                } else {
                    dd = parseInt(dashParts[0]);
                    mm = parseInt(dashParts[1]);
                    yyyy = parseInt(dashParts[2]);
                }
                const cleanDate = new Date(yyyy, mm - 1, dd);
                if (!isNaN(cleanDate.getTime())) {
                    const rdd = String(cleanDate.getDate()).padStart(2, '0');
                    const rmm = String(cleanDate.getMonth() + 1).padStart(2, '0');
                    const ryyyy = cleanDate.getFullYear();
                    return `${rdd}-${rmm}-${ryyyy}`;
                }
            }
        } catch (e) {
            console.error("Error parsing local date:", dateStr, e);
        }
        return 'Unknown Date';
    };

    // Load and aggregate all local data
    const loadLocalHistory = async () => {
        setLoadingHistory(true);
        try {
            const allFiles = [];

            // 1. Screenshots
            const screenshotsStr = localStorage.getItem('practice_screenshots');
            if (screenshotsStr) {
                const list = JSON.parse(screenshotsStr);
                list.forEach(item => {
                    allFiles.push({
                        id: item.id,
                        originalName: item.timestamp,
                        timestamp: item.timestamp,
                        toolType: 'Screenshot Tool',
                        mimeType: 'image/png',
                        url: item.url, // holds base64 data URL
                        size: item.size || 'Unknown Size',
                        createdTime: item.id ? parseInt(item.id.replace('scr_', '')) || Date.now() : Date.now()
                    });
                });
            }

            // 2. Screen Recordings
            const screenStr = localStorage.getItem('practice_screen_recordings');
            if (screenStr) {
                const list = JSON.parse(screenStr);
                list.forEach(item => {
                    allFiles.push({
                        id: item.id,
                        originalName: item.timestamp,
                        timestamp: item.timestamp,
                        toolType: 'Screen Recorder',
                        mimeType: 'video/webm',
                        url: '', // Loaded from IndexedDB on demand
                        size: item.size || 'Unknown Size',
                        createdTime: item.id ? parseInt(item.id.replace('screen_', '')) || Date.now() : Date.now()
                    });
                });
            }

            // 3. Videos
            const videoStr = localStorage.getItem('practice_videos');
            if (videoStr) {
                const list = JSON.parse(videoStr);
                list.forEach(item => {
                    allFiles.push({
                        id: item.id,
                        originalName: item.timestamp,
                        timestamp: item.timestamp,
                        toolType: 'Video Recorder',
                        mimeType: 'video/webm',
                        url: '', // Loaded on demand
                        size: item.size || 'Unknown Size',
                        createdTime: item.id ? parseInt(item.id.replace('vid_', '')) || Date.now() : Date.now()
                    });
                });
            }

            // 4. Audios
            const audioStr = localStorage.getItem('practice_audios');
            if (audioStr) {
                const list = JSON.parse(audioStr);
                list.forEach(item => {
                    allFiles.push({
                        id: item.id,
                        originalName: item.timestamp,
                        timestamp: item.timestamp,
                        toolType: 'Voice Recorder',
                        mimeType: 'audio/wav',
                        url: '', // Loaded on demand
                        size: item.size || 'Unknown Size',
                        createdTime: item.id ? parseInt(item.id.replace('audio_', '')) || Date.now() : Date.now(),
                        duration: item.duration || '00:00'
                    });
                });
            }

            // 5. Call Logs
            const logsStr = localStorage.getItem('practice_call_logs');
            if (logsStr) {
                const list = JSON.parse(logsStr);
                list.forEach(item => {
                    // Extract numeric timestamp if possible
                    let createdTime = Date.now();
                    if (item.id && item.id.startsWith('log_')) {
                        createdTime = parseInt(item.id.replace('log_', '')) || Date.now();
                    }
                    allFiles.push({
                        id: item.id,
                        originalName: `Call with ${item.name}`,
                        timestamp: item.date,
                        toolType: 'Web-Calling Tool',
                        mimeType: 'text/plain',
                        url: '',
                        size: '1 KB',
                        createdTime: createdTime,
                        callDetails: item
                    });
                });
            }

            // 6. File Uploads
            const fileUploadsStr = localStorage.getItem('practice_file_uploads');
            if (fileUploadsStr) {
                try {
                    const list = JSON.parse(fileUploadsStr);
                    list.forEach(item => {
                        allFiles.push({
                            id: item.id,
                            originalName: item.name || item.timestamp,
                            timestamp: item.timestamp,
                            toolType: 'File Uploader',
                            mimeType: item.mimeType || 'application/octet-stream',
                            url: '', // Loaded on demand
                            size: item.size || 'Unknown Size',
                            createdTime: item.id ? parseInt(item.id.replace('file_', '')) || Date.now() : Date.now()
                        });
                    });
                } catch (e) {
                    console.error("Failed to parse local file uploads in history:", e);
                }
            }

            // Map standard parsed Date
            const parsedFiles = allFiles.map(file => {
                const dateStr = parseDateToDdMmYyyy(file.timestamp);
                return { ...file, parsedDate: dateStr };
            });

            const filteredFiles = filterDate
                ? parsedFiles.filter(f => f.parsedDate === filterDate)
                : parsedFiles;

            // Group dates (DD-MM-YYYY)
            const datesMap = {};
            filteredFiles.forEach(f => {
                if (f.parsedDate !== 'Unknown Date') {
                    datesMap[f.parsedDate] = true;
                }
            });

            const datesList = Object.keys(datesMap).sort((a, b) => {
                const aParts = a.split('-');
                const bParts = b.split('-');
                const aTime = new Date(`${aParts[2]}-${aParts[1]}-${aParts[0]}`).getTime();
                const bTime = new Date(`${bParts[2]}-${bParts[1]}-${bParts[0]}`).getTime();
                return bTime - aTime; // Newest first
            });

            setRawFiles(filteredFiles);
            setDateFolders(datesList.map((d, idx) => ({ id: `date_${idx}`, name: d })));
        } catch (err) {
            console.error("Failed to load local history:", err);
            toast.error("Failed to fetch local practice storage files.");
        } finally {
            setLoadingHistory(false);
        }
    };

    // Load local history on open
    useEffect(() => {
        if (isOpen) {
            setHistoryLevel(0);
            setSelectedDateFolder(null);
            setSelectedToolFolder(null);
            setPreviewFile(null);
            setPreviewUrl('');
            setPreviewText('');
            loadLocalHistory();
        }
    }, [isOpen]);

    // Clean up preview URLs
    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // Open Date Folder (Level 1: Tool Folders)
    const handleOpenDateFolder = (dateFolder) => {
        setSelectedDateFolder(dateFolder);
        setHistoryLevel(1);
        setSelectedToolFolder(null);

        // Filter files for this date and map which tools have files
        const filesForDate = rawFiles.filter(f => f.parsedDate === dateFolder.name);
        const tempMap = {};
        TARGET_FOLDERS.forEach(folderName => {
            const hasFiles = filesForDate.some(f => f.toolType === folderName);
            if (hasFiles) {
                tempMap[folderName] = true; // folder exists on this day
            }
        });
        setFoldersMap(tempMap);
    };

    // Open Tool Folder (Level 2: Files list)
    const handleOpenToolFolder = (folderName) => {
        setSelectedToolFolder({ name: folderName });
        setHistoryLevel(2);

        // Filter files for both date and toolType
        const filtered = rawFiles.filter(f => 
            f.parsedDate === selectedDateFolder.name && 
            f.toolType === folderName
        );

        // Sort chronologically by createdTime
        const sorted = [...filtered].sort((a, b) => a.createdTime - b.createdTime);

        // Hydrate sequential naming: f1, f2, f3...
        const extensionMap = {
            "Screenshot Tool": "png",
            "Screen Recorder": "webm",
            "Video Recorder": "webm",
            "Voice Recorder": "wav",
            "Web-Calling Tool": "txt"
        };
        const ext = extensionMap[folderName] || "png";

        const namedFiles = sorted.map((file, idx) => ({
            ...file,
            name: `f${idx + 1}_${folderName}.${ext}`
        }));

        setHistoryFiles(namedFiles);
    };

    // Preview Local File
    const handlePreviewFile = async (file) => {
        setPreviewFile(file);
        setLoadingPreview(true);
        setPreviewText('');
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl('');
        }

        try {
            if (file.toolType === 'Screenshot Tool') {
                // Screenshots are already base64 data URLs
                setPreviewUrl(file.url);
            } else if (file.toolType === 'Web-Calling Tool') {
                // Call logs are styled text
                const details = file.callDetails;
                const logText = `CALL PRACTICE REPORT
----------------------------------
ID:        ${details.id}
Partner:   ${details.name}
Type:      ${details.type}
Duration:  ${details.duration}
Status:    ${details.status}
Date:      ${details.date}
Synced:    ${details.synced ? 'Yes' : 'No'}
----------------------------------
Log saved locally.`;
                setPreviewText(logText);
                setPreviewUrl('text-report');
            } else {
                // Load from IndexedDB
                const blob = await getLocalBlob(file.id);
                if (blob) {
                    const objectUrl = URL.createObjectURL(blob);
                    setPreviewUrl(objectUrl);
                } else {
                    throw new Error("Local binary data could not be located in IndexedDB storage.");
                }
            }
        } catch (err) {
            console.error("Preview failed:", err);
            toast.error(err.message || "Failed to load local file preview.");
            setPreviewFile(null);
        } finally {
            setLoadingPreview(false);
        }
    };

    // Delete Local File
    const handleDeleteFile = async (file) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this file from your local storage?");
        if (!confirmDelete) return;

        try {
            if (file.toolType === 'Screenshot Tool') {
                const list = JSON.parse(localStorage.getItem('practice_screenshots') || '[]');
                const filtered = list.filter(item => item.id !== file.id);
                localStorage.setItem('practice_screenshots', JSON.stringify(filtered));
            } else if (file.toolType === 'Screen Recorder') {
                const list = JSON.parse(localStorage.getItem('practice_screen_recordings') || '[]');
                const filtered = list.filter(item => item.id !== file.id);
                localStorage.setItem('practice_screen_recordings', JSON.stringify(filtered));
                await deleteLocalBlob(file.id);
            } else if (file.toolType === 'Video Recorder') {
                const list = JSON.parse(localStorage.getItem('practice_videos') || '[]');
                const filtered = list.filter(item => item.id !== file.id);
                localStorage.setItem('practice_videos', JSON.stringify(filtered));
                await deleteLocalBlob(file.id);
            } else if (file.toolType === 'Voice Recorder') {
                const list = JSON.parse(localStorage.getItem('practice_audios') || '[]');
                const filtered = list.filter(item => item.id !== file.id);
                localStorage.setItem('practice_audios', JSON.stringify(filtered));
                await deleteLocalBlob(file.id);
            } else if (file.toolType === 'File Uploader') {
                const list = JSON.parse(localStorage.getItem('practice_file_uploads') || '[]');
                const filtered = list.filter(item => item.id !== file.id);
                localStorage.setItem('practice_file_uploads', JSON.stringify(filtered));
                await deleteLocalBlob(file.id);
            }

            toast.success("File deleted from local storage!");
            if (onRefresh) onRefresh();

            // Refresh our modal data state
            const updatedRaw = rawFiles.filter(item => item.id !== file.id);
            setRawFiles(updatedRaw);

            // Recompute dateFolders from updated rawFiles
            const datesMap = {};
            updatedRaw.forEach(f => {
                if (f.parsedDate !== 'Unknown Date') {
                    datesMap[f.parsedDate] = true;
                }
            });

            const datesList = Object.keys(datesMap).sort((a, b) => {
                const aParts = a.split('-');
                const bParts = b.split('-');
                const aTime = new Date(`${aParts[2]}-${aParts[1]}-${aParts[0]}`).getTime();
                const bTime = new Date(`${bParts[2]}-${bParts[1]}-${bParts[0]}`).getTime();
                return bTime - aTime; // Newest first
            });
            setDateFolders(datesList.map((d, idx) => ({ id: `date_${idx}`, name: d })));

            // Re-render level 2 or level 1 lists
            const filesForDate = updatedRaw.filter(f => f.parsedDate === selectedDateFolder.name);
            const remainingInFolder = filesForDate.filter(f => f.toolType === selectedToolFolder.name);

            if (filesForDate.length === 0) {
                // If the entire date became empty, go back to level 0 (Dates list)
                setHistoryLevel(0);
                setSelectedDateFolder(null);
                setSelectedToolFolder(null);
            } else if (remainingInFolder.length === 0) {
                // If only the tool folder became empty, go back to level 1 (Tools list)
                handleOpenDateFolder(selectedDateFolder);
            } else {
                // Re-evaluate filenames with f1/f2/f3 sequence
                const sorted = [...remainingInFolder].sort((a, b) => a.createdTime - b.createdTime);
                const extensionMap = {
                    "Screenshot Tool": "png",
                    "Screen Recorder": "webm",
                    "Video Recorder": "webm",
                    "Voice Recorder": "wav",
                    "Web-Calling Tool": "txt"
                };
                const ext = extensionMap[selectedToolFolder.name] || "png";
                
                const namedFiles = sorted.map((item, idx) => ({
                    ...item,
                    name: `f${idx + 1}_${selectedToolFolder.name}.${ext}`
                }));
                setHistoryFiles(namedFiles);
            }
        } catch (err) {
            console.error("Local delete failed:", err);
            toast.error("Failed to delete local file.");
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left font-sans">
            <div className="bg-[#f5f5f5] rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden relative transition-all duration-300 flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-2">
                        <FolderOpen className="w-6 h-6 text-indigo-600" />
                        <div>
                            <span className="font-extrabold text-slate-800 text-sm tracking-tight block">Local Practice Storage</span>
                            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                                Organized Offline History
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
                    <div className="h-full">
                        
                        {/* Level 0: Date Folders List */}
                        {historyLevel === 0 && !previewFile && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Local History (Dates)</h3>
                                    <button 
                                        onClick={loadLocalHistory}
                                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                                        title="Refresh Dates"
                                    >
                                        <RefreshCw size={14} />
                                    </button>
                                </div>

                                {loadingHistory ? (
                                    <div className="flex flex-col items-center justify-center py-10 space-y-3 text-slate-400">
                                        <Loader2 size={24} className="animate-spin text-[#3E3ADD]" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Loading Dates...</span>
                                    </div>
                                ) : dateFolders.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400">
                                        <FolderOpen size={32} className="mx-auto text-slate-300 mb-2" />
                                        <p className="text-xs italic font-medium">No local history found.</p>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Capture screenshots or recordings on page to see dates here</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[350px] overflow-y-auto pr-1">
                                        {dateFolders.map((dateFolder) => (
                                            <button
                                                key={dateFolder.id}
                                                onClick={() => handleOpenDateFolder(dateFolder)}
                                                className="p-4 rounded-2xl border border-slate-150 bg-white hover:bg-slate-50 hover:border-slate-300 text-left flex items-center justify-between group transition-all cursor-pointer outline-none"
                                            >
                                                <div className="flex items-center gap-3.5 min-w-0">
                                                    <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-150 text-indigo-700 group-hover:scale-105 transition-transform">
                                                        <FolderOpen size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-xs font-black text-slate-800 truncate leading-snug">{dateFolder.name}</h4>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Day Folder</p>
                                                    </div>
                                                </div>
                                                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Level 1: Tool Folders list inside selectedDateFolder */}
                        {historyLevel === 1 && !previewFile && selectedDateFolder && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <button
                                        onClick={() => {
                                            setHistoryLevel(0);
                                            setSelectedDateFolder(null);
                                        }}
                                        className="flex items-center gap-1.5 text-xs font-black text-slate-505 hover:text-slate-800 transition-colors uppercase tracking-wider"
                                    >
                                        <ArrowLeft size={14} />
                                        Back to Dates
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-xs text-slate-800 uppercase tracking-tight">LMS / {selectedDateFolder.name}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mt-2">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Practice Tools</h3>
                                </div>

                                {TARGET_FOLDERS.filter(folderName => !!foldersMap[folderName]).length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 col-span-2">
                                        <FolderOpen size={32} className="mx-auto text-slate-300 mb-2" />
                                        <p className="text-xs italic font-medium">No uploads found for this date.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        {TARGET_FOLDERS.filter(folderName => !!foldersMap[folderName]).map((folderName) => {
                                            const IconComponent = FOLDER_ICONS[folderName] || Folder;
                                            const folderStyle = FOLDER_COLORS[folderName] || "bg-slate-50 border-slate-155 text-slate-700";

                                            return (
                                                <button
                                                    key={folderName}
                                                    onClick={() => handleOpenToolFolder(folderName)}
                                                    className="p-4 rounded-2xl border border-slate-150 bg-white hover:bg-slate-50 hover:border-slate-300 cursor-pointer text-left flex items-center justify-between group transition-all outline-none"
                                                >
                                                    <div className="flex items-center gap-3.5 min-w-0">
                                                        <div className={`p-3 rounded-xl ${folderStyle} group-hover:scale-105 transition-transform`}>
                                                            <IconComponent size={18} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="text-xs font-black text-slate-800 truncate leading-snug">{folderName}</h4>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                                View files
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Level 2: Files listing inside selectedToolFolder */}
                        {historyLevel === 2 && !previewFile && selectedToolFolder && selectedDateFolder && (
                            <div className="space-y-4 flex flex-col h-full">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <button
                                        onClick={() => handleOpenDateFolder(selectedDateFolder)}
                                        className="flex items-center gap-1.5 text-xs font-black text-slate-550 hover:text-slate-800 transition-colors uppercase tracking-wider"
                                    >
                                        <ArrowLeft size={14} />
                                        Back to Tools
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">{selectedDateFolder.name}</span>
                                        <span className="text-slate-300">/</span>
                                        <span className="font-extrabold text-xs text-slate-800 uppercase tracking-tight">{selectedToolFolder.name}</span>
                                    </div>
                                </div>

                                <div className="flex-1 min-h-[220px]">
                                    {historyFiles.length === 0 ? (
                                        <div className="text-center py-12 text-slate-400">
                                            <FolderOpen size={32} className="mx-auto text-slate-300 mb-2" />
                                            <p className="text-xs italic font-medium">This folder is empty.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                                            {historyFiles.map(file => {
                                                const isImage = file.toolType === 'Screenshot Tool';
                                                return (
                                                    <div 
                                                        key={file.id} 
                                                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-150 rounded-xl hover:border-slate-300 transition-colors gap-3"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            {isImage && file.url ? (
                                                                <img
                                                                    src={file.url}
                                                                    alt="thumbnail"
                                                                    className="w-12 h-9 object-cover rounded-lg border border-slate-200 bg-white"
                                                                />
                                                            ) : (
                                                                <div className="w-12 h-9 rounded-lg bg-slate-200 flex items-center justify-center text-slate-505 shrink-0">
                                                                    <FileText size={16} />
                                                                </div>
                                                            )}
                                                            
                                                            <div className="min-w-0 flex-1">
                                                                <h5 className="text-[11px] font-black text-slate-700 truncate leading-tight">{file.name}</h5>
                                                                <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                                                                    {file.size} • {new Date(file.createdTime).toLocaleTimeString()}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                onClick={() => handlePreviewFile(file)}
                                                                className="p-1.5 hover:bg-slate-200 rounded text-slate-550 hover:text-slate-800"
                                                                title="Preview File"
                                                            >
                                                                <Eye size={13} />
                                                            </button>
                                                            {file.toolType === 'Screenshot Tool' && (
                                                                <a
                                                                    href={file.url}
                                                                    download={file.name}
                                                                    className="p-1.5 hover:bg-slate-200 rounded text-slate-555 hover:text-slate-800"
                                                                    title="Download File"
                                                                >
                                                                    <Download size={13} />
                                                                </a>
                                                            )}
                                                            {!readOnly && (
                                                                <button
                                                                    onClick={() => handleDeleteFile(file)}
                                                                    className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-655"
                                                                    title="Delete File"
                                                                >
                                                                    <Trash size={13} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Sub-View: Direct Media Preview */}
                        {previewFile && (
                            <div className="space-y-4 animate-fade-in flex flex-col">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <button
                                        onClick={() => {
                                            setPreviewFile(null);
                                            setPreviewUrl('');
                                            setPreviewText('');
                                        }}
                                        className="flex items-center gap-1.5 text-xs font-black text-slate-550 hover:text-slate-800 transition-colors uppercase tracking-wider"
                                    >
                                        <ArrowLeft size={14} />
                                        Back to List
                                    </button>
                                    <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">
                                        Local Preview
                                    </span>
                                </div>

                                <div className="text-center py-2">
                                    <h4 className="text-xs font-black text-slate-800 truncate mb-1">{previewFile.name}</h4>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                        Type: {previewFile.mimeType} • Size: {previewFile.size}
                                    </p>
                                </div>

                                {/* Display container */}
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-center min-h-[220px] max-h-[320px] overflow-hidden relative">
                                    {loadingPreview ? (
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <Loader2 size={24} className="animate-spin text-[#3E3ADD]" />
                                            <span className="text-[10px] font-black uppercase tracking-wider">Loading Preview...</span>
                                        </div>
                                    ) : previewUrl ? (
                                        <>
                                            {previewFile.toolType === 'Screenshot Tool' && (
                                                <img 
                                                    src={previewUrl} 
                                                    alt="preview" 
                                                    className="max-w-full max-h-[280px] object-contain rounded-xl shadow-sm"
                                                />
                                            )}
                                            {(previewFile.toolType === 'Screen Recorder' || previewFile.toolType === 'Video Recorder') && (
                                                <video 
                                                    src={previewUrl} 
                                                    controls 
                                                    className="max-w-full max-h-[280px] rounded-xl shadow-sm"
                                                />
                                            )}
                                            {previewFile.toolType === 'Voice Recorder' && (
                                                <div className="w-full max-w-sm text-center space-y-4 py-8">
                                                    <WaveformPlayer src={previewUrl} id={previewFile.id} durationStr={previewFile.duration || '00:00'} />
                                                </div>
                                            )}
                                            {previewFile.toolType === 'Web-Calling Tool' && (
                                                <pre className="w-full text-left font-mono text-[10px] bg-[#0b1329] text-slate-250 p-4 rounded-xl overflow-auto max-h-[280px] leading-relaxed shadow-inner">
                                                    {previewText}
                                                </pre>
                                            )}
                                            {previewFile.toolType === 'File Uploader' && (
                                                <div className="w-full text-center space-y-4 py-4 max-h-[280px] overflow-y-auto">
                                                    {previewFile.mimeType.startsWith('image/') ? (
                                                        <img 
                                                            src={previewUrl} 
                                                            alt="preview" 
                                                            className="max-w-full max-h-[200px] object-contain rounded-xl shadow-sm mx-auto"
                                                        />
                                                    ) : previewFile.mimeType.startsWith('video/') ? (
                                                        <video 
                                                            src={previewUrl} 
                                                            controls 
                                                            className="max-w-full max-h-[200px] rounded-xl shadow-sm mx-auto"
                                                        />
                                                    ) : previewFile.mimeType.startsWith('audio/') ? (
                                                        <div className="w-full max-w-sm text-center space-y-4 py-4 mx-auto">
                                                            <WaveformPlayer src={previewUrl} id={previewFile.id} durationStr={previewFile.duration || '00:00'} />
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-3">
                                                            <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 shadow-sm">
                                                                <FileText size={24} />
                                                            </div>
                                                            <div className="text-xs">
                                                                <p className="font-bold text-slate-800 truncate max-w-xs">{previewFile.originalName}</p>
                                                                <p className="text-slate-400 mt-1">{previewFile.size} • {previewFile.mimeType}</p>
                                                            </div>
                                                            <a 
                                                                href={previewUrl} 
                                                                download={previewFile.originalName} 
                                                                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-[#3E3ADD] border border-indigo-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                                            >
                                                                <Download size={14} /> Download to View
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-slate-400 text-xs italic font-medium font-bold">Failed to load preview url</div>
                                    )}
                                </div>
                                {!readOnly && (
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => {
                                                const fileToDelete = previewFile;
                                                setPreviewFile(null);
                                                setPreviewUrl('');
                                                setPreviewText('');
                                                handleDeleteFile(fileToDelete);
                                            }}
                                            className="w-full py-3 bg-red-50 border border-red-200 hover:bg-red-100 text-red-655 rounded-xl text-xs font-black transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer animate-fade-in"
                                        >
                                            <Trash size={13} /> Delete Local File
                                        </button>
                                    </div>
                                 )}
                            </div>
                        )}

                    </div>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}} />
        </div>,
        document.body
    );
};

export default LocalHistoryModal;
