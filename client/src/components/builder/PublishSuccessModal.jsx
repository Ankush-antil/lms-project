import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, Copy, Check, ExternalLink, ArrowRight, Globe, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';

const PublishSuccessModal = ({ isOpen, onClose, testId, testTitle, publishMode }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !testId) return null;

    const path = publishMode === 'public' ? `/public-test/${testId}` : `/take-test/${testId}`;
    const url = `${window.location.origin}${path}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            toast.success("Share link copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
            const el = document.createElement('textarea');
            el.value = url;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true);
            toast.success("Share link copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return createPortal(
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md animate-fade-in flex items-center justify-center p-4 font-sans">
            <div className="bg-white w-full max-w-lg rounded-[30px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up p-8 text-center space-y-6">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-full transition-all"
                >
                    <X size={20} />
                </button>

                {/* Success Icon */}
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-100 animate-pulse">
                    <CheckCircle2 size={44} />
                </div>

                {/* Header */}
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Form Published Successfully!</h2>
                    <p className="text-xs text-slate-500 font-medium">
                        "{testTitle}" is now live and ready for responses.
                    </p>
                </div>

                {/* Share Link Card */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3 text-left">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        {publishMode === 'public' ? <Globe size={12} className="text-emerald-500" /> : <Link2 size={12} className="text-[#0b1329]" />}
                        {publishMode === 'public' ? 'Public Web Link' : 'LMS Connected Link'}
                    </span>

                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2.5 overflow-hidden">
                        <span className="text-xs text-slate-650 truncate flex-1 font-mono select-all">
                            {url}
                        </span>

                        <button
                            onClick={handleCopy}
                            className={`p-2 rounded-lg border transition-all ${copied
                                ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                                : 'text-slate-505 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                                }`}
                            title="Copy link to clipboard"
                        >
                            {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>

                {/* QR Code Card */}
                <div className="bg-slate-50 border border-slate-150 rounded-[20px] p-4 flex flex-col items-center justify-center space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">
                        Scan QR Code to Take Test
                    </span>
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm transition-transform hover:scale-105 duration-200">
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`}
                            alt="Scan to take test"
                            className="w-[150px] h-[150px] object-contain"
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <a
                        href={path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-200 transition-all"
                    >
                        <ExternalLink size={14} />
                        <span>Preview Test</span>
                    </a>

                    <button
                        onClick={onClose}
                        className="py-3 bg-[#0b1329] hover:bg-[#152244] text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#0b1329]/15 transition-all"
                    >
                        <span>Go to Dashboard</span>
                        <ArrowRight size={14} />
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default PublishSuccessModal;
