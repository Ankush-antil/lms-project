import { useAuth } from '../../context/AuthContext';
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
    Search, CheckCircle, Users, GraduationCap, XCircle,
    Save, RotateCcw, FileText, Sun, UserCheck, Calendar,
    ChevronLeft, ChevronRight, Filter, QrCode
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import StudentAttendanceDetailModal from '../../components/common/StudentAttendanceDetailModal';

// Custom Calendar Picker Component
const CalendarPicker = ({ selectedDate, onChange }) => {
    const parsedDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
    const [currentYear, setCurrentYear] = useState(parsedDate.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(parsedDate.getMonth());

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    useEffect(() => {
        if (selectedDate) {
            const parsed = new Date(selectedDate + 'T00:00:00');
            setCurrentYear(parsed.getFullYear());
            setCurrentMonth(parsed.getMonth());
        }
    }, [selectedDate]);

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const startDay = new Date(currentYear, currentMonth, 1).getDay();

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
    };

    const handleSelectDay = (day) => {
        const y = currentYear;
        const m = String(currentMonth + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        onChange(`${y}-${m}-${d}`);
    };

    const dayCells = [];
    for (let i = 0; i < startDay; i++) {
        dayCells.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const y = currentYear;
        const m = String(currentMonth + 1).padStart(2, '0');
        const dayStr = String(d).padStart(2, '0');
        const formatted = `${y}-${m}-${dayStr}`;
        const isSelected = formatted === selectedDate;

        const cellDate = new Date(currentYear, currentMonth, d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isFuture = cellDate > today;

        dayCells.push(
            <button
                key={`day-${d}`}
                type="button"
                disabled={isFuture}
                onClick={() => handleSelectDay(d)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    isFuture
                        ? 'text-slate-300 font-normal cursor-not-allowed'
                        : isSelected
                            ? 'bg-emerald-500 text-white font-black shadow-md shadow-emerald-100 cursor-pointer'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 cursor-pointer'
                }`}
            >
                {d}
            </button>
        );
    }

    return (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between px-1">
                <button type="button" onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-pointer transition">
                    <ChevronLeft size={16} />
                </button>
                <h4 className="text-sm font-black text-slate-700">
                    {months[currentMonth]} {currentYear}
                </h4>
                <button type="button" onClick={handleNextMonth} className="p-1.5 hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-pointer transition">
                    <ChevronRight size={16} />
                </button>
            </div>
            
            <div className="grid grid-cols-7 gap-y-1 text-center">
                {daysOfWeek.map(d => (
                    <div key={d} className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-1">
                        {d}
                    </div>
                ))}
                {dayCells}
            </div>
        </div>
    );
};

const MiniCalendar = ({ date, onSelect }) => {
    const d = new Date(date + 'T00:00:00');
    const year = d.getFullYear();
    const month = d.getMonth();
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let i = 1; i <= daysInMonth; i++) cells.push(i);
    const prevMonth = () => {
        const nd = new Date(year, month - 1, 1);
        onSelect(nd.getFullYear() + '-' + String(nd.getMonth() + 1).padStart(2, '0') + '-01');
    };
    const nextMonth = () => {
        const nd = new Date(year, month + 1, 1);
        onSelect(nd.getFullYear() + '-' + String(nd.getMonth() + 1).padStart(2, '0') + '-01');
    };
    const monthName = d.toLocaleString('default', { month: 'long' });
    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <button onClick={prevMonth} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 cursor-pointer font-bold">&lt;</button>
                <span className="text-sm font-bold text-gray-700">{monthName} {year}</span>
                <button onClick={nextMonth} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 cursor-pointer font-bold">&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-[10px] font-bold text-gray-400">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {cells.map((day, idx) => {
                    if (!day) return <div key={'e' + idx} />;
                    const cellDate = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
                    const isSelected = cellDate === date;
                    const isToday = cellDate === today;
                    const isFuture = cellDate > today;
                    return (
                        <button key={day}
                            onClick={() => !isFuture && onSelect(cellDate)}
                            disabled={isFuture}
                            title={isFuture ? 'Cannot select future date' : ''}
                            className={`w-7 h-7 rounded-full text-xs font-semibold mx-auto flex items-center justify-center ${
                                isFuture
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : isSelected
                                        ? 'bg-green-500 text-white shadow-sm cursor-pointer'
                                        : isToday
                                            ? 'bg-green-100 text-green-700 font-bold cursor-pointer hover:bg-green-200'
                                            : 'text-gray-600 hover:bg-gray-100 cursor-pointer transition'
                            }`}>
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const TeacherSnapshots = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [records, setRecords] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [noteModal, setNoteModal] = useState(null);
    const [noteText, setNoteText] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const todayStr = new Date().toISOString().split('T')[0];

    // Filters local input states
    const [filterCourse, setFilterCourse] = useState('All');
    const [filterSection, setFilterSection] = useState('All');
    const [searchTermInput, setSearchTermInput] = useState('');

    // Filters active applied states
    const [activeCourse, setActiveCourse] = useState('All');
    const [activeSection, setActiveSection] = useState('All');
    const [activeSearch, setActiveSearch] = useState('');

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get('/api/users/teacher-students');
            setStudents(data);
        } catch (err) {
            toast.error('Failed to load students');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStudents(); }, []);

    useEffect(() => {
        if (!students.length) return;
        const init = {};
        students.forEach(s => {
            const existing = s.studentProfile?.physicalAttendance?.find(a => a.date === attendanceDate);
            init[s._id] = {
                status: existing?.status || 'Present',
                note: existing?.teacherNote || ''
            };
        });
        setRecords(init);
    }, [students, attendanceDate]);

    // Unique sections and courses list extracted dynamically
    const coursesList = useMemo(() => {
        const unique = new Set();
        students.forEach(s => {
            if (s.studentProfile?.course?.name) {
                unique.add(s.studentProfile.course.name);
            }
        });
        return Array.from(unique);
    }, [students]);

    const sectionsList = useMemo(() => {
        const unique = new Set();
        students.forEach(s => {
            if (s.studentProfile?.section) {
                unique.add(s.studentProfile.section);
            }
        });
        return Array.from(unique).sort();
    }, [students]);

    const handleSearchClick = () => {
        setActiveCourse(filterCourse);
        setActiveSection(filterSection);
        setActiveSearch(searchTermInput);
    };

    // Filter students by active course/section/search criteria
    const filtered = useMemo(() => {
        const list = students.filter(s => {
            const courseName = s.studentProfile?.course?.name || '';
            const sectionName = s.studentProfile?.section || '';
            
            const matchCourse = activeCourse === 'All' || courseName === activeCourse;
            const matchSection = activeSection === 'All' || sectionName === activeSection;
            const matchSearch = !activeSearch ||
                s.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
                (s.email && s.email.toLowerCase().includes(activeSearch.toLowerCase())) ||
                (s.studentProfile?.rollNumber && s.studentProfile.rollNumber.toLowerCase().includes(activeSearch.toLowerCase()));
            
            return matchCourse && matchSection && matchSearch;
        });
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [students, activeCourse, activeSection, activeSearch]);

    const stats = useMemo(() => {
        // Calculate stats only for active filtered students
        const filteredIds = new Set(filtered.map(s => s._id));
        const vals = Object.entries(records)
            .filter(([id]) => filteredIds.has(id))
            .map(([, data]) => data);
            
        return {
            total: filtered.length,
            present: vals.filter(r => r.status === 'Present' || r.status === 'In').length,
            absent:  vals.filter(r => r.status === 'Absent').length,
            leave:   vals.filter(r => r.status === 'Leave').length,
            holiday: vals.filter(r => r.status === 'Holiday').length,
        };
    }, [records, filtered]);

    const setStatus = (id, status) =>
        setRecords(prev => ({ ...prev, [id]: { ...prev[id], status } }));

    const markAll = (status) =>
        setRecords(prev => {
            const u = { ...prev };
            filtered.forEach(s => { u[s._id] = { ...u[s._id], status }; });
            return u;
        });

    const openNoteModal = (id) => {
        setNoteText(records[id]?.note || '');
        setNoteModal(id);
    };

    const saveNote = async () => {
        try {
            const currentStatus = records[noteModal]?.status || 'Absent';
            await axios.post(`/api/users/${noteModal}/physical-attendance`, {
                date: attendanceDate,
                status: currentStatus,
                teacherNote: noteText
            });
            setRecords(prev => ({ ...prev, [noteModal]: { ...prev[noteModal], note: noteText } }));
            toast.success('Note saved successfully!');
            setNoteModal(null);
            setNoteText('');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save note');
        }
    };

    const handleSave = async () => {
        if (attendanceDate > todayStr) {
            toast.error('Cannot mark attendance for a future date');
            return;
        }
        try {
            setSubmitting(true);
            const attendanceRecords = Object.entries(records).map(([studentId, data]) => ({
                studentId,
                status: data.status,
                note: data.note
            }));
            await axios.post('/api/users/bulk-physical-attendance', {
                date: attendanceDate,
                attendanceRecords
            });
            toast.success(`Attendance saved for ${attendanceDate}!`);
            await fetchStudents();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save attendance');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <DashboardLayout role="Teacher" fullWidth={true}>
            <LoadingPlaceholder type="dashboard" />
        </DashboardLayout>
    );

    return (
        <DashboardLayout role="Teacher" fullWidth={true}>
            <div className="max-w-7xl mx-auto pb-12 space-y-5 font-sans">

                {/* Header */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm px-7 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2.5">
                            <UserCheck className="text-indigo-600" size={24} />
                            Attendance Register
                        </h1>
                        <p className="text-slate-400 text-sm mt-0.5">Mark daily attendance for all students in your class</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={() => navigate('/teacher/attendance')}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-black transition shadow-md shadow-emerald-100 cursor-pointer"
                        >
                            <QrCode size={15} />
                            QR Attendance
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={submitting}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black transition shadow-md shadow-indigo-100 disabled:opacity-60 cursor-pointer"
                        >
                            <Save size={15} />
                            {submitting ? 'Saving...' : 'Save Register'}
                        </button>
                    </div>
                </div>

                {/* Two-Column Page Content */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left Column: Calendar Picker */}
                    <div className="lg:col-span-4 space-y-5">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Calendar size={13} /> Select Date
                        </h3>
                        <CalendarPicker selectedDate={attendanceDate} onChange={setAttendanceDate} />
                        
                        {/* Selected Date Summary Display */}
                        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 text-center space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Date</p>
                            <p className="text-lg font-black text-indigo-750">
                                {new Date(attendanceDate + 'T00:00:00').toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Students List & Filter Bar */}
                    <div className="lg:col-span-8 space-y-5">
                        
                        {/* Search and filter toolbar */}
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-wrap gap-4 items-end">
                            
                            {/* Section select - flexible */}
                            <div className="space-y-1.5 w-24 shrink-0">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Section</label>
                                <select
                                    value={filterSection}
                                    onChange={e => setFilterSection(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-750 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition cursor-pointer"
                                >
                                    <option value="All">All</option>
                                    {sectionsList.map(sec => (
                                        <option key={sec} value={sec}>{sec}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Course select - flexible */}
                            <div className="space-y-1.5 flex-1 min-w-[150px]">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Course</label>
                                <select
                                    value={filterCourse}
                                    onChange={e => setFilterCourse(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-755 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition cursor-pointer"
                                >
                                    <option value="All">All Courses</option>
                                    {coursesList.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Text Search - flexible */}
                            <div className="space-y-1.5 flex-1 min-w-[200px]">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Search</label>
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                    <input
                                        type="text"
                                        placeholder="Search by name or ID..."
                                        value={searchTermInput}
                                        onChange={e => setSearchTermInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSearchClick(); }}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 text-sm font-semibold text-slate-700 transition"
                                    />
                                </div>
                            </div>

                            {/* Search Button - Icon only */}
                            <button
                                onClick={handleSearchClick}
                                className="h-[42px] w-[42px] flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition shadow-md shadow-emerald-100 cursor-pointer shrink-0"
                                title="Search"
                             >
                                <Search size={18} />
                            </button>
                        </div>

                        {/* Stats mini bar */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                { label: 'Present', count: stats.present, bg: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
                                { label: 'Absent',  count: stats.absent,  bg: 'bg-rose-500',    light: 'bg-rose-50 border-rose-100',       text: 'text-rose-700',    icon: XCircle },
                                { label: 'Leave',   count: stats.leave,   bg: 'bg-amber-500',   light: 'bg-amber-50 border-amber-100',     text: 'text-amber-700',   icon: FileText },
                                { label: 'Holiday', count: stats.holiday, bg: 'bg-blue-500',    light: 'bg-blue-50 border-blue-100',       text: 'text-blue-700',    icon: Sun },
                            ].map(({ label, count, bg, light, text, icon: Icon }) => (
                                <div key={label} className={`${light} border rounded-2xl px-5 py-4 flex items-center gap-4`}>
                                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                                        <Icon size={18} className="text-white" />
                                    </div>
                                    <div>
                                        <p className={`text-3xl font-black ${text} leading-none`}>{count}</p>
                                        <p className="text-xs text-slate-500 font-bold mt-0.5">{label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Table Card */}
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                            {/* Toolbar: Bulk mark choices */}
                            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between">
                                <p className="text-xs font-black text-slate-440 uppercase tracking-widest">
                                    Results: {filtered.length} Students
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                    {[
                                        { label: 'All Present', status: 'Present', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' },
                                        { label: 'All Absent',  status: 'Absent',  cls: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' },
                                        { label: 'All Leave',   status: 'Leave',   cls: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
                                        { label: 'All Holiday', status: 'Holiday', cls: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
                                    ].map(({ label, status, cls }) => (
                                        <button
                                            key={status}
                                            onClick={() => markAll(status)}
                                            className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition cursor-pointer ${cls}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {!filtered.length ? (
                                <div className="text-center py-16 text-slate-450">
                                    <Users size={36} className="mx-auto mb-2.5 opacity-25" />
                                    <p className="text-sm font-bold text-slate-500">No students match your filter criteria</p>
                                    <p className="text-xs text-slate-400 mt-1">Try resetting the Course or Section selection</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 border-b border-slate-150 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                <th className="py-4 px-6">Roll No</th>
                                                <th className="py-4 px-6">Student Info</th>
                                                {['Present', 'Absent', 'Leave', 'Holiday'].map(st => (
                                                    <th key={st} className="py-4 px-3 text-center w-20">{st}</th>
                                                ))}
                                                <th className="py-4 px-5 text-center w-20">Note</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filtered.map((s, index) => {
                                                const rec = records[s._id] || { status: 'Absent', note: '' };
                                                const roll = index + 1;
                                                
                                                return (
                                                    <tr key={s._id} className="hover:bg-slate-50/30 transition">
                                                        <td className="py-4 px-6 text-xs font-black text-slate-450">{roll}</td>
                                                        <td className="py-4 px-6">
                                                            <div className="flex flex-col min-w-0">
                                                                <button
                                                                    onClick={() => setSelectedStudentId(s._id)}
                                                                    className="text-sm font-black text-slate-800 hover:text-indigo-650 transition text-left cursor-pointer outline-none"
                                                                >
                                                                    {s.name}
                                                                </button>
                                                                <p className="text-xs text-slate-400 leading-tight mt-0.5 truncate">{s.email}</p>
                                                             </div>
                                                        </td>

                                                        {['Present', 'Absent', 'Leave', 'Holiday'].map(st => (
                                                            <td key={st} className="py-4 px-3 text-center">
                                                                <button
                                                                    onClick={() => setStatus(s._id, st)}
                                                                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mx-auto transition-all cursor-pointer ${
                                                                        rec.status === st
                                                                            ? st === 'Present'  ? 'border-emerald-500 bg-emerald-500 shadow-lg shadow-emerald-100 scale-110'
                                                                            : st === 'Absent'   ? 'border-rose-500 bg-rose-500 shadow-lg shadow-rose-100 scale-110'
                                                                            : st === 'Leave'    ? 'border-amber-500 bg-amber-500 shadow-lg shadow-amber-100 scale-110'
                                                                                                : 'border-blue-500 bg-blue-500 shadow-lg shadow-blue-100 scale-110'
                                                                            : 'border-slate-200 bg-white hover:border-slate-400'
                                                                    }`}
                                                                >
                                                                    {rec.status === st && <div className="w-3 h-3 rounded-full bg-white" />}
                                                                </button>
                                                            </td>
                                                        ))}

                                                        <td className="py-4 px-5 text-center">
                                                            <button
                                                                onClick={() => { setNoteModal(s._id); setNoteText(rec.note || ''); }}
                                                                title="Add teacher note"
                                                                className={`w-8 h-8 rounded-xl border flex items-center justify-center mx-auto transition cursor-pointer ${
                                                                    rec.note
                                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                                                                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-655'
                                                                }`}
                                                            >
                                                                <FileText size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Bottom Save bar */}
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <p className="text-xs text-slate-400 font-semibold">
                                    {attendanceDate} · {filtered.length} students showing
                                </p>
                                <button
                                    onClick={handleSave}
                                    disabled={submitting}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black transition shadow-md shadow-indigo-100 disabled:opacity-60 cursor-pointer"
                                >
                                    <Save size={15} />
                                    {submitting ? 'Saving...' : 'Save Register'}
                                </button>
                            </div>
                        </div>                    </div>
                </div>
            </div>

            {/* Teacher Note Modal */}
            {noteModal && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={e => { if (e.target === e.currentTarget) setNoteModal(null); }}
                >
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6">
                        <h3 className="font-bold text-slate-800 text-base mb-1 flex items-center gap-2">
                            <FileText size={17} className="text-indigo-500" /> Teacher Note
                        </h3>
                        <p className="text-slate-400 text-xs mb-4">
                            {students.find(s => s._id === noteModal)?.name} — {attendanceDate}
                        </p>
                        <textarea
                            autoFocus
                            rows={4}
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            placeholder="e.g. Medical leave approved, arrived late..."
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 resize-none outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                        />
                        <div className="flex gap-3 justify-end mt-4">
                            <button onClick={() => setNoteModal(null)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer">
                                Cancel
                            </button>
                            <button onClick={saveNote}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm">
                                Save Note
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Student Attendance Detail Modal */}
            {selectedStudentId && (
                <StudentAttendanceDetailModal
                    studentId={selectedStudentId}
                    onClose={() => setSelectedStudentId(null)}
                    onDataChange={fetchStudents}
                />
            )}
        </DashboardLayout>
    );
};

export default TeacherSnapshots;