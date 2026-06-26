import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Video, Play, Pause, Download, Clock, Monitor, AlertCircle, Loader2, Volume2, Shield } from 'lucide-react';

// Format seconds to mm:ss
const formatSecs = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

// Format bytes to human readable
const formatBytes = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// Format date
const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

export default function SharedVideoPage() {
    const { id } = useParams();
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Video state
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const animFrameRef = useRef(null);

    useEffect(() => {
        const fetchFile = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`/api/practice-files/share/${id}`);
                setFile(res.data.file);
            } catch (err) {
                setError(err.response?.data?.message || 'Recording not found or has been deleted.');
            } finally {
                setLoading(false);
            }
        };
        fetchFile();
    }, [id]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !file) return;

        const onLoaded = () => setDuration(video.duration);
        const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
        const onTimeUpdate = () => setCurrentTime(video.currentTime);

        video.addEventListener('loadedmetadata', onLoaded);
        video.addEventListener('ended', onEnded);
        video.addEventListener('timeupdate', onTimeUpdate);
        
        return () => {
            video.removeEventListener('loadedmetadata', onLoaded);
            video.removeEventListener('ended', onEnded);
            video.removeEventListener('timeupdate', onTimeUpdate);
        };
    }, [file]);

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        if (isPlaying) {
            video.pause();
        } else {
            video.play().catch(err => console.error("Video play failed:", err));
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e) => {
        const video = videoRef.current;
        if (!video || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        video.currentTime = ratio * duration;
        setCurrentTime(video.currentTime);
    };

    const handleVolume = (e) => {
        const v = parseFloat(e.target.value);
        setVolume(v);
        setIsMuted(v === 0);
        if (videoRef.current) {
            videoRef.current.volume = v;
            videoRef.current.muted = v === 0;
        }
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        const nextMute = !isMuted;
        setIsMuted(nextMute);
        videoRef.current.muted = nextMute;
        if (nextMute) {
            videoRef.current.volume = 0;
        } else {
            videoRef.current.volume = volume;
        }
    };

    const progress = duration ? (currentTime / duration) * 100 : 0;

    // Get absolute URL for video file
    const getFileUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        const serverBase = import.meta.env.VITE_API_URL || window.location.origin.replace(':5173', ':5000').replace(':3000', ':5000');
        return `${serverBase}${url}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-purple-400 mb-4" size={40} />
                <p className="text-slate-400 font-semibold text-sm tracking-wider uppercase">Loading Video...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="text-red-400" size={28} />
                    </div>
                    <h2 className="text-white font-extrabold text-xl mb-2">Video Not Found</h2>
                    <p className="text-red-300/80 text-sm font-medium">{error}</p>
                    <p className="text-slate-500 text-xs mt-4">The link may have expired or the file was deleted by its owner.</p>
                </div>
            </div>
        );
    }

    const videoUrl = getFileUrl(file?.fileUrl);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex flex-col items-center justify-center p-4 font-sans text-left">
            <div className="w-full max-w-3xl">
                
                {/* Brand Header */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 animate-pulse">
                        <Video size={16} className="text-white" />
                    </div>
                    <span className="text-white font-black text-lg tracking-tight">DS<span className="text-purple-400">Play</span></span>
                    <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[9px] font-black rounded-full uppercase tracking-widest">Shared</span>
                </div>

                {/* Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                    
                    {/* Video Player Container */}
                    <div className="relative aspect-video bg-black/60 flex items-center justify-center group">
                        {file && (
                            <video 
                                ref={videoRef} 
                                src={videoUrl} 
                                className="w-full h-full object-contain"
                                onClick={togglePlay}
                                playsInline
                            />
                        )}
                        
                        {/* Huge Play overlay button when paused */}
                        {!isPlaying && (
                            <button 
                                onClick={togglePlay}
                                className="absolute w-16 h-16 rounded-full bg-purple-600/90 hover:bg-purple-500 text-white flex items-center justify-center transition-all scale-100 hover:scale-105 shadow-xl shadow-purple-500/30 z-25"
                            >
                                <Play size={24} fill="white" className="ml-1" />
                            </button>
                        )}
                    </div>

                    {/* Meta Card details */}
                    <div className="p-6">
                        {/* Title & Metadata */}
                        <div className="mb-6">
                            <h1 className="text-white font-extrabold text-lg leading-tight mb-2 truncate">
                                {file?.filename?.replace(/\.\w+$/, '') || 'Screen/Video Recording'}
                            </h1>
                            <div className="flex items-center gap-4 flex-wrap text-xs text-slate-400 font-semibold">
                                {file?.metadata?.duration && (
                                    <span className="flex items-center gap-1.5 text-purple-300">
                                        <Clock size={13} />
                                        {file.metadata.duration}
                                    </span>
                                )}
                                {file?.metadata?.resolution && (
                                    <span className="flex items-center gap-1.5 text-purple-300">
                                        <Monitor size={13} />
                                        {file.metadata.resolution}
                                    </span>
                                )}
                                <span>{formatBytes(file?.size)}</span>
                                <span className="text-[10px] text-slate-500">Shared on {formatDate(file?.createdAt)}</span>
                            </div>
                        </div>

                        {/* Custom Control Bar */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-4 mb-6">
                            {/* Seek slider */}
                            <div>
                                <div 
                                    className="w-full h-2 bg-white/10 rounded-full cursor-pointer relative overflow-hidden group"
                                    onClick={handleSeek}
                                >
                                    <div 
                                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all duration-100"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-1 text-[10px] text-slate-450 font-mono">
                                    <span>{formatSecs(currentTime)}</span>
                                    <span>{formatSecs(duration)}</span>
                                </div>
                            </div>

                            {/* Play & Mute controls */}
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={togglePlay}
                                        className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-all active:scale-95 shadow-md shadow-purple-500/20"
                                    >
                                        {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" className="ml-0.5" />}
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={toggleMute}
                                        className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
                                    >
                                        <Volume2 size={16} className={isMuted ? 'opacity-40' : ''} />
                                    </button>
                                    <input 
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={isMuted ? 0 : volume}
                                        onChange={handleVolume}
                                        className="w-20 h-1 accent-purple-500 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Download CTA */}
                        <a
                            href={videoUrl}
                            download={file?.filename}
                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white rounded-2xl text-sm font-bold transition-all active:scale-[0.98] shadow-lg shadow-black/10"
                        >
                            <Download size={15} />
                            Download Recording
                        </a>

                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-600 text-[10px] font-medium mt-6 uppercase tracking-widest">
                    Powered by DS LMS Media Server
                </p>
            </div>
        </div>
    );
}
