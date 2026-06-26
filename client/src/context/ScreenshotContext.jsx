import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import html2canvas from 'html2canvas';

const ScreenshotContext = createContext();

export const useScreenshot = () => useContext(ScreenshotContext);

export const ScreenshotProvider = ({ children }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const pipWindowRef = useRef(null);
    const globalCanvasRef = useRef(null);

    // States
    const [screenshots, setScreenshots] = useState([]);
    const [drafts, setDrafts] = useState([]);
    const [stream, setStream] = useState(null);
    const [streamConnected, setStreamConnected] = useState(true);
    const [pipActive, setPipActive] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);

    // Capture settings
    const [captureSource, setCaptureSource] = useState('webpage'); // 'webpage' or 'desktop'
    const [sourceType, setSourceType] = useState('camera'); // 'camera' (simple screen), 'area' (crop), 'long' (full page)
    
    // Google Drive Link states
    const [driveLinked, setDriveLinked] = useState(() => {
        return localStorage.getItem('screenshot_drive_linked') === 'true';
    });
    const [driveEmail, setDriveEmail] = useState(() => {
        return localStorage.getItem('screenshot_drive_email') || '';
    });
    const [saveDestination, setSaveDestination] = useState(() => {
        return localStorage.getItem('screenshot_save_destination') || 'local';
    });
    const [latestCapture, setLatestCapture] = useState(null);

    const handleSetSaveDestination = (val) => {
        setSaveDestination(val);
        localStorage.setItem('screenshot_save_destination', val);
    };
    const [cropShape, setCropShape] = useState('rect'); // 'rect' or 'custom'
    const [resolution, setResolution] = useState('1080p');
    const [format, setFormat] = useState('PNG');
    const [quality, setQuality] = useState('High');

    // Crop coordinates (shared)
    const [rectStart, setRectStart] = useState(null);
    const [rectEnd, setRectEnd] = useState(null);
    const [customPath, setCustomPath] = useState([]);

    // Long scroll capture state
    const [scrollingActive, setScrollingActive] = useState(false);
    const [scrollPercent, setScrollPercent] = useState(0);
    const [flashActive, setFlashActive] = useState(false);

    // Cloud state
    const [cloudFiles, setCloudFiles] = useState([]);
    const [cloudSpace, setCloudSpace] = useState({ used: 0, limit: 300 * 1024 * 1024 });
    const [cloudLoading, setCloudLoading] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('practice_screenshots');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setScreenshots(parsed);
                if (parsed.length > 0) {
                    setLatestCapture(parsed[0]);
                }
            } catch (e) {
                console.error("Failed to parse saved screenshots", e);
            }
        }
    }, []);

    const saveToLocalStorage = (list) => {
        localStorage.setItem('practice_screenshots', JSON.stringify(list));
    };

    // Audio shutter effect
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

    // Stop Media Stream
    const stopStream = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setStreamConnected(false);
        }
        if (window.sharedScreenStream) {
            window.sharedScreenStream.getTracks().forEach(track => track.stop());
            window.sharedScreenStream = null;
        }
    };

    // Attach stream to hidden video element
    useEffect(() => {
        const video = videoRef.current;
        if (video && stream) {
            video.srcObject = stream;
            video.play().catch(err => {
                console.error("Hidden video play failed:", err);
            });
        }
    }, [stream]);

    // Handle stream tracks ended event
    useEffect(() => {
        if (stream) {
            const track = stream.getVideoTracks()[0];
            if (track) {
                track.onended = () => {
                    setStream(null);
                    setStreamConnected(false);
                    toast.success("Screen stream disconnected.");
                };
            }
        }
    }, [stream]);

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

    // Auto-save screenshot to server cloud storage under Google Drive email
    const autoSaveToGoogleDrive = async (dataUrl, id, formatVal, resolutionVal) => {
        try {
            const blob = dataURIToBlob(dataUrl);
            if (!blob) return;

            const formData = new FormData();
            formData.append('file', blob, `screenshot_${id}.${formatVal.toLowerCase()}`);
            formData.append('toolType', 'screenshot');
            formData.append('resolution', resolutionVal);
            formData.append('format', formatVal);
            formData.append('googleDriveEmail', localStorage.getItem('screenshot_drive_email') || '');
            const searchParams = new URLSearchParams(window.location.search);
            const inboxVal = searchParams.get('inbox');
            if (inboxVal) {
                formData.append('inbox', inboxVal);
            }

            await axios.post('/api/practice-files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success(`Auto-saved to Google Drive (${localStorage.getItem('screenshot_drive_email')})`);
            
            // Refresh cloud files list if currently viewing cloud tab
            if (window.refreshCloudGallery) {
                window.refreshCloudGallery();
            }
        } catch (err) {
            console.error("Auto-save to Google Drive failed:", err);
            toast.error("Auto-save to Google Drive failed.");
        }
    };

    // Connect screen share (Requests screen stream from navigator)
    const connectScreenShare = async () => {
        try {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            const mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: "always"
                },
                audio: false
            });
            setStream(mediaStream);
            setStreamConnected(true);
            
            // Listen for stream ended (e.g. user clicks browser's Stop Sharing button)
            const track = mediaStream.getVideoTracks()[0];
            if (track) {
                track.onended = () => {
                    setStream(null);
                    setStreamConnected(false);
                    toast.success("Desktop capture stream disconnected.");
                };
            }
            
            toast.success("Desktop capture stream connected!");
            return mediaStream;
        } catch (err) {
            console.error("Failed to connect screen share:", err);
            toast.error("Screen sharing permission denied or failed.");
            return null;
        }
    };

    // Capture Visible Screen (Simple Screenshot)
    const captureSimpleScreenshot = async () => {
        try {
            setFlashActive(true);
            setTimeout(() => setFlashActive(false), 150);
            playShutterSound();

            let canvas;
            let resolutionType = 'Screen';

            if (captureSource === 'desktop' && stream) {
                const video = videoRef.current;
                if (!video) {
                    toast.error("Video capture element not ready.");
                    return;
                }
                canvas = document.createElement('canvas');
                canvas.width = video.videoWidth || window.innerWidth;
                canvas.height = video.videoHeight || window.innerHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                resolutionType = 'Desktop';
            } else {
                canvas = await html2canvas(document.body, {
                    useCORS: true,
                    allowTaint: true,
                    scrollX: window.scrollX,
                    scrollY: window.scrollY,
                    windowWidth: window.innerWidth,
                    windowHeight: window.innerHeight,
                    x: window.scrollX,
                    y: window.scrollY,
                    width: window.innerWidth,
                    height: window.innerHeight,
                    backgroundColor: '#f8fafc',
                    logging: false
                });
            }

            // Downscaling handler based on settings
            let finalCanvas = canvas;
            if (resolution !== '1080p') {
                const targetH = resolution === '720p' ? 720 : 480;
                if (canvas.height > targetH) {
                    const scale = targetH / canvas.height;
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = canvas.width * scale;
                    tempCanvas.height = targetH;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, tempCanvas.width, tempCanvas.height);
                    finalCanvas = tempCanvas;
                }
            }

            const mimeType = format === 'PNG' ? 'image/png' : 'image/jpeg';
            const dataUrl = finalCanvas.toDataURL(mimeType);

            const searchParams = new URLSearchParams(window.location.search);
            const inboxVal = searchParams.get('inbox');
            const newScreenshot = {
                id: 'snap_' + Date.now(),
                timestamp: new Date().toLocaleString(),
                url: dataUrl,
                size: Math.round((dataUrl.length * 3) / 4 / 1024) + ' KB',
                format: format,
                resolution: `${Math.round(finalCanvas.width)}x${Math.round(finalCanvas.height)} (${resolutionType})`,
                inbox: inboxVal || ''
            };

            setLatestCapture(newScreenshot);
            setDrafts(prev => [newScreenshot, ...prev]);
            toast.success("Screenshot captured and added to drafts!");
        } catch (err) {
            console.error("Simple screenshot capture failed:", err);
            toast.error("Failed to capture screenshot.");
        }
    };

    // Capture Crop Screen
    const captureCroppedScreenshot = async () => {
        try {
            setFlashActive(true);
            setTimeout(() => setFlashActive(false), 150);
            playShutterSound();

            // 1. Capture the source image (either desktop stream or webpage DOM)
            let mainCanvas;
            const video = videoRef.current;

            if (captureSource === 'desktop' && stream) {
                if (!video) {
                    toast.error("Video capture element not ready.");
                    return;
                }
                mainCanvas = document.createElement('canvas');
                mainCanvas.width = video.videoWidth || window.innerWidth;
                mainCanvas.height = video.videoHeight || window.innerHeight;
                const ctx = mainCanvas.getContext('2d');
                ctx.drawImage(video, 0, 0, mainCanvas.width, mainCanvas.height);
            } else {
                mainCanvas = await html2canvas(document.body, {
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#f8fafc',
                    logging: false
                });
            }

            // 2. Create a temporary canvas to draw the cropped region
            const cropCanvas = document.createElement('canvas');
            const cropCtx = cropCanvas.getContext('2d');

            const pixelRatio = 1; // Since html2canvas renders at standard CSS pixels in these options

            if (cropShape === 'rect' && rectStart && rectEnd) {
                // Get relative coordinates
                let x1, y1, x2, y2;
                if (captureSource === 'desktop' && stream) {
                    x1 = (rectStart.x / 100) * mainCanvas.width;
                    y1 = (rectStart.y / 100) * mainCanvas.height;
                    x2 = (rectEnd.x / 100) * mainCanvas.width;
                    y2 = (rectEnd.y / 100) * mainCanvas.height;
                } else {
                    x1 = (rectStart.x / 100) * window.innerWidth + window.scrollX;
                    y1 = (rectStart.y / 100) * window.innerHeight + window.scrollY;
                    x2 = (rectEnd.x / 100) * window.innerWidth + window.scrollX;
                    y2 = (rectEnd.y / 100) * window.innerHeight + window.scrollY;
                }

                const sx = Math.min(x1, x2) * (captureSource === 'desktop' ? 1 : pixelRatio);
                const sy = Math.min(y1, y2) * (captureSource === 'desktop' ? 1 : pixelRatio);
                const sw = Math.abs(x1 - x2) * (captureSource === 'desktop' ? 1 : pixelRatio);
                const sh = Math.abs(y1 - y2) * (captureSource === 'desktop' ? 1 : pixelRatio);

                if (sw < 10 || sh < 10) {
                    toast.error("Selected crop area is too small.");
                    return;
                }

                cropCanvas.width = sw;
                cropCanvas.height = sh;

                if (format === 'JPG') {
                    cropCtx.fillStyle = '#FFFFFF';
                    cropCtx.fillRect(0, 0, sw, sh);
                }

                cropCtx.drawImage(mainCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
            } else if (cropShape === 'custom' && customPath.length > 1) {
                const points = customPath.map(p => {
                    if (captureSource === 'desktop' && stream) {
                        return {
                            x: (p.x / 100) * mainCanvas.width,
                            y: (p.y / 100) * mainCanvas.height
                        };
                    } else {
                        return {
                            x: ((p.x / 100) * window.innerWidth + window.scrollX) * pixelRatio,
                            y: ((p.y / 100) * window.innerHeight + window.scrollY) * pixelRatio
                        };
                    }
                });

                const minX = Math.min(...points.map(p => p.x));
                const maxX = Math.max(...points.map(p => p.x));
                const minY = Math.min(...points.map(p => p.y));
                const maxY = Math.max(...points.map(p => p.y));
                const sw = maxX - minX;
                const sh = maxY - minY;

                if (sw < 10 || sh < 10) {
                    toast.error("Drawn custom path area is too small.");
                    return;
                }

                cropCanvas.width = sw;
                cropCanvas.height = sh;

                cropCtx.save();
                cropCtx.beginPath();
                cropCtx.moveTo(points[0].x - minX, points[0].y - minY);
                for (let i = 1; i < points.length; i++) {
                    cropCtx.lineTo(points[i].x - minX, points[i].y - minY);
                }
                cropCtx.closePath();

                if (format === 'JPG') {
                    cropCtx.fillStyle = '#FFFFFF';
                    cropCtx.fillRect(0, 0, sw, sh);
                }

                cropCtx.clip();
                cropCtx.drawImage(mainCanvas, -minX, -minY);
                cropCtx.restore();
            } else {
                toast.error("Please draw a crop selection area first.");
                return;
            }

            // Downscaling handler based on settings
            let finalCanvas = cropCanvas;
            if (resolution !== '1080p') {
                const targetH = resolution === '720p' ? 720 : 480;
                if (cropCanvas.height > targetH) {
                    const scale = targetH / cropCanvas.height;
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = cropCanvas.width * scale;
                    tempCanvas.height = targetH;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.drawImage(cropCanvas, 0, 0, cropCanvas.width, cropCanvas.height, 0, 0, tempCanvas.width, tempCanvas.height);
                    finalCanvas = tempCanvas;
                }
            }

            const mimeType = format === 'PNG' ? 'image/png' : 'image/jpeg';
            const dataUrl = finalCanvas.toDataURL(mimeType);

            const searchParams = new URLSearchParams(window.location.search);
            const inboxVal = searchParams.get('inbox');
            const newScreenshot = {
                id: 'snap_' + Date.now(),
                timestamp: new Date().toLocaleString(),
                url: dataUrl,
                size: Math.round((dataUrl.length * 3) / 4 / 1024) + ' KB',
                format: format,
                resolution: `${Math.round(finalCanvas.width)}x${Math.round(finalCanvas.height)} (${cropShape === 'rect' ? 'Rectangle Crop' : 'Custom Shape Crop'}) [${captureSource === 'desktop' ? 'Desktop' : 'Screen'}]`,
                inbox: inboxVal || ''
            };

            setLatestCapture(newScreenshot);
            setDrafts(prev => [newScreenshot, ...prev]);
            toast.success("Cropped screenshot captured and added to drafts!");
        } catch (err) {
            console.error("Cropped capture failed:", err);
            toast.error("Failed to capture cropped screenshot.");
        }
    };

    // Capture Frame Function
    const captureFrame = () => {
        if (sourceType === 'area') {
            captureCroppedScreenshot();
        } else {
            captureSimpleScreenshot();
        }
    };

    // Long scroll page capture
    const triggerActualLongScreenshot = () => {
        setScrollingActive(true);
        setScrollPercent(0);
        playShutterSound();

        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 10;
            if (progress <= 90) {
                setScrollPercent(progress);
            }
        }, 150);

        setTimeout(async () => {
            try {
                const rootElement = document.getElementById('root') || document.body;
                
                const canvas = await html2canvas(rootElement, {
                    useCORS: true,
                    allowTaint: true,
                    scrollX: 0,
                    scrollY: 0,
                    windowWidth: document.documentElement.scrollWidth,
                    windowHeight: document.documentElement.scrollHeight,
                    backgroundColor: '#f8fafc',
                    logging: false
                });

                clearInterval(progressInterval);
                setScrollPercent(100);

                const mimeType = format === 'PNG' ? 'image/png' : 'image/jpeg';
                const dataUrl = canvas.toDataURL(mimeType);

                const searchParams = new URLSearchParams(window.location.search);
                const inboxVal = searchParams.get('inbox');
                const newScreenshot = {
                    id: 'snap_' + Date.now(),
                    timestamp: new Date().toLocaleString(),
                    url: dataUrl,
                    size: Math.round((dataUrl.length * 3) / 4 / 1024) + ' KB',
                    format: format,
                    resolution: `${canvas.width}x${canvas.height} (Full Page Scroll)`,
                    inbox: inboxVal || ''
                };

                setLatestCapture(newScreenshot);
                setDrafts(prev => [newScreenshot, ...prev]);
                toast.success("Full-page scrolling screenshot captured and added to drafts!");
            } catch (err) {
                console.error("Long page capture error:", err);
                toast.error("Failed to capture scrollable full-page screenshot.");
            } finally {
                clearInterval(progressInterval);
                setScrollingActive(false);
            }
        }, 1500);
    };

    // Delete screenshot
    const deleteScreenshot = (id) => {
        setScreenshots(prev => {
            const updated = prev.filter(s => s.id !== id);
            saveToLocalStorage(updated);
            return updated;
        });
        toast.success("Screenshot deleted.");
    };

    const saveScreenshotDraft = (draft) => {
        const newScreenshot = {
            ...draft,
            id: 'snap_' + Date.now(),
            synced: false,
            driveSynced: false
        };

        setScreenshots(prev => {
            const updated = [newScreenshot, ...prev];
            saveToLocalStorage(updated);
            return updated;
        });
        setDrafts(prev => prev.filter(d => d.id !== draft.id));
        toast.success("Screenshot saved locally!");
    };

    const deleteScreenshotDraft = (id) => {
        setDrafts(prev => prev.filter(d => d.id !== id));
        toast.success("Draft screenshot deleted.");
    };

    // Dragging state and handlers for the custom HTML floating toolbar widget
    const [toolbarPosition, setToolbarPosition] = useState({ x: 20, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });

    // Set initial position centered at the bottom when active
    useEffect(() => {
        if (pipActive) {
            setToolbarPosition({
                x: (window.innerWidth - 240) / 2,
                y: window.innerHeight - 80
            });
        }
    }, [pipActive]);

    const handleDragStart = (e) => {
        if (e.target.closest('button')) return;
        setIsDragging(true);
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragStart.current = {
            x: clientX - toolbarPosition.x,
            y: clientY - toolbarPosition.y
        };
    };

    const handleDragMove = (e) => {
        if (!isDragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const newX = Math.max(10, Math.min(window.innerWidth - 250, clientX - dragStart.current.x));
        const newY = Math.max(10, Math.min(window.innerHeight - 60, clientY - dragStart.current.y));
        setToolbarPosition({ x: newX, y: newY });
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchmove', handleDragMove);
            window.addEventListener('touchend', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [isDragging, toolbarPosition]);

    useEffect(() => {
        const handleResize = () => {
            setToolbarPosition(prev => ({
                x: Math.max(10, Math.min(window.innerWidth - 250, prev.x)),
                y: Math.max(10, Math.min(window.innerHeight - 60, prev.y))
            }));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Open Floating PiP Toolbar
    const openPipWindow = async () => {
        if (pipActive) {
            closePipWindow();
            return;
        }
        setPipActive(true);
        toast.success("Screenshot toolbar opened!");
    };

    const closePipWindow = () => {
        setPipActive(false);
        if (captureSource !== 'desktop') {
            stopStream();
        }
    };

    // Check if there is an active shared stream set on window object
    useEffect(() => {
        const interval = setInterval(() => {
            if (window.sharedScreenStream && !stream) {
                setStream(window.sharedScreenStream);
                setStreamConnected(true);
            }
        }, 500);

        return () => clearInterval(interval);
    }, [stream]);

    // Listen for tab/window unload to stop stream tracks cleanly
    useEffect(() => {
        const handleUnload = () => {
            stopStream();
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [stream]);

    // Global canvas coordinates and drawing event handlers
    const getGlobalCanvasCoords = (e) => {
        const canvas = globalCanvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;

        return {
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y))
        };
    };

    const handleGlobalMouseDown = (e) => {
        const coords = getGlobalCanvasCoords(e);
        if (!coords) return;
        setIsDrawing(true);
        if (cropShape === 'rect') {
            setRectStart(coords);
            setRectEnd(coords);
        } else {
            setCustomPath([coords]);
        }
    };

    const handleGlobalMouseMove = (e) => {
        if (!isDrawing) return;
        const coords = getGlobalCanvasCoords(e);
        if (!coords) return;
        if (cropShape === 'rect') {
            setRectEnd(coords);
        } else {
            setCustomPath(prev => [...prev, coords]);
        }
    };

    const handleGlobalMouseUp = () => {
        setIsDrawing(false);
    };

    const redrawGlobalOverlay = () => {
        const canvas = globalCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Draw overlay shading mask
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, w, h);

        if (cropShape === 'rect' && rectStart && rectEnd) {
            const x1 = (rectStart.x / 100) * w;
            const y1 = (rectStart.y / 100) * h;
            const x2 = (rectEnd.x / 100) * w;
            const y2 = (rectEnd.y / 100) * h;
            const rx = Math.min(x1, x2);
            const ry = Math.min(y1, y2);
            const rw = Math.abs(x1 - x2);
            const rh = Math.abs(y1 - y2);

            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillRect(rx, ry, rw, rh);
            ctx.restore();

            // Highlight border
            ctx.strokeStyle = '#fbbf24'; // amber-400
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(rx, ry, rw, rh);
            ctx.setLineDash([]);

            // Draw selection corner handles
            ctx.fillStyle = '#fbbf24';
            const hs = 6;
            ctx.fillRect(rx - hs/2, ry - hs/2, hs, hs);
            ctx.fillRect(rx + rw - hs/2, ry - hs/2, hs, hs);
            ctx.fillRect(rx - hs/2, ry + rh - hs/2, hs, hs);
            ctx.fillRect(rx + rw - hs/2, ry + rh - hs/2, hs, hs);
        } else if (cropShape === 'custom' && customPath.length > 1) {
            const pts = customPath.map(p => ({
                x: (p.x / 100) * w,
                y: (p.y / 100) * h
            }));

            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Glow border
            ctx.strokeStyle = '#10b981'; // emerald-500
            ctx.lineWidth = 3;
            ctx.shadowColor = 'rgba(16, 185, 129, 0.8)';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    };

    // Global canvas sizing & drawing sync effect
    useEffect(() => {
        if (sourceType === 'area') {
            const handleResize = () => {
                const canvas = globalCanvasRef.current;
                if (canvas) {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                    redrawGlobalOverlay();
                }
            };
            
            // Initial size setup
            setTimeout(handleResize, 50);

            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, [sourceType, cropShape, rectStart, rectEnd, customPath, isDrawing]);

    // Check if there is an active shared stream/PiP window already set on window object
    useEffect(() => {
        const interval = setInterval(() => {
            if (window.sharedScreenStream && !stream) {
                setStream(window.sharedScreenStream);
                setStreamConnected(true);
            }
            if (window.sharedPipWindow && !pipWindowRef.current) {
                pipWindowRef.current = window.sharedPipWindow;
                setPipActive(true);
                applyPipStyles(window.sharedPipWindow);

                // Set/override onunload handler to clean up state when window closes
                window.sharedPipWindow.onunload = () => {
                    setPipActive(false);
                    pipWindowRef.current = null;
                    window.sharedPipWindow = null;
                    stopStream();
                };
                
                let activeMode = 'camera';
                if (sourceType === 'area') {
                    activeMode = cropShape === 'rect' ? 'rect' : 'custom';
                } else if (sourceType === 'long') {
                    activeMode = 'long';
                }
                setupPipWindow(window.sharedPipWindow, activeMode);
            }
        }, 500);

        return () => clearInterval(interval);
    }, [stream, sourceType, cropShape, rectStart, rectEnd, customPath, format, resolution]);

    // Listen for tab/window unload to stop stream tracks cleanly
    useEffect(() => {
        const handleUnload = () => {
            stopStream();
            if (pipWindowRef.current) {
                pipWindowRef.current.close();
            }
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [stream]);

    return (
        <ScreenshotContext.Provider value={{
            screenshots,
            setScreenshots,
            stream,
            setStream,
            streamConnected,
            setStreamConnected,
            pipActive,
            setPipActive,
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
            setScrollingActive,
            scrollPercent,
            setScrollPercent,
            flashActive,
            setFlashActive,
            cloudFiles,
            setCloudFiles,
            cloudSpace,
            setCloudSpace,
            cloudLoading,
            setCloudLoading,
            captureSource,
            setCaptureSource,
            driveLinked,
            setDriveLinked,
            driveEmail,
            setDriveEmail,
            saveDestination,
            setSaveDestination: handleSetSaveDestination,
            latestCapture,
            setLatestCapture,
            connectScreenShare,
            stopStream,
            captureFrame,
            triggerActualLongScreenshot,
            deleteScreenshot,
            openPipWindow,
            closePipWindow,
            drafts,
            setDrafts,
            saveScreenshotDraft,
            deleteScreenshotDraft
        }}>
            {children}

            {/* Global Screenshot Drawing Overlay for Crop Mode */}
            {sourceType === 'area' && (
                <>
                    {/* Dark Canvas overlay covering entire viewport */}
                    <div 
                        data-html2canvas-ignore="true"
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            zIndex: 99999,
                            pointerEvents: 'auto',
                            cursor: 'crosshair'
                        }}
                    >
                        <canvas
                            ref={globalCanvasRef}
                            style={{
                                width: '100%',
                                height: '100%',
                                display: 'block'
                            }}
                            onMouseDown={handleGlobalMouseDown}
                            onMouseMove={handleGlobalMouseMove}
                            onMouseUp={handleGlobalMouseUp}
                            onTouchStart={handleGlobalMouseDown}
                            onTouchMove={handleGlobalMouseMove}
                            onTouchEnd={handleGlobalMouseUp}
                        />
                    </div>

                    {/* Glowing Top Guideline Bar */}
                    <div 
                        data-html2canvas-ignore="true"
                        style={{
                            position: 'fixed',
                            top: '20px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 100000,
                            background: 'rgba(15, 23, 42, 0.95)',
                            backdropFilter: 'blur(4px)',
                            border: '1px solid rgba(51, 65, 85, 0.8)',
                            borderRadius: '9999px',
                            padding: '8px 20px',
                            color: '#f8fafc',
                            fontFamily: 'sans-serif',
                            fontSize: '11px',
                            fontWeight: '800',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            pointerEvents: 'none',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase'
                        }}
                    >
                        <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: cropShape === 'rect' ? '#fbbf24' : '#10b981',
                            display: 'inline-block',
                            animation: 'pulse 1.5s infinite'
                        }}></span>
                        <span>{cropShape === 'rect' ? 'Rectangle Crop Active' : 'Custom Shape Crop Active'} — Draw on screen</span>
                    </div>

                    {/* Floating Controls for saving / resetting crop */}
                    {(() => {
                        let showControls = false;
                        let controlStyle = {
                            position: 'fixed',
                            zIndex: 100000,
                            display: 'flex',
                            gap: '8px',
                            padding: '6px 12px',
                            background: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                            pointerEvents: 'auto'
                        };

                        if (!isDrawing) {
                            if (cropShape === 'rect' && rectStart && rectEnd) {
                                const x1 = (rectStart.x / 100) * window.innerWidth;
                                const y1 = (rectStart.y / 100) * window.innerHeight;
                                const x2 = (rectEnd.x / 100) * window.innerWidth;
                                const y2 = (rectEnd.y / 100) * window.innerHeight;
                                const rx = Math.min(x1, x2);
                                const ry = Math.max(y1, y2);

                                showControls = true;
                                controlStyle.left = `${Math.max(10, Math.min(window.innerWidth - 200, rx))}px`;
                                controlStyle.top = `${Math.min(window.innerHeight - 65, ry + 12)}px`;
                            } else if (cropShape === 'custom' && customPath.length > 1) {
                                const ptsY = customPath.map(p => (p.y / 100) * window.innerHeight);
                                const ptsX = customPath.map(p => (p.x / 100) * window.innerWidth);
                                const maxY = Math.max(...ptsY);
                                const minX = Math.min(...ptsX);

                                showControls = true;
                                controlStyle.left = `${Math.max(10, Math.min(window.innerWidth - 200, minX))}px`;
                                controlStyle.top = `${Math.min(window.innerHeight - 65, maxY + 12)}px`;
                            }
                        }

                        if (!showControls) return null;

                        const handleSaveGlobalCrop = () => {
                            captureFrame();
                            setSourceType('camera');
                            setRectStart(null);
                            setRectEnd(null);
                            setCustomPath([]);
                        };

                        const handleCancelGlobalCrop = () => {
                            setRectStart(null);
                            setRectEnd(null);
                            setCustomPath([]);
                        };

                        return (
                            <div style={controlStyle} data-html2canvas-ignore="true">
                                <button
                                    onClick={handleSaveGlobalCrop}
                                    className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all border-none cursor-pointer"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                    <span>Capture</span>
                                </button>
                                <button
                                    onClick={handleCancelGlobalCrop}
                                    className="bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-350 font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all border-none cursor-pointer"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                    <span>Reset</span>
                                </button>
                            </div>
                        );
                    })()}
                </>
            )}

            {/* Draggable HTML Screenshot Toolbar Widget */}
            {pipActive && (
                <div
                    data-html2canvas-ignore="true"
                    onMouseDown={handleDragStart}
                    onTouchStart={handleDragStart}
                    style={{
                        position: 'fixed',
                        left: `${toolbarPosition.x}px`,
                        top: `${toolbarPosition.y}px`,
                        zIndex: 100001,
                        background: 'rgba(15, 23, 42, 0.95)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(51, 65, 85, 0.6)',
                        borderRadius: '16px',
                        padding: '6px 10px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        userSelect: 'none',
                        transition: isDragging ? 'none' : 'box-shadow 0.2s ease'
                    }}
                >
                    {/* Simple Screenshot Button (Monitor) */}
                    <button
                        title="Simple Screenshot"
                        onClick={() => {
                            setSourceType('camera');
                            setTimeout(() => {
                                captureFrame();
                            }, 150);
                        }}
                        style={{
                            position: 'relative',
                            padding: '8px',
                            background: sourceType === 'camera' ? 'rgba(30, 41, 59, 0.8)' : 'transparent',
                            border: sourceType === 'camera' ? '1px solid rgba(248, 250, 252, 0.5)' : '1px solid transparent',
                            borderRadius: '12px',
                            color: sourceType === 'camera' ? '#ffffff' : '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '34px',
                            height: '34px',
                            boxSizing: 'border-box',
                            transition: 'all 0.2s'
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="20" height="14" x="2" y="3" rx="2"/>
                            <line x1="8" x2="16" y1="21" y2="21"/>
                            <line x1="12" x2="12" y1="17" y2="21"/>
                        </svg>
                        {sourceType === 'camera' && (
                            <div style={{
                                position: 'absolute',
                                bottom: '2px',
                                left: '30%',
                                right: '30%',
                                height: '2px',
                                backgroundColor: '#22d3ee',
                                borderRadius: '9999px',
                                boxShadow: '0 0 6px #22d3ee'
                            }} />
                        )}
                    </button>

                    {/* Rectangle Crop Button (Square) */}
                    <button
                        title="Rectangle Crop"
                        onClick={() => {
                            setSourceType('area');
                            setCropShape('rect');
                            toast.info("Rectangle crop active. Draw on screen to select area.");
                        }}
                        style={{
                            position: 'relative',
                            padding: '8px',
                            background: (sourceType === 'area' && cropShape === 'rect') ? 'rgba(30, 41, 59, 0.8)' : 'transparent',
                            border: (sourceType === 'area' && cropShape === 'rect') ? '1px solid rgba(248, 250, 252, 0.5)' : '1px solid transparent',
                            borderRadius: '12px',
                            color: (sourceType === 'area' && cropShape === 'rect') ? '#ffffff' : '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '34px',
                            height: '34px',
                            boxSizing: 'border-box',
                            transition: 'all 0.2s'
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="3" rx="2"/>
                        </svg>
                        {sourceType === 'area' && cropShape === 'rect' && (
                            <div style={{
                                position: 'absolute',
                                bottom: '2px',
                                left: '30%',
                                right: '30%',
                                height: '2px',
                                backgroundColor: '#22d3ee',
                                borderRadius: '9999px',
                                boxShadow: '0 0 6px #22d3ee'
                            }} />
                        )}
                    </button>

                    {/* Custom Shape Crop Button (Circle reload arrow) */}
                    <button
                        title="Custom Shape Crop"
                        onClick={() => {
                            setSourceType('area');
                            setCropShape('custom');
                            toast.info("Custom shape crop active. Draw on screen to select area.");
                        }}
                        style={{
                            position: 'relative',
                            padding: '8px',
                            background: (sourceType === 'area' && cropShape === 'custom') ? 'rgba(30, 41, 59, 0.8)' : 'transparent',
                            border: (sourceType === 'area' && cropShape === 'custom') ? '1px solid rgba(248, 250, 252, 0.5)' : '1px solid transparent',
                            borderRadius: '12px',
                            color: (sourceType === 'area' && cropShape === 'custom') ? '#ffffff' : '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '34px',
                            height: '34px',
                            boxSizing: 'border-box',
                            transition: 'all 0.2s'
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                            <polyline points="21 3 21 8 16 8"/>
                        </svg>
                        {sourceType === 'area' && cropShape === 'custom' && (
                            <div style={{
                                position: 'absolute',
                                bottom: '2px',
                                left: '30%',
                                right: '30%',
                                height: '2px',
                                backgroundColor: '#22d3ee',
                                borderRadius: '9999px',
                                boxShadow: '0 0 6px #22d3ee'
                            }} />
                        )}
                    </button>

                    {/* Long Scroll Screenshot Button (Double-sided vertical arrow) */}
                    <button
                        title={captureSource === 'desktop' ? "Long scroll is not supported in Desktop mode" : "Long Scroll Screenshot"}
                        disabled={captureSource === 'desktop'}
                        onClick={() => {
                            setSourceType('long');
                            setTimeout(() => {
                                triggerActualLongScreenshot();
                            }, 150);
                        }}
                        style={{
                            position: 'relative',
                            padding: '8px',
                            background: sourceType === 'long' ? 'rgba(30, 41, 59, 0.8)' : 'transparent',
                            border: sourceType === 'long' ? '1px solid rgba(248, 250, 252, 0.5)' : '1px solid transparent',
                            borderRadius: '12px',
                            color: captureSource === 'desktop' ? 'rgba(148, 163, 184, 0.3)' : (sourceType === 'long' ? '#ffffff' : '#94a3b8'),
                            cursor: captureSource === 'desktop' ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '34px',
                            height: '34px',
                            boxSizing: 'border-box',
                            transition: 'all 0.2s'
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2v20"/>
                            <path d="m17 5-5-5-5 5"/>
                            <path d="m17 19-5 5-5-5"/>
                        </svg>
                        {sourceType === 'long' && (
                            <div style={{
                                position: 'absolute',
                                bottom: '2px',
                                left: '30%',
                                right: '30%',
                                height: '2px',
                                backgroundColor: '#22d3ee',
                                borderRadius: '9999px',
                                boxShadow: '0 0 6px #22d3ee'
                            }} />
                        )}
                    </button>

                    {/* Divider */}
                    <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />

                    {/* Close Toolbar Button */}
                    <button
                        title="Close Toolbar"
                        onClick={closePipWindow}
                        style={{
                            padding: '8px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '12px',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '34px',
                            height: '34px',
                            boxSizing: 'border-box',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            )}

            {/* Hidden persistent video element for screen captures in the background */}
            <video
                ref={videoRef}
                style={{ display: 'none' }}
                autoPlay
                playsInline
                muted
            />
            {/* Hidden canvas for drawing/extracting screenshots */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </ScreenshotContext.Provider>
    );
};
