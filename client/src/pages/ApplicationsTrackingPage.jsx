import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, Clock, Building, CheckCircle, ArrowLeft, Lock,
    Compass, BookOpen, Shield, AlertCircle, ChevronRight,
    RefreshCw, Phone, Mail, X, ExternalLink, GraduationCap, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// Fixed Futuristic Animated Background Component
const FuturisticBackground = () => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            const x = (e.clientX / window.innerWidth) - 0.5;
            const y = (e.clientY / window.innerHeight) - 0.5;
            setMousePos({ x, y });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="fixed inset-0 w-full h-full -z-20 pointer-events-none overflow-hidden select-none bg-gradient-to-br from-[#dce4ec] via-[#b6d0e6] to-[#1e60a3]">
            <style>{`
                .glass-blob {
                    position: absolute;
                    background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(200,225,255,0.15) 100%);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255,255,255,0.45);
                    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15),
                                inset 0 8px 16px 0 rgba(255,255,255,0.25);
                }
                .blob-primary {
                    width: 380px;
                    height: 380px;
                    border-radius: 53% 47% 43% 57% / 45% 52% 48% 55%;
                    animation: morphBlob 16s ease-in-out infinite;
                }
                .blob-secondary {
                    width: 260px;
                    height: 260px;
                    border-radius: 40% 60% 50% 50% / 60% 40% 60% 40%;
                    animation: morphBlob2 12s ease-in-out infinite;
                }
                .blob-glow {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(100px);
                }
                @keyframes morphBlob {
                    0% { border-radius: 53% 47% 43% 57% / 45% 52% 48% 55%; transform: rotate(0deg); }
                    33% { border-radius: 40% 60% 55% 45% / 55% 40% 60% 45%; transform: rotate(120deg); }
                    66% { border-radius: 60% 40% 45% 55% / 40% 60% 45% 60%; transform: rotate(240deg); }
                    100% { border-radius: 53% 47% 43% 57% / 45% 52% 48% 55%; transform: rotate(360deg); }
                }
                @keyframes morphBlob2 {
                    0% { border-radius: 40% 60% 50% 50% / 60% 40% 60% 40%; transform: rotate(360deg); }
                    50% { border-radius: 60% 40% 60% 40% / 40% 60% 40% 60%; transform: rotate(180deg); }
                    100% { border-radius: 40% 60% 50% 50% / 60% 40% 60% 40%; transform: rotate(0deg); }
                }
                .float-slow {
                    animation: floatingVertical 6s ease-in-out infinite;
                }
                @keyframes floatingVertical {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-15px); }
                }
                .float-delay {
                    animation: floatingVerticalDelay 8s ease-in-out infinite;
                }
                @keyframes floatingVerticalDelay {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
            `}</style>

            {/* Background grids and glowing lights */}
            <div 
                className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0c_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0c_1px,transparent_1px)] bg-[size:50px_50px] transition-transform duration-500 ease-out"
                style={{
                    transform: `translate(${mousePos.x * 15}px, ${mousePos.y * 15}px)`
                }}
            />

            {/* Glowing orbs representing the background lights in the image */}
            <div className="absolute top-[20%] left-[45%] w-[450px] h-[450px] bg-[#49a8f5]/25 blob-glow animate-pulse"></div>
            <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] bg-[#2860a4]/40 blob-glow"></div>
            <div className="absolute top-[10%] left-[5%] w-[350px] h-[350px] bg-[#a8c2d9]/35 blob-glow"></div>

            {/* Center glassmorphism cluster */}
            <div 
                className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-transform duration-1000 ease-out"
                style={{
                    transform: `translate(calc(-50% + ${mousePos.x * -70}px), calc(-50% + ${mousePos.y * -70}px))`
                }}
            >
                {/* Cluster of glass circles layered over each other to create the organic fluid shape */}
                <div className="relative w-[500px] h-[500px] flex items-center justify-center">
                    <div className="glass-blob blob-primary opacity-90 float-slow shadow-xl"></div>
                    <div className="glass-blob blob-secondary opacity-80 float-delay -mt-16 -ml-24 border-[#ffffff40]"></div>
                    <div className="absolute w-[200px] h-[200px] rounded-full glass-blob opacity-60 float-slow border-white/20 mt-20 ml-28 flex items-center justify-center">
                        <div className="w-[140px] h-[140px] rounded-full bg-gradient-to-tr from-[#1e60a3]/20 to-[#49a8f5]/20 blur-md"></div>
                    </div>

                    {/* Floating mechanical elements - SVG line nodes representing the metal rods in the user's reference */}
                    <svg className="absolute w-[600px] h-[600px] pointer-events-none opacity-60" viewBox="0 0 600 600">
                        <path d="M 100 150 L 220 230" stroke="rgba(255,255,255,0.7)" strokeWidth="3" fill="none" />
                        <circle cx="100" cy="150" r="6" fill="#ffffff" />
                        <circle cx="220" cy="230" r="5" fill="#49a8f5" />
                        
                        <path d="M 500 320 L 380 270" stroke="rgba(255,255,255,0.7)" strokeWidth="3" fill="none" />
                        <circle cx="500" cy="320" r="6" fill="#ffffff" />
                        <circle cx="380" cy="270" r="5" fill="#1e60a3" />

                        {/* Floating connecting links */}
                        <line x1="220" y1="230" x2="380" y2="270" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="5,5" />
                    </svg>

                    {/* Floating Stats Card mimicking the "82%" glass block in the image */}
                    <div 
                        className="absolute w-[180px] p-5 rounded-3xl border border-white/40 bg-white/25 backdrop-blur-xl shadow-2xl flex flex-col justify-between items-center text-center float-slow border-[#ffffff40] -mt-10 ml-6"
                        style={{
                            transform: `translate(${mousePos.x * 35}px, ${mousePos.y * 35}px)`
                        }}
                    >
                        <div className="text-3xl font-black text-white drop-shadow-md select-none tracking-tight">82%</div>
                        
                        {/* Circular Progress Ring */}
                        <div className="relative w-14 h-14 my-3 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.2)" strokeWidth="4.5" fill="transparent" />
                                <circle cx="28" cy="28" r="22" stroke="url(#blue-grad)" strokeWidth="4.5" fill="transparent"
                                        strokeDasharray="138" strokeDashoffset="25" strokeLinecap="round" />
                                <defs>
                                    <linearGradient id="blue-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#ffffff" />
                                        <stop offset="100%" stopColor="#49a8f5" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute w-2 h-2 rounded-full bg-white shadow-md shadow-indigo-600/50"></div>
                        </div>

                        <div className="text-[9px] font-bold text-slate-100/90 leading-normal tracking-wide">
                            LMS Interactive Sandbox Platform Efficiency
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating ambient icons/notes from the LMS system */}
            <div 
                className="absolute top-[18%] left-[10%] opacity-40 transition-transform duration-1000 ease-out"
                style={{ transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px) rotate(15deg)` }}
            >
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white shadow-lg">
                    <GraduationCap size={24} />
                </div>
            </div>

            <div 
                className="absolute bottom-[22%] left-[15%] opacity-40 transition-transform duration-1000 ease-out"
                style={{ transform: `translate(${mousePos.x * -25}px, ${mousePos.y * 25}px) rotate(-10deg)` }}
            >
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white shadow-lg">
                    <BookOpen size={24} />
                </div>
            </div>

            <div 
                className="absolute top-[35%] right-[12%] opacity-35 transition-transform duration-1000 ease-out"
                style={{ transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px) rotate(8deg)` }}
            >
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white shadow-lg">
                    <Sparkles size={24} />
                </div>
            </div>
        </div>
    );
};

const ApplicationsTrackingPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const phone = searchParams.get('phone') || '';
    const guestName = searchParams.get('name') || 'Guest';

    const { login } = useAuth();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('activity');
    const [selectedApp, setSelectedApp] = useState(null);

    // Registration States
    const [registeringApp, setRegisteringApp] = useState(null);
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirmPassword, setRegConfirmPassword] = useState('');
    const [regLoading, setRegLoading] = useState(false);

    const handleRegisterStudentSubmit = async (e) => {
        e.preventDefault();
        if (regPassword !== regConfirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setRegLoading(true);
        try {
            await axios.post('/api/setup/register-student', {
                applicationId: registeringApp._id,
                email: regEmail,
                password: regPassword
            });

            toast.success("Account created successfully! Logging you in...");

            // Auto login
            await login(regEmail, regPassword);

            // Clean up state
            setRegisteringApp(null);
            setRegEmail('');
            setRegPassword('');
            setRegConfirmPassword('');

            // Redirect to student portal
            navigate('/student/tests');
        } catch (error) {
            console.error("Registration failed:", error);
            toast.error(error.response?.data?.message || "Registration failed");
        } finally {
            setRegLoading(false);
        }
    };

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
        <div className="min-h-screen bg-transparent font-sans relative overflow-x-hidden">
            {/* Fixed Futuristic Animated Background */}
            <FuturisticBackground />
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
                                className={`relative p-4 rounded-2xl border text-left transition-all backdrop-blur-md ${
                                    sec.locked
                                        ? 'bg-slate-100/30 border-white/40 cursor-not-allowed opacity-60'
                                        : activeSection === sec.id
                                            ? 'bg-[#0b1329]/90 border-[#0b1329] text-white shadow-lg shadow-slate-900/10'
                                            : 'bg-white/40 border-white/60 hover:border-indigo-300 hover:bg-white/65 hover:shadow-md hover:-translate-y-0.5'
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
                                            whileHover={{ y: -5, scale: 1.005, boxShadow: '0 20px 40px rgba(30, 96, 163, 0.1)' }}
                                            className="bg-white/45 backdrop-blur-md border border-white/65 rounded-[2rem] p-5 shadow-md hover:border-indigo-300 hover:bg-white/65 transition-all duration-300"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {getStatusIcon(app.status)}
                                                        <h3 className="font-extrabold text-slate-800 text-sm">{app.course?.name}</h3>
                                                        <span className="text-[9px] font-bold text-indigo-650 bg-indigo-50/50 border border-indigo-100/50 px-2 py-0.5 rounded-full uppercase">
                                                            {app.course?.code}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 text-xs text-slate-650 mb-3">
                                                        <Building size={12} className="text-slate-400" />
                                                        <span className="font-bold">{app.institute?.name}</span>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 font-semibold">
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
                                                            <span className="flex items-center gap-1 text-emerald-600 font-bold">
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
                                                    <div className="bg-emerald-50/75 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                        <div className="flex items-start gap-2.5">
                                                            <CheckCircle size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                                                            <div>
                                                                <p className="text-sm font-bold text-emerald-800">
                                                                    {app.isRegistrationRequest ? `Your ${app.role} application was approved!` : 'Your application was accepted!'}
                                                                </p>
                                                                <p className="text-xs text-emerald-650 mt-0.5 font-medium">
                                                                    {app.isRegistrationRequest
                                                                        ? `Your ${app.role} user account is created. Click below to login to your portal.`
                                                                        : 'Create your login credentials below to set up your student account.'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {app.isRegistrationRequest ? (
                                                            <button
                                                                onClick={() => navigate('/login')}
                                                                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                                                            >
                                                                Login to {app.role} Portal
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    setRegisteringApp(app);
                                                                    setRegEmail(app.guestEmail || '');
                                                                }}
                                                                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                                                            >
                                                                Create Account to Login
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {(app.status === 'Applied' || app.status === 'Under Review') && (
                                                <div className="mt-4 pt-4 border-t border-slate-200/50">
                                                    <p className="text-[11px] text-slate-400 italic">Your application is being reviewed. You'll be notified once a decision is made.</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 bg-white/40 backdrop-blur-md border border-white/60 rounded-[2rem] shadow-md">
                                    <FileText size={36} className="mx-auto text-slate-350 mb-3" />
                                    <h3 className="font-black text-slate-700 text-sm">No applications yet</h3>
                                    <p className="text-slate-500 text-xs mt-1 max-w-xs mx-auto font-semibold">
                                        Go back to the home page, select a course, and apply to an institute.
                                    </p>
                                    <button
                                        onClick={() => navigate('/')}
                                        className="mt-4 px-5 py-2.5 bg-gradient-to-r from-[#1e60a3] to-[#49a8f5] text-white rounded-xl text-xs font-bold hover:from-[#1b5592] hover:to-[#3b93db] transition-all shadow-md active:scale-95 cursor-pointer"
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
                            {(() => {
                                const hasTeacherApp = applications.some(a => a.role === 'Teacher');
                                const hasEditorApp = applications.some(a => a.role === 'Editor');
                                const roleName = hasTeacherApp ? 'Teacher' : (hasEditorApp ? 'Editor' : 'Student');

                                return (
                                    <>
                                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <Compass size={18} className="text-indigo-500" />
                                            {roleName} Portal Preview
                                        </h2>
                                        <div className="bg-white/40 backdrop-blur-md border border-white/60 rounded-[2rem] overflow-hidden shadow-md">
                                            {/* Preview header bar */}
                                            <div className="bg-[#0b1329] px-5 py-4 flex items-center gap-3">
                                                <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm">
                                                    {roleName[0]}
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-sm">LMSPortal — {roleName} Workspace View</p>
                                                    <p className="text-white/40 text-[10px]">Preview Mode — Read Only</p>
                                                </div>
                                                <span className="ml-auto text-[9px] bg-amber-400/20 text-amber-400 border border-amber-400/30 px-2 py-1 rounded-full font-bold uppercase">Demo</span>
                                            </div>

                                            <div className="p-6 space-y-4">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {(roleName === 'Teacher'
                                                        ? ['Assigned Courses', 'Video Lectures', 'Student Evaluation', 'Class Notices']
                                                        : roleName === 'Editor'
                                                        ? ['Course Content', 'Quiz Builder', 'Media Library', 'Submissions']
                                                        : ['My Tests', 'Study Files', 'Performance', 'Tools']
                                                    ).map((item, i) => (
                                                        <div key={i} className="bg-white/35 border border-white/50 rounded-xl p-3 text-center">
                                                            <div className="w-8 h-8 bg-indigo-50 border border-indigo-105 rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                                                                <BookOpen size={14} className="text-indigo-650" />
                                                            </div>
                                                            <p className="text-xs font-black text-slate-700">{item}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="bg-indigo-50/70 border border-indigo-100/50 rounded-xl p-4 flex items-start gap-3">
                                                    <AlertCircle size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs font-bold text-indigo-700">This is a {roleName} Workspace Preview</p>
                                                        <p className="text-[11px] text-indigo-600 mt-0.5 font-semibold">
                                                            Once your application is approved by the institute, you will have full access to your {roleName.toLowerCase()} dashboard, courses, and tools.
                                                        </p>
                                                    </div>
                                                </div>

                                                {applications.length > 0 && applications.some(a => a.status === 'Applied' || a.status === 'Under Review') && (
                                                    <div className="bg-amber-50/70 border border-amber-200/50 rounded-xl p-4">
                                                        <p className="text-xs font-bold text-amber-700">You have {applications.filter(a => a.status === 'Applied' || a.status === 'Under Review').length} pending application(s)</p>
                                                        <p className="text-[11px] text-amber-600 mt-1 font-semibold">Waiting for institute review. You'll be notified once accepted.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
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
                            <div className="text-center py-20 bg-white/40 backdrop-blur-md border border-white/60 rounded-[2rem] relative overflow-hidden shadow-md">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50/10 pointer-events-none" />
                                <div className="relative z-10 space-y-4">
                                    <div className="w-16 h-16 bg-white/40 backdrop-blur-md border border-white/50 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                                        <Lock size={28} className="text-slate-550" />
                                    </div>
                                    <h3 className="font-black text-slate-800 text-lg">Login Required</h3>
                                    <p className="text-slate-600 text-sm max-w-xs mx-auto font-semibold">
                                        This section is available only for registered students. Create your account after your application is accepted.
                                    </p>
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="px-6 py-3 bg-gradient-to-r from-[#1e60a3] to-[#49a8f5] hover:from-[#1b5592] hover:to-[#3b93db] text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-95"
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

            {/* ─────────────── GUEST STUDENT REGISTRATION MODAL ─────────────── */}
            <AnimatePresence>
                {registeringApp && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.6 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setRegisteringApp(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        ></motion.div>

                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 15 }}
                            className="bg-white border border-slate-200 rounded-[2.5rem] w-full max-w-md p-6 md:p-8 relative z-10 text-slate-800 overflow-hidden shadow-2xl"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-bold tracking-tight text-slate-900 font-sans">Setup Student Account</h3>
                                    <p className="text-xs text-slate-500 mt-1 font-sans">Create login details for {registeringApp.guestName}</p>
                                </div>
                                <button
                                    onClick={() => setRegisteringApp(null)}
                                    className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl transition-all"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleRegisterStudentSubmit} className="space-y-4 font-sans">
                                <div className="space-y-4">
                                    <div className="border-b border-slate-200 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 transition-all opacity-85">
                                        <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">Email Address (From Application)</label>
                                        <input
                                            type="email"
                                            value={regEmail}
                                            disabled
                                            required
                                            className="w-full bg-transparent border-none text-slate-500 text-xs font-semibold focus:outline-none cursor-not-allowed"
                                        />
                                    </div>

                                    <div className="border-b border-slate-200 focus-within:border-indigo-500 py-1 transition-all">
                                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Create Password</label>
                                        <input
                                            type="password"
                                            value={regPassword}
                                            onChange={(e) => setRegPassword(e.target.value)}
                                            required
                                            placeholder="Create a password"
                                            className="w-full bg-transparent border-none text-slate-800 text-sm focus:outline-none placeholder-slate-400"
                                        />
                                    </div>

                                    <div className="border-b border-slate-200 focus-within:border-indigo-500 py-1 transition-all">
                                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Confirm Password</label>
                                        <input
                                            type="password"
                                            value={regConfirmPassword}
                                            onChange={(e) => setRegConfirmPassword(e.target.value)}
                                            required
                                            placeholder="Confirm your password"
                                            className="w-full bg-transparent border-none text-slate-800 text-sm focus:outline-none placeholder-slate-400"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={regLoading}
                                    className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-indigo-600/10 flex justify-center items-center text-sm disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {regLoading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        "Register & Login"
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ApplicationsTrackingPage;
