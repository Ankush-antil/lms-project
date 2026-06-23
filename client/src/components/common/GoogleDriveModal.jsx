import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, ChevronRight, Lock, Eye, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const GoogleDriveModal = ({ isOpen, onClose, fileName, fileBlob, onSaveSuccess }) => {
    const [step, setStep] = useState(1); // 1: Choose Account, 2: Permissions, 3: Uploading, 4: Success
    const [selectedAccount, setSelectedAccount] = useState('');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedAccount('');
            setProgress(0);
        }
    }, [isOpen]);

    // Simulate progress upload
    useEffect(() => {
        if (step === 3) {
            setProgress(0);
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setTimeout(() => {
                            setStep(4);
                            if (onSaveSuccess) onSaveSuccess();
                        }, 500);
                        return 100;
                    }
                    return prev + 10;
                });
            }, 150);
            return () => clearInterval(interval);
        }
    }, [step]);

    if (!isOpen) return null;

    const handleSelectAccount = (email) => {
        setSelectedAccount(email);
        setStep(2);
    };

    const handleAllow = () => {
        setStep(3);
    };

    const handleDownloadMock = () => {
        if (!fileBlob) {
            toast.error("File content unavailable.");
            return;
        }
        // Download the file
        const url = URL.createObjectURL(fileBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'drive_file';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Opening Google Drive simulated link...");
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden relative transition-all duration-300">
                
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <svg className="w-6 h-6" viewBox="0 0 48 48">
                            <path fill="#FFC107" d="M17 6h14l13 22H30L17 6z" />
                            <path fill="#FF3D00" d="m15.5 11.5-8.5 15L17 42h13L15.5 11.5z" />
                            <path fill="#4CAF50" d="M44 28H15.5L30 42h14z" />
                        </svg>
                        <span className="font-extrabold text-slate-800 text-sm tracking-tight">Google Drive Storage</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-6">
                    
                    {/* STEP 1: Choose Account */}
                    {step === 1 && (
                        <div className="space-y-5 animate-fade-in">
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-black text-slate-900 leading-tight">Sign in with Google</h3>
                                <p className="text-xs text-slate-500 font-medium">to continue uploading to <b>LMS Storage</b></p>
                            </div>
                            
                            <div className="space-y-2.5">
                                {[
                                    { name: 'Ankush Antil', email: 'ankush.antil@gmail.com', avatar: 'A' },
                                    { name: 'Student Profile', email: 'student.lms@gmail.com', avatar: 'S' }
                                ].map((acc, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSelectAccount(acc.email)}
                                        className="w-full flex items-center justify-between p-3 border border-slate-200 hover:border-[#3E3ADD] hover:bg-[#3E3ADD]/5 rounded-2xl transition-all text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                                {acc.avatar}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-800">{acc.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold">{acc.email}</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-450" />
                                    </button>
                                ))}
                                
                                <button className="w-full flex items-center gap-3 p-3 border border-dashed border-slate-200 hover:border-slate-350 hover:bg-slate-50 rounded-2xl transition-all text-left">
                                    <div className="w-9 h-9 rounded-full border border-slate-200 bg-white text-slate-500 flex items-center justify-center font-bold text-sm">
                                        +
                                    </div>
                                    <span className="text-xs font-bold text-slate-600">Use another account</span>
                                </button>
                            </div>
                            
                            <div className="text-[10px] text-slate-400 font-semibold leading-relaxed border-t border-slate-100 pt-3">
                                To continue, Google will share your name, email address, language preference, and profile picture with LMS Portal.
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Permissions */}
                    {step === 2 && (
                        <div className="space-y-5 animate-fade-in">
                            <div className="text-center space-y-2">
                                <h3 className="text-base font-black text-slate-900 leading-tight">LMS Portal wants to access your Google Account</h3>
                                <p className="text-[11px] text-slate-450 font-bold uppercase tracking-wider">{selectedAccount}</p>
                            </div>
                            
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3">
                                <div className="flex gap-3">
                                    <Lock size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-xs font-black text-slate-800">Create, view and manage files</h4>
                                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed font-medium">Allows LMS Portal to upload your screenshots and recordings to your Google Drive folder.</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl text-xs font-black transition-all uppercase tracking-wider"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAllow}
                                    className="flex-1 py-3 bg-[#3E3ADD] hover:bg-indigo-650 text-white rounded-2xl text-xs font-black transition-all uppercase tracking-wider shadow-md"
                                >
                                    Allow
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Uploading Progress */}
                    {step === 3 && (
                        <div className="space-y-6 py-4 text-center animate-fade-in">
                            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                            <div className="space-y-2">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Uploading to Google Drive...</h3>
                                <p className="text-xs text-slate-500 truncate max-w-xs mx-auto font-medium">File: <b>{fileName}</b></p>
                            </div>
                            
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200 max-w-xs mx-auto">
                                <div className="bg-[#3E3ADD] h-full transition-all duration-150" style={{ width: `${progress}%` }}></div>
                            </div>
                            <span className="text-xs font-black text-indigo-700">{progress}% Completed</span>
                        </div>
                    )}

                    {/* STEP 4: Success */}
                    {step === 4 && (
                        <div className="space-y-6 text-center animate-fade-in py-2">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
                                <CheckCircle2 size={36} />
                            </div>
                            
                            <div className="space-y-1.5">
                                <h3 className="text-lg font-black text-slate-900 leading-tight">Saved in Google Drive!</h3>
                                <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                                    Your file has been saved to your Google Drive account.
                                </p>
                            </div>
                            
                            <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-150 text-left max-w-sm mx-auto space-y-2">
                                <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                                    <span>Google Drive Metadata</span>
                                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Active Sync</span>
                                </div>
                                <p className="text-xs font-black text-slate-700 truncate">{fileName}</p>
                                <p className="text-[10px] text-slate-400 font-bold">Folder: <b>My Drive &gt; LMS Practice Tools</b></p>
                            </div>
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDownloadMock}
                                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md"
                                >
                                    <Eye size={14} />
                                    View in Drive
                                </button>
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl text-xs font-black transition-all uppercase tracking-wider"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default GoogleDriveModal;
