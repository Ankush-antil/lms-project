import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Camera, Download, Eye, AlertCircle, Loader2, Info } from 'lucide-react';

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

export default function SharedScreenshotPage() {
    const { id } = useParams();
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchFile = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`/api/practice-files/share/${id}`);
                setFile(res.data.file);
            } catch (err) {
                setError(err.response?.data?.message || 'Screenshot not found or has been deleted.');
            } finally {
                setLoading(false);
            }
        };
        fetchFile();
    }, [id]);

    // Get absolute URL for file
    const getFileUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        const serverBase = import.meta.env.VITE_API_URL || window.location.origin.replace(':5173', ':5000').replace(':3000', ':5000');
        return `${serverBase}${url}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-emerald-400 mb-4" size={40} />
                <p className="text-slate-400 font-semibold text-sm tracking-wider uppercase">Loading Screenshot...</p>
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
                    <h2 className="text-white font-extrabold text-xl mb-2">Screenshot Not Found</h2>
                    <p className="text-red-300/80 text-sm font-medium">{error}</p>
                    <p className="text-slate-500 text-xs mt-4">The link may have expired or the file was deleted by its owner.</p>
                </div>
            </div>
        );
    }

    const imageUrl = getFileUrl(file?.fileUrl);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex flex-col items-center justify-center p-4 font-sans text-left">
            <div className="w-full max-w-3xl">
                
                {/* Brand Header */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-pulse">
                        <Camera size={16} className="text-white" />
                    </div>
                    <span className="text-white font-black text-lg tracking-tight">DS<span className="text-emerald-400">Snap</span></span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[9px] font-black rounded-full uppercase tracking-widest">Shared</span>
                </div>

                {/* Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                    
                    {/* Screenshot Container */}
                    <div className="relative bg-black/40 flex items-center justify-center group p-4 border-b border-white/5">
                        <a 
                            href={imageUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="relative block w-full h-full max-h-[50vh] overflow-auto select-none rounded-xl border border-white/5 cursor-zoom-in"
                            title="Click to view full image in a new tab"
                        >
                            <img 
                                src={imageUrl} 
                                alt="Shared Snapshot" 
                                className="w-full h-full object-contain mx-auto rounded-lg"
                            />
                            {/* Hover overlay indication */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 border border-white/15 text-white text-xs font-bold rounded-xl shadow-lg">
                                    <Eye size={14} />
                                    View Full Resolution
                                </span>
                            </div>
                        </a>
                    </div>

                    {/* Metadata Card details */}
                    <div className="p-6">
                        {/* Title & Metadata */}
                        <div className="mb-6">
                            <h1 className="text-white font-extrabold text-lg leading-tight mb-2 truncate">
                                {file?.filename?.replace(/\.\w+$/, '') || 'Screenshot Capture'}
                            </h1>
                            <div className="flex items-center gap-4 flex-wrap text-xs text-slate-400 font-semibold">
                                {file?.metadata?.resolution && (
                                    <span className="flex items-center gap-1.5 text-emerald-300">
                                        <Info size={13} />
                                        {file.metadata.resolution}
                                    </span>
                                )}
                                {file?.metadata?.format && (
                                    <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-black rounded-full uppercase tracking-wider">
                                        {file.metadata.format}
                                    </span>
                                )}
                                <span>{formatBytes(file?.size)}</span>
                                <span className="text-[10px] text-slate-505">Shared on {formatDate(file?.createdAt)}</span>
                            </div>
                        </div>

                        {/* Download CTA */}
                        <a
                            href={imageUrl}
                            download={file?.filename}
                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white rounded-2xl text-sm font-bold transition-all active:scale-[0.98] shadow-lg shadow-black/10"
                        >
                            <Download size={15} />
                            Download Screenshot
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
