import { useAuth } from '../../context/AuthContext';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
    Search, CheckCircle, Users, XCircle,
    Save, FileText, Sun, Calendar,
    ChevronLeft, ChevronRight, History, Bell
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';
import StaffAttendanceDetailModal from '../../components/common/StaffAttendanceDetailModal';
import { createPortal } from 'react-dom';

// ─── Custom Calendar Picker Component ──────────────────────────────────────────
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
                        ? 'text-slate-350 font-normal cursor-not-allowed'
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
                {daysOfWeek.map(d => (
                    <div key={d} className="text-[10px] font-black text-slate-450 uppercase tracking-wider py-1">
                        {d}
                    </div>
                ))}
                {dayCells}
            </div>
        </div>
    );
};

// ─── Custom Time Picker Popover ───────────────────────────────────────────────
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
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-slate-200 rounded-3xl shadow-2xl p-4 z-[9999] min-w-[220px] text-slate-700">
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
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-sm font-bold outline-none cursor-pointer"
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
                        className="flex-1 py-1.5 text-xs font-bold text-slate-550 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
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

// ─── Main Register Component ──────────────────────────────────────────────────
const InstituteStaffAttendance = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [records, setRecords] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [bulkPresentModal, setBulkPresentModal] = useState(false);
    const [bulkCheckIn, setBulkCheckIn] = useState('09:00');
    const [bulkCheckOut, setBulkCheckOut] = useState('17:00');
    const [selectedStaffId, setSelectedStaffId] = useState(null);
    const todayStr = new Date().toISOString().split('T')[0];

    const [showDatePicker, setShowDatePicker] = useState(false);
    const datePickerRef = useRef(null);

    // Filters local input states
    const [searchTermInput, setSearchTermInput] = useState('');
    const [pageSizeInput, setPageSizeInput] = useState('10');
    const pageSize = Math.max(1, parseInt(pageSizeInput, 10) || 10);
    const [currentPage, setCurrentPage] = useState(1);

    // Filters active applied states
    const [activeSearch, setActiveSearch] = useState('');

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
                setShowDatePicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchStaff = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('authToken');
            const { data } = await axios.get('/api/users?role=Staff', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStaffList(Array.isArray(data) ? data : data.users || []);
        } catch (err) {
            toast.error('Failed to load staff list');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    useEffect(() => {
        if (!staffList.length) return;
        const init = {};
        staffList.forEach(s => {
            const existing = s.staffProfile?.physicalAttendance?.find(a => a.date === attendanceDate);
            init[s._id] = {
                status: existing ? (existing.status || 'Present') : 'Absent',
                note: existing?.teacherNote || existing?.leaveNote || '',
                checkInTime: existing?.checkInTime || '',
                checkOutTime: existing?.checkOutTime || '',
                source: existing?.source || 'manual',
                markedBy: existing?.markedBy || ''
            };
        });
        setRecords(init);
    }, [staffList, attendanceDate]);

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

    const handleSearchClick = () => {
        setActiveSearch(searchTermInput);
        setCurrentPage(1);
    };

    // Filter staff list
    const allFiltered = useMemo(() => {
        return staffList.filter(s => {
            const matchSearch = !activeSearch ||
                s.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
                (s.email && s.email.toLowerCase().includes(activeSearch.toLowerCase()));
            return matchSearch;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [staffList, activeSearch]);

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, allFiltered.length);
    const displayedItems = useMemo(() => {
        return allFiltered.slice(startIndex, endIndex);
    }, [allFiltered, startIndex, endIndex]);

    const totalPages = Math.ceil(allFiltered.length / pageSize);

    const stats = useMemo(() => {
        const filteredIds = new Set(allFiltered.map(s => s._id));
        const vals = Object.entries(records)
            .filter(([id]) => filteredIds.has(id))
            .map(([, data]) => data);
            
        return {
            total: allFiltered.length,
            present: vals.filter(r => r.status === 'Present').length,
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
            const token = localStorage.getItem('authToken');
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
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Staff attendance saved for ${attendanceDate}!`);
            await fetchStaff();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save attendance');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DashboardLayout role="Institute" fullWidth={true}>
            <div className="space-y-6">
                
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-tr from-emerald-450 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100 shrink-0">
                            <Users size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">Staff Attendance Register</h1>
                            <p className="text-xs text-slate-400 font-bold mt-1.5">Mark and manage daily physical attendance logs for all office and lab staff</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                        {/* Select Date Popover Button */}
                        <div className="relative" ref={datePickerRef}>
                            <button
                                type="button"
                                onClick={() => setShowDatePicker(!showDatePicker)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 rounded-2xl text-sm font-black transition shadow-sm cursor-pointer"
                            >
                                <Calendar size={15} className="text-indigo-650" />
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

                        <button
                            onClick={handleSave}
                            disabled={submitting}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black transition shadow-md shadow-indigo-100 disabled:opacity-60 cursor-pointer"
                        >
                            <Save size={15} />
                            {submitting ? 'Saving...' : 'Save Register'}
                        </button>
                    </div>
                </div>

                {/* Main Search and filters */}
                <div className="space-y-5">
                    
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-wrap gap-4 items-end animate-fade-in">
                        {/* Text Search */}
                        <div className="space-y-1.5 flex-1 min-w-[200px]">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Search Staff</label>
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchTermInput}
                                    onChange={e => setSearchTermInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSearchClick(); }}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 text-sm font-semibold text-slate-700 transition"
                                />
                            </div>
                        </div>

                        {/* Show Entries */}
                        <div className="space-y-1.5 flex-1 min-w-[120px] max-w-[200px]">
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
                            className="h-[42px] w-[42px] flex items-center justify-center bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl transition shadow-md shadow-indigo-100 cursor-pointer shrink-0 outline-none"
                            title="Filter List"
                         >
                            <Search size={18} />
                        </button>
                    </div>

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in">
                        {[
                            { label: 'Present', count: stats.present, bg: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
                            { label: 'Absent',  count: stats.absent,  bg: 'bg-rose-500',    light: 'bg-rose-50 border-rose-100',       text: 'text-rose-700',    icon: XCircle },
                            { label: 'Leave',   count: stats.leave,   bg: 'bg-amber-500',   light: 'bg-amber-50 border-amber-100',     text: 'text-amber-700',   icon: FileText },
                            { label: 'Holiday', count: stats.holiday, bg: 'bg-blue-500',    light: 'bg-blue-50 border-blue-100',       text: 'text-blue-700',    icon: Sun },
                        ].map(({ label, count, bg, light, text, icon: Icon }) => (
                            <div key={label} className={`${light} border rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm`}>
                                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0 shadow-sm`}>
                                    <Icon size={18} className="text-white" />
                                </div>
                                <div>
                                    <p className={`text-3xl font-black ${text} leading-none`}>{count}</p>
                                    <p className="text-xs text-slate-500 font-bold mt-0.5">{label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Checklist Table Grid */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                        {/* Toolbar: Bulk Operations */}
                        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                Results: {allFiltered.length} Staff Members
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

                        {loading ? (
                            <div className="text-center py-20 text-slate-400 font-bold">
                                <div className="w-8 h-8 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                Fetching Register Data...
                            </div>
                        ) : !allFiltered.length ? (
                            <div className="text-center py-16 text-slate-450">
                                <Users size={36} className="mx-auto mb-2.5 opacity-25" />
                                <p className="text-sm font-bold text-slate-500">No staff members found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[1100px]">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-150 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                            <th className="py-4 px-6 w-16">No</th>
                                            <th className="py-4 px-6 w-64">Staff Info</th>
                                            <th className="py-4 px-6 w-48">Designation & Department</th>
                                            <th className="py-4 px-3 text-center w-36">Check-In</th>
                                            <th className="py-4 px-3 text-center w-36">Check-Out</th>
                                            <th className="py-4 px-3 text-center w-28">Mode</th>
                                            <th className="py-4 px-3 text-center w-36">Marked By</th>
                                            <th className="py-4 px-3 text-center w-32">Status</th>
                                            <th className="py-4 px-5 text-left w-60">Admin / Leave Note</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {displayedItems.map((s, index) => {
                                            const rec = records[s._id] || {
                                                status: 'Present',
                                                note: '',
                                                checkInTime: '',
                                                checkOutTime: '',
                                                source: 'manual',
                                                markedBy: ''
                                            };
                                            const no = startIndex + index + 1;
                                            
                                            return (
                                                <tr key={s._id} className="hover:bg-slate-50/30 transition">
                                                    <td className="py-4 px-6 text-xs font-black text-slate-450">{no}</td>
                                                    <td className="py-4 px-6">
                                                        {(() => {
                                                            const hasPendingLeaveOverall = s.staffProfile?.physicalAttendance?.some(a => a.status === 'Leave' && a.leaveStatus === 'Pending');
                                                            const hasPendingLeaveToday = s.staffProfile?.physicalAttendance?.some(a => a.date === attendanceDate && a.status === 'Leave' && a.leaveStatus === 'Pending');
                                                            return (
                                                                <div className="flex items-center gap-3">
                                                                    <div className="relative">
                                                                        <button
                                                                            onClick={() => setSelectedStaffId(s._id)}
                                                                            title="View history log"
                                                                            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm border border-slate-200 cursor-pointer hover:ring-2 hover:ring-indigo-300 transition"
                                                                        >
                                                                            {s.name?.[0]?.toUpperCase() || '?'}
                                                                        </button>
                                                                        {hasPendingLeaveOverall && (
                                                                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-white animate-pulse" title="Has pending leave request" />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex flex-col min-w-0">
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <button
                                                                                onClick={() => setSelectedStaffId(s._id)}
                                                                                className="text-sm font-black text-slate-800 hover:text-indigo-650 transition text-left cursor-pointer outline-none"
                                                                            >
                                                                                {s.name}
                                                                            </button>
                                                                            {hasPendingLeaveToday && (
                                                                                <button
                                                                                    onClick={() => setSelectedStaffId(s._id)}
                                                                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold border border-rose-200 hover:bg-rose-200 transition cursor-pointer"
                                                                                    title="Pending leave on this date – click to review"
                                                                                >
                                                                                    <Bell size={8} className="animate-pulse" />
                                                                                    Leave Applied
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-slate-400 leading-none mt-1 truncate">{s.email}</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="py-4 px-6 text-xs font-bold text-slate-500">
                                                        {s.staffProfile?.designation || 'Staff'} • {s.staffProfile?.department || 'LMS'}
                                                    </td>

                                                    {/* Check-In */}
                                                    <td className="py-4 px-3 text-center">
                                                        <CustomTimePicker
                                                            value={rec.checkInTime || ''}
                                                            onChange={val => handleTimeChange(s._id, 'checkInTime', val)}
                                                        />
                                                    </td>

                                                    {/* Check-Out */}
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
                                                            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-600 outline-none cursor-pointer focus:border-indigo-400 transition"
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
                                                            placeholder="e.g. Admin"
                                                            onChange={e => setRecords(prev => ({
                                                                ...prev,
                                                                [s._id]: { ...prev[s._id], markedBy: e.target.value }
                                                            }))}
                                                            className="w-28 text-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 transition"
                                                        />
                                                    </td>

                                                    {/* Status */}
                                                    <td className="py-4 px-3 text-center">
                                                        <select
                                                            value={rec.status}
                                                            onChange={e => setStatus(s._id, e.target.value)}
                                                            className={`font-black text-xs px-2.5 py-1.5 rounded-xl border cursor-pointer outline-none transition w-28 ${
                                                                rec.status === 'Present'
                                                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                                                    : rec.status === 'Absent'
                                                                        ? 'bg-rose-50 border-rose-100 text-rose-700'
                                                                        : rec.status === 'Leave'
                                                                            ? 'bg-amber-50 border-amber-100 text-amber-700'
                                                                            : 'bg-blue-50 border-blue-100 text-blue-700'
                                                            }`}
                                                        >
                                                            <option value="Present">Present</option>
                                                            <option value="Absent">Absent</option>
                                                            <option value="Leave">Leave</option>
                                                            <option value="Holiday">Holiday</option>
                                                        </select>
                                                    </td>

                                                    {/* Notes */}
                                                    <td className="py-4 px-5">
                                                        <input
                                                            type="text"
                                                            value={rec.note || ''}
                                                            placeholder="Add remark..."
                                                            onChange={e => setRecords(prev => ({
                                                                ...prev,
                                                                [s._id]: { ...prev[s._id], note: e.target.value }
                                                            }))}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 transition"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination footer */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">
                                    Showing {startIndex + 1} to {endIndex} of {allFiltered.length} entries
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                        className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-50 transition cursor-pointer"
                                    >
                                        Previous
                                    </button>
                                    <span className="px-3.5 py-1.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-black text-slate-700">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                        className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-50 transition cursor-pointer"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Save register bottom sticky button */}
                <div className="flex justify-end pt-2">
                    <button
                        onClick={handleSave}
                        disabled={submitting}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black transition shadow-lg shadow-indigo-100 disabled:opacity-60 cursor-pointer"
                    >
                        <Save size={16} />
                        {submitting ? 'Saving Register...' : 'Save Register'}
                    </button>
                </div>
            </div>

            {/* Bulk Time Options Modal */}
            {bulkPresentModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
                        <h3 className="text-base font-black text-slate-800">Bulk Mark Present</h3>
                        <p className="text-xs font-bold text-slate-400 leading-relaxed">Specify default check-in and check-out times to apply to all selected staff members.</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block ml-1">Check-In</label>
                                <input
                                    type="time"
                                    value={bulkCheckIn}
                                    onChange={e => setBulkCheckIn(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none text-slate-700"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-455 uppercase tracking-wider block ml-1">Check-Out</label>
                                <input
                                    type="time"
                                    value={bulkCheckOut}
                                    onChange={e => setBulkCheckOut(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none text-slate-700"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setBulkPresentModal(false)}
                                className="flex-1 py-2.5 text-xs font-bold text-slate-650 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={applyBulkPresent}
                                className="flex-1 py-2.5 text-xs font-black text-white bg-indigo-650 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-100 cursor-pointer"
                            >
                                Apply Times
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Staff Attendance History Modal */}
            {selectedStaffId && createPortal(
                <StaffAttendanceDetailModal
                    staffId={selectedStaffId}
                    onClose={() => setSelectedStaffId(null)}
                    onDataChange={fetchStaff}
                />,
                document.body
            )}
        </DashboardLayout>
    );
};

export default InstituteStaffAttendance;
