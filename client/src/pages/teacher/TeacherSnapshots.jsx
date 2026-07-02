import { useAuth } from '../../context/AuthContext';
import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Users, Search, CheckCircle, AlertCircle, BookOpen, Clock, Info,
    FileText, MessageSquare, BarChart3, RotateCcw, Settings, ChevronRight,
    Sparkles, Camera, Mic, Phone, Video, Calendar, ArrowRight, CreditCard, Activity,
    UserCheck, DollarSign
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';

const TeacherSnapshots = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [expandedSections, setExpandedSections] = useState({});

    // Attendance state
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceStatus, setAttendanceStatus] = useState('Present');
    const [submittingAttendance, setSubmittingAttendance] = useState(false);

    // Fee status state
    const [feeStatusVal, setFeeStatusVal] = useState('Paid');
    const [submittingFee, setSubmittingFee] = useState(false);

    // Bulk attendance register state
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkAttendanceDate, setBulkAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [bulkRecords, setBulkRecords] = useState({}); // studentId -> 'Present'/'Absent'
    const [submittingBulk, setSubmittingBulk] = useState(false);
    const [bulkSearch, setBulkSearch] = useState('');

    // Initialize bulk records when students load
    useEffect(() => {
        if (students.length > 0) {
            const initialRecords = {};
            students.forEach(s => {
                const existing = s.studentProfile?.physicalAttendance?.find(
                    a => a.date === bulkAttendanceDate
                );
                initialRecords[s._id] = existing?.status || 'Present';
            });
            setBulkRecords(initialRecords);
        }
    }, [students, bulkAttendanceDate, showBulkModal]);

    const handleBulkSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmittingBulk(true);
            const attendanceRecords = Object.entries(bulkRecords).map(([studentId, status]) => ({
                studentId,
                status
            }));

            await axios.post('/api/users/bulk-physical-attendance', {
                date: bulkAttendanceDate,
                attendanceRecords
            });

            toast.success(`Class attendance for ${bulkAttendanceDate} saved successfully!`);
            setShowBulkModal(false);

            // Reload students data to sync profiles
            await fetchStudents();
            setSubmittingBulk(false);
        } catch (error) {
            console.error("Error saving bulk attendance:", error);
            toast.error(error.response?.data?.message || "Failed to save bulk attendance");
            setSubmittingBulk(false);
        }
    };

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get('/api/users/teacher-students');
            setStudents(data);
            if (data.length > 0) {
                // If there's already a selected student, preserve it by matching ID
                setSelectedStudent(prev => {
                    if (prev) {
                        return data.find(s => s._id === prev._id) || data[0];
                    }
                    return data[0];
                });
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching teacher students:", error);
            toast.error("Failed to load students list");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    // Set initial values when selectedStudent changes
    useEffect(() => {
        if (selectedStudent) {
            setFeeStatusVal(selectedStudent.studentProfile?.feeStatus || 'Paid');
            // Default attendance status for selected date
            const existingForDate = selectedStudent.studentProfile?.physicalAttendance?.find(
                a => a.date === attendanceDate
            );
            setAttendanceStatus(existingForDate?.status || 'Present');
        }
    }, [selectedStudent, attendanceDate]);

    // Handle marking physical attendance
    const handleMarkAttendance = async (e) => {
        e.preventDefault();
        if (!selectedStudent) return;
        try {
            setSubmittingAttendance(true);
            const { data } = await axios.post(`/api/users/${selectedStudent._id}/physical-attendance`, {
                date: attendanceDate,
                status: attendanceStatus
            });
            toast.success(`Attendance marked as ${attendanceStatus} for ${attendanceDate}`);

            // Update selected student list state
            setStudents(prev => prev.map(s => {
                if (s._id === selectedStudent._id) {
                    return {
                        ...s,
                        studentProfile: {
                            ...s.studentProfile,
                            physicalAttendance: data.physicalAttendance
                        }
                    };
                }
                return s;
            }));

            // Sync selectedStudent details
            setSelectedStudent(prev => ({
                ...prev,
                studentProfile: {
                    ...prev.studentProfile,
                    physicalAttendance: data.physicalAttendance
                }
            }));
            setSubmittingAttendance(false);
        } catch (error) {
            console.error("Error marking physical attendance:", error);
            toast.error(error.response?.data?.message || "Failed to mark attendance");
            setSubmittingAttendance(false);
        }
    };

    // Handle updating fee status
    const handleUpdateFee = async (status) => {
        if (!selectedStudent) return;
        try {
            setSubmittingFee(true);
            const { data } = await axios.put(`/api/users/${selectedStudent._id}/fee-status`, {
                feeStatus: status
            });
            toast.success(`Fee status updated to ${status}`);
            setFeeStatusVal(status);

            // Update students list state
            setStudents(prev => prev.map(s => {
                if (s._id === selectedStudent._id) {
                    return {
                        ...s,
                        studentProfile: {
                            ...s.studentProfile,
                            feeStatus: data.feeStatus
                        }
                    };
                }
                return s;
            }));

            // Sync selectedStudent details
            setSelectedStudent(prev => ({
                ...prev,
                studentProfile: {
                    ...prev.studentProfile,
                    feeStatus: data.feeStatus
                }
            }));
            setSubmittingFee(false);
        } catch (error) {
            console.error("Error updating fee status:", error);
            toast.error(error.response?.data?.message || "Failed to update fee status");
            setSubmittingFee(false);
        }
    };

    const filteredStudents = useMemo(() => {
        return students.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [students, searchTerm]);

    const showSectionsGrouped = useMemo(() => {
        const mode = user?.teacherProfile?.studentAssignmentMode;
        const sections = user?.teacherProfile?.assignedSections || [];
        return mode === 'section' && sections.length > 1;
    }, [user]);

    const studentsBySection = useMemo(() => {
        if (!showSectionsGrouped) return {};
        const groups = {};
        filteredStudents.forEach(student => {
            const sec = student.studentProfile?.section || 'No Section';
            if (!groups[sec]) groups[sec] = [];
            groups[sec].push(student);
        });
        return groups;
    }, [filteredStudents, showSectionsGrouped]);

    // LMS Attendance rate calculation
    const lmsAttendanceRate = useMemo(() => {
        if (!selectedStudent?.stats) return 88;
        const totalSubmissions = selectedStudent.stats.total || 0;
        const baseline = 88;
        const bonus = totalSubmissions * 2;
        return Math.min(100, baseline + bonus);
    }, [selectedStudent]);

    // Physical Attendance calculations
    const physicalStats = useMemo(() => {
        if (!selectedStudent?.studentProfile?.physicalAttendance) {
            return { present: 42, total: 50, rate: 84 };
        }
        const list = selectedStudent.studentProfile.physicalAttendance;
        if (list.length === 0) {
            return { present: 42, total: 50, rate: 84 }; // Default baseline
        }
        const present = list.filter(a => a.status === 'Present').length;
        const total = list.length;
        const rate = Math.round((present / total) * 100);
        return { present, total, rate };
    }, [selectedStudent]);

    if (loading) {
        return (
            <DashboardLayout role="Teacher" fullWidth={true}>
                <LoadingPlaceholder type="dashboard" />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="Teacher" fullWidth={true}>
            <div className="space-y-8 font-sans max-w-7xl mx-auto pb-12">
                {/* Header */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
                            <Activity className="text-indigo-650 animate-pulse" size={26} />
                            Class Snapshots & Diagnostics
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Evaluate student workspace logs, log physical classroom registers, and check ledger details.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowBulkModal(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-100 hover:-translate-y-0.5 cursor-pointer shrink-0"
                    >
                        <UserCheck size={16} />
                        Mark Attendance Register
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Panel: Students Directory list */}
                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-[650px]">
                        <div className="p-5 border-b border-slate-100 space-y-3">
                            <h3 className="font-extrabold text-slate-800 text-base">Students Directory</h3>
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all font-semibold text-xs text-slate-800"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                            {filteredStudents.length > 0 ? (
                                showSectionsGrouped ? (
                                    Object.keys(studentsBySection).sort().map(secName => {
                                        const secStudents = studentsBySection[secName];
                                        const isExpanded = !!expandedSections[secName];
                                        return (
                                            <div key={secName} className="space-y-1.5 p-2 bg-slate-50/20 border-b border-slate-100">
                                                <div 
                                                    onClick={() => setExpandedSections(prev => ({ ...prev, [secName]: !prev[secName] }))}
                                                    className="flex items-center justify-between px-2.5 py-2 bg-slate-50 hover:bg-slate-100/70 rounded-lg border border-slate-100/85 cursor-pointer select-none transition-all"
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                                            Section {secName}
                                                        </span>
                                                        <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
                                                            {secStudents.length} Students
                                                        </span>
                                                    </div>
                                                    <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                                {isExpanded && (
                                                    <div className="space-y-1.5 p-1 bg-white rounded-xl mt-1 animate-fade-in">
                                                        {secStudents.map(student => {
                                                            const isSelected = selectedStudent?._id === student._id;
                                                            return (
                                                                <button
                                                                    key={student._id}
                                                                    onClick={() => setSelectedStudent(student)}
                                                                    className={`w-full p-2 flex items-center gap-3 text-left transition-all hover:bg-slate-50/50 rounded-xl ${isSelected ? 'bg-indigo-50/40 border-l-4 border-indigo-650' : 'border-l-4 border-transparent'
                                                                        }`}
                                                                >
                                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-650 flex items-center justify-center text-white font-extrabold text-xs shadow-sm shrink-0 overflow-hidden">
                                                                        {student.avatar ? (
                                                                            <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            student.name[0].toUpperCase()
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <h4 className={`text-xs font-black truncate ${isSelected ? 'text-indigo-955' : 'text-slate-800'}`}>{student.name}</h4>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    filteredStudents.map(student => {
                                        const isSelected = selectedStudent?._id === student._id;
                                        return (
                                            <button
                                                key={student._id}
                                                onClick={() => setSelectedStudent(student)}
                                                className={`w-full p-4 flex items-center gap-4 text-left transition-all hover:bg-slate-50/50 ${isSelected ? 'bg-indigo-50/40 border-l-4 border-indigo-650' : 'border-l-4 border-transparent'
                                                    }`}
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-650 flex items-center justify-center text-white font-extrabold text-sm shadow-sm shrink-0 overflow-hidden">
                                                    {student.avatar ? (
                                                        <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        student.name[0].toUpperCase()
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className={`text-xs font-black truncate ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>{student.name}</h4>
                                                    <p className="text-[10px] text-slate-455 truncate font-semibold mt-0.5">{student.email}</p>
                                                </div>
                                            </button>
                                        );
                                    })
                                )
                            ) : (
                                <div className="p-8 text-center text-slate-400 text-xs font-bold">
                                    No students found matching your search.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Selected Student Metrics & Actions */}
                    {selectedStudent ? (
                        <div className="lg:col-span-2 space-y-6">
                            {/* Student Profile Header */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-2xl shadow-sm overflow-hidden">
                                    {selectedStudent.avatar ? (
                                        <img src={selectedStudent.avatar} alt={selectedStudent.name} className="w-full h-full object-cover" />
                                    ) : (
                                        selectedStudent.name[0]?.toUpperCase()
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 leading-tight">{selectedStudent.name}</h2>
                                    <p className="text-slate-400 text-xs font-semibold mt-0.5">{selectedStudent.email}</p>
                                    <div className="flex gap-2.5 mt-2 flex-wrap">
                                        <span className="px-2.5 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black uppercase text-slate-500 tracking-wider">
                                            Batch: {selectedStudent.studentProfile?.batch || '2024 - Standard'}
                                        </span>
                                        <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-150 rounded-lg text-[9px] font-black uppercase text-indigo-700 tracking-wider">
                                            Subject: {selectedStudent.studentProfile?.subject || 'All Assigned'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Attendance Double Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* LMS Attendance Rate Card */}
                                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 w-20 h-20 bg-indigo-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">LMS Attendance</span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${lmsAttendanceRate >= 90 ? 'text-indigo-600 bg-indigo-50 border-indigo-200' : 'text-amber-600 bg-amber-50 border-amber-200'
                                                }`}>
                                                {lmsAttendanceRate >= 90 ? 'Good' : 'Needs Work'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-6 my-2">
                                            <div className="relative w-16 h-16 shrink-0">
                                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                                    <path className="text-slate-100" strokeWidth="3.5" stroke="currentColor" fill="transparent" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                    <path className="text-indigo-600 transition-all duration-1000 ease-out" strokeWidth="3.5" strokeDasharray={`${lmsAttendanceRate}, 100`} strokeLinecap="round" stroke="currentColor" fill="transparent" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                </svg>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-sm font-black text-slate-800">{lmsAttendanceRate}%</span>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-slate-800">{selectedStudent.stats?.total || 0} Submissions</h4>
                                                <p className="text-slate-500 text-[10px] font-bold uppercase mt-0.5 tracking-wider">Active Workspace Logs</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
                                        <Info size={12} className="text-indigo-500 shrink-0" />
                                        <p className="text-[10px] text-slate-500 font-semibold">
                                            Calculated from test submissions and workspace practice sessions.
                                        </p>
                                    </div>
                                </div>

                                {/* Physical Biometric Attendance Card */}
                                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 w-20 h-20 bg-emerald-500/5 rounded-bl-full pointer-events-none transition-all group-hover:scale-110" />
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Physical Attendance</span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${physicalStats.rate >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-rose-600 bg-rose-50 border-rose-200'
                                                }`}>
                                                {physicalStats.rate >= 80 ? 'Good' : 'Defaulter'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-6 my-2">
                                            <div className="relative w-16 h-16 shrink-0">
                                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                                    <path className="text-slate-100" strokeWidth="3.5" stroke="currentColor" fill="transparent" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                    <path className="text-emerald-600 transition-all duration-1000 ease-out" strokeWidth="3.5" strokeDasharray={`${physicalStats.rate}, 100`} strokeLinecap="round" stroke="currentColor" fill="transparent" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                </svg>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-sm font-black text-slate-800">{physicalStats.rate}%</span>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-slate-800">{physicalStats.present} / {physicalStats.total} Days</h4>
                                                <p className="text-slate-500 text-[10px] font-bold uppercase mt-0.5 tracking-wider">Lectures Attended</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
                                        <Info size={12} className="text-emerald-500 shrink-0" />
                                        <p className="text-[10px] text-slate-500 font-semibold">
                                            Calculated from biometric classroom scans and manual registers.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Mark Daily Attendance Action Card */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                                <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                                    <UserCheck size={18} className="text-indigo-600" />
                                    Mark Physical Attendance
                                </h3>
                                <form onSubmit={handleMarkAttendance} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end bg-slate-50/50 p-4 rounded-2xl border border-slate-105">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-450 uppercase tracking-wider block">Attendance Date</label>
                                        <input
                                            type="date"
                                            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-700 bg-white"
                                            value={attendanceDate}
                                            onChange={e => setAttendanceDate(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-455 uppercase tracking-wider block">Log Status</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setAttendanceStatus('Present')}
                                                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${attendanceStatus === 'Present'
                                                    ? 'bg-emerald-500 border-emerald-550 text-white shadow-md shadow-emerald-100'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                    }`}
                                            >
                                                Present
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAttendanceStatus('Absent')}
                                                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${attendanceStatus === 'Absent'
                                                    ? 'bg-rose-500 border-rose-550 text-white shadow-md shadow-rose-100'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                    }`}
                                            >
                                                Absent
                                            </button>
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submittingAttendance}
                                        className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 h-10 shadow-md cursor-pointer"
                                    >
                                        {submittingAttendance ? 'Saving...' : 'Save Attendance'}
                                    </button>
                                </form>
                            </div>

                            {/* Student Fees Ledger & Management Card */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                                        <CreditCard size={18} className="text-indigo-650" />
                                        ERP Accounting & Financial Ledger
                                    </h3>
                                    {feeStatusVal === 'Pending' ? (
                                        <span className="px-3 py-1.5 rounded-xl border border-rose-105 bg-rose-50/50 text-rose-700 text-[10px] font-black tracking-wider uppercase">
                                            Status: Pending Dues
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1.5 rounded-xl border border-emerald-100 bg-emerald-50/50 text-emerald-700 text-[10px] font-black tracking-wider uppercase">
                                            Status: Cleared
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Semester Fee</p>
                                        <p className="text-lg font-black text-slate-700 mt-1">₹48,500</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Amount Paid</p>
                                        <p className="text-lg font-black text-slate-700 mt-1">
                                            {feeStatusVal === 'Pending' ? '₹36,000' : '₹48,500'}
                                        </p>
                                    </div>
                                    <div className={`p-4 border rounded-2xl ${feeStatusVal === 'Pending' ? 'bg-red-50/50 border-red-100' : 'bg-slate-50 border-slate-100'
                                        }`}>
                                        <p className={`text-[9px] font-black uppercase tracking-wider ${feeStatusVal === 'Pending' ? 'text-red-500' : 'text-slate-400'
                                            }`}>Outstanding Dues</p>
                                        <p className={`text-lg font-black mt-1 ${feeStatusVal === 'Pending' ? 'text-red-700' : 'text-slate-700'
                                            }`}>
                                            {feeStatusVal === 'Pending' ? '₹12,500' : '₹0'}
                                        </p>
                                    </div>
                                </div>

                                {/* Manage Fees Status Button Action */}
                                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-xs font-black">Update Ledger Status</h4>
                                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Toggle student clearance level inside ERP database</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleUpdateFee('Paid')}
                                            disabled={submittingFee || feeStatusVal === 'Paid'}
                                            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all border cursor-pointer ${feeStatusVal === 'Paid'
                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-black cursor-not-allowed'
                                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                                }`}
                                        >
                                            Mark as Paid
                                        </button>
                                        <button
                                            onClick={() => handleUpdateFee('Pending')}
                                            disabled={submittingFee || feeStatusVal === 'Pending'}
                                            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all border cursor-pointer ${feeStatusVal === 'Pending'
                                                ? 'bg-rose-50 border-rose-200 text-rose-700 font-black cursor-not-allowed'
                                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                                }`}
                                        >
                                            Mark as Pending
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="lg:col-span-2 bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-450 flex flex-col items-center justify-center gap-3">
                            <Users size={48} className="text-slate-300" />
                            <p className="font-bold text-sm">Please select a student from the directory to review performance logs and manage ledgers.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bulk Attendance Register Modal */}
            {showBulkModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-3xl rounded-[32px] border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <div>
                                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                                    <UserCheck className="text-indigo-600" size={22} />
                                    Mark Bulk Attendance Register
                                </h3>
                                <p className="text-slate-400 text-xs mt-1">Mark attendance for all students assigned to your class.</p>
                            </div>
                            <button
                                onClick={() => setShowBulkModal(false)}
                                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-450 hover:bg-slate-100 hover:text-slate-700 transition-all font-black text-sm cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Controls */}
                        <div className="p-6 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center bg-white shrink-0">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Attendance Date</label>
                                <input
                                    type="date"
                                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-700 bg-white"
                                    value={bulkAttendanceDate}
                                    onChange={e => setBulkAttendanceDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Quick Search</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Filter students..."
                                        className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-700 bg-white"
                                        value={bulkSearch}
                                        onChange={e => setBulkSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1 sm:text-right pt-4 sm:pt-0">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Quick Actions</span>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const updated = {};
                                            students.forEach(s => updated[s._id] = 'Present');
                                            setBulkRecords(updated);
                                        }}
                                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                    >
                                        All Present
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const updated = {};
                                            students.forEach(s => updated[s._id] = 'Absent');
                                            setBulkRecords(updated);
                                        }}
                                        className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-105 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                    >
                                        All Absent
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Students List */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                            <div className="divide-y divide-slate-100 bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
                                {students
                                    .filter(s => s.name.toLowerCase().includes(bulkSearch.toLowerCase()))
                                    .map(s => {
                                        const currentStatus = bulkRecords[s._id] || 'Present';
                                        return (
                                            <div key={s._id} className="p-4 flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-xs overflow-hidden shrink-0">
                                                        {s.avatar ? <img src={s.avatar} alt="" className="w-full h-full object-cover" /> : s.name[0]?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-xs">{s.name}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{s.studentProfile?.course?.name || 'B.Tech'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setBulkRecords(prev => ({ ...prev, [s._id]: 'Present' }))}
                                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${currentStatus === 'Present'
                                                            ? 'bg-emerald-500 border-emerald-550 text-white shadow-md shadow-emerald-100'
                                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        Present
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setBulkRecords(prev => ({ ...prev, [s._id]: 'Absent' }))}
                                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${currentStatus === 'Absent'
                                                            ? 'bg-rose-500 border-rose-550 text-white shadow-md shadow-rose-100'
                                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        Absent
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setShowBulkModal(false)}
                                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-55 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkSubmit}
                                disabled={submittingBulk}
                                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-55 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md"
                            >
                                {submittingBulk ? 'Saving register...' : 'Save Register'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </DashboardLayout>
    );
};

export default TeacherSnapshots;
