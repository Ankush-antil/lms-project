import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Mic, Play, Pause, Download, Clock, Music, AlertCircle, Loader2, Volume2 } from 'lucide-react';

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

export default function SharedAudioPage() {
    const { id } = useParams();
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Player state
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
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

    // Audio event handlers
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !file) return;

        const onLoaded = () => setDuration(audio.duration);
        const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };

        audio.addEventListener('loadedmetadata', onLoaded);
        audio.addEventListener('ended', onEnded);
        return () => {
            audio.removeEventListener('loadedmetadata', onLoaded);
            audio.removeEventListener('ended', onEnded);
        };
    }, [file]);

    const tick = () => {
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        animFrameRef.current = requestAnimationFrame(tick);
    };

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) {
            audio.pause();
            cancelAnimationFrame(animFrameRef.current);
        } else {
            audio.play();
            animFrameRef.current = requestAnimationFrame(tick);
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e) => {
        const audio = audioRef.current;
        if (!audio || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        audio.currentTime = ratio * duration;
        setCurrentTime(audio.currentTime);
    };

    const handleVolume = (e) => {
        const v = parseFloat(e.target.value);
        setVolume(v);
        if (audioRef.current) audioRef.current.volume = v;
    };

    const progress = duration ? (currentTime / duration) * 100 : 0;

    // Get base URL for file
    const getFileUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        // Relative URL — build absolute using server origin
        const serverBase = import.meta.env.VITE_API_URL || window.location.origin.replace(':5173', ':5000').replace(':3000', ':5000');
        return `${serverBase}${url}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-white">
                    <Loader2 className="animate-spin text-indigo-400" size={40} />
                    <p className="text-slate-400 font-semibold text-sm tracking-wider uppercase">Loading Recording...</p>
                </div>
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
                    <h2 className="text-white font-extrabold text-xl mb-2">Recording Not Found</h2>
                    <p className="text-red-300/80 text-sm font-medium">{error}</p>
                    <p className="text-slate-500 text-xs mt-4">The link may have expired or the file was deleted by its owner.</p>
                </div>
            </div>
        );
    }

    const audioUrl = getFileUrl(file?.fileUrl);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-4 font-sans">

            {/* Hidden audio element */}
            {file && (
                <audio ref={audioRef} src={audioUrl} preload="metadata" />
            )}

            {/* Card */}
            <div className="w-full max-w-lg">

                {/* Brand Header */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <Mic size={16} className="text-white" />
                    </div>
                    <span className="text-white font-black text-lg tracking-tight">DS<span className="text-indigo-400">Voice</span></span>
                    <span className="px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[9px] font-black rounded-full uppercase tracking-widest">Shared</span>
                </div>

                {/* Main Player Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">

                    {/* Waveform Visual / Icon */}
                    <div className="flex items-center justify-center mb-6">
                        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
                            {/* Pulsing ring when playing */}
                            {isPlaying && (
                                <span className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping" />
                            )}
                            <Mic size={36} className="text-white relative z-10" />
                        </div>
                    </div>

                    {/* Title & Meta */}
                    <div className="text-center mb-6">
                        <h1 className="text-white font-extrabold text-lg leading-tight mb-1 px-4 line-clamp-2">
                            {file?.filename?.replace(/\.\w+$/, '') || 'Voice Recording'}
                        </h1>
                        <div className="flex items-center justify-center gap-3 flex-wrap mt-2">
                            {file?.metadata?.duration && (
                                <span className="flex items-center gap-1 text-indigo-300 text-xs font-bold">
                                    <Clock size={11} />
                                    {file.metadata.duration}
                                </span>
                            )}
                            {file?.metadata?.format && (
                                <span className="flex items-center gap-1 text-indigo-300 text-xs font-bold">
                                    <Music size={11} />
                                    {file.metadata.format}
                                </span>
                            )}
                            <span className="text-slate-500 text-xs font-medium">
                                {formatBytes(file?.size)}
                            </span>
                        </div>
                        <p className="text-slate-500 text-[10px] font-medium mt-1.5">
                            Shared on {formatDate(file?.createdAt)}
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                        <div
                            className="w-full h-2 bg-white/10 rounded-full cursor-pointer overflow-hidden group"
                            onClick={handleSeek}
                        >
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 rounded-full transition-all duration-100 relative"
                                style={{ width: `${progress}%` }}
                            >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </div>
                        <div className="flex justify-between mt-1.5">
                            <span className="text-slate-400 text-[10px] font-mono">{formatSecs(currentTime)}</span>
                            <span className="text-slate-400 text-[10px] font-mono">{formatSecs(duration)}</span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-4 mb-5">
                        {/* Play / Pause */}
                        <button
                            onClick={togglePlay}
                            className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-indigo-500/30"
                        >
                            {isPlaying
                                ? <Pause size={22} fill="white" />
                                : <Play size={22} fill="white" className="ml-0.5" />
                            }
                        </button>
                    </div>

                    {/* Volume */}
                    <div className="flex items-center gap-2 mb-5 px-2">
                        <Volume2 size={14} className="text-slate-400 shrink-0" />
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={volume}
                            onChange={handleVolume}
                            className="flex-1 h-1.5 accent-indigo-500 cursor-pointer"
                        />
                        <span className="text-slate-500 text-[10px] font-mono w-6 text-right">{Math.round(volume * 100)}</span>
                    </div>

                    {/* Download Button */}
                    <a
                        href={audioUrl}
                        download={file?.filename}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white rounded-2xl text-sm font-bold transition-all active:scale-[0.98]"
                    >
                        <Download size={15} />
                        Download Recording
                    </a>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-600 text-[10px] font-medium mt-6 uppercase tracking-widest">
                    Powered by DS LMS Voice Recorder
                </p>
            </div>
        </div>
    );
}
