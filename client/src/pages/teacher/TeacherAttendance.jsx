import { useAuth } from '../../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
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
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [timeLeft, setTimeLeft] = useState('');
    const [selectedPhoto, setSelectedPhoto] = useState(null);

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

    const pollingIntervalRef = useRef(null);

    // Fetch initial data
    const fetchInitialData = async () => {
        try {
            setLoading(true);
            
            // 1. Check for active sessions
            const { data: activeRes } = await axios.get('/api/attendance/session/active');
            if (activeRes && activeRes.length > 0) {
                setActiveSession(activeRes[0]);
                fetchSessionRecords(activeRes[0]._id);
            }
            
            // 2. Fetch courses
            const { data: coursesRes } = await axios.get('/api/setup/courses');
            setCourses(coursesRes);

            // Populate Wi-Fi list (always default to custom on web)
            setWifiNetworks([]);
            setWifiSSID('custom');
            
            setLoading(false);
        } catch (error) {
            console.error("Error fetching initial attendance data:", error);
            toast.error("Failed to load initial page data");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        };
    }, []);

    const teacherCourses = user?.teacherProfile?.assignedCourses && user.teacherProfile.assignedCourses.length > 0
        ? user.teacherProfile.assignedCourses
        : courses;

    const availableSubjects = (() => {
        if (user?.teacherProfile?.subjects && user.teacherProfile.subjects.length > 0) {
            return user.teacherProfile.subjects;
        }
        if (selectedCourse) {
            const course = courses.find(c => c._id === selectedCourse);
            if (course && course.subjects) {
                return course.subjects;
            }
        }
        return [];
    })();

    // Auto-select course on load
    useEffect(() => {
        if (teacherCourses && teacherCourses.length > 0 && !selectedCourse) {
            setSelectedCourse(teacherCourses[0]._id);
        }
    }, [teacherCourses, selectedCourse]);

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
        if (!selectedSubject || !section || !duration || !wifiSSID) {
            toast.error("Please fill out all fields");
            return;
        }
        if (wifiSSID === 'custom' && !customWifiSSID.trim()) {
            toast.error("Please specify a custom Wi-Fi network name");
            return;
        }

        try {
            setSubmitting(true);
            const { data } = await axios.post('/api/attendance/session', {
                courseId: selectedCourse || null,
                subject: selectedSubject,
                section,
                duration,
                wifiSSID: wifiSSID === 'custom' ? customWifiSSID.trim() : wifiSSID
            });
            setActiveSession(data);
            fetchSessionRecords(data._id);
            toast.success("Attendance session started successfully!");
            setSubmitting(false);
        } catch (error) {
            console.error("Error starting session:", error);
            toast.error(error.response?.data?.message || "Failed to start session");
            setSubmitting(false);
        }
    };

    const handleEndSession = async () => {
        if (!window.confirm("Are you sure you want to end this attendance session? Students will no longer be able to scan.")) return;
        
        try {
            await axios.post(`/api/attendance/session/${activeSession._id}/end`);
            toast.success("Session closed.");
            setActiveSession(null);
            setRecords([]);
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
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

    if (loading) {
        return (
            <DashboardLayout role="Teacher">
                <LoadingPlaceholder type="dashboard" />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="Teacher">
            <div className="mb-6">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <QrCode className="text-indigo-650" size={32} /> QR Attendance
                </h1>
                <p className="text-slate-500 mt-1">Generate dynamic QR codes for live attendance or mark students manually.</p>
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
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Course</label>
                                <select
                                    value={selectedCourse}
                                    onChange={(e) => setSelectedCourse(e.target.value)}
                                    className="input-field select-field"
                                >
                                    <option value="">-- General / Non-Course --</option>
                                    {teacherCourses.map(course => (
                                        <option key={course._id} value={course._id}>{course.name} {course.code ? `(${course.code})` : ''}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Subject</label>
                                {availableSubjects.length > 0 ? (
                                    <select
                                        value={selectedSubject}
                                        onChange={(e) => setSelectedSubject(e.target.value)}
                                        className="input-field select-field"
                                        required
                                    >
                                        {availableSubjects.map((sub, idx) => (
                                            <option key={idx} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        placeholder="e.g. REACT, MATH, ENGLISH"
                                        value={selectedSubject}
                                        onChange={(e) => setSelectedSubject(e.target.value.toUpperCase())}
                                        className="input-field"
                                        required
                                    />
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Section</label>
                                <input
                                    type="text"
                                    placeholder="e.g. A, B, C"
                                    value={section}
                                    onChange={(e) => setSection(e.target.value.toUpperCase())}
                                    className="input-field"
                                    maxLength="5"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Class Duration</label>
                                <select
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    className="input-field select-field"
                                >
                                    <option value="15">15 Minutes (Short test/meeting)</option>
                                    <option value="30">30 Minutes</option>
                                    <option value="45">45 Minutes</option>
                                    <option value="60">60 Minutes (Standard)</option>
                                    <option value="90">90 Minutes</option>
                                    <option value="120">120 Minutes (Extended)</option>
                                </select>
                            </div>

                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Classroom Wi-Fi Network</label>
                                    <select
                                        value={wifiSSID}
                                        onChange={(e) => setWifiSSID(e.target.value)}
                                        className="input-field select-field"
                                        required
                                    >
                                        {wifiNetworks.map((net, idx) => (
                                            <option key={idx} value={net}>{net}</option>
                                        ))}
                                        <option value="custom">-- Enter Custom Wi-Fi --</option>
                                    </select>
                                </div>

                                {wifiSSID === 'custom' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Custom Wi-Fi SSID Name</label>
                                        <input
                                            type="text"
                                            placeholder="Enter exact Wi-Fi network name"
                                            value={customWifiSSID}
                                            onChange={(e) => setCustomWifiSSID(e.target.value)}
                                            className="input-field"
                                            required
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

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
                    </form>
                </div>
            ) : (
                /* Active Session Dashboard */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: QR and Stats */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100 text-emerald-600 font-extrabold text-[10px] uppercase tracking-wider mb-4 animate-pulse">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Active Session
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 mb-0.5">{activeSession.subject}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Section {activeSession.section}</p>

                            {/* QR CODE CONTAINER */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner mb-6">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${activeSession.qrToken}`}
                                    alt="Attendance QR Code"
                                    className="w-[200px] h-[200px] object-contain select-none"
                                />
                            </div>

                            <div className="flex items-center gap-2 bg-rose-50 px-4 py-2 rounded-xl text-rose-600 font-bold text-sm mb-6 border border-rose-100">
                                <Clock size={16} /> Ends in: <span className="font-extrabold font-mono">{timeLeft}</span>
                            </div>

                            <button
                                onClick={handleEndSession}
                                className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all text-sm"
                            >
                                Close Session Now
                            </button>
                        </div>

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
                                <Users size={22} className="text-indigo-600" /> Student Attendance Sheet
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
                                        <th className="pb-3">Verification Selfies</th>
                                        <th className="pb-3 text-right">Manual Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredRecords.length > 0 ? (
                                        filteredRecords.map(({ student, record }) => (
                                            <tr key={student._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-700 flex items-center justify-center font-bold overflow-hidden border border-slate-100">
                                                            {student.avatar ? (
                                                                <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                student.name[0]
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-slate-800 text-sm">{student.name}</div>
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
                                                    <div className="flex gap-2">
                                                        {record?.checkInPhoto ? (
                                                            <button 
                                                                onClick={() => setSelectedPhoto(record.checkInPhoto)}
                                                                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-1"
                                                                title="View check-in photo"
                                                            >
                                                                <ImageIcon size={12} /> In Selfie
                                                            </button>
                                                        ) : null}
                                                        {record?.checkOutPhoto ? (
                                                            <button 
                                                                onClick={() => setSelectedPhoto(record.checkOutPhoto)}
                                                                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-1"
                                                                title="View check-out photo"
                                                            >
                                                                <ImageIcon size={12} /> Out Selfie
                                                            </button>
                                                        ) : null}
                                                        {!record?.checkInPhoto && !record?.checkOutPhoto && (
                                                            <span className="text-xs text-slate-400 italic">—</span>
                                                        )}
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
        </DashboardLayout>
    );
};

export default TeacherAttendance;
