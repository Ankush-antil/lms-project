import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Globe, Link2, Info, Lock, Clock, Calendar, ShieldCheck, Mail, CheckCircle2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const PublishOptionsModal = ({ isOpen, onClose, onPublish, initialSettings, isConnected, onOpenConnect }) => {
    const [publishMode, setPublishMode] = useState('connected'); // 'connected' | 'public'
    const [settings, setSettings] = useState({
        allowMultiple: false,
        startDate: '',
        endDate: '',
        expiryDate: '',
        maxResponses: '',
        timeLimit: 60,
        randomizeQuestions: false,
        showScoreAfterSubmission: true,
        showCorrectAnswers: false,
        allowRetake: false,
        password: '',
        antiSpam: false,
        emailNotification: {
            sendSubmissionNotification: true,
            sendScoreEmail: true,
            sendConfirmationEmail: true
        }
    });

    useEffect(() => {
        if (initialSettings) {
            setSettings(prev => ({
                ...prev,
                ...initialSettings,
                emailNotification: {
                    ...prev.emailNotification,
                    ...(initialSettings.emailNotification || {})
                }
            }));
        }
    }, [initialSettings]);

    if (!isOpen) return null;

    const handleEmailNotificationChange = (field, checked) => {
        setSettings(prev => ({
            ...prev,
            emailNotification: {
                ...prev.emailNotification,
                [field]: checked
            }
        }));
    };

    const handleConfirm = () => {
        if (publishMode === 'connected') {
            if (!isConnected) {
                toast.error('LMS configuration not completed. Please connect metadata first.');
                onOpenConnect();
                return;
            }
            onPublish('connected', null);
        } else {
            // Verify public options
            onPublish('public', settings);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md animate-fade-in flex items-center justify-center p-4 font-sans">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[30px] shadow-2xl border border-slate-100 overflow-hidden relative animate-slide-up flex flex-col">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                            <Globe size={16} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Publish Options</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                    
                    {/* Publishing Modes Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Option 1: Connect It */}
                        <div
                            onClick={() => setPublishMode('connected')}
                            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-44 relative overflow-hidden group ${
                                publishMode === 'connected'
                                    ? 'border-indigo-600 bg-indigo-50/10 shadow-md ring-2 ring-indigo-500/10'
                                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                            }`}
                        >
                            <div>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all mb-4 ${
                                    publishMode === 'connected'
                                        ? 'bg-indigo-600 border-indigo-700 text-white'
                                        : 'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:scale-105'
                                }`}>
                                    <Link2 size={20} />
                                </div>
                                <h3 className="font-extrabold text-slate-800 text-base">Connect It</h3>
                                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                                    Assign the test only to LMS students. Requires LMS login and course assignment details.
                                </p>
                            </div>
                            
                            {publishMode === 'connected' && (
                                <div className="absolute top-4 right-4 text-indigo-600">
                                    <CheckCircle2 size={20} fill="currentColor" className="text-white fill-indigo-600" />
                                </div>
                            )}
                        </div>

                        {/* Option 2: Publish to Web */}
                        <div
                            onClick={() => setPublishMode('public')}
                            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-44 relative overflow-hidden group ${
                                publishMode === 'public'
                                    ? 'border-emerald-600 bg-emerald-50/10 shadow-md ring-2 ring-emerald-500/10'
                                    : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm'
                            }`}
                        >
                            <div>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all mb-4 ${
                                    publishMode === 'public'
                                        ? 'bg-emerald-600 border-emerald-700 text-white'
                                        : 'bg-emerald-50 border-emerald-100 text-emerald-600 group-hover:scale-105'
                                }`}>
                                    <Globe size={20} />
                                </div>
                                <h3 className="font-extrabold text-slate-800 text-base">Publish to Web</h3>
                                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                                    Generate a unique public link that anyone can attempt without requiring an LMS account.
                                </p>
                            </div>

                            {publishMode === 'public' && (
                                <div className="absolute top-4 right-4 text-emerald-600">
                                    <CheckCircle2 size={20} fill="currentColor" className="text-white fill-emerald-600" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mode-Specific Detailed Settings */}
                    {publishMode === 'connected' ? (
                        <div className="bg-indigo-50/20 border border-indigo-100 rounded-2xl p-5 space-y-3">
                            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                <Info size={16} className="text-indigo-600" /> LMS Assignment Details
                            </h4>
                            <p className="text-slate-500 text-xs leading-relaxed">
                                In Connected mode, this test will only show up inside student dashboards who are enrolled in the configured course, institute, and subject.
                            </p>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                <span className="text-xs text-slate-400 font-semibold">
                                    Current Status: {isConnected ? <span className="text-emerald-600 font-bold">● Metadata Connected</span> : <span className="text-amber-500 font-bold">● Connection Required</span>}
                                </span>
                                <button
                                    onClick={onOpenConnect}
                                    className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    Configure Connection
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in border-t border-slate-100 pt-6">
                            <h4 className="font-black text-slate-800 text-sm tracking-wider uppercase">Public Link Configuration</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                
                                {/* Access & Security Card */}
                                <div className="bg-white p-5 border border-slate-200 rounded-2xl space-y-4">
                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Lock size={14} className="text-emerald-500" /> Access & Security</h5>
                                    
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600">Access Password</label>
                                        <input
                                            type="text"
                                            value={settings.password}
                                            onChange={(e) => setSettings(prev => ({ ...prev, password: e.target.value }))}
                                            placeholder="Leave empty for public access"
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:bg-white focus:border-emerald-500 transition-all font-semibold"
                                        />
                                    </div>

                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={!settings.allowMultiple}
                                            onChange={(e) => setSettings(prev => ({ ...prev, allowMultiple: !e.target.checked }))}
                                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                        />
                                        One Response Per Email
                                    </label>

                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={settings.antiSpam}
                                            onChange={(e) => setSettings(prev => ({ ...prev, antiSpam: e.target.checked }))}
                                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                        />
                                        Enable Spam Protection (reCAPTCHA)
                                    </label>
                                </div>

                                {/* Scheduling Card */}
                                <div className="bg-white p-5 border border-slate-200 rounded-2xl space-y-4">
                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={14} className="text-emerald-500" /> Test Scheduling</h5>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Start Date</label>
                                            <input
                                                type="date"
                                                value={settings.startDate}
                                                onChange={(e) => setSettings(prev => ({ ...prev, startDate: e.target.value }))}
                                                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">End Date</label>
                                            <input
                                                type="date"
                                                value={settings.endDate}
                                                onChange={(e) => setSettings(prev => ({ ...prev, endDate: e.target.value }))}
                                                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Expiry Date</label>
                                        <input
                                            type="date"
                                            value={settings.expiryDate}
                                            onChange={(e) => setSettings(prev => ({ ...prev, expiryDate: e.target.value }))}
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Maximum Responses Allowed</label>
                                        <input
                                            type="number"
                                            value={settings.maxResponses}
                                            onChange={(e) => setSettings(prev => ({ ...prev, maxResponses: e.target.value }))}
                                            placeholder="E.g. 500 (Leave empty for infinite)"
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Flow & Notification Card */}
                                <div className="bg-white p-5 border border-slate-200 rounded-2xl space-y-4">
                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={14} className="text-emerald-500" /> Flow & Limits</h5>
                                    
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600">Time Limit (Minutes)</label>
                                        <input
                                            type="number"
                                            value={settings.timeLimit}
                                            onChange={(e) => setSettings(prev => ({ ...prev, timeLimit: e.target.value }))}
                                            placeholder="E.g. 60 (Minutes)"
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 transition-all"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Flow Settings</span>
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={settings.randomizeQuestions}
                                                onChange={(e) => setSettings(prev => ({ ...prev, randomizeQuestions: e.target.checked }))}
                                                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                            />
                                            Randomize Question Order
                                        </label>
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={settings.showScoreAfterSubmission}
                                                onChange={(e) => setSettings(prev => ({ ...prev, showScoreAfterSubmission: e.target.checked }))}
                                                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                            />
                                            Show Score After Submission
                                        </label>
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={settings.showCorrectAnswers}
                                                onChange={(e) => setSettings(prev => ({ ...prev, showCorrectAnswers: e.target.checked }))}
                                                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                            />
                                            Show Correct Answers
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Email notification preferences card */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                                <h5 className="text-xs font-bold text-slate-550 uppercase tracking-widest flex items-center gap-1.5"><Mail size={15} className="text-emerald-600" /> Simulated Email Notifications</h5>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <label className="flex items-center gap-2.5 text-xs font-bold text-slate-600 cursor-pointer select-none bg-white p-3 border border-slate-200 rounded-xl">
                                        <input
                                            type="checkbox"
                                            checked={settings.emailNotification.sendConfirmationEmail}
                                            onChange={(e) => handleEmailNotificationChange('sendConfirmationEmail', e.target.checked)}
                                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                        />
                                        Send Confirmation Email
                                    </label>
                                    <label className="flex items-center gap-2.5 text-xs font-bold text-slate-600 cursor-pointer select-none bg-white p-3 border border-slate-200 rounded-xl">
                                        <input
                                            type="checkbox"
                                            checked={settings.emailNotification.sendScoreEmail}
                                            onChange={(e) => handleEmailNotificationChange('sendScoreEmail', e.target.checked)}
                                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                        />
                                        Send Score Report Email
                                    </label>
                                    <label className="flex items-center gap-2.5 text-xs font-bold text-slate-600 cursor-pointer select-none bg-white p-3 border border-slate-200 rounded-xl">
                                        <input
                                            type="checkbox"
                                            checked={settings.emailNotification.sendSubmissionNotification}
                                            onChange={(e) => handleEmailNotificationChange('sendSubmissionNotification', e.target.checked)}
                                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                        />
                                        Send Admin Alert Notification
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-slate-600 font-bold border border-slate-200 rounded-2xl hover:bg-white hover:shadow-sm transition-all active:scale-95 text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`px-8 py-3 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95 text-sm ${
                            publishMode === 'connected'
                                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                        }`}
                    >
                        {publishMode === 'connected' ? 'Save & Assign to LMS' : 'Save & Publish to Web'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PublishOptionsModal;
