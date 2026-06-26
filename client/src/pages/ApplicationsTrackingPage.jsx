import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, Clock, Building, CheckCircle, ArrowLeft, Lock,
    Compass, BookOpen, Shield, AlertCircle, ChevronRight,
    RefreshCw, Phone, Mail, X, ExternalLink
} from 'lucide-react';

const ApplicationsTrackingPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const phone = searchParams.get('phone') || '';
    const guestName = searchParams.get('name') || 'Guest';

    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('activity');
    const [selectedApp, setSelectedApp] = useState(null);

    const fetchApplications = async () => {
        if (!phone) return;
        try {
            setLoading(true);
            const { data } = await axios.get(`/api/setup/applications?phone=${encodeURIComponent(phone)}`);
            setApplications(data.filter(app => app.status !== 'Registered'));
        } catch (err) {
            console.error('Error fetching apps:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, [phone]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Accepted': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'Rejected': return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'Under Review': return 'bg-amber-50 text-amber-700 border-amber-200';
            default: return 'bg-blue-50 text-blue-700 border-blue-200';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Accepted': return <CheckCircle size={14} className="text-emerald-500" />;
            case 'Rejected': return <X size={14} className="text-rose-500" />;
            case 'Under Review': return <Clock size={14} className="text-amber-500" />;
            default: return <AlertCircle size={14} className="text-blue-500" />;
        }
    };

    const sections = [
        { id: 'activity', label: 'My Activity', icon: FileText, locked: false, desc: 'Track your application status' },
        { id: 'preview', label: 'Portal Preview', icon: Compass, locked: false, desc: 'Explore student portal demo' },
        { id: 'resources', label: 'Study Resources', icon: BookOpen, locked: true, desc: 'Course materials & files' },
        { id: 'support', label: 'Student Support', icon: Shield, locked: true, desc: 'Help & guidance center' },
    ];

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-[#0b1329] border-b border-slate-800/50 px-4 md:px-8 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-white font-black text-base leading-none">Applications Tracking</h1>
                        <p className="text-white/50 text-[11px] mt-0.5">Welcome, {guestName}</p>
                    </div>
                </div>
                <button
                    onClick={fetchApplications}
                    className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                    title="Refresh"
                >
                    <RefreshCw size={16} />
                </button>
            </header>

            <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">

                {/* Section Navigation */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {sections.map(sec => {
                        const IconC = sec.icon;
                        return (
                            <button
                                key={sec.id}
                                onClick={() => !sec.locked && setActiveSection(sec.id)}
                                className={`relative p-4 rounded-2xl border text-left transition-all ${
                                    sec.locked
                                        ? 'bg-slate-50 border-slate-200 cursor-not-allowed opacity-70'
                                        : activeSection === sec.id
                                            ? 'bg-[#0b1329] border-[#0b1329] text-white shadow-lg'
                                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
                                }`}
                            >
                                {sec.locked && (
                                    <div className="absolute top-2 right-2">
                                        <Lock size={12} className="text-slate-400" />
                                    </div>
                                )}
                                <IconC size={20} className={activeSection === sec.id && !sec.locked ? 'text-indigo-400 mb-2' : 'text-slate-400 mb-2'} />
                                <p className={`text-xs font-extrabold leading-none ${activeSection === sec.id && !sec.locked ? 'text-white' : 'text-slate-700'}`}>
                                    {sec.label}
                                </p>
                                <p className={`text-[10px] mt-1 leading-tight ${activeSection === sec.id && !sec.locked ? 'text-white/60' : 'text-slate-400'}`}>
                                    {sec.locked ? '🔒 Login Required' : sec.desc}
                                </p>
                            </button>
                        );
                    })}
                </div>

                {/* Section Content */}
                <AnimatePresence mode="wait">

                    {/* ── MY ACTIVITY ── */}
                    {activeSection === 'activity' && (
                        <motion.div
                            key="activity"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <FileText size={18} className="text-indigo-500" />
                                    My Applications
                                    {applications.length > 0 && (
                                        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                            {applications.length}
                                        </span>
                                    )}
                                </h2>
                            </div>

                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs text-slate-500">Fetching applications...</span>
                                </div>
                            ) : applications.length > 0 ? (
                                <div className="space-y-4">
                                    {applications.map(app => (
                                        <motion.div
                                            key={app._id}
                                            whileHover={{ y: -2 }}
                                            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {getStatusIcon(app.status)}
                                                        <h3 className="font-extrabold text-slate-800 text-sm">{app.course?.name}</h3>
                                                        <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full uppercase">
                                                            {app.course?.code}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                                                        <Building size={12} className="text-slate-400" />
                                                        <span className="font-semibold">{app.institute?.name}</span>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={11} />
                                                            Applied: {new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                        {app.institute?.contactEmail && (
                                                            <span className="flex items-center gap-1">
                                                                <Mail size={11} /> {app.institute.contactEmail}
                                                            </span>
                                                        )}
                                                        {app.institute?.helplineNumber && (
                                                            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                                                                <Phone size={11} /> {app.institute.helplineNumber}
                                                                <span className="text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 py-0.5 rounded font-extrabold">24/7</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <span className={`px-3 py-1.5 border rounded-full text-[10px] font-extrabold uppercase tracking-wider flex-shrink-0 ${getStatusColor(app.status)}`}>
                                                    {app.status}
                                                </span>
                                            </div>

                                            {/* Status-specific action */}
                                            {app.status === 'Accepted' && (
                                                <div className="mt-4 pt-4 border-t border-slate-100">
                                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
                                                        <CheckCircle size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-xs font-bold text-emerald-700">Your application was accepted!</p>
                                                            <p className="text-[11px] text-emerald-600 mt-0.5">Go back to the home page and click "Track Applications" → "Create Account to Login"</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {(app.status === 'Applied' || app.status === 'Under Review') && (
                                                <div className="mt-4 pt-4 border-t border-slate-100">
                                                    <p className="text-[11px] text-slate-400 italic">Your application is being reviewed. You'll be notified once a decision is made.</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
                                    <FileText size={36} className="mx-auto text-slate-300 mb-3" />
                                    <h3 className="font-bold text-slate-600 text-sm">No applications yet</h3>
                                    <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">
                                        Go back to the home page, select a course, and apply to an institute.
                                    </p>
                                    <button
                                        onClick={() => navigate('/')}
                                        className="mt-4 px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all"
                                    >
                                        Browse Institutes →
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── PORTAL PREVIEW ── */}
                    {activeSection === 'preview' && (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            className="space-y-4"
                        >
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Compass size={18} className="text-indigo-500" />
                                Student Portal Preview
                            </h2>

                            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                {/* Preview header bar */}
                                <div className="bg-[#0b1329] px-5 py-4 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm">L</div>
                                    <div>
                                        <p className="text-white font-bold text-sm">LMSPortal — Student View</p>
                                        <p className="text-white/40 text-[10px]">Preview Mode — Read Only</p>
                                    </div>
                                    <span className="ml-auto text-[9px] bg-amber-400/20 text-amber-400 border border-amber-400/30 px-2 py-1 rounded-full font-bold uppercase">Demo</span>
                                </div>

                                <div className="p-6 space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {['My Tests', 'Study Files', 'Performance', 'Tools'].map((item, i) => (
                                            <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                                                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                                    <BookOpen size={14} className="text-indigo-600" />
                                                </div>
                                                <p className="text-xs font-bold text-slate-600">{item}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                                        <AlertCircle size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-indigo-700">This is a Preview</p>
                                            <p className="text-[11px] text-indigo-600 mt-0.5">
                                                Once your application is accepted and you create your account, you'll have full access to this portal with real course content, tests, and tools.
                                            </p>
                                        </div>
                                    </div>

                                    {applications.length > 0 && applications.some(a => a.status === 'Applied' || a.status === 'Under Review') && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                            <p className="text-xs font-bold text-amber-700">You have {applications.filter(a => a.status === 'Applied' || a.status === 'Under Review').length} pending application(s)</p>
                                            <p className="text-[11px] text-amber-600 mt-1">Waiting for institute review. You'll be notified once accepted.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── LOCKED SECTIONS ── */}
                    {(activeSection === 'resources' || activeSection === 'support') && (
                        <motion.div
                            key="locked"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                        >
                            <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50/80 pointer-events-none" />
                                <div className="relative z-10 space-y-4">
                                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                                        <Lock size={28} className="text-slate-400" />
                                    </div>
                                    <h3 className="font-extrabold text-slate-700 text-lg">Login Required</h3>
                                    <p className="text-slate-500 text-sm max-w-xs mx-auto">
                                        This section is available only for registered students. Create your account after your application is accepted.
                                    </p>
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="px-6 py-3 bg-[#0b1329] text-white rounded-xl text-sm font-bold hover:bg-[#152244] transition-all"
                                    >
                                        Sign In →
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>

                {/* Back button */}
                <div className="pt-4">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-all"
                    >
                        <ArrowLeft size={14} /> Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApplicationsTrackingPage;
