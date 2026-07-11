import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
    Users, Search, UserPlus, X, Eye, EyeOff, Calendar, DollarSign,
    CheckSquare, Plus, Check, Clock, AlertCircle, Trash2, Pencil,
    UserCheck, History, Save, ChevronLeft, ChevronRight, FileText, Sun,
    CheckCircle, XCircle, Bell, Send, Shield, ShieldCheck, ShieldX, ShieldAlert,
    AlertTriangle, PauseCircle, TrendingUp
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import StaffAttendanceDetailModal from '../../components/common/StaffAttendanceDetailModal';

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
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${isFuture
                    ? 'text-slate-355 font-normal cursor-not-allowed'
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
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-slate-200 rounded-3xl shadow-2xl p-4 z-[9999] min-w-[220px] text-slate-750">
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
                        className="flex-1 py-1.5 text-xs font-bold text-slate-555 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
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
                className={`px-3 py-1.5 text-xs font-bold border rounded-xl transition cursor-pointer w-28 text-center outline-none ${value
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

const InstituteStaff = () => {
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('directory'); // directory, attendance, salary, task

    // Form & Edit state
    const [editingStaff, setEditingStaff] = useState(null); // null = Add, object = Edit
    const [form, setForm] = useState({ name: '', email: '', password: '', designation: '', department: '', minusPoints: '' });

    // Sub-modules state
    const [tasks, setTasks] = useState(() => {
        const stored = localStorage.getItem('staff_tasks');
        return stored ? JSON.parse(stored) : [];
    });

    useEffect(() => {
        localStorage.setItem('staff_tasks', JSON.stringify(tasks));
    }, [tasks]);

    const [minusPointsLogs, setMinusPointsLogs] = useState(() => {
        const stored = localStorage.getItem('staff_minus_points');
        return stored ? JSON.parse(stored) : [];
    });

    useEffect(() => {
        localStorage.setItem('staff_minus_points', JSON.stringify(minusPointsLogs));
    }, [minusPointsLogs]);


    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskModalMode, setTaskModalMode] = useState('add'); // 'add' or 'edit'
    const [taskModalStaff, setTaskModalStaff] = useState('');
    const [isStaffPreselected, setIsStaffPreselected] = useState(false);
    const [taskModalRows, setTaskModalRows] = useState([
        { title: '', description: '', priority: 'Medium', due: '', reminderTime: '', remark: '', valuation: '' },
        { title: '', description: '', priority: 'Medium', due: '', reminderTime: '', remark: '', valuation: '' }
    ]);
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [viewingTask, setViewingTask] = useState(null);
    const [viewEvidenceModalOpen, setViewEvidenceModalOpen] = useState(false);
    const [viewingEvidenceTask, setViewingEvidenceTask] = useState(null);
    const [selectedStaffTasks, setSelectedStaffTasks] = useState(null); // name of staff whose tasks we are previewing
    const [descPopupIndex, setDescPopupIndex] = useState(null); // index of row whose description is being edited
    const [descPopupText, setDescPopupText] = useState('');

    // Minus points modal states
    const [showMinusPointsModal, setShowMinusPointsModal] = useState(false);
    const [minusPointsStaff, setMinusPointsStaff] = useState('');
    const [minusPointsValue, setMinusPointsValue] = useState('');
    const [minusPointsReason, setMinusPointsReason] = useState('');
    const [submittingMinusPoints, setSubmittingMinusPoints] = useState(false);


    const [taskDateFilter, setTaskDateFilter] = useState('today'); // 'today', 'month', 'range', 'year', 'particular'
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterParticularDate, setFilterParticularDate] = useState('');
    const [taskVerificationFilter, setTaskVerificationFilter] = useState('');
    const [taskStatusFilter, setTaskStatusFilter] = useState(''); // pending, progress (inprogress), completed (done)

    const [previewDateFilter, setPreviewDateFilter] = useState('year'); // 'today', 'month', 'range', 'year', 'particular'
    const [previewStartDate, setPreviewStartDate] = useState('');
    const [previewEndDate, setPreviewEndDate] = useState('');
    const [previewParticularDate, setPreviewParticularDate] = useState('');
    const [previewVerificationFilter, setPreviewVerificationFilter] = useState('');
    const [previewStatusFilter, setPreviewStatusFilter] = useState('');

    // Separate filter for Self-Created section inside preview modal
    const [selfPreviewDateFilter, setSelfPreviewDateFilter] = useState('year');
    const [selfPreviewStartDate, setSelfPreviewStartDate] = useState('');
    const [selfPreviewEndDate, setSelfPreviewEndDate] = useState('');
    const [selfPreviewParticularDate, setSelfPreviewParticularDate] = useState('');
    const [selfPreviewVerificationFilter, setSelfPreviewVerificationFilter] = useState('');
    const [selfPreviewStatusFilter, setSelfPreviewStatusFilter] = useState('');

    const navigate = useNavigate();

    // Notifications bell states
    const [showNotificationsPopover, setShowNotificationsPopover] = useState(false);
    const notificationsBellRef = useRef(null);
    const [seenNotificationIds, setSeenNotificationIds] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('seen_task_notifications') || '[]');
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        if (showNotificationsPopover) {
            const pendingIds = tasks.filter(t => t.status === 'done' && (!t.verificationStatus || t.verificationStatus === 'under_verification')).map(t => t.id);
            const newSeen = Array.from(new Set([...seenNotificationIds, ...pendingIds]));
            setSeenNotificationIds(newSeen);
            localStorage.setItem('seen_task_notifications', JSON.stringify(newSeen));
        }
    }, [showNotificationsPopover, tasks]);

    // Staff attendance register states
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceRecords, setAttendanceRecords] = useState({});
    const [savingAttendance, setSavingAttendance] = useState(false);
    const [selectedStaffForAttendance, setSelectedStaffForAttendance] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const datePickerRef = useRef(null);
    const [bulkPresentModal, setBulkPresentModal] = useState(false);
    const [bulkCheckIn, setBulkCheckIn] = useState('09:00');
    const [bulkCheckOut, setBulkCheckOut] = useState('17:00');

    // Filters input and active states
    const [searchTermInput, setSearchTermInput] = useState('');
    const [pageSizeInput, setPageSizeInput] = useState('10');
    const [currentPage, setCurrentPage] = useState(1);
    const [filterDepartment, setFilterDepartment] = useState('All');
    const [filterDesignation, setFilterDesignation] = useState('All');

    const [activeSearch, setActiveSearch] = useState('');
    const [activeDepartment, setActiveDepartment] = useState('All');
    const [activeDesignation, setActiveDesignation] = useState('All');

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
                setShowDatePicker(false);
            }
            if (notificationsBellRef.current && !notificationsBellRef.current.contains(event.target)) {
                setShowNotificationsPopover(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Initialize attendance register when staff list or selected date changes
    useEffect(() => {
        if (!staffList.length) return;
        const init = {};
        staffList.forEach(s => {
            const existing = s.staffProfile?.physicalAttendance?.find(a => a.date === attendanceDate);
            init[s._id || s.name] = {
                status: existing ? (existing.status || 'Present') : 'Absent',
                note: existing?.teacherNote || existing?.leaveNote || '',
                checkInTime: existing?.checkInTime || '',
                checkOutTime: existing?.checkOutTime || '',
                source: existing?.source || 'manual',
                markedBy: existing?.markedBy || ''
            };
        });
        setAttendanceRecords(init);
    }, [staffList, attendanceDate]);

    const setStaffAttendanceStatus = (id, status) => {
        setAttendanceRecords(prev => ({
            ...prev,
            [id]: { ...prev[id], status }
        }));
    };

    const handleAttendanceTimeChange = (id, field, value) => {
        setAttendanceRecords(prev => {
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

    const markAllStaff = (status) => {
        setAttendanceRecords(prev => {
            const u = { ...prev };
            displayedStaffItems.forEach(s => {
                u[s._id || s.name] = {
                    ...u[s._id || s.name],
                    status,
                    checkInTime: '',
                    checkOutTime: ''
                };
            });
            return u;
        });
    };

    const applyBulkStaffPresent = () => {
        setAttendanceRecords(prev => {
            const u = { ...prev };
            displayedStaffItems.forEach(s => {
                u[s._id || s.name] = {
                    ...u[s._id || s.name],
                    status: 'Present',
                    checkInTime: bulkCheckIn,
                    checkOutTime: bulkCheckOut
                };
            });
            return u;
        });
        setBulkPresentModal(false);
    };

    const handleSearchClick = () => {
        setActiveSearch(searchTermInput);
        setActiveDepartment(filterDepartment);
        setActiveDesignation(filterDesignation);
        setCurrentPage(1);
    };

    const allFilteredStaff = useMemo(() => {
        return staffList.filter(s => {
            const matchSearch = !activeSearch ||
                s.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
                (s.email && s.email.toLowerCase().includes(activeSearch.toLowerCase()));

            const dept = s.staffProfile?.department || 'General';
            const desig = s.staffProfile?.designation || 'Staff';

            const matchDept = activeDepartment === 'All' || dept === activeDepartment;
            const matchDesig = activeDesignation === 'All' || desig === activeDesignation;

            return matchSearch && matchDept && matchDesig;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [staffList, activeSearch, activeDepartment, activeDesignation]);

    const pageSize = Math.min(10, Math.max(1, parseInt(pageSizeInput, 10) || 10));
    const startStaffIndex = (currentPage - 1) * pageSize;
    const endStaffIndex = Math.min(startStaffIndex + pageSize, allFilteredStaff.length);
    const displayedStaffItems = useMemo(() => {
        return allFilteredStaff.slice(startStaffIndex, endStaffIndex);
    }, [allFilteredStaff, startStaffIndex, endStaffIndex]);

    const totalStaffPages = Math.ceil(allFilteredStaff.length / pageSize);

    // Dynamic stats mapping
    const attendanceStats = useMemo(() => {
        const filteredIds = new Set(allFilteredStaff.map(s => s._id || s.name));
        const vals = Object.entries(attendanceRecords)
            .filter(([id]) => filteredIds.has(id))
            .map(([, data]) => data);

        return {
            total: allFilteredStaff.length,
            present: vals.filter(r => r.status === 'Present').length,
            absent: vals.filter(r => r.status === 'Absent').length,
            leave: vals.filter(r => r.status === 'Leave').length,
            holiday: vals.filter(r => r.status === 'Holiday').length,
        };
    }, [attendanceRecords, allFilteredStaff]);

    // Departments & Designations lists for dropdowns
    const departmentsList = useMemo(() => {
        const depts = new Set();
        staffList.forEach(s => {
            if (s.staffProfile?.department) depts.add(s.staffProfile.department);
        });
        return Array.from(depts);
    }, [staffList]);

    const designationsList = useMemo(() => {
        const desigs = new Set();
        staffList.forEach(s => {
            if (s.staffProfile?.designation) desigs.add(s.staffProfile.designation);
        });
        return Array.from(desigs);
    }, [staffList]);

    const handleSaveAttendance = async () => {
        try {
            setSavingAttendance(true);
            const token = localStorage.getItem('authToken');

            const dbRecords = [];
            const dummyRecords = {};

            Object.entries(attendanceRecords).forEach(([staffId, data]) => {
                if (staffId.startsWith('d')) {
                    dummyRecords[staffId] = data;
                } else {
                    dbRecords.push({
                        studentId: staffId, // bulk endpoint expects studentId as key for user ID
                        status: data.status,
                        note: data.note,
                        checkInTime: data.checkInTime,
                        checkOutTime: data.checkOutTime,
                        source: data.source,
                        markedBy: data.markedBy
                    });
                }
            });

            // Save database records via API
            if (dbRecords.length > 0) {
                await axios.post('/api/users/bulk-physical-attendance', {
                    date: attendanceDate,
                    attendanceRecords: dbRecords
                }, { headers: { Authorization: `Bearer ${token}` } });
            }

            // Save dummy records locally in state
            setStaffList(prev => prev.map(s => {
                if (s._id.startsWith('d') && dummyRecords[s._id]) {
                    const data = dummyRecords[s._id];
                    const existing = s.staffProfile?.physicalAttendance || [];
                    const existingIdx = existing.findIndex(a => a.date === attendanceDate);

                    const updatedRec = {
                        date: attendanceDate,
                        status: data.status,
                        teacherNote: data.note,
                        checkInTime: data.checkInTime,
                        checkOutTime: data.checkOutTime,
                        source: data.source
                    };

                    let newAttendance = [...existing];
                    if (existingIdx !== -1) {
                        newAttendance[existingIdx] = updatedRec;
                    } else {
                        newAttendance.push(updatedRec);
                    }

                    return {
                        ...s,
                        staffProfile: {
                            ...s.staffProfile,
                            physicalAttendance: newAttendance
                        }
                    };
                }
                return s;
            }));

            toast.success(`Staff attendance saved for ${attendanceDate}!`);
            fetchStaff();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save attendance');
        } finally {
            setSavingAttendance(false);
        }
    };

    const [salaryPayouts, setSalaryPayouts] = useState({
        'Ravi Kumar': 'Paid',
        'Sunita Sharma': 'Pending',
        'Mohit Verma': 'Paid'
    });

    const fetchStaff = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const { data } = await axios.get('/api/users?role=Staff', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const fetched = Array.isArray(data) ? data : data.users || [];
            setStaffList(fetched);
        } catch {
            setStaffList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStaff(); }, []);

    // Open Modal for Add
    const handleOpenAdd = () => {
        setEditingStaff(null);
        setForm({ name: '', email: '', password: '', designation: '', department: '', minusPoints: '' });
        setShowModal(true);
    };

    // Open Modal for Edit
    const handleOpenEdit = (staff) => {
        setEditingStaff(staff);
        setForm({
            name: staff.name || '',
            email: staff.email || '',
            password: '', // Keep password blank unless changing
            designation: staff.staffProfile?.designation || '',
            department: staff.staffProfile?.department || '',
            minusPoints: staff.staffProfile?.minusPoints !== undefined ? staff.staffProfile.minusPoints : 0
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email) {
            toast.error('Name and email are required');
            return;
        }
        if (!editingStaff && !form.password) {
            toast.error('Password is required to add new staff');
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('authToken');

            if (editingStaff) {
                if (editingStaff._id.startsWith('d')) {
                    // Update dummy staff locally in state
                    setStaffList(prev => prev.map(s => s._id === editingStaff._id ? {
                        ...s,
                        name: form.name,
                        email: form.email,
                        staffProfile: {
                            designation: form.designation,
                            department: form.department,
                            minusPoints: form.minusPoints !== '' ? Number(form.minusPoints) : 0
                        }
                    } : s));
                    toast.success('Staff member updated (Local)!');
                    setShowModal(false);
                    setForm({ name: '', email: '', password: '', designation: '', department: '', minusPoints: '' });
                    setEditingStaff(null);
                    setSubmitting(false);
                    return;
                }

                // Update existing database staff
                const updatePayload = {
                    name: form.name,
                    email: form.email,
                    staffProfile: {
                        designation: form.designation,
                        department: form.department,
                        minusPoints: form.minusPoints !== '' ? Number(form.minusPoints) : 0
                    }
                };
                if (form.password) {
                    updatePayload.password = form.password;
                }
                await axios.put(`/api/users/${editingStaff._id}`, updatePayload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Staff member updated!');
            } else {
                // Create new database staff
                await axios.post('/api/users', {
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    role: 'Staff',
                    staffProfile: {
                        designation: form.designation,
                        department: form.department,
                        minusPoints: form.minusPoints !== '' ? Number(form.minusPoints) : 0
                    }
                }, { headers: { Authorization: `Bearer ${token}` } });
                toast.success('Staff member added!');
            }

            setShowModal(false);
            setForm({ name: '', email: '', password: '', designation: '', department: '', minusPoints: '' });
            setEditingStaff(null);
            fetchStaff();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to save staff details');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteStaff = async (staffId) => {
        if (!window.confirm('Are you sure you want to delete this staff member?')) return;
        if (staffId.startsWith('d')) {
            // Delete dummy staff locally in state
            setStaffList(prev => prev.filter(s => s._id !== staffId));
            toast.success('Staff member deleted (Local)!');
            return;
        }
        try {
            const token = localStorage.getItem('authToken');
            await axios.delete(`/api/users/${staffId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Staff member deleted successfully!');
            fetchStaff();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to delete staff');
        }
    };

    const openAddTaskModal = (defaultStaffName = '') => {
        setTaskModalMode('add');
        const hasStaff = typeof defaultStaffName === 'string' && defaultStaffName !== '';
        setTaskModalStaff(hasStaff ? defaultStaffName : '');
        setIsStaffPreselected(hasStaff);
        setTaskModalRows([
            { title: '', description: '', priority: 'Medium', assignedDate: new Date().toISOString().split('T')[0], due: '', reminderTime: '', remark: '', valuation: '' },
            { title: '', description: '', priority: 'Medium', assignedDate: new Date().toISOString().split('T')[0], due: '', reminderTime: '', remark: '', valuation: '' }
        ]);
        setShowTaskModal(true);
    };

    const openEditTaskModal = (task) => {
        setTaskModalMode('edit');
        setTaskModalStaff(task.staffName);
        setIsStaffPreselected(true);
        setEditingTaskId(task.id);
        setTaskModalRows([
            {
                title: task.title,
                description: task.description || '',
                priority: task.priority || 'Medium',
                assignedDate: task.assignedDate || task.createdAt || new Date().toISOString().split('T')[0],
                due: task.due || '',
                reminderTime: task.reminderTime || '',
                remark: task.remark || '',
                valuation: task.valuation || ''
            }
        ]);
        setShowTaskModal(true);
    };

    const addTaskRow = () => {
        setTaskModalRows(prev => [
            ...prev,
            { title: '', description: '', priority: 'Medium', assignedDate: new Date().toISOString().split('T')[0], due: '', reminderTime: '', remark: '', valuation: '' }
        ]);
    };

    const removeTaskRow = (index) => {
        if (taskModalRows.length <= 1) {
            toast.error('At least one task row must remain.');
            return;
        }
        setTaskModalRows(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleRowChange = (index, field, val) => {
        setTaskModalRows(prev => prev.map((row, idx) => idx === index ? { ...row, [field]: val } : row));
    };

    const handleTaskModalSubmit = (e) => {
        e.preventDefault();
        if (!taskModalStaff) {
            toast.error('Please select a staff member to assign tasks.');
            return;
        }

        // Validate rows (filter out completely empty rows, but require title for semi-filled rows)
        const validRows = taskModalRows.filter(r => r.title.trim() !== '');

        if (validRows.length === 0) {
            toast.error('Please fill at least one task title.');
            return;
        }

        // Validate valuation is <= 10000
        for (const row of validRows) {
            if (row.valuation && (isNaN(row.valuation) || parseFloat(row.valuation) > 10000 || parseFloat(row.valuation) < 0)) {
                toast.error(`Valuation for "${row.title}" must be between 0 and 10,000!`);
                return;
            }
        }

        if (taskModalMode === 'add') {
            const newTasksList = validRows.map(row => ({
                id: Date.now() + Math.random(),
                staffName: taskModalStaff,
                title: row.title,
                description: row.description,
                priority: row.priority,
                assignedDate: row.assignedDate || new Date().toISOString().split('T')[0],
                due: row.due || new Date().toISOString().split('T')[0],
                reminderTime: row.reminderTime,
                remark: row.remark,
                valuation: row.valuation ? Number(row.valuation) : '',
                status: 'pending', // lowercase for kanban board compatibility
                createdAt: new Date().toISOString().split('T')[0]
            }));

            setTasks(prev => [...prev, ...newTasksList]);
            toast.success(`Assigned ${newTasksList.length} task(s) to ${taskModalStaff}!`);
        } else {
            // Edit mode (single task edited via row 0)
            const row = validRows[0];
            setTasks(prev => prev.map(t => t.id === editingTaskId ? {
                ...t,
                staffName: taskModalStaff,
                title: row.title,
                description: row.description,
                priority: row.priority,
                assignedDate: row.assignedDate || new Date().toISOString().split('T')[0],
                due: row.due || new Date().toISOString().split('T')[0],
                reminderTime: row.reminderTime,
                remark: row.remark,
                valuation: row.valuation ? Number(row.valuation) : '',
                createdAt: t.createdAt || new Date().toISOString().split('T')[0]
            } : t));
            toast.success('Task updated successfully!');
        }

        setShowTaskModal(false);
    };

    const handleAddMinusPoints = async (e) => {
        e.preventDefault();
        if (!minusPointsStaff) {
            toast.error('Please select a staff member.');
            return;
        }
        if (!minusPointsValue || Number(minusPointsValue) <= 0) {
            toast.error('Please enter a valid positive number for minus points.');
            return;
        }
        if (!minusPointsReason.trim()) {
            toast.error('Please enter a reason or remark.');
            return;
        }

        const staff = staffList.find(s => s._id === minusPointsStaff);
        if (!staff) {
            toast.error('Staff member not found.');
            return;
        }

        try {
            setSubmittingMinusPoints(true);
            const token = localStorage.getItem('token');
            const pointsToDeduct = Number(minusPointsValue);
            const currentTotal = staff.staffProfile?.minusPoints || 0;
            const newTotal = currentTotal + pointsToDeduct;

            // Update database user profile
            if (!staff._id.startsWith('d')) {
                await axios.put(`/api/users/${staff._id}`, {
                    staffProfile: {
                        ...staff.staffProfile,
                        minusPoints: newTotal
                    }
                }, { headers: { Authorization: `Bearer ${token}` } });
            }

            // Create log entry
            const newLog = {
                id: 'mp_' + Date.now(),
                staffId: staff._id,
                staffName: staff.name,
                points: pointsToDeduct,
                reason: minusPointsReason,
                date: new Date().toISOString().split('T')[0]
            };

            setMinusPointsLogs(prev => [newLog, ...prev]);
            toast.success(`Minus points successfully recorded for ${staff.name}!`);
            setShowMinusPointsModal(false);
            setMinusPointsStaff('');
            setMinusPointsValue('');
            setMinusPointsReason('');
            fetchStaff(); // Refresh staff list to update total points
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to record minus points');
        } finally {
            setSubmittingMinusPoints(false);
        }
    };

    const handleDeleteMinusPointsLog = async (logId) => {
        if (!window.confirm('Are you sure you want to delete this minus points entry? This will restore the points to the staff member.')) return;

        const log = minusPointsLogs.find(l => l.id === logId);
        if (!log) return;

        const staff = staffList.find(s => s._id === log.staffId);
        try {
            const token = localStorage.getItem('token');
            if (staff && !staff._id.startsWith('d')) {
                const currentTotal = staff.staffProfile?.minusPoints || 0;
                const newTotal = Math.max(0, currentTotal - log.points);
                await axios.put(`/api/users/${staff._id}`, {
                    staffProfile: {
                        ...staff.staffProfile,
                        minusPoints: newTotal
                    }
                }, { headers: { Authorization: `Bearer ${token}` } });
            }

            setMinusPointsLogs(prev => prev.filter(l => l.id !== logId));
            toast.success('Minus points entry deleted successfully.');
            fetchStaff(); // Refresh staff list
        } catch (err) {
            toast.error('Failed to update staff minus points.');
        }
    };


    const filtered = staffList.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase())
    );

    const displayList = filtered;

    return (
        <DashboardLayout role="Institute" fullWidth={true}>
            <div>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: '14px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Users size={22} color="#fff" />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>My Staff Portal</h1>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Manage your institute's staff, attendance, salaries, and tasks</p>
                        </div>
                    </div>

                    {activeTab === 'directory' && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{
                                    paddingLeft: 32, paddingRight: 14, paddingTop: 9, paddingBottom: 9,
                                    border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.8rem',
                                    fontWeight: 600, color: '#374151', background: '#fff', outline: 'none', fontFamily: 'inherit'
                                }} />
                            </div>
                            <button onClick={handleOpenAdd} style={{
                                display: 'flex', alignItems: 'center', gap: '7px',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                                border: 'none', borderRadius: '12px', padding: '9px 18px',
                                fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit'
                            }}>
                                <UserPlus size={15} /> Add Staff
                            </button>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', overflowX: 'auto' }}>
                    {[
                        { id: 'directory', label: 'Staff Directory', icon: Users },
                        { id: 'attendance', label: 'Attendance Management', icon: Calendar },
                        { id: 'salary', label: 'Salary & Payouts', icon: DollarSign },
                        { id: 'task', label: 'Task Assignments', icon: CheckSquare },
                        { id: 'minusPoints', label: 'Minus Points', icon: AlertTriangle },
                    ].map(t => {
                        const Icon = t.icon;
                        const isSel = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    borderRadius: '10px',
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                    border: 'none',
                                    background: isSel ? '#0f172a' : 'transparent',
                                    color: isSel ? '#fff' : '#64748b',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <Icon size={14} />
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab content routing */}
                {activeTab === 'directory' && (
                    <>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontWeight: 700 }}>Loading...</div>
                        ) : (
                            <div style={{ background: '#fff', borderRadius: '20px', overflow: 'hidden', border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                            {['#', 'Name', 'Email', 'Designation', 'Department', 'Minus Points', 'Status', 'Actions'].map(h => (
                                                <th key={h} style={{ padding: '13px 16px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                                            ))}
                                        </tr>
                                     </thead>
                                     <tbody>
                                         {displayList.length === 0 ? (
                                             <tr><td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>No staff found</td></tr>
                                         ) : displayList.map((s, i) => (
                                             <tr key={s._id || i} style={{ borderBottom: '1px solid #f8fafc' }}
                                                 onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                                 onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                 <td style={{ padding: '13px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8' }}>{i + 1}</td>
                                                 <td style={{ padding: '13px 16px' }}>
                                                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                         <div style={{ width: 32, height: 32, borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.78rem', fontWeight: 900 }}>
                                                             {s.name?.[0]?.toUpperCase() || '?'}
                                                         </div>
                                                         <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{s.name}</span>
                                                     </div>
                                                 </td>
                                                 <td style={{ padding: '13px 16px', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{s.email}</td>
                                                 <td style={{ padding: '13px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>{s.staffProfile?.designation || '—'}</td>
                                                 <td style={{ padding: '13px 16px', fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>{s.staffProfile?.department || '—'}</td>
                                                 <td style={{ padding: '13px 16px', fontSize: '0.78rem', fontWeight: 800, color: s.staffProfile?.minusPoints > 0 ? '#ef4444' : '#64748b' }}>
                                                     {s.staffProfile?.minusPoints !== undefined ? s.staffProfile.minusPoints : 0}
                                                 </td>
                                                 <td style={{ padding: '13px 16px' }}>
                                                    <span style={{ background: s.isActive !== false ? '#dcfce7' : '#fee2e2', color: s.isActive !== false ? '#16a34a' : '#dc2626', borderRadius: '999px', padding: '3px 10px', fontSize: '0.65rem', fontWeight: 900 }}>
                                                        {s.isActive !== false ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '13px 16px' }}>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            onClick={() => handleOpenEdit(s)}
                                                            title="Edit Details"
                                                            style={{ padding: '6px', border: 'none', background: '#f1f5f9', borderRadius: '8px', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <Pencil size={13} />
                                                        </button>
                                                        {s._id && (
                                                            <button
                                                                onClick={() => handleDeleteStaff(s._id)}
                                                                title="Delete Staff"
                                                                style={{ padding: '6px', border: 'none', background: '#fee2e2', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'attendance' && (
                    <div className="space-y-6">
                        {/* Attendance Top Controls */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div className="w-10 h-10 bg-gradient-to-tr from-emerald-450 to-emerald-600 rounded-xl flex items-center justify-center text-black shrink-0 shadow-md">
                                    <UserCheck size={18} />
                                </div>
                                <div className="ml-2">
                                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>Attendance Register</h3>
                                    <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>Mark daily staff attendance</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', itemsCenter: 'center', gap: '10px' }}>
                                <div className="relative" ref={datePickerRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowDatePicker(!showDatePicker)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 14px',
                                            border: '1.5px solid #e2e8f0',
                                            borderRadius: '12px',
                                            fontSize: '0.8rem',
                                            fontWeight: 800,
                                            background: '#fff',
                                            color: '#334155',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Calendar size={14} className="text-indigo-650" />
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
                                    onClick={handleSaveAttendance}
                                    disabled={savingAttendance}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '12px',
                                        padding: '9px 18px',
                                        fontSize: '0.8rem',
                                        fontWeight: 900,
                                        cursor: savingAttendance ? 'not-allowed' : 'pointer',
                                        opacity: savingAttendance ? 0.7 : 1,
                                        fontFamily: 'inherit'
                                    }}
                                >
                                    <Save size={14} />
                                    {savingAttendance ? 'Saving...' : 'Save Register'}
                                </button>
                            </div>
                        </div>

                        {/* Search and Filters box */}
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-wrap gap-4 items-end animate-fade-in">
                            <div className="space-y-1.5 flex-1 min-w-[150px]">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Department</label>
                                <select
                                    value={filterDepartment}
                                    onChange={e => setFilterDepartment(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-750 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition cursor-pointer"
                                >
                                    <option value="All">All Departments</option>
                                    {departmentsList.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5 flex-1 min-w-[150px]">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Designation</label>
                                <select
                                    value={filterDesignation}
                                    onChange={e => setFilterDesignation(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-750 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition cursor-pointer"
                                >
                                    <option value="All">All Designations</option>
                                    {designationsList.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>

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

                            <div className="space-y-1.5 flex-1 min-w-[80px] max-w-[120px]">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Show Entries (Max 10)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={pageSizeInput}
                                    onChange={e => {
                                        const val = Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 1));
                                        setPageSizeInput(String(val));
                                        setCurrentPage(1);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition text-center"
                                />
                            </div>

                            <button
                                onClick={handleSearchClick}
                                className="h-[42px] w-[42px] flex items-center justify-center bg-indigo-650 hover:bg-indigo-700 text-bg-indigo-700 hover:text-white rounded-xl transition shadow-md shadow-indigo-100 cursor-pointer shrink-0 outline-none"
                                title="Filter List"
                            >
                                <Search size={18} />
                            </button>
                        </div>

                        {/* Summary Counter Stats boxes */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in">
                            {[
                                { label: 'Present', count: attendanceStats.present, bg: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
                                { label: 'Absent', count: attendanceStats.absent, bg: 'bg-rose-500', light: 'bg-rose-50 border-rose-100', text: 'text-rose-700', icon: XCircle },
                                { label: 'Leave', count: attendanceStats.leave, bg: 'bg-amber-500', light: 'bg-amber-50 border-amber-100', text: 'text-amber-700', icon: FileText },
                                { label: 'Holiday', count: attendanceStats.holiday, bg: 'bg-blue-500', light: 'bg-blue-50 border-blue-100', text: 'text-blue-700', icon: Sun },
                            ].map(({ label, count, bg, light, text, icon: Icon }) => (
                                <div key={label} className={`${light} border rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm bg-white`}>
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

                        {/* Register checklist table card */}
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                            {/* Sub toolbar: bulking options */}
                            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                    Results: {allFilteredStaff.length} Staff Members
                                </p>
                                <div className="flex gap-2 flex-wrap items-center">
                                    <select
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val) {
                                                setAttendanceRecords(prev => {
                                                    const u = { ...prev };
                                                    displayedStaffItems.forEach(s => {
                                                        u[s._id || s.name] = { ...u[s._id || s.name], source: val };
                                                    });
                                                    return u;
                                                });
                                                e.target.value = '';
                                            }
                                        }}
                                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-650 outline-none cursor-pointer hover:border-slate-300 hover:bg-slate-100 transition"
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
                                            setAttendanceRecords(prev => {
                                                const u = { ...prev };
                                                displayedStaffItems.forEach(s => {
                                                    u[s._id || s.name] = { ...u[s._id || s.name], markedBy: val };
                                                });
                                                return u;
                                            });
                                        }}
                                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-705 outline-none w-40 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition placeholder:text-slate-400 placeholder:font-bold"
                                    />

                                    {[
                                        { label: 'All Present', status: 'Present', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' },
                                        { label: 'All Absent', status: 'Absent', cls: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' },
                                        { label: 'All Leave', status: 'Leave', cls: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
                                        { label: 'All Holiday', status: 'Holiday', cls: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
                                    ].map(({ label, status, cls }) => (
                                        <button
                                            key={status}
                                            onClick={() => {
                                                if (status === 'Present') {
                                                    setBulkPresentModal(true);
                                                } else {
                                                    markAllStaff(status);
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
                                <div className="text-center py-20 text-slate-400 font-bold bg-white rounded-3xl border border-slate-200 shadow-sm">
                                    <div className="w-8 h-8 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                    Loading Register Data...
                                </div>
                            ) : !allFilteredStaff.length ? (
                                <div className="text-center py-16 text-slate-455 bg-white rounded-3xl border border-slate-200 shadow-sm">
                                    <Users size={36} className="mx-auto mb-2.5 opacity-25" />
                                    <p className="text-sm font-bold text-slate-500">No staff members found</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto scrollbar-thin">
                                    <table className="w-full text-left border-collapse min-w-[1200px]">
                                        <thead>
                                            <tr className="bg-slate-50/50 border-b border-slate-150 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                                <th className="py-4 px-6 w-16 whitespace-nowrap">No</th>
                                                <th className="py-4 px-6 w-64 whitespace-nowrap">Staff Info</th>
                                                <th className="py-4 px-6 w-48 whitespace-nowrap">Designation & Department</th>
                                                <th className="py-4 px-3 text-center w-36 whitespace-nowrap">Check-In</th>
                                                <th className="py-4 px-3 text-center w-36 whitespace-nowrap">Check-Out</th>
                                                <th className="py-4 px-3 text-center w-28 whitespace-nowrap">Mode</th>
                                                <th className="py-4 px-3 text-center w-36 whitespace-nowrap">Marked By</th>
                                                <th className="py-4 px-3 text-center w-32 whitespace-nowrap">Status</th>
                                                <th className="py-4 px-5 text-left w-60 whitespace-nowrap">Admin / Leave Note</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {displayedStaffItems.map((s, index) => {
                                                const rec = attendanceRecords[s._id || s.name] || {
                                                    status: 'Present',
                                                    note: '',
                                                    checkInTime: '',
                                                    checkOutTime: '',
                                                    source: 'manual',
                                                    markedBy: ''
                                                };
                                                const no = startStaffIndex + index + 1;

                                                return (
                                                    <tr key={s._id || s.name} className="hover:bg-slate-50/30 transition whitespace-nowrap">
                                                        <td className="py-4 px-6 text-xs font-black text-slate-450 whitespace-nowrap">{no}</td>
                                                        <td className="py-4 px-6 whitespace-nowrap">
                                                            {(() => {
                                                                const hasPendingLeaveOverall = s.staffProfile?.physicalAttendance?.some(a => a.status === 'Leave' && a.leaveStatus === 'Pending');
                                                                const hasPendingLeaveToday = s.staffProfile?.physicalAttendance?.some(a => a.date === attendanceDate && a.status === 'Leave' && a.leaveStatus === 'Pending');
                                                                return (
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="relative">
                                                                            <button
                                                                                onClick={() => {
                                                                                    if (s._id.startsWith('d')) {
                                                                                        toast.error('Dummy staff records have no archive database logs');
                                                                                    } else {
                                                                                        setSelectedStaffForAttendance(s._id);
                                                                                    }
                                                                                }}
                                                                                title="View history log"
                                                                                className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-700 flex items-center justify-center font-bold overflow-hidden border border-slate-100 cursor-pointer hover:ring-2 hover:ring-indigo-300 transition"
                                                                            >
                                                                                {s.name[0]?.toUpperCase() || '?'}
                                                                            </button>
                                                                            {hasPendingLeaveOverall && (
                                                                                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-white animate-pulse" title="Has pending leave request" />
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                                <button
                                                                                    onClick={() => {
                                                                                        if (s._id.startsWith('d')) {
                                                                                            toast.error('Dummy staff records have no archive database logs');
                                                                                        } else {
                                                                                            setSelectedStaffForAttendance(s._id);
                                                                                        }
                                                                                    }}
                                                                                    className="font-black text-slate-800 text-sm hover:text-indigo-600 transition cursor-pointer text-left outline-none"
                                                                                >
                                                                                    {s.name}
                                                                                </button>
                                                                                {hasPendingLeaveToday && (
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            if (!s._id.startsWith('d')) setSelectedStaffForAttendance(s._id);
                                                                                        }}
                                                                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold border border-rose-200 hover:bg-rose-200 transition cursor-pointer"
                                                                                        title="Pending leave on this date – click to review"
                                                                                    >
                                                                                        <Bell size={8} className="animate-pulse" />
                                                                                        Leave Applied
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                            <div className="text-xs text-slate-400">{s.email}</div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="py-4 px-6 text-xs font-bold text-slate-500 whitespace-nowrap">
                                                            {s.staffProfile?.designation || 'Staff'} • {s.staffProfile?.department || 'LMS'}
                                                        </td>

                                                        {/* Check-In */}
                                                        <td className="py-4 px-3 text-center whitespace-nowrap">
                                                            <CustomTimePicker
                                                                value={rec.checkInTime || ''}
                                                                onChange={val => handleAttendanceTimeChange(s._id || s.name, 'checkInTime', val)}
                                                            />
                                                        </td>

                                                        {/* Check-Out */}
                                                        <td className="py-4 px-3 text-center whitespace-nowrap">
                                                            <CustomTimePicker
                                                                value={rec.checkOutTime || ''}
                                                                onChange={val => handleAttendanceTimeChange(s._id || s.name, 'checkOutTime', val)}
                                                            />
                                                        </td>

                                                        {/* Mode */}
                                                        <td className="py-4 px-3 text-center whitespace-nowrap">
                                                            <select
                                                                value={rec.source || 'manual'}
                                                                onChange={e => setAttendanceRecords(prev => ({
                                                                    ...prev,
                                                                    [s._id || s.name]: { ...prev[s._id || s.name], source: e.target.value }
                                                                }))}
                                                                className="bg-slate-55 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-600 outline-none cursor-pointer focus:border-indigo-400 transition"
                                                            >
                                                                <option value="manual">Manual</option>
                                                                <option value="qr">QR Scan</option>
                                                                <option value="biometric">Biometric</option>
                                                            </select>
                                                        </td>

                                                        {/* Marked By */}
                                                        <td className="py-4 px-3 text-center whitespace-nowrap">
                                                            <input
                                                                type="text"
                                                                value={rec.markedBy || ''}
                                                                placeholder="e.g. Admin"
                                                                onChange={e => setAttendanceRecords(prev => ({
                                                                    ...prev,
                                                                    [s._id || s.name]: { ...prev[s._id || s.name], markedBy: e.target.value }
                                                                }))}
                                                                className="w-28 text-center bg-slate-55 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-707 outline-none focus:border-indigo-400 transition"
                                                            />
                                                        </td>

                                                        {/* Status */}
                                                        <td className="py-4 px-3 text-center whitespace-nowrap">
                                                            <select
                                                                value={rec.status}
                                                                onChange={e => setStaffAttendanceStatus(s._id || s.name, e.target.value)}
                                                                className={`font-black text-xs px-2.5 py-1.5 rounded-xl border cursor-pointer outline-none transition w-28 ${rec.status === 'Present'
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

                                                        {/* Remarks */}
                                                        <td className="py-4 px-5 whitespace-nowrap">
                                                            <input
                                                                type="text"
                                                                value={rec.note || ''}
                                                                placeholder="Add remark..."
                                                                onChange={e => setAttendanceRecords(prev => ({
                                                                    ...prev,
                                                                    [s._id || s.name]: { ...prev[s._id || s.name], note: e.target.value }
                                                                }))}
                                                                className="w-full bg-slate-55 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 transition"
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
                            {totalStaffPages > 1 && (
                                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-505">
                                        Showing {startStaffIndex + 1} to {endStaffIndex} of {allFilteredStaff.length} entries
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                            className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-650 disabled:opacity-50 transition cursor-pointer"
                                        >
                                            Previous
                                        </button>
                                        <span className="px-3.5 py-1.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-black text-slate-700">
                                            {currentPage} / {totalStaffPages}
                                        </span>
                                        <button
                                            disabled={currentPage === totalStaffPages}
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                            className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-655 disabled:opacity-50 transition cursor-pointer"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Save Register bottom sticky button */}
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={handleSaveAttendance}
                                disabled={savingAttendance}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '12px 24px',
                                    fontSize: '0.85rem',
                                    fontWeight: 900,
                                    cursor: savingAttendance ? 'not-allowed' : 'pointer',
                                    opacity: savingAttendance ? 0.7 : 1,
                                    fontFamily: 'inherit'
                                }}
                            >
                                <Save size={16} />
                                {savingAttendance ? 'Saving Register...' : 'Save Register'}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'salary' && (
                    <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>Salary Processing (July 2026)</h3>
                            <button
                                onClick={() => {
                                    setSalaryPayouts(prev => {
                                        const updated = { ...prev };
                                        Object.keys(updated).forEach(k => { updated[k] = 'Paid'; });
                                        return updated;
                                    });
                                    toast.success('All salaries processed successfully!');
                                }}
                                style={{
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: '#fff', border: 'none', borderRadius: '10px',
                                    padding: '8px 16px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer'
                                }}
                            >
                                Process All Salaries
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {staffList.map(s => {
                                const status = salaryPayouts[s.name] || 'Pending';
                                return (
                                    <div key={s.name} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #f1f5f9', justifyContent: 'space-between' }}>
                                        <div>
                                            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{s.name}</p>
                                            <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>₹25,000 / month</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{
                                                background: status === 'Paid' ? '#dcfce7' : '#fffbeb',
                                                color: status === 'Paid' ? '#16a34a' : '#d97706',
                                                borderRadius: '999px', padding: '4px 12px',
                                                fontSize: '0.68rem', fontWeight: 900
                                            }}>{status}</span>
                                            {status === 'Pending' && (
                                                <button
                                                    onClick={() => {
                                                        setSalaryPayouts(prev => ({ ...prev, [s.name]: 'Paid' }));
                                                        toast.success(`Salary processed for ${s.name}`);
                                                    }}
                                                    style={{
                                                        background: '#0f172a', color: '#fff', border: 'none',
                                                        borderRadius: '8px', padding: '6px 12px', fontSize: '0.7rem',
                                                        fontWeight: 800, cursor: 'pointer'
                                                    }}
                                                >
                                                    Pay
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'task' && (
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Task Tab Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>Task Assignments</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Create, edit, and assign tasks to staff members with priorities and reminders.</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {/* Notification Bell */}
                                {(() => {
                                    const pendingNotifications = tasks.filter(t => t.status === 'done' && (!t.verificationStatus || t.verificationStatus === 'under_verification'));
                                    const unseenNotifications = pendingNotifications.filter(t => !seenNotificationIds.includes(t.id));
                                    return (
                                        <div ref={notificationsBellRef} style={{ position: 'relative' }}>
                                            <button
                                                type="button"
                                                onClick={() => setShowNotificationsPopover(!showNotificationsPopover)}
                                                title="View Task Completion Submissions"
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '12px',
                                                    border: '1.5px solid #cbd5e1',
                                                    background: '#fff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    color: unseenNotifications.length > 0 ? '#4f46e5' : '#64748b',
                                                    transition: 'all 0.2s',
                                                    position: 'relative'
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#4f46e5'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                            >
                                                <Bell size={18} />
                                                {unseenNotifications.length > 0 && (
                                                    <span style={{
                                                        position: 'absolute',
                                                        top: '-4px',
                                                        right: '-4px',
                                                        background: '#ef4444',
                                                        color: '#fff',
                                                        borderRadius: '50%',
                                                        width: '18px',
                                                        height: '18px',
                                                        fontSize: '0.62rem',
                                                        fontWeight: 900,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 0 0 2px #fff'
                                                    }}>
                                                        {unseenNotifications.length}
                                                    </span>
                                                )}
                                            </button>

                                            {/* Notifications Popover */}
                                            {showNotificationsPopover && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '110%',
                                                    right: 0,
                                                    background: '#fff',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '16px',
                                                    width: '320px',
                                                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                                                    zIndex: 9999,
                                                    padding: '12px 0',
                                                    textAlign: 'left'
                                                }}>
                                                    <div style={{ padding: '0 16px 8px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>Task Submissions</span>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 900, background: '#f5f3ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '10px' }}>
                                                            {pendingNotifications.length} New
                                                        </span>
                                                    </div>
                                                    <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                                                        {pendingNotifications.length === 0 ? (
                                                            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600 }}>
                                                                🔕 No new completed tasks to verify.
                                                            </div>
                                                        ) : (
                                                            pendingNotifications.map(n => (
                                                                <div
                                                                    key={n.id}
                                                                    onClick={() => {
                                                                        setShowNotificationsPopover(false);
                                                                        navigate(`/institute/staff-task-detail/${encodeURIComponent(n.staffName)}`);
                                                                    }}
                                                                    style={{
                                                                        padding: '10px 16px',
                                                                        borderBottom: '1px solid #f8fafc',
                                                                        cursor: 'pointer',
                                                                        transition: 'background 0.15s'
                                                                    }}
                                                                    onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
                                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                                >
                                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                                                        <div style={{ width: 24, height: 24, borderRadius: '6px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', flexShrink: 0, marginTop: '2px' }}>
                                                                            <CheckCircle size={13} />
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontSize: '0.75rem', fontWeight: 805, color: '#1e293b' }}>
                                                                                {n.staffName} completed:
                                                                            </div>
                                                                            <div style={{ fontSize: '0.72rem', fontWeight: 650, color: '#4f46e5', marginTop: '1px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '230px' }}>
                                                                                "{n.title}"
                                                                            </div>
                                                                            <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: '3px', fontWeight: 600 }}>
                                                                                Completed on {n.completedAt ? new Date(n.completedAt + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'recently'}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                <button
                                    onClick={openAddTaskModal}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '12px',
                                        padding: '10px 20px',
                                        fontSize: '0.8rem',
                                        fontWeight: 900,
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
                                    }}
                                >
                                    <Plus size={15} /> Add Task
                                </button>
                            </div>
                        </div>

                        {/* Premium Filter Toolbar */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            flexWrap: 'wrap',
                            background: '#f8fafc',
                            padding: '16px',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            marginBottom: '16px'
                        }}>
                            {/* Date Filter */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Date:</span>
                                <select
                                    value={taskDateFilter}
                                    onChange={e => setTaskDateFilter(e.target.value)}
                                    style={{ padding: '6px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 700, color: '#334155', background: '#fff', cursor: 'pointer', outline: 'none' }}
                                >
                                    <option value="today">Today</option>
                                    <option value="month">This Month</option>
                                    <option value="particular">Particular Date</option>
                                    <option value="range">Date Range</option>
                                    <option value="year">Complete Year</option>
                                </select>
                            </div>

                            {/* Conditionally Rendered Inputs */}
                            {taskDateFilter === 'particular' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="date"
                                        value={filterParticularDate}
                                        onChange={e => setFilterParticularDate(e.target.value)}
                                        style={{
                                            padding: '5px 10px',
                                            borderRadius: '8px',
                                            border: '1.5px solid #cbd5e1',
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            outline: 'none',
                                            color: '#334155'
                                        }}
                                    />
                                </div>
                            )}

                            {taskDateFilter === 'range' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <input
                                        type="date"
                                        value={filterStartDate}
                                        onChange={e => setFilterStartDate(e.target.value)}
                                        placeholder="From"
                                        style={{
                                            padding: '5px 10px',
                                            borderRadius: '8px',
                                            border: '1.5px solid #cbd5e1',
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            outline: 'none',
                                            color: '#334155'
                                        }}
                                    />
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>to</span>
                                    <input
                                        type="date"
                                        value={filterEndDate}
                                        onChange={e => setFilterEndDate(e.target.value)}
                                        placeholder="To"
                                        style={{
                                            padding: '5px 10px',
                                            borderRadius: '8px',
                                            border: '1.5px solid #cbd5e1',
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            outline: 'none',
                                            color: '#334155'
                                        }}
                                    />
                                </div>
                            )}

                            {/* Verification Filter */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Verification:</span>
                                <select
                                    value={taskVerificationFilter}
                                    onChange={e => setTaskVerificationFilter(e.target.value)}
                                    style={{ padding: '6px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 700, color: '#334155', background: '#fff', cursor: 'pointer', outline: 'none' }}
                                >
                                    <option value="">All Verifications</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="needs_revision">Needs Revision</option>
                                    <option value="under_verification">Under Verification</option>
                                    <option value="evidence_insufficient">Evidence Insufficient</option>
                                    <option value="on_hold">On Hold</option>
                                    <option value="escalated">Escalated</option>
                                </select>
                            </div>

                            {/* Status Filter */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Status:</span>
                                <select
                                    value={taskStatusFilter}
                                    onChange={e => setTaskStatusFilter(e.target.value)}
                                    style={{ padding: '6px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.75rem', fontWeight: 700, color: '#334155', background: '#fff', cursor: 'pointer', outline: 'none' }}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="inprogress">In Progress</option>
                                    <option value="done">Completed</option>
                                </select>
                            </div>
                        </div>

                        {/* Tasks Table */}
                        {staffList.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
                                👥 No staff members found.
                            </div>
                        ) : (
                            <div className="overflow-x-auto scrollbar-thin" style={{ borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                            <th className="py-3.5 px-5 w-16">Sr No.</th>
                                            <th className="py-3.5 px-5 w-48">Staff Name</th>
                                            <th className="py-3.5 px-5 text-center">Assigned Tasks</th>
                                            <th className="py-3.5 px-5 text-center">Not Assigned Tasks</th>
                                            <th className="py-3.5 px-5 text-center w-36">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {staffList.map((s, idx) => {
                                            const staffTasks = tasks.filter(t => t.staffName?.toLowerCase() === s.name?.toLowerCase());

                                            // Apply date range filter to active tasks list
                                            const filteredStaffTasks = staffTasks.filter(t => {
                                                const taskDate = t.createdAt || t.due || new Date().toISOString().split('T')[0];
                                                const todayStr = new Date().toISOString().split('T')[0];

                                                if (taskDateFilter === 'today') {
                                                    return taskDate === todayStr;
                                                }
                                                if (taskDateFilter === 'month') {
                                                    const currentMonthStr = todayStr.substring(0, 7);
                                                    return taskDate.startsWith(currentMonthStr);
                                                }
                                                if (taskDateFilter === 'range') {
                                                    if (!filterStartDate || !filterEndDate) return true;
                                                    return taskDate >= filterStartDate && taskDate <= filterEndDate;
                                                }
                                                if (taskDateFilter === 'particular') {
                                                    if (!filterParticularDate) return true;
                                                    return taskDate === filterParticularDate;
                                                }
                                                if (taskDateFilter === 'year') {
                                                    return true; // Complete Year / All Time
                                                }
                                                return true;
                                            });

                                            const assignedTasks = filteredStaffTasks.filter(t =>
                                                !t.isSelfCreated &&
                                                (taskVerificationFilter === '' || (t.verificationStatus || '') === taskVerificationFilter) &&
                                                (taskStatusFilter === '' || (t.status || 'pending') === taskStatusFilter)
                                            );
                                            const assPending = assignedTasks.filter(t => t.status === 'pending' || !t.status).length;
                                            const assInprogress = assignedTasks.filter(t => t.status === 'inprogress').length;
                                            const assCompleted = assignedTasks.filter(t => t.status === 'done').length;

                                            const selfTasks = filteredStaffTasks.filter(t =>
                                                t.isSelfCreated &&
                                                (taskVerificationFilter === '' || (t.verificationStatus || '') === taskVerificationFilter) &&
                                                (taskStatusFilter === '' || (t.status || 'pending') === taskStatusFilter)
                                            );
                                            const selfCompleted = selfTasks.length;

                                            return (
                                                <tr key={s._id || s.name} className="hover:bg-slate-50/30 transition">
                                                    <td className="py-4 px-5 text-xs font-black text-slate-450">{idx + 1}</td>
                                                    <td className="py-4 px-5">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ width: 26, height: 26, borderRadius: '6px', background: 'linear-gradient(135deg,#e0e7ff,#eef2ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', fontSize: '0.72rem', fontWeight: 900 }}>
                                                                {s.name?.[0]?.toUpperCase() || '?'}
                                                            </div>
                                                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>{s.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-5">
                                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                            <span title="Pending" style={{
                                                                background: assPending > 0 ? '#fee2e2' : '#f1f5f9',
                                                                color: assPending > 0 ? '#ef4444' : '#64748b',
                                                                border: `1.5px solid ${assPending > 0 ? '#fca5a5' : '#e2e8f0'}`,
                                                                borderRadius: '20px',
                                                                padding: '2px 8px',
                                                                fontSize: '0.68rem',
                                                                fontWeight: 900
                                                            }}>
                                                                Pending: {assPending}
                                                            </span>
                                                            <span title="In Progress" style={{
                                                                background: assInprogress > 0 ? '#fffbeb' : '#f1f5f9',
                                                                color: assInprogress > 0 ? '#d97706' : '#64748b',
                                                                border: `1.5px solid ${assInprogress > 0 ? '#fde68a' : '#e2e8f0'}`,
                                                                borderRadius: '20px',
                                                                padding: '2px 8px',
                                                                fontSize: '0.68rem',
                                                                fontWeight: 900
                                                            }}>
                                                                In Progress: {assInprogress}
                                                            </span>
                                                            <span title="Completed" style={{
                                                                background: assCompleted > 0 ? '#dcfce7' : '#f1f5f9',
                                                                color: assCompleted > 0 ? '#16a34a' : '#64748b',
                                                                border: `1.5px solid ${assCompleted > 0 ? '#86efac' : '#e2e8f0'}`,
                                                                borderRadius: '20px',
                                                                padding: '2px 8px',
                                                                fontSize: '0.68rem',
                                                                fontWeight: 900
                                                            }}>
                                                                Completed: {assCompleted}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-5">
                                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                            <span title="Completed" style={{
                                                                background: selfCompleted > 0 ? '#dcfce7' : '#f1f5f9',
                                                                color: selfCompleted > 0 ? '#16a34a' : '#64748b',
                                                                border: `1.5px solid ${selfCompleted > 0 ? '#86efac' : '#e2e8f0'}`,
                                                                borderRadius: '20px',
                                                                padding: '2px 8px',
                                                                fontSize: '0.68rem',
                                                                fontWeight: 900
                                                            }}>
                                                                Completed: {selfCompleted}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-5 text-center">
                                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                            {/* Add task button for this specific staff member */}
                                                            <button
                                                                onClick={() => openAddTaskModal(s.name)}
                                                                title={`Add task for ${s.name}`}
                                                                style={{ width: 32, height: 32, borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }}
                                                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.color = '#10b981'; e.currentTarget.style.background = '#ecfdf5'; }}
                                                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = '#fff'; }}
                                                            >
                                                                <Plus size={15} />
                                                            </button>
                                                            {/* Navigate to dedicated task detail page */}
                                                            <button
                                                                onClick={() => navigate(`/institute/staff-task-detail/${encodeURIComponent(s.name)}`)}
                                                                title="View all tasks for this staff"
                                                                style={{ width: 32, height: 32, borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }}
                                                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.background = '#f5f3ff'; }}
                                                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = '#fff'; }}
                                                            >
                                                                <Eye size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'minusPoints' && (
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>Minus Points Log History</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Deduct points from staff members for negative actions or performance reviews.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setMinusPointsStaff('');
                                    setMinusPointsValue('');
                                    setMinusPointsReason('');
                                    setShowMinusPointsModal(true);
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '7px',
                                    background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff',
                                    border: 'none', borderRadius: '12px', padding: '9px 18px',
                                    fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit'
                                }}
                            >
                                <Plus size={15} /> Add Minus Points
                            </button>
                        </div>

                        {minusPointsLogs.length === 0 ? (
                            <div style={{ padding: '48px', textAlign: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '24px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
                                ⚠️ No minus points logs recorded yet.
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto', border: '1px solid #fee2e2', borderRadius: '20px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ background: '#fff5f5', borderBottom: '1px solid #fee2e2', whiteSpace: 'nowrap' }}>
                                            <th style={{ padding: '12px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#991b1b', textTransform: 'uppercase' }}>#</th>
                                            <th style={{ padding: '12px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#991b1b', textTransform: 'uppercase' }}>Staff Name</th>
                                            <th style={{ padding: '12px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#991b1b', textTransform: 'uppercase' }}>Points Deducted</th>
                                            <th style={{ padding: '12px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#991b1b', textTransform: 'uppercase' }}>Reason / Remark</th>
                                            <th style={{ padding: '12px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#991b1b', textTransform: 'uppercase' }}>Date</th>
                                            <th style={{ padding: '12px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#991b1b', textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {minusPointsLogs.map((log, index) => (
                                            <tr key={log.id} style={{ borderBottom: '1px solid #fff5f5', background: index % 2 === 0 ? '#fff' : '#fff8f8' }}>
                                                <td style={{ padding: '12px 14px', fontSize: '0.78rem', fontWeight: 800, color: '#ef4444' }}>{index + 1}</td>
                                                <td style={{ padding: '12px 14px', fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{log.staffName}</td>
                                                <td style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 900, color: '#b91c1c' }}>
                                                    -{log.points} Points
                                                </td>
                                                <td style={{ padding: '12px 14px', fontSize: '0.78rem', color: '#4b5563', fontWeight: 650 }}>{log.reason}</td>
                                                <td style={{ padding: '12px 14px', fontSize: '0.72rem', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                    📅 {new Date(log.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => handleDeleteMinusPointsLog(log.id)}
                                                        title="Delete entry & refund points"
                                                        style={{ padding: '6px', border: 'none', background: '#fee2e2', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Add Minus Points Modal (Rendered globally using React Portal) */}
                {showMinusPointsModal && createPortal(
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '100px 20px 40px', overflowY: 'auto' }}>
                        <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '460px', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', margin: '0 auto', position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                                    Record Minus Points
                                </h2>
                                <button onClick={() => setShowMinusPointsModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <X size={16} style={{ color: '#64748b' }} />
                                </button>
                            </div>
                            <form onSubmit={handleAddMinusPoints} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginBottom: '5px' }}>Select Staff Member *</label>
                                    <select
                                        value={minusPointsStaff}
                                        onChange={e => setMinusPointsStaff(e.target.value)}
                                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff', cursor: 'pointer' }}
                                    >
                                        <option value="">-- Choose Staff member --</option>
                                        {staffList.map(s => (
                                            <option key={s._id} value={s._id}>{s.name} ({s.staffProfile?.designation || 'Staff'})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginBottom: '5px' }}>Minus Points to Deduct *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="e.g. 5"
                                        value={minusPointsValue}
                                        onChange={e => setMinusPointsValue(e.target.value)}
                                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginBottom: '5px' }}>Reason / Remark *</label>
                                    <textarea
                                        rows="3"
                                        placeholder="Reason for minus points deduction..."
                                        value={minusPointsReason}
                                        onChange={e => setMinusPointsReason(e.target.value)}
                                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
                                    />
                                </div>
                                <button type="submit" disabled={submittingMinusPoints} style={{
                                    marginTop: '6px', padding: '12px', background: 'linear-gradient(135deg,#ef4444,#b91c1c)',
                                    color: '#fff', border: 'none', borderRadius: '14px', fontSize: '0.9rem', fontWeight: 900,
                                    cursor: submittingMinusPoints ? 'not-allowed' : 'pointer', opacity: submittingMinusPoints ? 0.7 : 1, fontFamily: 'inherit'
                                }}>
                                    {submittingMinusPoints ? 'Recording...' : 'Record Deduction'}
                                </button>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}
            </div>

            {/* Add/Edit Staff Modal (Rendered globally using React Portal) */}
            {showModal && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '100px 20px 40px', overflowY: 'auto' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '460px', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', margin: '0 auto', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                                {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
                            </h2>
                            <button onClick={() => { setShowModal(false); setEditingStaff(null); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={16} style={{ color: '#64748b' }} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {[
                                { label: 'Full Name *', key: 'name', type: 'text', placeholder: 'e.g. Ravi Kumar' },
                                { label: 'Email *', key: 'email', type: 'email', placeholder: 'e.g. ravi@institute.com' },
                                { label: 'Designation', key: 'designation', type: 'text', placeholder: 'e.g. Office Clerk' },
                                { label: 'Department', key: 'department', type: 'text', placeholder: 'e.g. Administration' },
                                { label: 'Minus Points', key: 'minusPoints', type: 'number', placeholder: 'e.g. 5' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginBottom: '5px' }}>{f.label}</label>
                                    <input
                                        type={f.type} placeholder={f.placeholder} value={form[f.key]}
                                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                    />
                                </div>
                            ))}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginBottom: '5px' }}>
                                    Password {editingStaff ? '(Leave blank to keep current)' : '*'}
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPass ? 'text' : 'password'} placeholder={editingStaff ? 'Enter new password if changing' : 'Min 6 characters'} value={form.password}
                                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 40px 10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                    />
                                    <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <button type="submit" disabled={submitting} style={{
                                marginTop: '6px', padding: '12px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                color: '#fff', border: 'none', borderRadius: '14px', fontSize: '0.9rem', fontWeight: 900,
                                cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, fontFamily: 'inherit'
                            }}>
                                {submitting ? 'Saving...' : (editingStaff ? 'Update Details' : 'Add Staff Member')}
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Bulk Time Options Modal */}
            {bulkPresentModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
                        <h3 className="text-base font-black text-slate-800">Bulk Mark Present</h3>
                        <p className="text-xs font-bold text-slate-400 leading-relaxed">Specify default check-in and check-out times to apply to all selected staff members.</p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-455 uppercase tracking-wider block ml-1">Check-In</label>
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
                                className="flex-1 py-2.5 text-xs font-bold text-slate-655 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={applyBulkStaffPresent}
                                className="flex-1 py-2.5 text-xs font-black text-white bg-indigo-650 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-100 cursor-pointer"
                            >
                                Apply Times
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Staff Attendance History Modal */}
            {selectedStaffForAttendance && createPortal(
                <StaffAttendanceDetailModal
                    staffId={selectedStaffForAttendance}
                    onClose={() => setSelectedStaffForAttendance(null)}
                    onDataChange={fetchStaff}
                />,
                document.body
            )}

            {/* Multiple Task Assignment Modal (Table Grid Form inside Popup) */}
            {showTaskModal && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '60px 20px 40px', overflowY: 'auto' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '1050px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', margin: '0 auto', position: 'relative', border: '1px solid #e2e8f0', animation: 'scaleUp 0.2s ease-out' }}>

                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em' }}>
                                    {taskModalMode === 'add' ? 'Assign Tasks to Staff' : 'Edit Assigned Task'}
                                </h2>
                                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>
                                    {taskModalMode === 'add' ? 'You can add multiple rows to assign multiple tasks to the selected staff member at once.' : 'Update the title, priority, due date, remark and reminder time of this task.'}
                                </p>
                            </div>
                            <button onClick={() => setShowTaskModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '12px', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'} onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
                                <X size={18} style={{ color: '#64748b' }} />
                            </button>
                        </div>

                        <form onSubmit={handleTaskModalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Staff Selection Dropdown */}
                            <div style={{ maxWidth: '320px' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#374151', marginBottom: '6px' }}>Assign To Staff Member *</label>
                                <select
                                    value={taskModalStaff}
                                    onChange={e => setTaskModalStaff(e.target.value)}
                                    disabled={taskModalMode === 'edit' || isStaffPreselected}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        border: '1.5px solid #e2e8f0',
                                        borderRadius: '12px',
                                        fontSize: '0.82rem',
                                        fontWeight: 700,
                                        color: '#0f172a',
                                        outline: 'none',
                                        background: (taskModalMode === 'edit' || isStaffPreselected) ? '#f8fafc' : '#fff',
                                        cursor: (taskModalMode === 'edit' || isStaffPreselected) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    <option value="">Choose Staff...</option>
                                    {staffList.map(s => (
                                        <option key={s._id || s.name} value={s.name}>{s.name} ({s.staffProfile?.designation || 'Staff'})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Multiple Tasks Table Editor */}
                            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '970px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                                            <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '50px' }}>#</th>
                                            <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '200px' }}>Task Title *</th>
                                            <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '220px' }}>Description / Details</th>
                                            <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '110px' }}>Priority</th>
                                            <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '140px' }}>Assigned Date</th>
                                            <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '140px' }}>Due Date</th>
                                            <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '110px' }}>Valuation</th>
                                            {taskModalMode === 'add' && <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '60px', textAlign: 'center' }}>Delete</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {taskModalRows.map((row, idx) => (
                                            <tr key={idx} style={{ borderBottom: idx < taskModalRows.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                                <td style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, color: '#64748b' }}>{idx + 1}</td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <input
                                                        type="text"
                                                        value={row.title}
                                                        onChange={e => handleRowChange(idx, 'title', e.target.value)}
                                                        placeholder="e.g. Prepare report"
                                                        required={idx === 0}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                if (taskModalMode === 'add') addTaskRow();
                                                            }
                                                        }}
                                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#334155', outline: 'none' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <input
                                                        type="text"
                                                        value={row.description}
                                                        onClick={() => {
                                                            setDescPopupIndex(idx);
                                                            setDescPopupText(row.description || '');
                                                        }}
                                                        readOnly
                                                        placeholder="Click to edit details..."
                                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#334155', outline: 'none', cursor: 'pointer', background: '#f8fafc' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <select
                                                        value={row.priority}
                                                        onChange={e => handleRowChange(idx, 'priority', e.target.value)}
                                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, color: '#334155', outline: 'none', background: '#fff', cursor: 'pointer' }}
                                                    >
                                                        <option value="Urgent">Urgent</option>
                                                        <option value="High">High</option>
                                                        <option value="Medium">Medium</option>
                                                        <option value="Low">Low</option>
                                                    </select>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <input
                                                        type="date"
                                                        value={row.assignedDate}
                                                        onChange={e => handleRowChange(idx, 'assignedDate', e.target.value)}
                                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#334155', outline: 'none' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <input
                                                        type="date"
                                                        value={row.due}
                                                        onChange={e => handleRowChange(idx, 'due', e.target.value)}
                                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#334155', outline: 'none' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="10000"
                                                        value={row.valuation || ''}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (val === '' || (Number(val) >= 0 && Number(val) <= 10000)) {
                                                                handleRowChange(idx, 'valuation', val);
                                                            } else if (Number(val) > 10000) {
                                                                toast.error('Valuation cannot exceed 10,000!');
                                                            }
                                                        }}
                                                        placeholder="Max 10k"
                                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#334155', outline: 'none' }}
                                                    />
                                                </td>
                                                {taskModalMode === 'add' && (
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <button
                                                            type="button"
                                                            disabled={taskModalRows.length <= 1}
                                                            onClick={() => removeTaskRow(idx)}
                                                            style={{ border: 'none', background: 'none', cursor: taskModalRows.length <= 1 ? 'not-allowed' : 'pointer', color: '#ef4444', opacity: taskModalRows.length <= 1 ? 0.3 : 1, transition: 'all 0.2s' }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Add row options */}
                            {taskModalMode === 'add' && (
                                <button
                                    type="button"
                                    onClick={addTaskRow}
                                    style={{
                                        alignSelf: 'flex-start',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: '#fff',
                                        color: '#4f46e5',
                                        border: '1.5px dashed #c7d2fe',
                                        borderRadius: '12px',
                                        padding: '8px 16px',
                                        fontSize: '0.78rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.background = '#f5f3ff'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#c7d2fe'; e.currentTarget.style.background = '#fff'; }}
                                >
                                    <Plus size={14} /> Add Task Row
                                </button>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowTaskModal(false)}
                                    style={{
                                        padding: '10px 24px',
                                        borderRadius: '12px',
                                        border: '1.5px solid #e2e8f0',
                                        background: '#fff',
                                        color: '#475569',
                                        fontSize: '0.8rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: '10px 28px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        color: '#fff',
                                        border: 'none',
                                        fontSize: '0.8rem',
                                        fontWeight: 900,
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                                        transition: 'opacity 0.2s'
                                    }}
                                >
                                    {taskModalMode === 'add' ? 'Assign All Tasks' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Dedicated View Evidence Modal */}
            {viewEvidenceModalOpen && viewingEvidenceTask && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0', animation: 'scaleUp 0.2s ease-out' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Task Evidence Submission</h3>
                            <button onClick={() => {
                                setViewEvidenceModalOpen(false);
                                setViewingEvidenceTask(null);
                            }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={16} style={{ color: '#64748b' }} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>Task Name:</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>{viewingEvidenceTask.title}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>Submitted Remark:</div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981', background: '#f0fdf4', border: '1.5px solid #a7f3d0', padding: '10px 14px', borderRadius: '12px', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                                    {viewingEvidenceTask.evidenceNote || 'No remarks provided.'}
                                </div>
                            </div>
                            {viewingEvidenceTask.evidenceFile && (
                                <div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 650, marginBottom: '6px' }}>Uploaded File Proof:</div>
                                    {viewingEvidenceTask.evidenceFile.startsWith('data:image/') ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', background: '#f8fafc', padding: '12px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                            <img src={viewingEvidenceTask.evidenceFile} alt="Evidence Proof" style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '12px', border: '1px solid #cbd5e1' }} />
                                        </div>
                                    ) : (
                                        <a href={viewingEvidenceTask.evidenceFile} download={viewingEvidenceTask.evidenceFileName || 'evidence_proof.pdf'} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f5f3ff', border: '1.5px solid #c7d2fe', padding: '8px 16px', borderRadius: '12px', fontSize: '0.78rem', color: '#4f46e5', fontWeight: 800, textDecoration: 'none' }}>
                                            📎 Download Proof Document ({viewingEvidenceTask.evidenceFileName || 'Download Attachment'})
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* View Task Details Modal */}
            {viewingTask && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', relative: true, border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <span style={{
                                background:
                                    viewingTask.priority === 'Urgent' ? '#fee2e2' :
                                        viewingTask.priority === 'High' ? '#ffedd5' :
                                            viewingTask.priority === 'Medium' ? '#fef9c3' : '#dcfce7',
                                color:
                                    viewingTask.priority === 'Urgent' ? '#dc2626' :
                                        viewingTask.priority === 'High' ? '#ea580c' :
                                            viewingTask.priority === 'Medium' ? '#d97706' : '#16a34a',
                                border: `1.5px solid ${viewingTask.priority === 'Urgent' ? '#fca5a5' :
                                    viewingTask.priority === 'High' ? '#fdba74' :
                                        viewingTask.priority === 'Medium' ? '#fde68a' : '#86efac'
                                    }`,
                                borderRadius: '20px',
                                padding: '3px 12px',
                                fontSize: '0.68rem',
                                fontWeight: 900
                            }}>
                                {viewingTask.priority} Priority
                            </span>
                            <button onClick={() => setViewingTask(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={16} style={{ color: '#64748b' }} />
                            </button>
                        </div>

                        <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.3 }}>{viewingTask.title}</h3>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '14px 0 20px', background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.78rem', fontWeight: 900 }}>
                                {viewingTask.staffName?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Assigned To Staff</div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', marginTop: '1px' }}>{viewingTask.staffName}</div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', tracking: '0.05em', marginBottom: '6px' }}>Task Details</label>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', fontWeight: 550, lineHeight: 1.5, background: '#fafafa', padding: '12px', borderRadius: '12px', border: '1.5px solid #f1f5f9', whiteSpace: 'pre-wrap' }}>
                                {viewingTask.description || 'No detailed description provided for this task.'}
                            </p>
                        </div>

                        {viewingTask.remark && (
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', tracking: '0.05em', marginBottom: '4px' }}>Remark / Instructions</label>
                                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f59e0b', background: '#fffbeb', border: '1px solid #fde68a', padding: '8px 12px', borderRadius: '8px' }}>
                                    📝 {viewingTask.remark}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', tracking: '0.05em', marginBottom: '4px' }}>Created Date</label>
                                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>
                                    📅 {viewingTask.createdAt ? new Date(viewingTask.createdAt + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', tracking: '0.05em', marginBottom: '4px' }}>Due Date</label>
                                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>
                                    📅 {viewingTask.due ? new Date(viewingTask.due + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No Due Date'}
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', tracking: '0.05em', marginBottom: '4px' }}>Reminder Alert</label>
                                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: viewingTask.reminderTime ? '#6366f1' : '#64748b' }}>
                                    {viewingTask.reminderTime ? `🔔 ${(() => {
                                        const [h, m] = viewingTask.reminderTime.split(':');
                                        const hrs = parseInt(h, 10);
                                        const ampm = hrs >= 12 ? 'PM' : 'AM';
                                        const hrs12 = hrs % 12 || 12;
                                        return `${String(hrs12).padStart(2, '0')}:${m} ${ampm}`;
                                    })()}` : '🔕 Not Set'}
                                </div>
                            </div>
                        </div>

                        {viewingTask.evidenceNote && (
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', tracking: '0.05em', marginBottom: '4px' }}>Evidence Remarks</label>
                                <div style={{ fontSize: '0.82rem', fontWeight: 850, color: '#10b981', background: '#f0fdf4', border: '1.5px solid #a7f3d0', padding: '8px 12px', borderRadius: '8px' }}>
                                    ✅ {viewingTask.evidenceNote}
                                </div>
                            </div>
                        )}

                        {viewingTask.evidenceFile && (
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', tracking: '0.05em', marginBottom: '4px' }}>Evidence Proof</label>
                                {viewingTask.evidenceFile.startsWith('data:image/') ? (
                                    <img src={viewingTask.evidenceFile} alt="Evidence Proof" style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'block' }} />
                                ) : (
                                    <a href={viewingTask.evidenceFile} download={viewingTask.evidenceFileName || 'evidence.pdf'} style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4f46e5', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        📎 Download Proof ({viewingTask.evidenceFileName || 'Attachment'})
                                    </a>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => setViewingTask(null)}
                            style={{
                                width: '100%',
                                padding: '11px',
                                background: '#1e293b',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#0f172a'}
                            onMouseLeave={e => e.currentTarget.style.background = '#1e293b'}
                        >
                            Close Details
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* Description Sub-Modal Popup for Add/Edit Rows */}
            {descPopupIndex !== null && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 100000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0', animation: 'scaleUp 0.15s ease-out' }}>
                        <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                            Edit Detailed Description (Row #{descPopupIndex + 1})
                        </h3>
                        <p style={{ margin: '0 0 16px', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                            Write a detailed description for this task below.
                        </p>
                        <textarea
                            value={descPopupText}
                            onChange={e => setDescPopupText(e.target.value)}
                            placeholder="Type full description here..."
                            rows={8}
                            style={{ width: '100%', padding: '12px', border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, color: '#334155', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                        />
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button
                                type="button"
                                onClick={() => setDescPopupIndex(null)}
                                style={{ padding: '8px 20px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleRowChange(descPopupIndex, 'description', descPopupText);
                                    setDescPopupIndex(null);
                                }}
                                style={{ padding: '8px 24px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', fontSize: '0.78rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 10px rgba(99, 102, 241, 0.2)' }}
                            >
                                Save Description
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Staff Tasks Preview Modal */}
            {selectedStaffTasks && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '60px 20px 40px', overflowY: 'auto' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '1200px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', margin: '0 auto', position: 'relative', border: '1px solid #e2e8f0', animation: 'scaleUp 0.2s ease-out' }}>

                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em' }}>
                                    Tasks for {selectedStaffTasks}
                                </h2>
                                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 650 }}>
                                    View and manage all assigned and self-created tasks for this staff member.
                                </p>
                            </div>
                            <button onClick={() => setSelectedStaffTasks(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '12px', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={18} style={{ color: '#64748b' }} />
                            </button>
                        </div>

                        {/* List of Tasks */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Section 1: Assigned Tasks */}
                            <div>
                                <h4 style={{ margin: '0 0 10px', fontSize: '0.82rem', fontWeight: 900, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Assigned by Institute
                                </h4>

                                {/* Section 1: Assigned Tasks Filter Toolbar */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    flexWrap: 'wrap',
                                    background: '#f8fafc',
                                    padding: '10px 14px',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    marginBottom: '12px'
                                }}>
                                    {/* Date Filter */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569' }}>Date:</span>
                                        <select
                                            value={previewDateFilter}
                                            onChange={e => setPreviewDateFilter(e.target.value)}
                                            style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.7rem', fontWeight: 700, color: '#334155', background: '#fff', cursor: 'pointer', outline: 'none' }}
                                        >
                                            <option value="today">Today</option>
                                            <option value="month">This Month</option>
                                            <option value="particular">Particular Date</option>
                                            <option value="range">Date Range</option>
                                            <option value="year">Complete Year</option>
                                        </select>
                                    </div>

                                    {previewDateFilter === 'particular' && (
                                        <input type="date" value={previewParticularDate} onChange={e => setPreviewParticularDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.7rem', fontWeight: 600, outline: 'none' }} />
                                    )}
                                    {previewDateFilter === 'range' && (
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            <input type="date" value={previewStartDate} onChange={e => setPreviewStartDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.7rem', fontWeight: 600, outline: 'none' }} />
                                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>to</span>
                                            <input type="date" value={previewEndDate} onChange={e => setPreviewEndDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.7rem', fontWeight: 600, outline: 'none' }} />
                                        </div>
                                    )}

                                    {/* Verification Filter */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569' }}>Verification:</span>
                                        <select
                                            value={previewVerificationFilter}
                                            onChange={e => setPreviewVerificationFilter(e.target.value)}
                                            style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.7rem', fontWeight: 700, color: '#334155', background: '#fff', cursor: 'pointer', outline: 'none' }}
                                        >
                                            <option value="">All Verifications</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                            <option value="needs_revision">Needs Revision</option>
                                            <option value="under_verification">Under Verification</option>
                                            <option value="evidence_insufficient">Evidence Insufficient</option>
                                            <option value="on_hold">On Hold</option>
                                            <option value="escalated">Escalated</option>
                                        </select>
                                    </div>

                                    {/* Status Filter */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569' }}>Status:</span>
                                        <select
                                            value={previewStatusFilter}
                                            onChange={e => setPreviewStatusFilter(e.target.value)}
                                            style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.7rem', fontWeight: 700, color: '#334155', background: '#fff', cursor: 'pointer', outline: 'none' }}
                                        >
                                            <option value="">All Statuses</option>
                                            <option value="pending">Pending</option>
                                            <option value="inprogress">In Progress</option>
                                            <option value="done">Completed</option>
                                        </select>
                                    </div>
                                </div>

                                {(() => {
                                    const filterPreviewTask = (t) => {
                                        const taskDate = t.createdAt || t.due || new Date().toISOString().split('T')[0];
                                        const todayStr = new Date().toISOString().split('T')[0];

                                        if (previewDateFilter === 'today') {
                                            return taskDate === todayStr;
                                        }
                                        if (previewDateFilter === 'month') {
                                            const currentMonthStr = todayStr.substring(0, 7);
                                            return taskDate.startsWith(currentMonthStr);
                                        }
                                        if (previewDateFilter === 'range') {
                                            if (!previewStartDate || !previewEndDate) return true;
                                            return taskDate >= previewStartDate && taskDate <= previewEndDate;
                                        }
                                        if (previewDateFilter === 'particular') {
                                            if (!previewParticularDate) return true;
                                            return taskDate === previewParticularDate;
                                        }
                                        if (previewDateFilter === 'year') {
                                            return true;
                                        }
                                        return true;
                                    };

                                    const filteredList = tasks.filter(t =>
                                        t.staffName?.toLowerCase() === selectedStaffTasks.toLowerCase() &&
                                        !t.isSelfCreated &&
                                        filterPreviewTask(t) &&
                                        (previewVerificationFilter === '' || (t.verificationStatus || '') === previewVerificationFilter) &&
                                        (previewStatusFilter === '' || (t.status || 'pending') === previewStatusFilter)
                                    );

                                    return filteredList.length === 0 ? (
                                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>
                                            No tasks assigned by the institute match this filter.
                                        </div>
                                    ) : (
                                        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                                <thead>
                                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Task Title</th>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '100px', whiteSpace: 'nowrap' }}>Priority</th>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '140px', whiteSpace: 'nowrap' }}>Created Date</th>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '180px', whiteSpace: 'nowrap' }}>Due Date</th><th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '110px', whiteSpace: 'nowrap' }}>Valuation</th>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '110px', whiteSpace: 'nowrap' }}>Time Taken</th>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '110px', whiteSpace: 'nowrap' }}>Status</th>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '160px', whiteSpace: 'nowrap', textAlign: 'center' }}>Report with Evidence</th>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '120px', textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredList.map(t => {
                                                        const priorityColor = t.priority === 'Urgent' ? '#ef4444' : t.priority === 'High' ? '#ea580c' : t.priority === 'Medium' ? '#d97706' : '#16a34a';

                                                        const formatTime12h = (t24) => {
                                                            if (!t24) return '';
                                                            const [h, m] = t24.split(':');
                                                            const hrs = parseInt(h, 10);
                                                            const ampm = hrs >= 12 ? 'PM' : 'AM';
                                                            const hrs12 = hrs % 12 || 12;
                                                            return `${String(hrs12).padStart(2, '0')}:${m} ${ampm}`;
                                                        };

                                                        return (
                                                            <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                <td style={{ padding: '10px 14px', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>{t.title}</td>
                                                                <td style={{ padding: '10px 14px', fontSize: '0.7rem', fontWeight: 800, color: priorityColor }}>{t.priority}</td>
                                                                <td style={{ padding: '10px 14px', fontSize: '0.72rem', color: '#475569', fontWeight: 650 }}>
                                                                    📅 {t.createdAt ? new Date(t.createdAt + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                                                </td>
                                                                <td style={{ padding: '10px 14px', fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>
                                                                    📅 {t.due ? new Date(t.due + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No Due Date'} {t.reminderTime && `· ⏰ ${formatTime12h(t.reminderTime)}`}
                                                                </td>
                                                                <td style={{ padding: '10px 14px', fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>
                                                                    {t.valuation ? `₹${Number(t.valuation).toLocaleString('en-IN')}` : '—'}
                                                                </td>
                                                                <td style={{ padding: '10px 14px', fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>
                                                                    {t.timeTaken ? t.timeTaken : '—'}
                                                                </td>
                                                                <td style={{ padding: '10px 14px' }}>
                                                                    <span style={{
                                                                        background: t.status === 'done' ? '#dcfce7' : t.status === 'inprogress' ? '#fffbeb' : '#f1f5f9',
                                                                        color: t.status === 'done' ? '#16a34a' : t.status === 'inprogress' ? '#d97706' : '#64748b',
                                                                        fontSize: '0.62rem', fontWeight: 900, padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase'
                                                                    }}>{t.status === 'done' ? 'Completed' : t.status === 'inprogress' ? 'In Progress' : 'Pending'}</span>
                                                                </td>
                                                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                                    {t.evidenceNote || t.evidenceFile ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setViewingEvidenceTask(t);
                                                                                setViewEvidenceModalOpen(true);
                                                                            }}
                                                                            style={{
                                                                                padding: '4px 10px',
                                                                                borderRadius: '6px',
                                                                                border: '1.5px solid #86efac',
                                                                                background: '#f0fdf4',
                                                                                color: '#16a34a',
                                                                                fontSize: '0.65rem',
                                                                                fontWeight: 800,
                                                                                cursor: 'pointer'
                                                                            }}
                                                                        >
                                                                            View Evidence
                                                                        </button>
                                                                    ) : (
                                                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>—</span>
                                                                    )}
                                                                </td>
                                                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setViewingTask(t)}
                                                                            title="View details"
                                                                            style={{ width: 26, height: 26, borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                                                                        >
                                                                            <Eye size={12} />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setSelectedStaffTasks(null);
                                                                                openEditTaskModal(t);
                                                                            }}
                                                                            title="Edit task"
                                                                            style={{ width: 26, height: 26, borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#4f46e5' }}
                                                                        >
                                                                            <Pencil size={12} />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (window.confirm('Delete this task?')) {
                                                                                    setTasks(prev => prev.filter(x => x.id !== t.id));
                                                                                    toast.success('Task removed');
                                                                                }
                                                                            }}
                                                                            title="Delete task"
                                                                            style={{ width: 26, height: 26, borderRadius: '6px', border: '1px solid #fee2e2', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}
                                                                        >
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Section 2: Self Created Tasks */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 900, color: '#ca8a04', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Self-Created (Not Assigned)
                                    </h4>
                                    {/* Self-Created Dropdown Filters Toolbar */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        flexWrap: 'wrap',
                                        background: '#fffbeb',
                                        padding: '10px 14px',
                                        borderRadius: '12px',
                                        border: '1px solid #fde68a',
                                        marginBottom: '12px'
                                    }}>
                                        {/* Date Filter */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#92400e' }}>Date:</span>
                                            <select
                                                value={selfPreviewDateFilter}
                                                onChange={e => setSelfPreviewDateFilter(e.target.value)}
                                                style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #fde68a', fontSize: '0.7rem', fontWeight: 700, color: '#92400e', background: '#fff', cursor: 'pointer', outline: 'none' }}
                                            >
                                                <option value="month">This Month</option>
                                                <option value="particular">Particular Date</option>
                                                <option value="range">Date Range</option>
                                                <option value="year">All</option>
                                            </select>
                                        </div>

                                        {selfPreviewDateFilter === 'range' && (
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                <input type="date" value={selfPreviewStartDate} onChange={e => setSelfPreviewStartDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #fde68a', fontSize: '0.7rem', fontWeight: 600, outline: 'none' }} />
                                                <span style={{ fontSize: '0.68rem', color: '#92400e', fontWeight: 700 }}>to</span>
                                                <input type="date" value={selfPreviewEndDate} onChange={e => setSelfPreviewEndDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #fde68a', fontSize: '0.7rem', fontWeight: 600, outline: 'none' }} />
                                            </div>
                                        )}
                                        {selfPreviewDateFilter === 'particular' && (
                                            <input type="date" value={selfPreviewParticularDate} onChange={e => setSelfPreviewParticularDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #fde68a', fontSize: '0.7rem', fontWeight: 600, outline: 'none' }} />
                                        )}

                                        {/* Verification Filter */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#92400e' }}>Verification:</span>
                                            <select
                                                value={selfPreviewVerificationFilter}
                                                onChange={e => setSelfPreviewVerificationFilter(e.target.value)}
                                                style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #fde68a', fontSize: '0.7rem', fontWeight: 700, color: '#92400e', background: '#fff', cursor: 'pointer', outline: 'none' }}
                                            >
                                                <option value="">All Verifications</option>
                                                <option value="approved">Approved</option>
                                                <option value="rejected">Rejected</option>
                                                <option value="needs_revision">Needs Revision</option>
                                                <option value="under_verification">Under Verification</option>
                                                <option value="evidence_insufficient">Evidence Insufficient</option>
                                                <option value="on_hold">On Hold</option>
                                                <option value="escalated">Escalated</option>
                                            </select>
                                        </div>

                                        {/* Status Filter */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#92400e' }}>Status:</span>
                                            <select
                                                value={selfPreviewStatusFilter}
                                                onChange={e => setSelfPreviewStatusFilter(e.target.value)}
                                                style={{ padding: '4px 8px', borderRadius: '8px', border: '1.5px solid #fde68a', fontSize: '0.7rem', fontWeight: 700, color: '#92400e', background: '#fff', cursor: 'pointer', outline: 'none' }}
                                            >
                                                <option value="">All Statuses</option>
                                                <option value="pending">Pending</option>
                                                <option value="inprogress">In Progress</option>
                                                <option value="done">Completed</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                {(() => {
                                    const filterSelfTask = (t) => {
                                        const taskDate = t.createdAt || t.due || new Date().toISOString().split('T')[0];
                                        const todayStr = new Date().toISOString().split('T')[0];
                                        if (selfPreviewDateFilter === 'month') {
                                            const currentMonthStr = todayStr.substring(0, 7);
                                            return taskDate.startsWith(currentMonthStr);
                                        }
                                        if (selfPreviewDateFilter === 'range') {
                                            if (!selfPreviewStartDate || !selfPreviewEndDate) return true;
                                            return taskDate >= selfPreviewStartDate && taskDate <= selfPreviewEndDate;
                                        }
                                        if (selfPreviewDateFilter === 'particular') {
                                            if (!selfPreviewParticularDate) return true;
                                            return taskDate === selfPreviewParticularDate;
                                        }
                                        return true; // 'year' = show all
                                    };

                                    const filteredList = tasks.filter(t =>
                                        t.staffName?.toLowerCase() === selectedStaffTasks.toLowerCase() &&
                                        t.isSelfCreated &&
                                        filterSelfTask(t) &&
                                        (selfPreviewVerificationFilter === '' || (t.verificationStatus || '') === selfPreviewVerificationFilter) &&
                                        (selfPreviewStatusFilter === '' || (t.status || 'pending') === selfPreviewStatusFilter)
                                    );

                                    return filteredList.length === 0 ? (
                                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>
                                            No self-created tasks added by this staff member match this filter.
                                        </div>
                                    ) : (
                                        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                                <thead>
                                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Task Title</th>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '100px', whiteSpace: 'nowrap' }}>Priority</th>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '140px', whiteSpace: 'nowrap' }}>Created Date</th>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '180px', whiteSpace: 'nowrap' }}>Due Date</th><th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '110px', whiteSpace: 'nowrap' }}>Valuation</th>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '110px', whiteSpace: 'nowrap' }}>Time Taken</th>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '110px', whiteSpace: 'nowrap' }}>Status</th>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '160px', whiteSpace: 'nowrap', textAlign: 'center' }}>Report with Evidence</th>
                                                        <th style={{ padding: '10px 14px', fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', width: '120px', textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredList.map(t => {
                                                        const priorityColor = t.priority === 'Urgent' ? '#ef4444' : t.priority === 'High' ? '#ea580c' : t.priority === 'Medium' ? '#d97706' : '#16a34a';

                                                        const formatTime12h = (t24) => {
                                                            if (!t24) return '';
                                                            const [h, m] = t24.split(':');
                                                            const hrs = parseInt(h, 10);
                                                            const ampm = hrs >= 12 ? 'PM' : 'AM';
                                                            const hrs12 = hrs % 12 || 12;
                                                            return `${String(hrs12).padStart(2, '0')}:${m} ${ampm}`;
                                                        };

                                                        return (
                                                            <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                <td style={{ padding: '10px 14px', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>{t.title}</td>
                                                                <td style={{ padding: '10px 14px', fontSize: '0.7rem', fontWeight: 800, color: priorityColor }}>{t.priority}</td>
                                                                <td style={{ padding: '10px 14px', fontSize: '0.72rem', color: '#475569', fontWeight: 650 }}>
                                                                    📅 {t.createdAt ? new Date(t.createdAt + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                                                </td>
                                                                <td style={{ padding: '10px 14px', fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>
                                                                    📅 {t.due ? new Date(t.due + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No Due Date'} {t.reminderTime && `· ⏰ ${formatTime12h(t.reminderTime)}`}
                                                                </td>
                                                                <td style={{ padding: '10px 14px', fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>
                                                                    {t.valuation ? `₹${Number(t.valuation).toLocaleString('en-IN')}` : '—'}
                                                                </td>
                                                                <td style={{ padding: '10px 14px', fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>
                                                                    {t.timeTaken ? t.timeTaken : '—'}
                                                                </td>
                                                                <td style={{ padding: '10px 14px' }}>
                                                                    <span style={{
                                                                        background: '#dcfce7',
                                                                        color: '#16a34a',
                                                                        border: '1.5px solid #86efac',
                                                                        fontSize: '0.62rem', fontWeight: 900, padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase'
                                                                    }}>Completed</span>
                                                                </td>
                                                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                                    {t.evidenceNote || t.evidenceFile ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setViewingEvidenceTask(t);
                                                                                setViewEvidenceModalOpen(true);
                                                                            }}
                                                                            style={{
                                                                                padding: '4px 10px',
                                                                                borderRadius: '6px',
                                                                                border: '1.5px solid #86efac',
                                                                                background: '#f0fdf4',
                                                                                color: '#16a34a',
                                                                                fontSize: '0.65rem',
                                                                                fontWeight: 800,
                                                                                cursor: 'pointer'
                                                                            }}
                                                                        >
                                                                            View Evidence
                                                                        </button>
                                                                    ) : (
                                                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>—</span>
                                                                    )}
                                                                </td>
                                                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setViewingTask(t)}
                                                                            title="View details"
                                                                            style={{ width: 26, height: 26, borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                                                                        >
                                                                            <Eye size={12} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </DashboardLayout>
    );
};

export default InstituteStaff;
