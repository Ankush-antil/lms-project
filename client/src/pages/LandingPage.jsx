import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    BookOpen, Building, GraduationCap, Lock, Mail, Phone, Key, 
    CheckCircle, Clock, ArrowRight, ChevronDown, LogOut, Compass, 
    FileText, User, MapPin, Send, HelpCircle, X, ShieldAlert,
    Sparkles, Shield, Award, MessageSquare, Video
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
    const navigate = useNavigate();
    const { user, login, logout } = useAuth();
    
    // Guest Session state
    const [guestSession, setGuestSession] = useState(() => {
        const saved = localStorage.getItem('lms_guest_session');
        return saved ? JSON.parse(saved) : null;
    });

    // Lock Modal States
    const [showLockModal, setShowLockModal] = useState(!user && !guestSession);
    const [modalTab, setModalTab] = useState('register'); // 'register' | 'login'
    
    // Guest Register Form State
    const [username, setUsername] = useState('');
    const [phone, setPhone] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [generatedOtp, setGeneratedOtp] = useState('');
    const [userOtp, setUserOtp] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [registerLoading, setRegisterLoading] = useState(false);
    
    // Login Form State
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    // Landing Page Data States
    const [courses, setCourses] = useState([]);
    const [uniqueCourses, setUniqueCourses] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [selectedCourseName, setSelectedCourseName] = useState(null);
    const [showCoursesDropdown, setShowCoursesDropdown] = useState(false);

    // Apply Modal States
    const [selectedInstitute, setSelectedInstitute] = useState(null);
    const [selectedCourseForApply, setSelectedCourseForApply] = useState(null);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [applyName, setApplyName] = useState('');
    const [applyPhone, setApplyPhone] = useState('');
    const [applyEmail, setApplyEmail] = useState('');
    const [applyStatement, setApplyStatement] = useState('');
    const [applyLoading, setApplyLoading] = useState(false);
    const [applySuccess, setApplySuccess] = useState(false);

    // Applications Tracking
    const [applications, setApplications] = useState([]);
    const [showApplicationsPanel, setShowApplicationsPanel] = useState(false);
    const [loadingApps, setLoadingApps] = useState(false);

    // Registration States for Accepted Applications
    const [registeringApp, setRegisteringApp] = useState(null);
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirmPassword, setRegConfirmPassword] = useState('');
    const [regLoading, setRegLoading] = useState(false);

    // Student Portal Simulator States
    const [showSimulatorModal, setShowSimulatorModal] = useState(false);
    const [simulatorCourse, setSimulatorCourse] = useState('');
    const [simulatorInstitute, setSimulatorInstitute] = useState('');
    const [simulatorTab, setSimulatorTab] = useState('dashboard');
    const [mockTestStarted, setMockTestStarted] = useState(false);
    const [selectedMockAnswer, setSelectedMockAnswer] = useState('');
    const [mockTestSubmitted, setMockTestSubmitted] = useState(false);
    const [mockTestScore, setMockTestScore] = useState(null);
    const [helpdeskMessages, setHelpdeskMessages] = useState([
        { sender: 'bot', text: 'Hello! Welcome to the LMS Student Helpdesk Simulator. How can I assist you with your application today?' }
    ]);

    const dropdownRef = useRef(null);
    const countdownTimer = useRef(null);

    // Sync showLockModal with auth state or guest session
    useEffect(() => {
        if (user || guestSession) {
            setShowLockModal(false);
        } else {
            setShowLockModal(true);
        }
    }, [user, guestSession]);

    // Fetch active courses
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setLoadingCourses(true);
                const { data } = await axios.get('/api/setup/courses?status=active');
                setCourses(data);
                
                // Get unique course names
                const names = [...new Set(data.map(c => c.name))];
                setUniqueCourses(names);
            } catch (err) {
                console.error("Error fetching courses:", err);
                toast.error("Failed to load available courses");
            } finally {
                setLoadingCourses(false);
            }
        };
        fetchCourses();
    }, []);

    // Fetch user's applications
    const fetchUserApplications = async (phoneNum) => {
        if (!phoneNum) return;
        try {
            setLoadingApps(true);
            const { data } = await axios.get(`/api/setup/applications?phone=${encodeURIComponent(phoneNum)}`);
            // Hide/Filter out applications that have been registered/logged in
            setApplications(data.filter(app => app.status !== 'Registered'));
        } catch (err) {
            console.error("Error fetching applications:", err);
        } finally {
            setLoadingApps(false);
        }
    };

    useEffect(() => {
        if (guestSession?.phone) {
            fetchUserApplications(guestSession.phone);
        }
    }, [guestSession]);

    // Dropdown click outside handler
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowCoursesDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // OTP Countdown countdown effect
    useEffect(() => {
        if (countdown > 0) {
            countdownTimer.current = setTimeout(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        }
        return () => clearTimeout(countdownTimer.current);
    }, [countdown]);

    // Send simulated OTP
    const handleSendOtp = async () => {
        if (!username || !phone) {
            toast.error("Please fill in username and phone number first");
            return;
        }
        if (phone.length < 10) {
            toast.error("Please enter a valid phone number");
            return;
        }

        try {
            const { data } = await axios.post('/api/setup/send-otp', { phone });
            setOtpSent(true);
            setCountdown(60);
            toast.success(data.message || "OTP sent!");
        } catch (err) {
            console.error("OTP request failed:", err);
            toast.error(err.response?.data?.message || "Failed to generate OTP");
        }
    };

    // Guest Register submit
    const handleGuestRegister = async (e) => {
        e.preventDefault();
        if (!otpSent) {
            toast.error("Please send and verify OTP first");
            return;
        }

        setRegisterLoading(true);
        try {
            await axios.post('/api/setup/verify-otp', { phone, otp: userOtp });
            
            const guestData = { username, phone };
            localStorage.setItem('lms_guest_session', JSON.stringify(guestData));
            setGuestSession(guestData);
            setShowLockModal(false);
            toast.success(`Welcome, Guest ${username}!`);
        } catch (err) {
            console.error("OTP Verification failed:", err);
            toast.error(err.response?.data?.message || "Invalid or expired OTP code");
        } finally {
            setRegisterLoading(false);
        }
    };

    // Submit student account registration from accepted application
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
            setShowApplicationsPanel(false);
            
            // Redirect to student portal
            navigate('/student');
        } catch (error) {
            console.error("Registration failed:", error);
            toast.error(error.response?.data?.message || "Registration failed");
        } finally {
            setRegLoading(false);
        }
    };

    // Active User Login submit
    const handleActiveUserLogin = async (e) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError('');
        try {
            const data = await login(loginEmail, loginPassword);
            toast.success(`Signed in as ${data.name}`);
            
            // Redirect based on Role
            if (data.role === 'Admin') navigate('/admin');
            else if (data.role === 'Teacher') navigate('/teacher');
            else if (data.role === 'Student') navigate('/student/tests');
            else if (data.role === 'Editor') navigate('/editor');
            else if (data.role === 'Institute') navigate('/institute');
            
            setShowLockModal(false);
        } catch (err) {
            setLoginError(err.response?.data?.message || 'Login failed. Please check credentials.');
        } finally {
            setLoginLoading(false);
        }
    };

    // Exit Guest session
    const handleExitGuestSession = () => {
        localStorage.removeItem('lms_guest_session');
        setGuestSession(null);
        setSelectedCourseName(null);
        setApplications([]);
        setShowLockModal(true);
        toast.success("Guest session ended");
    };

    // Helpdesk simulator bot response
    const handleHelpdeskQuestionClick = (questionText, answerText) => {
        setHelpdeskMessages(prev => [
            ...prev,
            { sender: 'user', text: questionText },
            { sender: 'bot', text: 'Typing...' }
        ]);

        setTimeout(() => {
            setHelpdeskMessages(prev => {
                const list = prev.filter(msg => msg.text !== 'Typing...');
                return [
                    ...list,
                    { sender: 'bot', text: answerText }
                ];
            });
        }, 800);
    };

    // Get institutes offering selected course
    const getInstitutesForSelectedCourse = () => {
        if (!selectedCourseName) return [];
        return courses.filter(c => c.name === selectedCourseName);
    };

    // Open Apply Modal
    const handleOpenApplyModal = (courseObj) => {
        setSelectedCourseForApply(courseObj);
        setSelectedInstitute(courseObj.institute);
        setApplyName(guestSession?.username || user?.name || '');
        setApplyPhone(guestSession?.phone || '');
        setApplyEmail(user?.email || '');
        setApplyStatement('');
        setApplySuccess(false);
        setShowApplyModal(true);
    };

    // Submit Application
    const handleApplySubmit = async (e) => {
        e.preventDefault();
        setApplyLoading(true);
        try {
            await axios.post('/api/setup/apply', {
                guestName: applyName,
                guestPhone: applyPhone,
                guestEmail: applyEmail,
                courseId: selectedCourseForApply._id,
                instituteId: selectedInstitute._id,
                statement: applyStatement
            });
            
            setApplySuccess(true);
            toast.success(`Application submitted to ${selectedInstitute.name}!`);
            
            // Refresh applications tracker list
            if (applyPhone) {
                fetchUserApplications(applyPhone);
            }
        } catch (err) {
            console.error("Apply failed:", err);
            toast.error(err.response?.data?.message || "Failed to submit application");
        } finally {
            setApplyLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans select-none relative overflow-x-hidden">
            {/* Background design elements */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
            <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[80px] -z-10 pointer-events-none"></div>

            {/* ─────────────── HEADER ─────────────── */}
            <header className="h-20 border-b border-slate-800/50 bg-[#0b1329] sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between">
                <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setSelectedCourseName(null)}>
                    <div className="w-11 h-11 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform duration-300">
                        L
                    </div>
                    <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
                        LMS<span className="text-slate-400 font-light">Portal</span>
                    </span>
                </div>

                <div className="flex items-center space-x-3 md:space-x-4">
                    {/* Track Applications inside Header */}
                    {!showLockModal && guestSession && (
                        <button
                            onClick={() => setShowApplicationsPanel(true)}
                            className="flex items-center space-x-2 px-3 py-2 md:px-4 md:py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all font-semibold text-xs md:text-sm"
                        >
                            <FileText size={16} />
                            <span>Track Applications</span>
                            {applications.length > 0 && (
                                <span className="bg-indigo-650 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {applications.length}
                                </span>
                            )}
                        </button>
                    )}

                    {/* Courses Dropdown */}
                    {!showLockModal && (
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setShowCoursesDropdown(!showCoursesDropdown)}
                                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all font-semibold text-sm hover:bg-slate-800/50 text-white"
                            >
                                <span>Explore Courses</span>
                                <ChevronDown size={16} className={`transition-transform duration-300 ${showCoursesDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            
                            <AnimatePresence>
                                {showCoursesDropdown && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 overflow-hidden"
                                    >
                                        <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800/50 mb-1">
                                            Available Programs
                                        </div>
                                        {loadingCourses ? (
                                            <div className="p-4 text-center text-slate-500 text-xs">Loading courses...</div>
                                        ) : uniqueCourses.length > 0 ? (
                                            <div className="max-h-64 overflow-y-auto space-y-0.5">
                                                {uniqueCourses.map((courseName) => (
                                                    <button
                                                        key={courseName}
                                                        onClick={() => {
                                                            setSelectedCourseName(courseName);
                                                            setShowCoursesDropdown(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${
                                                            selectedCourseName === courseName 
                                                            ? 'bg-indigo-600/20 text-indigo-300 border-l-4 border-indigo-500' 
                                                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                                        }`}
                                                    >
                                                        <span>{courseName}</span>
                                                        <ArrowRight size={14} className="opacity-0 group-hover:opacity-100" />
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-4 text-center text-slate-500 text-xs">No courses available</div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Guest Session/Auth Actions */}
                    {guestSession && (
                        <div className="flex items-center space-x-3 pl-4 border-l border-slate-800">
                            <div className="hidden md:flex flex-col text-right">
                                <span className="text-xs font-bold text-slate-200">{guestSession.username}</span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Guest Profile</span>
                            </div>
                            <button
                                onClick={handleExitGuestSession}
                                title="Exit Guest Session"
                                className="p-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-950/20 hover:border-red-900 rounded-xl transition-all"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    )}

                    {user && (
                        <div className="flex items-center space-x-3 pl-4 border-l border-slate-800">
                            <div className="hidden md:flex flex-col text-right">
                                <span className="text-xs font-bold text-slate-200">{user.name}</span>
                                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">{user.role}</span>
                            </div>
                            <button
                                onClick={() => navigate(`/${user.role.toLowerCase()}`)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600/10 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-bold transition-all"
                            >
                                Dashboard <ArrowRight size={12} />
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* ─────────────── MAIN CONTENT ─────────────── */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-10 flex flex-col justify-start">
                {!showLockModal && (
                    <AnimatePresence mode="wait">
                        {!selectedCourseName ? (
                            /* ─── Hero / Browse Grid ─── */
                            <motion.div
                                key="hero-browse"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="space-y-12"
                            >
                                {/* Hero section */}
                                <div className="text-center max-w-3xl mx-auto space-y-6 py-8">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.5 }}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-105 text-indigo-600 rounded-full text-xs font-semibold tracking-wider uppercase mb-2"
                                    >
                                        <Compass size={12} /> Welcome to the LMS explorer
                                    </motion.div>
                                    <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 bg-clip-text text-transparent">
                                        Find Your Path to Excellence
                                    </h1>
                                    <p className="text-slate-500 text-base md:text-lg leading-relaxed">
                                        Explore available courses across top registered institutes. Apply directly in seconds and track your applications seamlessly in real time.
                                    </p>
                                </div>

                                {/* LMS Platform Statistics banner */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto py-4">
                                    {[
                                        { count: "25+", label: "Affiliated Hubs", desc: "Top Vetted Institutes", icon: Building, color: "text-indigo-600 bg-indigo-50/50" },
                                        { count: "120+", label: "Course Streams", desc: "Syllabi for Hot Roles", icon: BookOpen, color: "text-emerald-500 bg-emerald-50/50" },
                                        { count: "10k+", label: "Active Students", desc: "Connected Portals", icon: GraduationCap, color: "text-blue-500 bg-blue-50/50" },
                                        { count: "99.8%", label: "Evaluation Rate", desc: "Instant Grading System", icon: CheckCircle, color: "text-purple-500 bg-purple-50/50" }
                                    ].map((stat, idx) => {
                                        const IconComp = stat.icon;
                                        return (
                                            <div key={idx} className="bg-white border border-slate-100 rounded-3xl p-5 text-center shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-all duration-500"></div>
                                                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-3 text-sm`}>
                                                    <IconComp size={18} />
                                                </div>
                                                <h4 className="text-2xl font-black text-slate-900 leading-none">{stat.count}</h4>
                                                <p className="text-[11px] font-bold text-slate-800 mt-1.5 leading-none">{stat.label}</p>
                                                <p className="text-[9px] text-slate-400 font-medium mt-1 leading-none">{stat.desc}</p>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Unique Courses Section */}
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 border-l-4 border-indigo-500 pl-3">
                                        Browse Available Courses
                                    </h2>
                                    
                                                                   {loadingCourses ? (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {[1, 2, 3].map(n => (
                                                <div key={n} className="bg-white border border-slate-200 rounded-3xl p-6 h-48 animate-pulse space-y-4 shadow-sm">
                                                    <div className="h-6 bg-slate-100 rounded w-1/2"></div>
                                                    <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                                                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : uniqueCourses.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {uniqueCourses.map((courseName, idx) => {
                                                const matchCourses = courses.filter(c => c.name === courseName);
                                                const previewCourse = matchCourses[0];
                                                const instituteCount = matchCourses.length;
                                                
                                                return (
                                                    <motion.div
                                                        key={courseName}
                                                        whileHover={{ y: -6, scale: 1.01 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="bg-white border border-slate-100 rounded-[2rem] p-6 hover:border-indigo-505 hover:shadow-xl hover:shadow-indigo-100/50 transition-all flex flex-col justify-between group relative overflow-hidden shadow-sm"
                                                    >
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
                                                        <div className="space-y-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-650 flex items-center justify-center font-bold">
                                                                <BookOpen size={24} />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <h3 className="font-extrabold text-slate-800 text-lg leading-tight group-hover:text-indigo-650 transition-colors">
                                                                    {courseName}
                                                                </h3>
                                                                <span className="text-[10px] bg-slate-50 text-slate-500 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest inline-block border border-slate-200">
                                                                    {previewCourse?.code || 'PROGRAM'}
                                                                </span>
                                                            </div>
                                                            <p className="text-slate-500 text-xs line-clamp-3 leading-relaxed">
                                                                {previewCourse?.description || 'Learn and master critical subject matter through verified comprehensive LMS curriculum.'}
                                                            </p>
                                                        </div>

                                                        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                                                                <Building size={14} className="text-slate-400" />
                                                                <span className="text-slate-500">Available at {instituteCount} {instituteCount === 1 ? 'Institute' : 'Institutes'}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => setSelectedCourseName(courseName)}
                                                                className="text-xs font-bold text-indigo-650 hover:text-indigo-800 flex items-center gap-1 hover:gap-2 transition-all"
                                                            >
                                                                Explore <ArrowRight size={14} />
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl max-w-md mx-auto shadow-sm">
                                            <HelpCircle size={36} className="mx-auto text-slate-400 mb-3" />
                                            <p className="text-slate-650 text-sm font-bold">No active courses found.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Core Features Grid */}
                                <div className="space-y-6 pt-8 border-t border-slate-100">
                                    <div className="text-center max-w-2xl mx-auto space-y-2">
                                        <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">Core Pillars</span>
                                        <h3 className="text-2xl font-bold tracking-tight text-slate-900">Why Choose the LMSPortal Ecosystem?</h3>
                                        <p className="text-slate-500 text-xs leading-relaxed">
                                            We bridge the gap between educational hubs, dedicated instructors, and ambitious students through next-generation portals.
                                        </p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                                        {[
                                            { 
                                                title: "Isolated College Gateways", 
                                                desc: "Each institute manages their own courses, tests, teachers, and editor groups without database leaks or crossover access.",
                                                icon: Shield, 
                                                color: "text-indigo-600 bg-indigo-50"
                                            },
                                            { 
                                                title: "Personalized Study Portals", 
                                                desc: "Students enjoy a central area to track syllabi, explore files, take online exams, and receive teacher assessments in real-time.",
                                                icon: Sparkles, 
                                                color: "text-emerald-500 bg-emerald-50"
                                            },
                                            { 
                                                title: "Interactive Sandbox Previews", 
                                                desc: "Applied guests can simulate tests, try chatbot support, and explore program files instantly before admissions are processed.",
                                                icon: Compass, 
                                                color: "text-blue-500 bg-blue-50"
                                            }
                                        ].map((feature, i) => {
                                            const IconC = feature.icon;
                                            return (
                                                <div key={i} className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-lg transition-all space-y-4 hover:-translate-y-1 duration-300 font-sans">
                                                    <div className={`w-12 h-12 rounded-2xl ${feature.color} flex items-center justify-center font-bold text-indigo-600`}>
                                                        <IconC size={22} className={feature.color.replace('bg-', 'text-')} />
                                                    </div>
                                                    <h4 className="font-extrabold text-slate-800 text-sm">{feature.title}</h4>
                                                    <p className="text-slate-505 text-xs leading-relaxed">{feature.desc}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* About Us Story Section */}
                                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm font-sans">
                                    <div className="space-y-4 flex-1">
                                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                            <Award size={14} className="text-indigo-500" />
                                            <span>About Our Learning Platform</span>
                                        </div>
                                        <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                                            Empowering Education Through Smart Digital Portals
                                        </h3>
                                        <p className="text-slate-500 text-xs leading-relaxed">
                                            LMSPortal was engineered to digitize traditional educational environments into secure, decoupled cloud nodes. Our architecture allows schools, colleges, and coaching classes to operate their digital syllabus systems securely while keeping students engaged.
                                        </p>
                                        <p className="text-slate-500 text-xs leading-relaxed">
                                            With integrated SMS validation, dynamic student account conversion, isolated folders, and interactive exam assessors, we ensure that modern digital learning is smooth, intuitive, and extremely fast.
                                        </p>
                                    </div>
                                    <div className="w-full md:w-80 bg-slate-900 text-slate-300 p-6 rounded-3xl space-y-4 border border-slate-850 relative overflow-hidden shadow-xl self-stretch flex flex-col justify-between">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
                                        <div className="space-y-2">
                                            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Global Outreach</div>
                                            <h4 className="text-base font-extrabold text-white font-sans">Connecting Institutes</h4>
                                            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                                                We enable seamless integration for colleges to scale their exams and manage courses across dozens of unique subject categories.
                                            </p>
                                        </div>
                                        <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                                            <span>Active Ecosystem</span>
                                            <span className="text-emerald-400">99% uptime</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            /* ─── Course Explorer (Institutes Grid) ─── */
                            <motion.div
                                key="explorer"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="space-y-8"
                            >
                                {/* Back button */}
                                <div>
                                    <button 
                                        onClick={() => setSelectedCourseName(null)}
                                        className="text-xs font-bold text-slate-600 hover:text-indigo-650 flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl transition-all shadow-sm"
                                    >
                                        &larr; Back to all courses
                                    </button>
                                </div>

                                {/* Selected course header info */}
                                {(() => {
                                    const matching = getInstitutesForSelectedCourse();
                                    const baseInfo = matching[0];
                                    return (
                                        <div className="bg-indigo-50/40 border border-indigo-100 rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
                                            <div className="space-y-3 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-100 border border-indigo-200 px-3 py-1 rounded-full">
                                                        {baseInfo?.code}
                                                    </span>
                                                    {baseInfo?.subjects && (
                                                        <span className="text-[10px] text-slate-500 font-bold bg-white px-3 py-1 rounded-full border border-slate-200">
                                                            {baseInfo.subjects.length} Subjects
                                                        </span>
                                                    )}
                                                </div>
                                                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">{selectedCourseName}</h1>
                                                <p className="text-slate-600 text-sm max-w-3xl leading-relaxed">
                                                    {baseInfo?.description || 'A complete LMS syllabus structured by experienced educators to provide depth and practical learning.'}
                                                </p>

                                                {/* Subjects chips */}
                                                {baseInfo?.subjects && baseInfo.subjects.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 pt-3">
                                                        {baseInfo.subjects.map((sub, i) => (
                                                            <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 shadow-sm">
                                                                {sub}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Offered by institutes grid */}
                                <div className="space-y-6">
                                    <h2 className="text-xl font-bold tracking-tight text-slate-900 border-l-4 border-indigo-500 pl-3">
                                        Offering Institutes
                                    </h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {getInstitutesForSelectedCourse().map((courseObj) => {
                                            const inst = courseObj.institute;
                                            if (!inst) return null;

                                            return (
                                                <motion.div
                                                    key={courseObj._id}
                                                    whileHover={{ y: -6 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="bg-white border border-slate-100 rounded-[2rem] p-6 flex flex-col justify-between hover:border-indigo-500/25 hover:shadow-xl hover:shadow-indigo-100/50 transition-all group shadow-sm"
                                                >
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-650 flex items-center justify-center font-bold">
                                                                <Building size={24} />
                                                            </div>
                                                            <div>
                                                                <h3 className="font-extrabold text-slate-800 text-base leading-tight group-hover:text-indigo-650 transition-colors">
                                                                    {inst.name}
                                                                </h3>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{inst.code}</p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                                                            {inst.contactEmail && (
                                                                <div className="flex items-center gap-2">
                                                                    <Mail size={14} className="text-slate-400 flex-shrink-0" />
                                                                    <span className="truncate">{inst.contactEmail}</span>
                                                                </div>
                                                            )}
                                                            {inst.address && (
                                                                <div className="flex items-start gap-2">
                                                                    <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                                                    <span className="line-clamp-2">{inst.address}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                                                        <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                            Admissions Open
                                                        </span>
                                                        <button
                                                            onClick={() => handleOpenApplyModal(courseObj)}
                                                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md shadow-indigo-600/15"
                                                        >
                                                            Apply Now <ArrowRight size={12} />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </main>

            {/* ─────────────── APPLICATIONS PANEL (TRACKER DRAWER) ─────────────── */}
            <AnimatePresence>
                {showApplicationsPanel && (
                    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.6 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowApplicationsPanel(false)}
                            className="absolute inset-0 bg-black backdrop-blur-sm"
                        ></motion.div>

                        {/* Drawer body */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                            className="relative w-full max-w-md bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl p-6 text-slate-800"
                        >
                            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
                                <div className="flex items-center gap-2">
                                    <FileText className="text-indigo-650" size={20} />
                                    <h2 className="text-lg font-bold text-slate-900">Applications Tracking</h2>
                                </div>
                                <button 
                                    onClick={() => setShowApplicationsPanel(false)}
                                    className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto space-y-4">
                                {loadingApps ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
                                        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-xs">Fetching applications...</span>
                                    </div>
                                ) : applications.length > 0 ? (
                                    applications.map((app) => (
                                        <div 
                                            key={app._id} 
                                            className="bg-slate-55 border border-slate-200 p-4 rounded-2xl space-y-3 relative overflow-hidden shadow-sm"
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <div>
                                                    <h4 className="font-extrabold text-sm text-slate-800">{app.course?.name}</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{app.course?.code}</p>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
                                                    app.status === 'Accepted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                    app.status === 'Registered' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse' :
                                                    app.status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-200' :
                                                    app.status === 'Under Review' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                    'bg-blue-50 text-blue-700 border border-blue-200'
                                                }`}>
                                                    {app.status}
                                                </span>
                                            </div>

                                            <div className="text-[11px] text-slate-600 space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-150 shadow-sm">
                                                <div className="flex items-center gap-1.5">
                                                    <Building size={12} className="text-slate-400" />
                                                    <span className="font-semibold text-slate-700">{app.institute?.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                                    <Clock size={12} />
                                                    <span>Applied on: {new Date(app.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>

                                            {app.status === 'Accepted' && (
                                                <button
                                                    onClick={() => {
                                                        setRegisteringApp(app);
                                                        setRegEmail(app.guestEmail || '');
                                                    }}
                                                    className="w-full mt-2 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-md flex items-center justify-center gap-1"
                                                >
                                                    Create Account to Login
                                                </button>
                                            )}

                                            {(app.status === 'Applied' || app.status === 'Under Review') && (
                                                <button
                                                    onClick={() => {
                                                        setShowApplicationsPanel(false);
                                                        setSimulatorCourse(app.course?.name || "Full Stack Web Development");
                                                        setSimulatorInstitute(app.institute?.name || "LMS Academy");
                                                        setShowSimulatorModal(true);
                                                    }}
                                                    className="w-full mt-2 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all border border-indigo-100 flex items-center justify-center gap-1 shadow-sm font-sans"
                                                >
                                                    <Compass size={12} /> Preview Portal Demo
                                                </button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2 max-w-xs mx-auto mt-8 shadow-sm">
                                        <ShieldAlert size={28} className="mx-auto text-slate-400" />
                                        <p className="text-slate-650 text-xs font-semibold">No applications found</p>
                                        <p className="text-slate-500 text-[10px]">Select a course and apply to an institute to submit your application details.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ─────────────── APPLY MODAL ─────────────── */}
            <AnimatePresence>
                {showApplyModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.6 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowApplyModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        ></motion.div>

                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 15 }}
                            className="bg-white border border-slate-200 rounded-[2.5rem] w-full max-w-lg p-6 md:p-8 relative z-10 text-slate-800 overflow-hidden shadow-2xl"
                        >
                            {/* Confetti decoration if success */}
                            {applySuccess && (
                                <div className="absolute inset-0 bg-indigo-50 pointer-events-none animate-pulse"></div>
                            )}

                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-xl font-bold tracking-tight text-slate-900">Course Application Form</h3>
                                <button 
                                    onClick={() => setShowApplyModal(false)}
                                    className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl transition-all"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <AnimatePresence mode="wait">
                                {!applySuccess ? (
                                    /* Form */
                                    <motion.form 
                                        key="apply-form"
                                        onSubmit={handleApplySubmit} 
                                        className="space-y-4"
                                    >
                                        {/* Brief preview of Course & Institute */}
                                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                                            <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Target Selection</div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="font-extrabold text-slate-800">{selectedCourseForApply?.name}</span>
                                                <span className="text-xs text-slate-500">({selectedCourseForApply?.code})</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-600 border-t border-slate-200 pt-2">
                                                <Building size={14} className="text-slate-400" />
                                                <span className="font-semibold text-slate-700">{selectedInstitute?.name}</span>
                                            </div>
                                        </div>

                                        {/* Inputs */}
                                        <div className="space-y-3.5">
                                            <div className="border-b border-slate-200 focus-within:border-indigo-500 py-1 transition-all">
                                                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Full Name</label>
                                                <input
                                                    type="text"
                                                    value={applyName}
                                                    onChange={(e) => setApplyName(e.target.value)}
                                                    required
                                                    placeholder="Enter your name"
                                                    className="w-full bg-transparent border-none text-slate-800 text-sm focus:outline-none placeholder-slate-400"
                                                />
                                            </div>

                                            <div className="border-b border-slate-200 focus-within:border-indigo-500 py-1 transition-all">
                                                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Phone Number</label>
                                                <input
                                                    type="text"
                                                    value={applyPhone}
                                                    onChange={(e) => setApplyPhone(e.target.value)}
                                                    required
                                                    placeholder="Enter phone number"
                                                    className="w-full bg-transparent border-none text-slate-800 text-sm focus:outline-none placeholder-slate-400"
                                                />
                                            </div>

                                            <div className="border-b border-slate-200 focus-within:border-indigo-500 py-1 transition-all">
                                                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Email Address (Optional)</label>
                                                <input
                                                    type="email"
                                                    value={applyEmail}
                                                    onChange={(e) => setApplyEmail(e.target.value)}
                                                    placeholder="Enter your email address"
                                                    className="w-full bg-transparent border-none text-slate-800 text-sm focus:outline-none placeholder-slate-400"
                                                />
                                            </div>

                                            <div className="border-b border-slate-200 focus-within:border-indigo-500 py-1 transition-all">
                                                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Short Statement / Comments (Optional)</label>
                                                <textarea
                                                    value={applyStatement}
                                                    onChange={(e) => setApplyStatement(e.target.value)}
                                                    placeholder="Why do you want to apply for this course?"
                                                    rows={3}
                                                    className="w-full bg-transparent border-none text-slate-800 text-sm focus:outline-none resize-none pt-1 placeholder-slate-400"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={applyLoading}
                                            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-indigo-600/10 flex justify-center items-center text-sm"
                                        >
                                            {applyLoading ? (
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                "Submit Application"
                                            )}
                                        </button>
                                    </motion.form>
                                ) : (
                                    /* Success Message */
                                    <motion.div 
                                        key="apply-success"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="py-8 text-center space-y-4"
                                    >
                                        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-250 rounded-full flex items-center justify-center mx-auto animate-bounce mb-2">
                                            <CheckCircle size={36} />
                                        </div>
                                        <h4 className="text-xl font-extrabold text-slate-900">Application Submitted!</h4>
                                        <p className="text-slate-500 text-xs max-w-sm mx-auto leading-relaxed">
                                            Your application for <span className="font-bold text-slate-800">{selectedCourseForApply?.name}</span> at <span className="font-bold text-slate-800">{selectedInstitute?.name}</span> was submitted successfully!
                                        </p>
                                        
                                        <div className="pt-6 flex flex-col gap-2.5 font-sans">
                                            <button
                                                onClick={() => {
                                                    setShowApplyModal(false);
                                                    setSimulatorCourse(selectedCourseForApply?.name || "Full Stack Web Development");
                                                    setSimulatorInstitute(selectedInstitute?.name || "LMS Academy");
                                                    setShowSimulatorModal(true);
                                                }}
                                                className="w-full py-3 bg-gradient-to-r from-indigo-650 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold rounded-xl text-xs transition-all active:scale-[0.98] shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
                                            >
                                                <Compass size={14} /> Preview Your Student Portal (Demo)
                                            </button>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setShowApplyModal(false);
                                                        setShowApplicationsPanel(true);
                                                    }}
                                                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold rounded-xl text-xs transition-all active:scale-95"
                                                >
                                                    Track Application
                                                </button>
                                                <button
                                                    onClick={() => setShowApplyModal(false)}
                                                    className="flex-1 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-all active:scale-95"
                                                >
                                                    Done
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
                                    <p className="text-xs text-slate-500 mt-1">Create login details for {registeringApp.guestName}</p>
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
                                    <div className="border-b border-slate-200 focus-within:border-indigo-500 py-1 transition-all">
                                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Email Address</label>
                                        <input
                                            type="email"
                                            value={regEmail}
                                            onChange={(e) => setRegEmail(e.target.value)}
                                            required
                                            placeholder="Enter your email address"
                                            className="w-full bg-transparent border-none text-slate-800 text-sm focus:outline-none placeholder-slate-400"
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
                                        "Register & Sign In"
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ─────────────── LOCK / REGISTRATION MODAL ─────────────── */}
            <AnimatePresence>
                {showLockModal && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gradient-to-r from-[#fafafa] from-35% via-[#b8c5d6] to-[#0b1329] to-65% overflow-hidden">
                        {/* Decorative background shapes */}
                        <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none"></div>
                        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[70px] pointer-events-none"></div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-4xl h-auto min-h-[500px] md:h-[550px] bg-transparent border border-slate-200/50 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col md:flex-row overflow-hidden relative"
                        >
                            {/* Form Box */}
                            <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col justify-between h-full bg-[#fafafa] text-slate-800">
                                <div>
                                    {/* Tabs */}
                                    <div className="flex gap-4 border-b border-slate-200 pb-3 mb-6">
                                        <button
                                            type="button"
                                            onClick={() => { setModalTab('register'); setLoginError(''); }}
                                            className={`text-sm font-bold pb-1 transition-all ${
                                                modalTab === 'register' ? 'text-slate-800 border-b-2 border-[#0b1329]' : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                        >
                                            Guest Register
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setModalTab('login'); setLoginError(''); }}
                                            className={`text-sm font-bold pb-1 transition-all ${
                                                modalTab === 'login' ? 'text-slate-800 border-b-2 border-[#0b1329]' : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                        >
                                            Member Login
                                        </button>
                                    </div>

                                    <AnimatePresence mode="wait">
                                        {modalTab === 'register' ? (
                                            /* Guest Registration Form */
                                            <motion.form
                                                key="guest-form"
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                onSubmit={handleGuestRegister}
                                                className="space-y-4"
                                            >
                                                <div className="space-y-1">
                                                    <h3 className="text-xl font-bold tracking-tight text-slate-900">Guest Entry</h3>
                                                    <p className="text-xs text-slate-500">Register as a guest to browse courses and institutes</p>
                                                </div>

                                                <div className="space-y-4 pt-2">
                                                    {/* Username */}
                                                    <div className="relative border-b border-slate-200 focus-within:border-[#0b1329] transition-all py-0.5">
                                                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Username</label>
                                                        <input
                                                            type="text"
                                                            value={username}
                                                            onChange={(e) => setUsername(e.target.value)}
                                                            required
                                                            placeholder="Enter a guest name"
                                                            className="w-full bg-transparent text-slate-800 focus:outline-none text-sm py-1 placeholder-slate-300"
                                                        />
                                                    </div>

                                                    {/* Phone Number */}
                                                    <div className="relative border-b border-slate-200 focus-within:border-[#0b1329] transition-all py-0.5">
                                                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Phone Number</label>
                                                        <div className="flex items-center justify-between">
                                                            <input
                                                                type="tel"
                                                                value={phone}
                                                                onChange={(e) => setPhone(e.target.value)}
                                                                required
                                                                placeholder="Enter 10-digit mobile number"
                                                                className="w-full bg-transparent text-slate-800 focus:outline-none text-sm py-1 placeholder-slate-300"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={handleSendOtp}
                                                                disabled={countdown > 0}
                                                                className="text-[10px] font-bold text-[#0b1329] bg-[#0b1329]/5 border border-[#0b1329]/10 px-2.5 py-1 rounded-lg hover:bg-[#0b1329] hover:text-white transition-all disabled:opacity-50 disabled:hover:bg-[#0b1329]/5 disabled:hover:text-[#0b1329] ml-2"
                                                            >
                                                                {countdown > 0 ? `Resend (${countdown}s)` : otpSent ? 'Resend' : 'Send OTP'}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* OTP Verification (Only shown once sent) */}
                                                    {otpSent && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="relative border-b border-slate-200 focus-within:border-[#0b1329] transition-all py-0.5"
                                                        >
                                                            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Enter OTP Code</label>
                                                            <input
                                                                type="text"
                                                                value={userOtp}
                                                                onChange={(e) => setUserOtp(e.target.value)}
                                                                required
                                                                maxLength={4}
                                                                placeholder="Enter 4-digit code"
                                                                className="w-full bg-transparent text-slate-800 focus:outline-none text-sm py-1 placeholder-slate-300 tracking-[0.3em] font-extrabold"
                                                            />
                                                        </motion.div>
                                                    )}
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={registerLoading || !otpSent}
                                                    className="w-full mt-6 bg-[#0b1329] hover:bg-[#152244] text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10 flex justify-center items-center text-sm disabled:opacity-50 disabled:pointer-events-none"
                                                >
                                                    {registerLoading ? (
                                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        "Verify & Enter LMS"
                                                    )}
                                                </button>
                                            </motion.form>
                                        ) : (
                                            /* Member Traditional Credentials Form */
                                            <motion.form
                                                key="login-form"
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                onSubmit={handleActiveUserLogin}
                                                className="space-y-4"
                                            >
                                                <div className="space-y-1">
                                                    <h3 className="text-xl font-bold tracking-tight text-slate-900">Member Sign In</h3>
                                                    <p className="text-xs text-slate-500">Sign in with your active student, teacher, or admin details</p>
                                                </div>

                                                {loginError && (
                                                    <div className="p-3 bg-red-50 border border-red-250 text-red-650 text-xs rounded-xl">
                                                        {loginError}
                                                    </div>
                                                )}

                                                <div className="space-y-4 pt-1">
                                                    {/* Email */}
                                                    <div className="relative border-b border-slate-200 focus-within:border-[#0b1329] transition-all py-0.5">
                                                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Email / Username</label>
                                                        <input
                                                            type="email"
                                                            value={loginEmail}
                                                            onChange={(e) => setLoginEmail(e.target.value)}
                                                            required
                                                            placeholder="Enter email address"
                                                            className="w-full bg-transparent text-slate-800 focus:outline-none text-sm py-1 placeholder-slate-300"
                                                        />
                                                    </div>

                                                    {/* Password */}
                                                    <div className="relative border-b border-slate-200 focus-within:border-[#0b1329] transition-all py-0.5">
                                                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Password</label>
                                                        <input
                                                            type="password"
                                                            value={loginPassword}
                                                            onChange={(e) => setLoginPassword(e.target.value)}
                                                            required
                                                            placeholder="Enter password"
                                                            className="w-full bg-transparent text-slate-800 focus:outline-none text-sm py-1 placeholder-slate-300"
                                                        />
                                                    </div>
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={loginLoading}
                                                    className="w-full mt-6 bg-[#0b1329] hover:bg-[#152244] text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10 flex justify-center items-center text-sm"
                                                >
                                                    {loginLoading ? (
                                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        "Sign In"
                                                    )}
                                                </button>
                                            </motion.form>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-4 mt-6 flex justify-between items-center">
                                    <span>LMS Portal &copy; 2026</span>
                                    <span className="flex items-center gap-1 text-slate-500"><GraduationCap size={12} /> Secure Connection</span>
                                </div>
                            </div>

                            {/* Info Banner Box */}
                            <div className="hidden md:flex flex-col justify-between items-center w-1/2 bg-[#0b1329] p-10 h-full relative overflow-hidden border-l border-slate-800/10">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

                                <div className="relative z-10 text-center w-full mt-4">
                                    <h2 className="text-2xl font-black text-white tracking-tight leading-snug">LMS Portal</h2>
                                    <p className="text-slate-300 text-xs mt-2 leading-relaxed">
                                        Access comprehensive curriculum, practice with mock exams, coordinate classes, and connect directly with certified educational hubs.
                                    </p>
                                </div>

                                {/* Graphic Decoration */}
                                <div className="relative z-10 my-auto flex flex-col items-center justify-center p-6 bg-slate-900/60 border border-slate-800 rounded-3xl backdrop-blur-sm max-w-xs shadow-xl">
                                    <BookOpen className="text-indigo-400 mb-3 animate-pulse" size={36} />
                                    <span className="text-xs font-bold text-slate-200">Interactive Courses Directory</span>
                                    <p className="text-[10px] text-slate-405 text-center mt-1">Select programs and apply to institutes of your choice right from the main landing dashboard.</p>
                                </div>

                                <div className="relative z-10 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    Enter credentials or join as guest
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ─────────────── STUDENT PORTAL SIMULATOR MODAL ─────────────── */}
            <AnimatePresence>
                {showSimulatorModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.6 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                setShowSimulatorModal(false);
                                setMockTestStarted(false);
                                setMockTestSubmitted(false);
                                setSelectedMockAnswer('');
                                setMockTestScore(null);
                            }}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                        ></motion.div>

                        {/* Modal Container */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative bg-[#f8fafc] border border-slate-200 rounded-[2.5rem] w-full max-w-5xl h-[85vh] flex flex-col md:flex-row overflow-hidden shadow-2xl z-10 text-slate-800"
                        >
                            {/* CLOSE BUTTON */}
                            <button
                                onClick={() => {
                                    setShowSimulatorModal(false);
                                    setMockTestStarted(false);
                                    setMockTestSubmitted(false);
                                    setSelectedMockAnswer('');
                                    setMockTestScore(null);
                                }}
                                className="absolute top-4 right-4 z-50 p-2 text-slate-400 hover:text-red-500 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all animate-fade-in"
                            >
                                <X size={18} />
                            </button>

                            {/* SIDEBAR */}
                            <div className="w-full md:w-64 bg-[#0b1329] text-slate-300 p-6 flex flex-col justify-between border-r border-slate-800">
                                <div className="space-y-8 animate-fade-in">
                                    {/* Sidebar branding */}
                                    <div className="flex items-center space-x-3 border-b border-slate-800/80 pb-4">
                                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-md">
                                            L
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-extrabold text-white tracking-wide">Student Portal</span>
                                            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded w-fit mt-0.5">Sandbox Demo</span>
                                        </div>
                                    </div>

                                    {/* Nav Menu */}
                                    <nav className="space-y-1.5">
                                        {[
                                            { id: 'dashboard', label: 'Dashboard', icon: Compass },
                                            { id: 'courses', label: 'My Courses', icon: BookOpen },
                                            { id: 'tests', label: 'Online Exams', icon: FileText },
                                            { id: 'helpdesk', label: 'Helpdesk Support', icon: HelpCircle }
                                        ].map((item) => {
                                            const IconComponent = item.icon;
                                            const isActive = simulatorTab === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => {
                                                        setSimulatorTab(item.id);
                                                        setMockTestStarted(false);
                                                    }}
                                                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                                                        isActive 
                                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                                                        : 'hover:bg-slate-800/40 text-slate-400 hover:text-slate-200'
                                                    }`}
                                                >
                                                    <IconComponent size={16} />
                                                    <span>{item.label}</span>
                                                </button>
                                            );
                                        })}
                                    </nav>
                                </div>

                                {/* Sidebar bottom tip */}
                                <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800/80 space-y-2 mt-4 animate-fade-in">
                                    <div className="flex items-center gap-1.5 text-amber-500 text-[10px] font-black uppercase tracking-wider">
                                        <Sparkles size={12} />
                                        <span>Pro Tip</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-relaxed">
                                        This simulates your student dashboard environment. Take the **mock test** to try the interface!
                                    </p>
                                </div>
                            </div>

                            {/* MAIN PANEL CONTENT */}
                            <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-y-auto">
                                {/* Simulated Header */}
                                <header className="bg-white border-b border-slate-100 py-5 px-6 md:px-8 flex items-center justify-between flex-shrink-0 shadow-sm animate-fade-in">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Student Portal Sandbox</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Previewing system for course: <span className="font-bold text-indigo-600">{simulatorCourse}</span></p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="hidden sm:inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider">
                                            Preview Mode
                                        </span>
                                    </div>
                                </header>

                                {/* Simulated Body Area */}
                                <div className="flex-1 p-6 md:p-8">
                                    {mockTestStarted ? (
                                        /* ───── SIMULATED TEST ENVIRONMENT ───── */
                                        <div className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 max-w-2xl mx-auto shadow-md animate-fade-in">
                                            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                                                <div>
                                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 border border-indigo-150 px-2.5 py-0.5 rounded-full">Mock Exam Sandbox</span>
                                                    <h4 className="text-base font-extrabold text-slate-900 mt-1">Pre-Admission Aptitude Assessment</h4>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-bold text-slate-500">Duration: 15 Mins</span>
                                                </div>
                                            </div>

                                            {!mockTestSubmitted ? (
                                                <div className="space-y-6">
                                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 font-sans">
                                                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Question 1 of 1</span>
                                                        <p className="text-sm font-bold text-slate-800 mt-1.5 font-sans">
                                                            Which of the following database query models allows counting documents based on a criteria in Mongoose?
                                                        </p>
                                                    </div>

                                                    <div className="space-y-2.5 font-sans">
                                                        {[
                                                            { key: 'A', text: 'findCountDocuments({})' },
                                                            { key: 'B', text: 'countDocuments({})' },
                                                            { key: 'C', text: 'aggregateCount({})' },
                                                            { key: 'D', text: 'count({})' }
                                                        ].map((opt) => (
                                                            <button
                                                                key={opt.key}
                                                                onClick={() => setSelectedMockAnswer(opt.key)}
                                                                className={`w-full flex items-center justify-between p-4 rounded-2xl text-left text-xs font-semibold border transition-all ${
                                                                    selectedMockAnswer === opt.key 
                                                                    ? 'bg-indigo-600/5 border-indigo-500 text-indigo-700 shadow-sm' 
                                                                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                                                }`}
                                                            >
                                                                <span>{opt.key}) {opt.text}</span>
                                                                <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                                                    selectedMockAnswer === opt.key
                                                                    ? 'border-indigo-600 bg-indigo-600 text-white text-[9px]'
                                                                    : 'border-slate-300'
                                                                }`}>
                                                                    {selectedMockAnswer === opt.key && '✓'}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            if (!selectedMockAnswer) {
                                                                toast.error("Please select an answer first");
                                                                return;
                                                            }
                                                            setMockTestSubmitted(true);
                                                            if (selectedMockAnswer === 'B') {
                                                                setMockTestScore(1);
                                                                toast.success("Correct answer selected!");
                                                            } else {
                                                                setMockTestScore(0);
                                                                toast.error("Incorrect. The correct answer is B.");
                                                            }
                                                        }}
                                                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md active:scale-[0.98] font-sans"
                                                    >
                                                        Submit Exam
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 space-y-5 font-sans">
                                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto text-white shadow-lg ${
                                                        mockTestScore === 1 ? 'bg-emerald-500 shadow-emerald-200 animate-bounce' : 'bg-red-500 shadow-red-200'
                                                    }`}>
                                                        {mockTestScore === 1 ? <CheckCircle size={32} /> : <X size={32} />}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h4 className="text-lg font-black text-slate-800 font-sans">
                                                            {mockTestScore === 1 ? 'Excellent Job! 100% Score' : 'Oops! Exam Failed'}
                                                        </h4>
                                                        <p className="text-xs text-slate-500 font-sans">
                                                            Score achieved: {mockTestScore}/1 Points. {mockTestScore === 1 ? 'Your concepts are strong!' : 'Keep practicing and reading notes.'}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2.5 max-w-sm mx-auto pt-4 font-sans font-sans">
                                                        <button
                                                            onClick={() => {
                                                                setMockTestSubmitted(false);
                                                                setSelectedMockAnswer('');
                                                                setMockTestScore(null);
                                                            }}
                                                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all border border-slate-200"
                                                        >
                                                            Try Again
                                                        </button>
                                                        <button
                                                            onClick={() => setMockTestStarted(false)}
                                                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all"
                                                        >
                                                            Back to Dashboard
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* ───── TAB DISPLAY ───── */
                                        <div className="animate-fade-in">
                                            {simulatorTab === 'dashboard' && (
                                                <div className="space-y-6 font-sans">
                                                    {/* Welcome banner */}
                                                    <div className="bg-indigo-600 text-white rounded-3xl p-6 shadow-lg shadow-indigo-600/15 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
                                                        <div className="space-y-2 relative z-10 text-center sm:text-left">
                                                            <h4 className="text-xl font-black">Welcome to the LMS Portal Demo!</h4>
                                                            <p className="text-xs text-indigo-100 max-w-md leading-relaxed">
                                                                This is a virtual workspace mimicking what you will see as an active student of <span className="font-bold text-white">{simulatorInstitute}</span>.
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setSimulatorTab('courses');
                                                            }}
                                                            className="px-4 py-2.5 bg-white text-indigo-600 font-bold rounded-xl text-xs hover:bg-indigo-50 transition-all active:scale-95 flex-shrink-0"
                                                        >
                                                            Browse My Course Modules
                                                        </button>
                                                    </div>

                                                    {/* Stat cards grid */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between">
                                                            <div>
                                                                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Active Test Assignments</span>
                                                                <h4 className="text-2xl font-black text-slate-900 mt-1">1</h4>
                                                            </div>
                                                            <div className="p-3 bg-orange-50 text-orange-500 rounded-xl">
                                                                <Clock size={20} />
                                                            </div>
                                                        </div>
                                                        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between">
                                                            <div>
                                                                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Completed Assignments</span>
                                                                <h4 className="text-2xl font-black text-slate-900 mt-1">{mockTestSubmitted && mockTestScore === 1 ? '1' : '0'}</h4>
                                                            </div>
                                                            <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl">
                                                                <CheckCircle size={20} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Dashboard grid layout */}
                                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                                        {/* Main widgets */}
                                                        <div className="lg:col-span-2 space-y-4 font-sans">
                                                            {/* Mock upcoming exam */}
                                                            <div className="bg-white p-6 rounded-3xl border border-slate-155 shadow-sm space-y-4">
                                                                <h4 className="font-extrabold text-sm text-slate-800">Your Upcoming Online Exams</h4>
                                                                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-indigo-150 transition-all">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 bg-white border border-slate-200 flex items-center justify-center text-indigo-650 rounded-xl shadow-sm">
                                                                            <FileText size={20} />
                                                                        </div>
                                                                        <div>
                                                                            <h5 className="font-bold text-slate-800 text-xs">Pre-Admission Aptitude Assessment</h5>
                                                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Duration: 15 mins &bull; 1 MCQ Query</p>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => {
                                                                            setMockTestStarted(true);
                                                                            setMockTestSubmitted(false);
                                                                            setSelectedMockAnswer('');
                                                                            setMockTestScore(null);
                                                                        }}
                                                                        className="px-4 py-2 bg-[#0b1329] text-white hover:bg-slate-850 font-bold rounded-xl text-xs transition-all"
                                                                    >
                                                                        Start Test
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Mock video lecture link */}
                                                            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-4">
                                                                <h4 className="font-extrabold text-sm text-slate-800 font-sans">Active Syllabus Modules</h4>
                                                                <div className="space-y-2">
                                                                    {[
                                                                        { title: "Module 1: Orientation & Basics Vitals", status: "Completed", icon: CheckCircle, iconColor: "text-emerald-500 bg-emerald-50" },
                                                                        { title: "Module 2: Advanced Concepts & Framework Vetting", status: "In Progress", icon: Clock, iconColor: "text-orange-500 bg-orange-50" }
                                                                    ].map((mod, i) => (
                                                                        <div key={i} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700">
                                                                            <span className="truncate">{mod.title}</span>
                                                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider ${mod.iconColor}`}>{mod.status}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Right sidebar profile card mock */}
                                                        <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-6 h-fit text-center font-sans">
                                                            <div className="flex flex-col items-center">
                                                                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-md ring-4 ring-indigo-50">
                                                                    G
                                                                </div>
                                                                <h4 className="font-extrabold text-slate-900 text-sm">{applyName || 'Guest User'}</h4>
                                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{applyEmail || 'guest@lmsportal.com'}</span>
                                                            </div>
                                                            <div className="space-y-2.5 pt-4 border-t border-slate-100 text-left text-xs font-semibold">
                                                                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl">
                                                                    <span className="text-slate-500 text-[10px]">Enrollment</span>
                                                                    <span className="text-slate-700 text-[10px] font-bold">Applied</span>
                                                                </div>
                                                                <div className="flex justify-between items-center p-2.5 bg-indigo-50/50 rounded-xl">
                                                                    <span className="text-slate-500 text-[10px]">Subject Stream</span>
                                                                    <span className="text-indigo-700 text-[10px] font-bold font-sans">General Studies</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {simulatorTab === 'courses' && (
                                                <div className="space-y-6 font-sans">
                                                    <h4 className="font-extrabold text-sm text-slate-800 border-l-4 border-indigo-500 pl-3 font-sans">Study Modules & Learning Material</h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {[
                                                            { title: "Standard Syllabus Guide.pdf", type: "PDF Document", size: "2.4 MB" },
                                                            { title: "Coding Architectures V2.zip", type: "Source Files Archive", size: "14.8 MB" },
                                                            { title: "Design Language Token System.pdf", type: "Style Guidebook", size: "1.1 MB" },
                                                            { title: "Introductory Video Lecture.mp4", type: "Video Tutorial File", size: "94.2 MB" }
                                                        ].map((doc, idx) => (
                                                            <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between hover:border-indigo-200 transition-colors">
                                                                <div className="min-w-0 flex-1 pr-2">
                                                                    <h5 className="font-bold text-slate-850 text-xs truncate">{doc.title}</h5>
                                                                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{doc.type} &bull; {doc.size}</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => toast.success(`Simulated download started for: ${doc.title}`)}
                                                                    className="px-3 py-1.5 bg-indigo-50 text-indigo-650 hover:bg-indigo-600 hover:text-white rounded-lg text-[10px] font-bold transition-colors flex-shrink-0"
                                                                >
                                                                    Download
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {simulatorTab === 'tests' && (
                                                <div className="space-y-4 font-sans">
                                                    <h4 className="font-extrabold text-sm text-slate-800 border-l-4 border-indigo-500 pl-3 font-sans">Exam Assignments Explorer</h4>
                                                    <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4 animate-fade-in">
                                                        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-indigo-150 transition-all">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-white border border-slate-200 flex items-center justify-center text-indigo-650 rounded-xl shadow-sm">
                                                                    <FileText size={20} />
                                                                </div>
                                                                <div>
                                                                    <h5 className="font-bold text-slate-800 text-xs">Pre-Admission Aptitude Assessment</h5>
                                                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Duration: 15 mins &bull; 1 MCQ Query</p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setMockTestStarted(true);
                                                                    setMockTestSubmitted(false);
                                                                    setSelectedMockAnswer('');
                                                                    setMockTestScore(null);
                                                                }}
                                                                className="px-4 py-2 bg-[#0b1329] text-white hover:bg-slate-850 font-bold rounded-xl text-xs transition-all"
                                                            >
                                                                Start Test
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {simulatorTab === 'helpdesk' && (
                                                <div className="bg-white rounded-3xl border border-slate-155 overflow-hidden flex flex-col h-[55vh] shadow-sm font-sans">
                                                    {/* Chat Messages */}
                                                    <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col">
                                                        {helpdeskMessages.map((msg, i) => (
                                                            <div
                                                                key={i}
                                                                className={`max-w-xs p-3 rounded-2xl text-xs font-medium leading-relaxed ${
                                                                    msg.sender === 'user'
                                                                    ? 'bg-indigo-600 text-white self-end rounded-tr-none'
                                                                    : 'bg-slate-100 text-slate-850 self-start rounded-tl-none border border-slate-200'
                                                                }`}
                                                            >
                                                                {msg.text}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Chat Suggestions Grid */}
                                                    <div className="bg-slate-50 border-t border-slate-150 p-4 space-y-2 font-sans">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Click to ask Helpdesk Simulator:</span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {[
                                                                { 
                                                                    q: "How long does application review take?", 
                                                                    a: "Application reviews are typically processed by the target Institute within 24 to 48 business hours. You can track its live status from the top right 'Track Applications' bar on the landing page."
                                                                },
                                                                { 
                                                                    q: "How do I create a student account?", 
                                                                    a: "Once your application status moves to 'Accepted', a button saying 'Create Account to Login' will appear next to your application in the Track Applications bar. Clicking it allows setting your email and password."
                                                                },
                                                                { 
                                                                    q: "Can I contact my Institute admin directly?", 
                                                                    a: "Yes! Once you apply, the contact email and address of the offering institute are shown directly in your applications list. You can reach out to them via their email."
                                                                }
                                                            ].map((suggestion, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => handleHelpdeskQuestionClick(suggestion.q, suggestion.a)}
                                                                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 text-[10px] font-semibold text-slate-600 hover:text-indigo-650 rounded-xl transition-all shadow-sm font-sans"
                                                                >
                                                                    {suggestion.q}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LandingPage;
