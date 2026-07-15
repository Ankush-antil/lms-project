import { useAuth } from '../../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import StudentAttendanceDetailModal from '../../components/common/StudentAttendanceDetailModal';
import { 
    Clock, QrCode, Users, CheckCircle, AlertCircle, X, Search, 
    RefreshCw, Check, AlertTriangle, Calendar, BookOpen, Layers, Image as ImageIcon 
} from 'lucide-react';
import toast from 'react-hot-toast';

const TeacherAttendance = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Active session state
    const [activeSession, setActiveSession] = useState(null);
    const [activeSessions, setActiveSessions] = useState([]);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [timeLeft, setTimeLeft] = useState('');
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    
    // Auto QR Config State
    const [showAutoQRModal, setShowAutoQRModal] = useState(false);
    const [autoQRConfig, setAutoQRConfig] = useState({
        enabled: false,
        scheduleTime: '',
        course: '',
        subject: '',
        section: '',
        wifiSSID: '',
        locationRequired: false
    });

    // Form inputs
    const [courses, setCourses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [section, setSection] = useState('A');
    const [duration, setDuration] = useState('60');
    const [wifiSSID, setWifiSSID] = useState('');
    const [customWifiSSID, setCustomWifiSSID] = useState('');
    const [wifiNetworks, setWifiNetworks] = useState([]);
    const [attendanceType, setAttendanceType] = useState('in');
    const [wifiRequired, setWifiRequired] = useState(false);
    const [locationRequired, setLocationRequired] = useState(true);

    const pollingIntervalRef = useRef(null);

    // Fetch initial data
    const fetchInitialData = async () => {
        try {
            setLoading(true);
            
            // 1. Check for active sessions
            const { data: activeRes } = await axios.get('/api/attendance/session/active');
            if (activeRes && activeRes.length > 0) {
                setActiveSessions(activeRes);
                setActiveSession(activeRes[0]);
                fetchSessionRecords(activeRes[0]._id);
            } else {
                setActiveSessions([]);
            }
            
            // 2. Fetch courses
            const { data: coursesRes } = await axios.get('/api/setup/courses');
            setCourses(coursesRes);

            // 3. Fetch auto-config
            try {
                const { data: autoConfig } = await axios.get('/api/attendance/auto-config');
                if (autoConfig) {
                    setAutoQRConfig(prev => ({
                        ...prev,
                        ...autoConfig,
                        course: autoConfig.course ? (autoConfig.course._id || autoConfig.course) : ''
                    }));
                }
            } catch (err) {
                console.error("Failed to fetch auto config", err);
            }

            // Populate Wi-Fi list (always default to custom on web)
            setWifiNetworks([]);
            setWifiSSID('');
            
            setLoading(false);
        } catch (error) {
            console.error("Error fetching initial attendance data:", error);
            toast.error("Failed to load initial page data");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
        
        // Poll for active sessions every 10 seconds in case cron generated one
        const activeSessionsInterval = setInterval(async () => {
            try {
                const { data: activeRes } = await axios.get('/api/attendance/session/active');
                setActiveSessions(activeRes || []);
                
                // If there's an activeSession currently viewed, check if it was ended externally
                setActiveSession(prevActive => {
                    if (prevActive) {
                        const stillExists = activeRes?.find(s => s._id === prevActive._id);
                        if (!stillExists) {
                            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                            return null;
                        }
                        return stillExists;
                    } else if (activeRes && activeRes.length > 0) {
                        // If we were on the form (null) and a session appeared (e.g. cron job), auto-open it!
                        fetchSessionRecords(activeRes[0]._id);
                        return activeRes[0];
                    }
                    return prevActive;
                });
            } catch (err) {
                console.error("Error polling active sessions", err);
            }
        }, 10000);

        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            clearInterval(activeSessionsInterval);
        };
    }, []);

    const teacherCourses = user?.teacherProfile?.assignedCourses && user.teacherProfile.assignedCourses.length > 0
        ? user.teacherProfile.assignedCourses
        : courses;

    const availableSubjects = (() => {
        if (selectedCourse) {
            const courseObj = teacherCourses.find(c => c._id === selectedCourse) || courses.find(c => c._id === selectedCourse);
            if (courseObj && courseObj.subjects) {
                if (user?.teacherProfile?.subjects && user.teacherProfile.subjects.length > 0) {
                    return courseObj.subjects.filter(s => user.teacherProfile.subjects.includes(s));
                }
                return courseObj.subjects;
            }
        }
        if (user?.teacherProfile?.subjects && user.teacherProfile.subjects.length > 0) {
            return user.teacherProfile.subjects;
        }
        return [];
    })();

    // Auto-select course on load
    useEffect(() => {
        if (teacherCourses && teacherCourses.length > 0 && !selectedCourse) {
            setSelectedCourse(teacherCourses[0]._id);
        }
    }, [teacherCourses, selectedCourse]);

    // Auto-select section on load
    useEffect(() => {
        if (user?.teacherProfile?.assignedSections && user.teacherProfile.assignedSections.length > 0) {
            if (user.teacherProfile.assignedSections.length === 1) {
                setSection(user.teacherProfile.assignedSections[0]);
            } else {
                setSection('ALL');
            }
        } else {
            setSection('ALL');
        }
    }, [user]);

    const detectedSection = (() => {
        if (user?.teacherProfile?.assignedSections && user.teacherProfile.assignedSections.length > 0) {
            return user.teacherProfile.assignedSections.length === 1 
                ? `Section ${user.teacherProfile.assignedSections[0]}`
                : `All Assigned Sections (${user.teacherProfile.assignedSections.join(', ')})`;
        }
        return 'All Sections';
    })();

    const detectedCourse = (() => {
        const courseObj = teacherCourses.find(c => c._id === selectedCourse);
        if (courseObj) {
            return `${courseObj.name} ${courseObj.code ? `(${courseObj.code})` : ''}`;
        }
        return teacherCourses && teacherCourses.length > 0
            ? `${teacherCourses[0].name} ${teacherCourses[0].code ? `(${teacherCourses[0].code})` : ''}`
            : 'General Course';
    })();

    const detectedSubject = (() => {
        if (selectedSubject) return selectedSubject;
        if (availableSubjects && availableSubjects.length > 0) return availableSubjects[0];
        return 'General Class';
    })();

    // Sync selectedSubject when availableSubjects change
    useEffect(() => {
        if (availableSubjects.length > 0) {
            if (!availableSubjects.includes(selectedSubject)) {
                setSelectedSubject(availableSubjects[0]);
            }
        } else if (!user?.teacherProfile?.subjects?.length) {
            setSelectedSubject('');
        }
    }, [availableSubjects, selectedSubject, user]);

    // Polling for live student check-ins
    useEffect(() => {
        if (activeSession) {
            // Start polling
            pollingIntervalRef.current = setInterval(() => {
                fetchSessionRecords(activeSession._id);
            }, 4000);
            
            // Calculate time left
            const updateTimer = () => {
                const now = new Date();
                const end = new Date(activeSession.endTime);
                const diff = end - now;
                if (diff <= 0) {
                    setTimeLeft('Expired');
                    setActiveSession(null);
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                } else {
                    const mins = Math.floor(diff / 60000);
                    const secs = Math.floor((diff % 60000) / 1000);
                    setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
                }
            };
            
            updateTimer();
            const timerInterval = setInterval(updateTimer, 1000);
            
            return () => {
                clearInterval(timerInterval);
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            };
        }
    }, [activeSession]);

    const fetchSessionRecords = async (sessionId) => {
        try {
            const { data } = await axios.get(`/api/attendance/session/${sessionId}/records`);
            setRecords(data.records || []);
        } catch (error) {
            console.error("Error fetching records:", error);
        }
    };

    const handleCreateSession = async (e) => {
        e.preventDefault();
        if (wifiRequired && wifiSSID === 'custom' && !customWifiSSID.trim()) {
            toast.error("Please specify a custom Wi-Fi network name");
            return;
        }

        const startSessionWithLocation = async (lat, lng) => {
            try {
                setSubmitting(true);
                const { data } = await axios.post('/api/attendance/session', {
                    courseId: selectedCourse || null,
                    subject: selectedSubject,
                    section,
                    duration,
                    wifiSSID: wifiRequired ? (wifiSSID === 'custom' ? customWifiSSID.trim() : wifiSSID) : null,
                    type: attendanceType || 'class',
                    locationRequired,
                    latitude: lat,
                    longitude: lng
                });
                setActiveSession(data);
                setActiveSessions(prev => [...prev, data]);
                fetchSessionRecords(data._id);
                toast.success("Attendance session started successfully!");
                setSubmitting(false);
            } catch (error) {
                console.error("Error starting session:", error);
                toast.error(error.response?.data?.message || "Failed to start session");
                setSubmitting(false);
            }
        };

        if (locationRequired && navigator.geolocation) {
            toast.loading("Fetching teacher's location...", { id: "location-fetch" });
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    toast.dismiss("location-fetch");
                    startSessionWithLocation(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    toast.dismiss("location-fetch");
                    console.error("Error fetching geolocation:", error);
                    toast.error("Could not retrieve location. Please check browser GPS permissions.");
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        } else {
            startSessionWithLocation(null, null);
        }
    };

    const handleEndSession = async (sessionId) => {
        if (!window.confirm("Are you sure you want to end this attendance session? Students will no longer be able to scan.")) return;
        
        try {
            await axios.post(`/api/attendance/session/${sessionId}/end`);
            toast.success("Session ended successfully");
            setActiveSessions(prev => prev.filter(s => s._id !== sessionId));
            if (activeSession && activeSession._id === sessionId) {
                setActiveSession(null);
                setRecords([]);
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            }
        } catch (error) {
            console.error("Error ending session:", error);
            toast.error("Failed to close session");
        }
    };

    const handleManualMark = async (studentId, status) => {
        try {
            await axios.post(`/api/attendance/session/${activeSession._id}/manual`, {
                studentId,
                status
            });
            toast.success(`Marked student ${status}`);
            fetchSessionRecords(activeSession._id);
        } catch (error) {
            console.error("Error manual marking:", error);
            toast.error("Failed to manually mark attendance");
        }
    };

    // Filters
    const filteredRecords = records.filter(r => 
        r.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.student.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const checkedInCount = records.filter(r => r.record?.status === 'In').length;
    const presentCount = records.filter(r => r.record?.status === 'Present').length;
    const absentCount = records.filter(r => !r.record || r.record.status === 'Absent').length;

    const controls = user?.teacherProfile?.controls;

    if (controls?.snapshots?.enabled === false || controls?.snapshots?.qrAttendance === false) {
        return (
            <DashboardLayout role="Teacher">
                <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white/60 backdrop-blur-xl border border-slate-100 rounded-[32px] text-center shadow-xl shadow-slate-100/50 max-w-2xl mx-auto my-12 relative overflow-hidden group">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500"></div>
                    <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <AlertCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Feature Deactivated</h2>
                    <p className="text-sm font-bold text-slate-500 max-w-md mb-6 leading-relaxed">
                        {controls.snapshots.subNotes?.qrAttendance || controls.snapshots.note || 'This page has been deactivated by your administrator. Please contact support if you require access.'}
                    </p>
                </div>
            </DashboardLayout>
        );
    }

    if (loading) {
        return (
            <DashboardLayout role="Teacher">
                <LoadingPlaceholder type="dashboard" />
            </DashboardLayout>
        );
    }

    const handleSaveAutoConfig = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const payload = {
                ...autoQRConfig,
                course: teacherCourses.length > 1 ? autoQRConfig.course : (teacherCourses[0]?._id || selectedCourse),
                subject: selectedSubject || 'General Class',
                section: section === 'ALL' ? 'ALL' : section,
            };
            await axios.post('/api/attendance/auto-config', payload);
            toast.success("Automatic QR Schedule saved successfully!");
            setShowAutoQRModal(false);
        } catch (error) {
            console.error("Error saving auto config:", error);
            toast.error("Failed to save schedule");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DashboardLayout role="Teacher">
            <div className="mb-6 flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <QrCode className="text-indigo-500" size={32} />
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">QR Attendance</h1>
                        <p className="text-sm font-bold text-slate-500 mt-1">Generate dynamic QR codes for live attendance or set up daily automatic schedules.</p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowAutoQRModal(true)}
                    className="bg-white border-2 border-indigo-100 hover:border-indigo-200 text-indigo-600 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm"
                >
                    <Calendar size={18} /> Schedule Daily QRs
                </button>
            </div>

            {!activeSession ? (
                /* Create Session Form */
                <div className="max-w-2xl bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Layers size={20} className="text-slate-500" /> Start New Class Attendance
                    </h2>

                    <form onSubmit={handleCreateSession} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Attendance Type</label>
                                <select
                                    value={attendanceType}
                                    onChange={(e) => setAttendanceType(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-750 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition cursor-pointer"
                                >
                                    <option value="in">Mark In (Check-in)</option>
                                    <option value="out">Mark Out (Check-out)</option>
                                </select>
                            </div>

                            {/* Course selection */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Course</label>
                                <select
                                    value={selectedCourse}
                                    onChange={(e) => setSelectedCourse(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-750 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition cursor-pointer"
                                    required
                                >
                                    <option value="">Select Course</option>
                                    {teacherCourses.map(c => (
                                        <option key={c._id} value={c._id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Subject selection */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Subject</label>
                                <select
                                    value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-750 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition cursor-pointer"
                                    required
                                >
                                    <option value="">Select Subject</option>
                                    {availableSubjects.map((sub, idx) => (
                                        <option key={idx} value={sub}>{sub}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Verification Toggles */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Wi-Fi Verification Switch */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/60 rounded-2xl hover:bg-slate-100/50 transition">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">📶</span>
                                    <div>
                                        <p className="text-xs font-black text-slate-800">Wi-Fi Verification</p>
                                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">Enforce classroom Wi-Fi match</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={wifiRequired} 
                                        onChange={e => setWifiRequired(e.target.checked)} 
                                        className="sr-only peer" 
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-650"></div>
                                </label>
                            </div>

                            {/* Location Verification Switch */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/60 rounded-2xl hover:bg-slate-100/50 transition">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">📍</span>
                                    <div>
                                        <p className="text-xs font-black text-slate-800">GPS Location</p>
                                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">Enforce geofencing range</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={locationRequired} 
                                        onChange={e => setLocationRequired(e.target.checked)} 
                                        className="sr-only peer" 
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-650"></div>
                                </label>
                            </div>
                        </div>

                        {/* Optional Wi-Fi SSID Inputs */}
                        {wifiRequired && (
                            <div className="p-5 border border-slate-200/60 bg-slate-50 rounded-2xl space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-455 uppercase tracking-widest ml-1 mb-2">Classroom Wi-Fi Network</label>
                                    <select
                                        value={wifiSSID}
                                        onChange={(e) => setWifiSSID(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-750 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition cursor-pointer"
                                        required
                                    >
                                        <option value="">-- Select Classroom Wi-Fi --</option>
                                        {wifiNetworks.map((net, idx) => (
                                            <option key={idx} value={net}>{net}</option>
                                        ))}
                                        <option value="custom">-- Enter Custom Wi-Fi --</option>
                                    </select>
                                </div>

                                {wifiSSID === 'custom' && (
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-455 uppercase tracking-widest ml-1 mb-2">Custom Wi-Fi SSID Name</label>
                                        <input
                                            type="text"
                                            placeholder="Enter exact Wi-Fi network name"
                                            value={customWifiSSID}
                                            onChange={(e) => setCustomWifiSSID(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-750 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                                            required
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {(() => {
                            const existingSession = activeSessions.find(s => s.type === attendanceType);
                            if (existingSession) {
                                return (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveSession(existingSession);
                                            fetchSessionRecords(existingSession._id);
                                        }}
                                        className="w-full bg-emerald-600 text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all text-base mt-4"
                                    >
                                        <QrCode size={20} /> Back to QR Code ({attendanceType === 'in' ? 'Mark In' : 'Mark Out'})
                                    </button>
                                );
                            }
                            return (
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full btn-primary py-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all text-base mt-4"
                                >
                                    {submitting ? (
                                        <>
                                            <RefreshCw className="animate-spin" size={20} /> Starting...
                                        </>
                                    ) : (
                                        <>
                                            <QrCode size={20} /> Generate QR Code
                                        </>
                                    )}
                                </button>
                            );
                        })()}
                    </form>
                </div>
            ) : (
                /* Active Session Dashboard */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: QR and Stats */}
                    <div className="lg:col-span-1 space-y-6">
                        <button
                            onClick={() => setActiveSession(null)}
                            className="w-full py-3 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all text-sm mb-2"
                        >
                            + Start Another New QR
                        </button>

                        {activeSessions.map(session => (
                            <div key={session._id} className={`bg-white p-5 rounded-3xl border ${activeSession._id === session._id ? 'border-indigo-400 shadow-md ring-4 ring-indigo-50' : 'border-slate-100 shadow-sm opacity-75 hover:opacity-100'} flex flex-col items-center text-center transition-all cursor-pointer`}
                                onClick={() => {
                                    if (activeSession._id !== session._id) {
                                        setActiveSession(session);
                                        fetchSessionRecords(session._id);
                                    }
                                }}
                            >
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border font-extrabold text-[10px] uppercase tracking-wider mb-4 ${session.type === 'in' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${session.type === 'in' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></span> {session.type === 'in' ? 'Mark In Active' : 'Mark Out Active'}
                                </div>

                                <h3 className="text-xl font-black text-slate-900 mb-0.5">{session.subject}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Section {session.section}</p>
                                
                                {/* QR CODE CONTAINER */}
                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-inner mb-4 w-full flex justify-center">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${session.qrToken}`}
                                        alt="Attendance QR Code"
                                        className="w-[160px] h-[160px] object-contain select-none"
                                    />
                                </div>

                                <div className="flex gap-2 w-full">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleEndSession(session._id); }}
                                        className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-rose-600 hover:text-white transition-all text-[11px]"
                                    >
                                        Close Session
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Live Counts Card */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-3 gap-4 text-center">
                            <div>
                                <h4 className="text-2xl font-black text-emerald-600">{presentCount}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Present (Out)</p>
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-amber-500">{checkedInCount}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Checked In (In)</p>
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-rose-500">{absentCount}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Absent</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Columns: Students Live Feed */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Users size={22} className="text-indigo-600" /> Live Class Feed - {activeSession.subject}
                            </h2>
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search student..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="input-field pl-9 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                        <th className="pb-3">Student</th>
                                        <th className="pb-3">Status</th>
                                        <th className="pb-3">Time & Duration</th>
                                        <th className="pb-3 text-right">Manual Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredRecords.length > 0 ? (
                                        filteredRecords.map(({ student, record }) => (
                                            <tr key={student._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4">
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => setSelectedStudentId(student._id)}
                                                            title="View attendance history"
                                                            className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-700 flex items-center justify-center font-bold overflow-hidden border border-slate-100 cursor-pointer hover:ring-2 hover:ring-indigo-300 transition"
                                                        >
                                                            {student.avatar ? (
                                                                <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                student.name[0]
                                                            )}
                                                        </button>
                                                        <div>
                                                            <button
                                                                onClick={() => setSelectedStudentId(student._id)}
                                                                className="font-semibold text-slate-800 text-sm hover:text-indigo-600 transition cursor-pointer text-left"
                                                            >{student.name}</button>
                                                            <div className="text-xs text-slate-400">{student.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4">
                                                    {record?.status === 'Present' && (
                                                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-bold inline-flex items-center gap-1">
                                                            <CheckCircle size={12} /> Present
                                                        </span>
                                                    )}
                                                    {record?.status === 'In' && (
                                                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-xs font-bold inline-flex items-center gap-1">
                                                            <Clock size={12} /> Checked-In
                                                        </span>
                                                    )}
                                                    {(!record || record.status === 'Absent') && (
                                                        <span className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-xs font-bold inline-flex items-center gap-1">
                                                            <AlertCircle size={12} /> Absent
                                                        </span>
                                                    )}
                                                    {record?.isManual && (
                                                        <span className="text-[9px] font-black text-indigo-500 uppercase ml-2 tracking-widest">
                                                            Manual
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        {record?.checkInTime && (
                                                            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                                                <Clock size={12} className="text-amber-500" />
                                                                <span>In: {new Date(record.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                                {record.checkInPhoto && (
                                                                    <button onClick={() => setSelectedPhoto(record.checkInPhoto)} className="p-0.5 hover:bg-indigo-50 rounded transition" title="View selfie"><ImageIcon size={12} className="text-indigo-500" /></button>
                                                                )}
                                                            </div>
                                                        )}
                                                        {record?.checkOutTime && (
                                                            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                                                <Clock size={12} className="text-emerald-500" />
                                                                <span>Out: {new Date(record.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                                {record.checkOutPhoto && (
                                                                    <button onClick={() => setSelectedPhoto(record.checkOutPhoto)} className="p-0.5 hover:bg-indigo-50 rounded transition" title="View selfie"><ImageIcon size={12} className="text-indigo-500" /></button>
                                                                )}
                                                            </div>
                                                        )}
                                                        {record?.checkInTime && record?.checkOutTime && (
                                                            <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-black tracking-widest border border-indigo-100 w-fit">
                                                                {Math.round((new Date(record.checkOutTime) - new Date(record.checkInTime)) / 60000)} MINS
                                                            </div>
                                                        )}
                                                        {!record?.checkInTime && <span className="text-xs text-slate-400 italic">—</span>}
                                                    </div>
                                                </td>
                                                <td className="py-4 text-right">
                                                    <div className="flex gap-1.5 justify-end">
                                                        <button
                                                            onClick={() => handleManualMark(student._id, 'Present')}
                                                            className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                                                                record?.status === 'Present'
                                                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                            }`}
                                                            title="Mark Present"
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleManualMark(student._id, 'In')}
                                                            className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                                                                record?.status === 'In'
                                                                    ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                            }`}
                                                            title="Mark Checked In"
                                                        >
                                                            <Clock size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleManualMark(student._id, 'Absent')}
                                                            className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                                                                !record || record.status === 'Absent'
                                                                    ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-200'
                                                            }`}
                                                            title="Mark Absent"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="py-8 text-center text-slate-400 italic">
                                                No students found in Section {activeSession.section}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Selfie Preview Modal */}
            {selectedPhoto && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl border border-slate-100 max-w-sm w-full overflow-hidden shadow-2xl relative">
                        <button
                            onClick={() => setSelectedPhoto(null)}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/40 text-white hover:bg-slate-900/60 transition-all flex items-center justify-center z-10"
                        >
                            <X size={18} />
                        </button>
                        <div className="p-4 bg-slate-50 border-b border-slate-100 text-center font-bold text-slate-700 text-sm">
                            Selfie Verification
                        </div>
                        <div className="aspect-square bg-slate-100 flex items-center justify-center">
                            <img 
                                src={selectedPhoto} 
                                alt="Selfie Verification" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Student Attendance Detail Modal */}
            {selectedStudentId && (
                <StudentAttendanceDetailModal
                    studentId={selectedStudentId}
                    onClose={() => setSelectedStudentId(null)}
                    onDataChange={() => fetchSessionRecords(activeSession?._id)}
                />
            )}

            {/* Auto QR Config Modal */}
            {showAutoQRModal && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl border border-slate-100 max-w-md w-full overflow-hidden shadow-2xl relative">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Schedule Automatic QRs</h3>
                                <p className="text-xs font-bold text-slate-500 mt-0.5">QRs will be generated automatically daily</p>
                            </div>
                            <button onClick={() => setShowAutoQRModal(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all flex items-center justify-center cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveAutoConfig} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
                            <label className="flex items-center justify-between p-4 border border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-all">
                                <div>
                                    <h4 className="font-bold text-slate-800">Enable Automatic Scheduling</h4>
                                    <p className="text-[10px] text-slate-500">Run background cron job daily</p>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={autoQRConfig.enabled}
                                    onChange={(e) => setAutoQRConfig({...autoQRConfig, enabled: e.target.checked})}
                                    className="w-5 h-5 accent-indigo-600 cursor-pointer"
                                />
                            </label>

                            {autoQRConfig.enabled && (
                                <>
                                    <div className="mb-4">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">QR Generation Time</label>
                                        <input type="time" required value={autoQRConfig.scheduleTime} onChange={e => setAutoQRConfig({...autoQRConfig, scheduleTime: e.target.value})} className="input-field" />
                                    </div>

                                    {/* Show Course only if multiple courses assigned */}
                                    {teacherCourses.length > 1 && (
                                        <div className="mb-4">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Course</label>
                                            <select value={autoQRConfig.course} onChange={e => setAutoQRConfig({...autoQRConfig, course: e.target.value})} className="input-field mb-3" required>
                                                <option value="">Select Course</option>
                                                {teacherCourses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {/* Wi-Fi Enforce (Subject & Section are auto-detected from teacher profile) */}
                                    <div className="mb-4">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Wi-Fi Enforce (Optional)</label>
                                        <input type="text" placeholder="SSID Name" value={autoQRConfig.wifiSSID} onChange={e => setAutoQRConfig({...autoQRConfig, wifiSSID: e.target.value})} className="input-field" />
                                    </div>
                                    
                                    <label className="flex items-center justify-between p-4 border border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-all">
                                        <div>
                                            <h4 className="font-bold text-slate-800">Enforce GPS Location</h4>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={autoQRConfig.locationRequired}
                                            onChange={(e) => setAutoQRConfig({...autoQRConfig, locationRequired: e.target.checked})}
                                            className="w-5 h-5 accent-indigo-600 cursor-pointer"
                                        />
                                    </label>
                                </>
                            )}
                            
                            <button type="submit" disabled={submitting} className="w-full btn-primary py-3.5 rounded-xl font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-2">
                                {submitting ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle size={18} />} Save Schedule
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </DashboardLayout>
    );
};

export default TeacherAttendance;
