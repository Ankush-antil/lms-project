import { useAuth } from '../../context/AuthContext';
import React, { useEffect, useState, useMemo, useRef } from 'react';
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
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xl space-y-4">
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
                {months && daysOfWeek.map(d => (
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

// Custom Time Picker Component
const TimePickerPopover = ({ value, onChange, onClose }) => {
    let initialHr = '09';
    let initialMin = '00';
    let initialPeriod = 'AM';
    if (value) {
        const [h24, m] = value.split(':');
        const hNum = parseInt(h24, 10);
        initialMin = m || '00';
        if (hNum >= 12) {
            initialPeriod = 'PM';
            initialHr = hNum === 12 ? '12' : String(hNum - 12).padStart(2, '0');
        } else {
            initialPeriod = 'AM';
            initialHr = hNum === 0 ? '12' : String(hNum).padStart(2, '0');
        }
    }

    const [hr, setHr] = useState(initialHr);
    const [min, setMin] = useState(initialMin);
    const [period, setPeriod] = useState(initialPeriod);

    const handleOk = () => {
        let hNum = parseInt(hr, 10);
        if (period === 'PM' && hNum < 12) hNum += 12;
        if (period === 'AM' && hNum === 12) hNum = 0;
        const formattedTime = `${String(hNum).padStart(2, '0')}:${min}`;
        onChange(formattedTime);
        onClose();
    };

    const handleClear = () => {
        onChange('');
        onClose();
    };

    return (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-slate-200 rounded-3xl shadow-2xl p-4 z-[9999] min-w-[220px] text-slate-700 animate-fade-in">
            <div className="flex gap-2 justify-center items-center mb-4">
                <select 
                    value={hr} 
                    onChange={e => setHr(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-sm font-bold outline-none cursor-pointer"
                >
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                        <option key={h} value={h}>{h}</option>
                    ))}
                </select>

                <span className="font-bold text-slate-400">:</span>

                <select 
                    value={min} 
                    onChange={e => setMin(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-sm font-bold outline-none cursor-pointer max-h-40"
                >
                    {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>

                <select 
                    value={period} 
                    onChange={e => setPeriod(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-sm font-bold outline-none cursor-pointer"
                >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                </select>
            </div>

            <div className="flex flex-col gap-1.5">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleOk}
                        className="flex-1 py-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-100 cursor-pointer"
                    >
                        OK
                    </button>
                </div>
                <button
                    type="button"
                    onClick={handleClear}
                    className="w-full py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-100 transition cursor-pointer"
                >
                    Not Confirmed
                </button>
            </div>
        </div>
    );
};

const CustomTimePicker = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    let displayStr = 'Not Confirmed';
    if (value) {
        const [h24, m] = value.split(':');
        const hNum = parseInt(h24, 10);
        const min = m || '00';
        if (hNum >= 12) {
            const h12 = hNum === 12 ? 12 : hNum - 12;
            displayStr = `${String(h12).padStart(2, '0')}:${min} PM`;
        } else {
            const h12 = hNum === 0 ? 12 : hNum;
            displayStr = `${String(h12).padStart(2, '0')}:${min} AM`;
        }
    }

    return (
        <div className="relative inline-block" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`px-3 py-1.5 text-xs font-bold border rounded-xl transition cursor-pointer w-28 text-center outline-none ${
                    value 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold hover:bg-indigo-100'
                        : 'bg-slate-50 border-slate-200 text-slate-400 placeholder:font-bold hover:bg-slate-100'
                }`}
            >
                {displayStr}
            </button>
            {isOpen && (
                <TimePickerPopover 
                    value={value} 
                    onChange={onChange} 
                    onClose={() => setIsOpen(false)} 
                />
            )}
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
    const [bulkPresentModal, setBulkPresentModal] = useState(false);
    const [bulkCheckIn, setBulkCheckIn] = useState('09:00');
    const [bulkCheckOut, setBulkCheckOut] = useState('17:00');
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const todayStr = new Date().toISOString().split('T')[0];

    const [showDatePicker, setShowDatePicker] = useState(false);
    const datePickerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
                setShowDatePicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filters local input states
    const [filterCourse, setFilterCourse] = useState('All');
    const [filterSection, setFilterSection] = useState('All');
    const [searchTermInput, setSearchTermInput] = useState('');
    const [pageSizeInput, setPageSizeInput] = useState('10');
    const pageSize = Math.max(1, parseInt(pageSizeInput, 10) || 10);
    const [currentPage, setCurrentPage] = useState(1);

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
                status: existing ? (existing.status || 'Present') : 'Absent',
                note: existing?.teacherNote || '',
                studentNote: existing?.leaveNote || '',
                checkInTime: existing?.checkInTime || '',
                checkOutTime: existing?.checkOutTime || '',
                source: existing?.source || 'manual',
                markedBy: existing?.markedBy || ''
            };
        });
        setRecords(init);
    }, [students, attendanceDate]);

    const handleTimeChange = (id, field, value) => {
        setRecords(prev => {
            const currentRec = prev[id] || {
                status: 'Absent',
                note: '',
                checkInTime: '',
                checkOutTime: '',
                source: 'manual',
                markedBy: ''
            };
            const updatedRec = { ...currentRec, [field]: value };
            
            if (!updatedRec.checkInTime && !updatedRec.checkOutTime) {
                updatedRec.status = 'Absent';
            } else {
                updatedRec.status = 'Present';
            }
            
            return { ...prev, [id]: updatedRec };
        });
    };

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
        setCurrentPage(1);
    };

    // Filter students by active course/section/search criteria
    const allFiltered = useMemo(() => {
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
        }).sort((a, b) => a.name.localeCompare(b.name));

        return list;
    }, [students, activeCourse, activeSection, activeSearch]);

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, allFiltered.length);
    const displayedItems = useMemo(() => {
        return allFiltered.slice(startIndex, endIndex);
    }, [allFiltered, startIndex, endIndex]);

    const totalPages = Math.ceil(allFiltered.length / pageSize);

    const stats = useMemo(() => {
        // Calculate stats only for active filtered students
        const filteredIds = new Set(allFiltered.map(s => s._id));
        const vals = Object.entries(records)
            .filter(([id]) => filteredIds.has(id))
            .map(([, data]) => data);
            
        return {
            total: allFiltered.length,
            present: vals.filter(r => r.status === 'Present' || r.status === 'In').length,
            absent:  vals.filter(r => r.status === 'Absent').length,
            leave:   vals.filter(r => r.status === 'Leave').length,
            holiday: vals.filter(r => r.status === 'Holiday').length,
        };
    }, [records, allFiltered]);

    const setStatus = (id, status) =>
        setRecords(prev => ({ ...prev, [id]: { ...prev[id], status } }));

    const markAll = (status) =>
        setRecords(prev => {
            const u = { ...prev };
            displayedItems.forEach(s => {
                u[s._id] = {
                    ...u[s._id],
                    status,
                    checkInTime: '',
                    checkOutTime: ''
                };
            });
            return u;
        });

    const applyBulkPresent = () => {
        setRecords(prev => {
            const u = { ...prev };
            displayedItems.forEach(s => {
                u[s._id] = {
                    ...u[s._id],
                    status: 'Present',
                    checkInTime: bulkCheckIn,
                    checkOutTime: bulkCheckOut
                };
            });
            return u;
        });
        setBulkPresentModal(false);
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
                note: data.note,
                checkInTime: data.checkInTime,
                checkOutTime: data.checkOutTime,
                source: data.source,
                markedBy: data.markedBy
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

    const controls = user?.teacherProfile?.controls;

    const resolveSubNote = (subKey) => {
        if (!controls || !controls.snapshots) return '';
        const sn = controls.snapshots;
        if (sn.subNotes && sn.subNotes[subKey]) return sn.subNotes[subKey];
        return sn.note || '';
    };

    const isSubDisabled = (subKey) => {
        if (!controls || !controls.snapshots) return false;
        if (controls.snapshots.enabled === false) return true;
        return controls.snapshots[subKey] === false;
    };

    const getSubMode = () => {
        return controls?.snapshots?.mode || 'hide';
    };

    if (loading) return (
        <DashboardLayout role="Teacher" fullWidth={true}>
            <LoadingPlaceholder type="dashboard" />
        </DashboardLayout>
    );

    if (controls?.snapshots?.enabled === false) {
        return (
            <DashboardLayout role="Teacher" collapsed={false}>
                <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white/60 backdrop-blur-xl border border-slate-100 rounded-[32px] text-center shadow-xl shadow-slate-100/50 max-w-2xl mx-auto my-12 relative overflow-hidden group">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500"></div>
                    <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <XCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Feature Deactivated</h2>
                    <p className="text-sm font-bold text-slate-500 max-w-md mb-6 leading-relaxed">
                        {controls.snapshots.note || 'This page has been deactivated by your administrator. Please contact support if you require access.'}
                    </p>
                </div>
            </DashboardLayout>
        );
    }

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
                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                        {/* Select Date Dropdown Button */}
                        <div className="relative" ref={datePickerRef}>
                            <button
                                type="button"
                                onClick={() => setShowDatePicker(!showDatePicker)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 rounded-2xl text-sm font-black transition shadow-sm cursor-pointer"
                            >
                                <Calendar size={15} className="text-indigo-600" />
                                <span>
                                    {new Date(attendanceDate + 'T00:00:00').toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </span>
                            </button>
                            {showDatePicker && (
                                <div className="absolute right-0 top-full mt-2 z-50 min-w-[280px]">
                                    <CalendarPicker selectedDate={attendanceDate} onChange={(d) => { setAttendanceDate(d); setShowDatePicker(false); }} />
                                </div>
                            )}
                        </div>

                        {(!isSubDisabled('qrAttendance') || getSubMode() === 'disable') && (
                            <button
                                disabled={isSubDisabled('qrAttendance')}
                                onClick={isSubDisabled('qrAttendance') ? () => toast.error(resolveSubNote('qrAttendance') || 'Feature Restricted') : () => navigate('/teacher/attendance')}
                                title={isSubDisabled('qrAttendance') ? (resolveSubNote('qrAttendance') || 'Feature Restricted') : undefined}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black transition shadow-md ${
                                    isSubDisabled('qrAttendance')
                                        ? 'bg-slate-100 border border-slate-200 text-slate-400 opacity-60 cursor-not-allowed shadow-none'
                                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-100 cursor-pointer'
                                }`}
                            >
                                <QrCode size={15} />
                                QR Attendance
                            </button>
                        )}
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

                {/* Full Width Page Content */}
                <div className="space-y-5">
                        
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

                            {/* Entries limit input */}
                            <div className="space-y-1.5 flex-1 min-w-[120px]">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Show Entries</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={pageSizeInput}
                                    onChange={e => {
                                        setPageSizeInput(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition text-center"
                                />
                            </div>

                            {/* Search Button */}
                            <button
                                onClick={handleSearchClick}
                                className="h-[42px] w-[42px] flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-md shadow-indigo-100 cursor-pointer shrink-0 outline-none"
                                title="Show Students"
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
                                    Results: {allFiltered.length} Students
                                </p>
                                <div className="flex gap-2 flex-wrap items-center">
                                    <select
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val) {
                                                setRecords(prev => {
                                                    const u = { ...prev };
                                                    displayedItems.forEach(s => {
                                                        u[s._id] = { ...u[s._id], source: val };
                                                    });
                                                    return u;
                                                });
                                                e.target.value = '';
                                            }
                                        }}
                                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 outline-none cursor-pointer hover:border-slate-300 hover:bg-slate-100 transition"
                                    >
                                        <option value="">Set All Mode</option>
                                        <option value="manual">Manual</option>
                                        <option value="qr">QR Scan</option>
                                        <option value="biometric">Biometric</option>
                                    </select>

                                    <input
                                        type="text"
                                        placeholder="Set All Marked By..."
                                        onChange={e => {
                                            const val = e.target.value;
                                            setRecords(prev => {
                                                const u = { ...prev };
                                                displayedItems.forEach(s => {
                                                    u[s._id] = { ...u[s._id], markedBy: val };
                                                });
                                                return u;
                                            });
                                        }}
                                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none w-40 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition placeholder:text-slate-400 placeholder:font-bold"
                                    />

                                    {[
                                        { label: 'All Present', status: 'Present', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' },
                                        { label: 'All Absent',  status: 'Absent',  cls: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' },
                                        { label: 'All Leave',   status: 'Leave',   cls: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
                                        { label: 'All Holiday', status: 'Holiday', cls: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
                                    ].map(({ label, status, cls }) => (
                                        <button
                                            key={status}
                                            onClick={() => {
                                                if (status === 'Present') {
                                                    setBulkPresentModal(true);
                                                } else {
                                                    markAll(status);
                                                }
                                            }}
                                            className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition cursor-pointer ${cls}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {!allFiltered.length ? (
                                <div className="text-center py-16 text-slate-450">
                                    <Users size={36} className="mx-auto mb-2.5 opacity-25" />
                                    <p className="text-sm font-bold text-slate-500">No students match your filter criteria</p>
                                    <p className="text-xs text-slate-400 mt-1">Try resetting the Course or Section selection</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[1100px]">
                                        <thead>
                                            <tr className="bg-slate-50/50 border-b border-slate-150 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                <th className="py-4 px-6">Roll No</th>
                                                <th className="py-4 px-6">Student Info</th>
                                                <th className="py-4 px-3 text-center">Check-In</th>
                                                <th className="py-4 px-3 text-center">Check-Out</th>
                                                <th className="py-4 px-3 text-center">Mode</th>
                                                <th className="py-4 px-3 text-center">Marked By</th>
                                                <th className="py-4 px-3 text-center w-28">Status</th>
                                                <th className="py-4 px-3 text-left">Student Note</th>
                                                <th className="py-4 px-3 text-left w-48">Teacher Note</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {displayedItems.map((s, index) => {
                                                const rec = records[s._id] || {
                                                    status: 'Absent',
                                                    note: '',
                                                    studentNote: '',
                                                    checkInTime: '',
                                                    checkOutTime: '',
                                                    source: 'manual',
                                                    markedBy: ''
                                                };
                                                const roll = startIndex + index + 1;
                                                
                                                return (
                                                    <tr key={s._id} className="hover:bg-slate-50/30 transition">
                                                        <td className="py-4 px-6 text-xs font-black text-slate-455">{roll}</td>
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

                                                        {/* Check-In Time */}
                                                        <td className="py-4 px-3 text-center">
                                                            <CustomTimePicker
                                                                value={rec.checkInTime || ''}
                                                                onChange={val => handleTimeChange(s._id, 'checkInTime', val)}
                                                            />
                                                        </td>

                                                        {/* Check-Out Time */}
                                                        <td className="py-4 px-3 text-center">
                                                            <CustomTimePicker
                                                                value={rec.checkOutTime || ''}
                                                                onChange={val => handleTimeChange(s._id, 'checkOutTime', val)}
                                                            />
                                                        </td>

                                                        {/* Mode */}
                                                        <td className="py-4 px-3 text-center">
                                                            <select
                                                                value={rec.source || 'manual'}
                                                                onChange={e => setRecords(prev => ({
                                                                    ...prev,
                                                                    [s._id]: { ...prev[s._id], source: e.target.value }
                                                                }))}
                                                                className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-[11px] font-bold focus:border-indigo-400 outline-none transition cursor-pointer"
                                                            >
                                                                <option value="manual">Manual</option>
                                                                <option value="qr">QR Scan</option>
                                                                <option value="biometric">Biometric</option>
                                                            </select>
                                                        </td>

                                                        {/* Marked By */}
                                                        <td className="py-4 px-3 text-center">
                                                            <input
                                                                type="text"
                                                                value={rec.markedBy || ''}
                                                                placeholder="e.g. Teacher"
                                                                onChange={e => setRecords(prev => ({
                                                                    ...prev,
                                                                    [s._id]: { ...prev[s._id], markedBy: e.target.value }
                                                                }))}
                                                                className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold focus:border-indigo-400 outline-none w-28 text-center transition"
                                                            />
                                                        </td>

                                                        {/* Status */}
                                                        <td className="py-4 px-3 text-center">
                                                            <select
                                                                value={rec.status || 'Present'}
                                                                onChange={e => setRecords(prev => ({
                                                                    ...prev,
                                                                    [s._id]: { ...prev[s._id], status: e.target.value }
                                                                }))}
                                                                className={`border-2 rounded-xl px-2 py-1.5 text-xs font-black outline-none transition cursor-pointer ${
                                                                    rec.status === 'Present' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' :
                                                                    rec.status === 'Absent' ? 'border-rose-500 bg-rose-50 text-rose-700' :
                                                                    rec.status === 'Leave' ? 'border-amber-500 bg-amber-50 text-amber-700' :
                                                                    'border-blue-500 bg-blue-50 text-blue-700'
                                                                }`}
                                                            >
                                                                <option value="Present">Present</option>
                                                                <option value="Absent">Absent</option>
                                                                <option value="Leave">Leave</option>
                                                                <option value="Holiday">Holiday</option>
                                                            </select>
                                                        </td>

                                                        {/* Student Note */}
                                                        <td className="py-4 px-3 text-xs text-slate-500 font-bold max-w-[120px] truncate" title={rec.studentNote || ''}>
                                                            {rec.studentNote || '—'}
                                                        </td>

                                                        {/* Teacher Note */}
                                                        <td className="py-4 px-3 text-left">
                                                            <input
                                                                type="text"
                                                                placeholder="Teacher Note..."
                                                                value={rec.note || ''}
                                                                onChange={e => setRecords(prev => ({
                                                                    ...prev,
                                                                    [s._id]: { ...prev[s._id], note: e.target.value }
                                                                }))}
                                                                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none w-44 text-left transition placeholder:text-slate-350"
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Pagination Controls */}
                            {allFiltered.length > 0 && (
                                <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/10">
                                    <p className="text-xs text-slate-400 font-bold">
                                        Showing {allFiltered.length === 0 ? 0 : startIndex + 1} to {endIndex} of {allFiltered.length} entries
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-black text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                                        >
                                            Previous
                                        </button>
                                        
                                        {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                                            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                            .map((p, index, arr) => {
                                                const showEllipsis = index > 0 && p - arr[index - 1] > 1;
                                                return (
                                                    <React.Fragment key={p}>
                                                        {showEllipsis && <span className="text-slate-400 text-xs px-1 font-bold">...</span>}
                                                        <button
                                                            onClick={() => setCurrentPage(p)}
                                                            className={`w-8 h-8 rounded-full text-xs font-bold transition cursor-pointer ${
                                                                currentPage === p
                                                                    ? 'bg-indigo-650 text-white font-black shadow-md shadow-indigo-150'
                                                                    : 'text-slate-650 hover:bg-slate-100'
                                                            }`}
                                                        >
                                                            {p}
                                                        </button>
                                                    </React.Fragment>
                                                );
                                            })
                                        }

                                        <button
                                            disabled={currentPage === totalPages || totalPages === 0}
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-black text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Bottom Save bar */}
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <p className="text-xs text-slate-400 font-semibold">
                                    {attendanceDate} · {allFiltered.length} students showing
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
                        </div>
                    </div>
                </div>

            {/* Bulk Present Modal */}
            {bulkPresentModal && (
                <div
                    className="fixed inset-0 z-[9999] flex items-start justify-center pt-24 bg-black/45 backdrop-blur-sm"
                    onClick={e => { if (e.target === e.currentTarget) setBulkPresentModal(false); }}
                >
                    <div className="bg-white rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-sm p-6 overflow-hidden relative group">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                        <h3 className="font-black text-slate-800 text-lg mb-1 flex items-center gap-2">
                            Set Check-In & Check-Out Times
                        </h3>
                        <p className="text-slate-400 text-xs mb-6 font-bold">
                            Marking all students as Present. Please set their default check-in and check-out times:
                        </p>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Check-In Time</label>
                                <input
                                    type="time"
                                    value={bulkCheckIn}
                                    onChange={e => setBulkCheckIn(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Check-Out Time</label>
                                <input
                                    type="time"
                                    value={bulkCheckOut}
                                    onChange={e => setBulkCheckOut(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setBulkPresentModal(false)}
                                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-black transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={applyBulkPresent}
                                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-black transition cursor-pointer shadow-md shadow-emerald-100"
                            >
                                Apply to All
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